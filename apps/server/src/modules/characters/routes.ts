import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Sql } from "../../db/sql.ts";
import { HttpError, parse } from "../../http.ts";
import { audit } from "../audit.ts";
import { authorize, can, roleIn } from "../campaigns/permissions.ts";
import { requireUser } from "../identity/routes.ts";
import { broadcastBoard } from "../table/routes.ts";
import { CharacterName, Sheet } from "./sheet.ts";

const Id = z.object({ id: z.uuid() });
const Create = z.object({ name: CharacterName, sheet: Sheet, campaignId: z.uuid().nullable().default(null) });
const Update = z.object({ name: CharacterName.optional(), sheet: Sheet.optional(), campaignId: z.uuid().nullable().optional() });

type Row = { id: string; ownerId: string; ownerName: string; campaignId: string | null; campaignName: string | null; name: string; sheet: unknown; updatedAt: string };

const SUMMARY = (sql: Sql) => sql`
  c.id, c.name, c.owner_id AS "ownerId", u.display_name AS "ownerName", c.campaign_id AS "campaignId", k.name AS "campaignName",
  c.sheet->'identity'->>'race' AS race, c.sheet->'identity'->>'className' AS "className", (c.sheet->'identity'->>'level')::int AS level,
  (c.sheet->'combat'->>'hp')::int AS hp, (c.sheet->'combat'->>'hpMax')::int AS "hpMax"`;

/**
 * Quién ve una ficha: su dueño, y el DM o co-DM de la campaña donde juega.
 * Al resto se le responde 404, como con las campañas, para no revelar que existe.
 */
async function load(sql: Sql, id: string, userId: string): Promise<{ row: Row; owner: boolean }> {
  const [row] = await sql<Row[]>`
    SELECT c.id, c.owner_id AS "ownerId", u.display_name AS "ownerName", c.campaign_id AS "campaignId", k.name AS "campaignName",
           c.name, c.sheet, c.updated_at AS "updatedAt"
    FROM characters c JOIN users u ON u.id = c.owner_id LEFT JOIN campaigns k ON k.id = c.campaign_id
    WHERE c.id = ${id}`;
  if (!row) throw new HttpError(404, "not_found");
  if (row.ownerId === userId) return { row, owner: true };
  if (row.campaignId && can(await roleIn(sql, row.campaignId, userId), "character.read_all")) return { row, owner: false };
  throw new HttpError(404, "not_found");
}

export async function characterRoutes(app: FastifyInstance, { sql }: { sql: Sql }) {
  app.get("/api/characters", async (req) => {
    const user = requireUser(req);
    const characters = await sql`
      SELECT ${SUMMARY(sql)}
      FROM characters c JOIN users u ON u.id = c.owner_id LEFT JOIN campaigns k ON k.id = c.campaign_id
      WHERE c.owner_id = ${user.id} ORDER BY c.updated_at DESC`;
    return { characters };
  });

  app.post("/api/characters", async (req, reply) => {
    const user = requireUser(req);
    const body = parse(Create, req.body);
    if (body.campaignId) await authorize(sql, body.campaignId, user.id, "character.bring");
    const [c] = await sql<{ id: string }[]>`
      INSERT INTO characters (owner_id, campaign_id, name, sheet)
      VALUES (${user.id}, ${body.campaignId}, ${body.name}, ${sql.json(body.sheet)}) RETURNING id`;
    return reply.status(201).send({ id: c!.id });
  });

  app.get("/api/characters/:id", async (req) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    const { row, owner } = await load(sql, id, user.id);
    return { character: row, canEdit: owner };
  });

  // Solo el dueño edita. Los PG también cambian desde la mesa (token.update en modules/board/messages.ts).
  app.patch("/api/characters/:id", async (req) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    const body = parse(Update, req.body);
    const { owner } = await load(sql, id, user.id);
    if (!owner) throw new HttpError(403, "forbidden");
    if (body.campaignId) await authorize(sql, body.campaignId, user.id, "character.bring");
    await sql`
      UPDATE characters SET
        name = ${body.name ?? sql`name`},
        sheet = ${body.sheet ? sql.json(body.sheet) : sql`sheet`},
        campaign_id = ${body.campaignId === undefined ? sql`campaign_id` : body.campaignId},
        updated_at = now()
      WHERE id = ${id}`;
    if (body.sheet) {
      // Sus fichas en el tablero toman los PG nuevos; quien tenga la mesa abierta lo ve al momento.
      const moved = await sql<{ campaignId: string }[]>`
        UPDATE tokens t SET hp = ${body.sheet.combat.hp}, hp_max = ${body.sheet.combat.hpMax}
        FROM scenes s WHERE s.id = t.scene_id AND t.character_id = ${id}
        RETURNING s.campaign_id AS "campaignId"`;
      for (const campaignId of new Set(moved.map((r) => r.campaignId))) await broadcastBoard(sql, campaignId);
    }
    return { ok: true };
  });

  app.delete("/api/characters/:id", async (req) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    const { owner } = await load(sql, id, user.id);
    if (!owner) throw new HttpError(403, "forbidden");
    await sql`DELETE FROM characters WHERE id = ${id}`;
    await audit(sql, user.id, "character.delete", id);
    return { ok: true };
  });

  // DM y co-DM ven todos los personajes de la campaña; el resto, solo los suyos.
  app.get("/api/campaigns/:id/characters", async (req) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    const role = await authorize(sql, id, user.id, "campaign.read");
    const all = can(role, "character.read_all");
    const characters = await sql`
      SELECT ${SUMMARY(sql)}
      FROM characters c JOIN users u ON u.id = c.owner_id LEFT JOIN campaigns k ON k.id = c.campaign_id
      WHERE c.campaign_id = ${id} AND (${all} OR c.owner_id = ${user.id})
      ORDER BY u.display_name, c.name`;
    return { characters };
  });
}
