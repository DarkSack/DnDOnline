import { randomInt } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Sql } from "../../db/sql.ts";
import { HttpError, parse } from "../../http.ts";
import { audit } from "../audit.ts";
import { requireUser } from "../identity/routes.ts";
import { authorize } from "./permissions.ts";

const Id = z.object({ id: z.uuid() });
const CreateCampaign = z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().max(2000).default("") });
const CreateInvite = z.object({
  role: z.enum(["player", "spectator"]).default("player"),
  maxUses: z.number().int().min(1).max(100).default(10),
  expiresInHours: z.number().int().min(1).max(24 * 30).default(72),
});
const ChangeRole = z.object({ role: z.enum(["co_dm", "player", "spectator"]) });

// Sin 0/O/1/I/L para que se pueda dictar por voz.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const newInviteCode = () => Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export async function campaignRoutes(app: FastifyInstance, { sql }: { sql: Sql }) {
  app.post("/api/campaigns", async (req, reply) => {
    const user = requireUser(req);
    const body = parse(CreateCampaign, req.body);
    const campaign = await sql.begin(async (tx) => {
      const [c] = await tx<{ id: string }[]>`
        INSERT INTO campaigns (name, description, owner_id) VALUES (${body.name}, ${body.description}, ${user.id}) RETURNING id`;
      await tx`INSERT INTO campaign_members (campaign_id, user_id, role) VALUES (${c!.id}, ${user.id}, 'dm')`;
      return c!;
    });
    await audit(sql, user.id, "campaign.create", campaign.id);
    return reply.status(201).send({ id: campaign.id });
  });

  app.get("/api/campaigns", async (req) => {
    const user = requireUser(req);
    const campaigns = await sql`
      SELECT c.id, c.name, c.description, m.role, c.created_at AS "createdAt"
      FROM campaign_members m JOIN campaigns c ON c.id = m.campaign_id
      WHERE m.user_id = ${user.id} ORDER BY c.created_at DESC`;
    return { campaigns };
  });

  app.get("/api/campaigns/:id", async (req) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    const role = await authorize(sql, id, user.id, "campaign.read");
    const [campaign] = await sql`SELECT id, name, description, owner_id AS "ownerId" FROM campaigns WHERE id = ${id}`;
    const members = await sql`
      SELECT u.id, u.display_name AS "displayName", m.role
      FROM campaign_members m JOIN users u ON u.id = m.user_id
      WHERE m.campaign_id = ${id} ORDER BY m.joined_at`;
    return { campaign, role, members };
  });

  app.post("/api/campaigns/:id/invites", async (req, reply) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    await authorize(sql, id, user.id, "campaign.manage");
    const body = parse(CreateInvite, req.body ?? {});
    const code = newInviteCode();
    const [invite] = await sql`
      INSERT INTO campaign_invites (code, campaign_id, role, created_by, expires_at, max_uses)
      VALUES (${code}, ${id}, ${body.role}, ${user.id}, now() + make_interval(hours => ${body.expiresInHours}), ${body.maxUses})
      RETURNING code, role, expires_at AS "expiresAt", max_uses AS "maxUses"`;
    await audit(sql, user.id, "invite.create", id, { role: body.role });
    return reply.status(201).send({ invite });
  });

  app.get("/api/campaigns/:id/invites", async (req) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    await authorize(sql, id, user.id, "campaign.manage");
    const invites = await sql`
      SELECT code, role, expires_at AS "expiresAt", max_uses AS "maxUses", uses
      FROM campaign_invites WHERE campaign_id = ${id} AND revoked_at IS NULL AND expires_at > now() AND uses < max_uses
      ORDER BY expires_at`;
    return { invites };
  });

  app.delete("/api/campaigns/:id/invites/:code", async (req) => {
    const user = requireUser(req);
    const { id, code } = parse(Id.extend({ code: z.string().max(20) }), req.params);
    await authorize(sql, id, user.id, "campaign.manage");
    await sql`UPDATE campaign_invites SET revoked_at = now() WHERE code = ${code} AND campaign_id = ${id}`;
    await audit(sql, user.id, "invite.revoke", id);
    return { ok: true };
  });

  app.post("/api/invites/:code/accept", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req) => {
    const user = requireUser(req);
    const { code } = parse(z.object({ code: z.string().trim().toUpperCase().max(20) }), req.params);
    const campaignId = await sql.begin(async (tx) => {
      // FOR UPDATE: dos personas aceptando a la vez no pueden pasarse de max_uses.
      const [inv] = await tx<{ campaign_id: string; role: string }[]>`
        SELECT campaign_id, role FROM campaign_invites
        WHERE code = ${code} AND revoked_at IS NULL AND expires_at > now() AND uses < max_uses FOR UPDATE`;
      if (!inv) throw new HttpError(404, "invalid_invite");
      const joined = await tx`
        INSERT INTO campaign_members (campaign_id, user_id, role) VALUES (${inv.campaign_id}, ${user.id}, ${inv.role})
        ON CONFLICT DO NOTHING RETURNING 1`;
      if (joined.length) await tx`UPDATE campaign_invites SET uses = uses + 1 WHERE code = ${code}`;
      return inv.campaign_id;
    });
    await audit(sql, user.id, "campaign.join", campaignId);
    return { campaignId };
  });

  app.patch("/api/campaigns/:id/members/:userId", async (req) => {
    const user = requireUser(req);
    const { id, userId } = parse(Id.extend({ userId: z.uuid() }), req.params);
    await authorize(sql, id, user.id, "campaign.change_roles");
    const { role } = parse(ChangeRole, req.body);
    // El DM propietario no se degrada a sí mismo por esta vía.
    const updated = await sql`
      UPDATE campaign_members m SET role = ${role}
      FROM campaigns c
      WHERE m.campaign_id = ${id} AND m.user_id = ${userId} AND c.id = m.campaign_id AND c.owner_id <> m.user_id
      RETURNING 1`;
    if (!updated.length) throw new HttpError(404, "not_found");
    await audit(sql, user.id, "member.role", id, { userId, role });
    return { ok: true };
  });

  app.delete("/api/campaigns/:id/members/:userId", async (req) => {
    const user = requireUser(req);
    const { id, userId } = parse(Id.extend({ userId: z.uuid() }), req.params);
    // Cualquiera puede irse; echar a otros exige gestionar la campaña.
    if (userId !== user.id) await authorize(sql, id, user.id, "campaign.manage");
    await sql.begin(async (tx) => {
      const removed = await tx`
        DELETE FROM campaign_members m USING campaigns c
        WHERE m.campaign_id = ${id} AND m.user_id = ${userId} AND c.id = m.campaign_id AND c.owner_id <> m.user_id
        RETURNING 1`;
      if (!removed.length) throw new HttpError(404, "not_found");
      // Sus personajes salen con él: el DM deja de ver esas fichas.
      await tx`UPDATE characters SET campaign_id = NULL WHERE owner_id = ${userId} AND campaign_id = ${id}`;
    });
    await audit(sql, user.id, userId === user.id ? "member.leave" : "member.kick", id, { userId });
    return { ok: true };
  });
}
