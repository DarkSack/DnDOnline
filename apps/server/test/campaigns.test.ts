import { describe, expect, it } from "vitest";
import { as, campaignWith, register, useApp } from "./helpers.ts";

const ctx = useApp();

describe("campañas", () => {
  it("quien crea la campaña es su DM y la ve en su lista", async () => {
    const dm = await register(ctx.app);
    const created = await as(ctx.app, dm).post("/api/campaigns", { name: "La Cripta" });
    expect(created.statusCode).toBe(201);
    const { campaigns } = (await as(ctx.app, dm).get("/api/campaigns")).json();
    expect(campaigns).toEqual([expect.objectContaining({ id: created.json().id, name: "La Cripta", role: "dm" })]);
  });

  it("un no miembro recibe 404, no 403", async () => {
    const { id } = await campaignWith(ctx.app);
    const outsider = await register(ctx.app);
    expect((await as(ctx.app, outsider).get(`/api/campaigns/${id}`)).statusCode).toBe(404);
  });

  it("el jugador entra con invitación pero no puede invitar", async () => {
    const { id, players } = await campaignWith(ctx.app, { player: 1 });
    const detail = (await as(ctx.app, players[0]!).get(`/api/campaigns/${id}`)).json();
    expect(detail.role).toBe("player");
    expect((await as(ctx.app, players[0]!).post(`/api/campaigns/${id}/invites`)).statusCode).toBe(403);
  });

  it("respeta max_uses y la revocación", async () => {
    const { id, dm } = await campaignWith(ctx.app);
    const { invite } = (await as(ctx.app, dm).post(`/api/campaigns/${id}/invites`, { maxUses: 1 })).json();
    const a = await register(ctx.app);
    const b = await register(ctx.app);
    expect((await as(ctx.app, a).post(`/api/invites/${invite.code}/accept`)).statusCode).toBe(200);
    expect((await as(ctx.app, b).post(`/api/invites/${invite.code}/accept`)).statusCode).toBe(404);

    const { invite: other } = (await as(ctx.app, dm).post(`/api/campaigns/${id}/invites`)).json();
    await as(ctx.app, dm).delete(`/api/campaigns/${id}/invites/${other.code}`);
    expect((await as(ctx.app, b).post(`/api/invites/${other.code}/accept`)).statusCode).toBe(404);
  });

  it("aceptar dos veces no gasta otro uso", async () => {
    const { id, dm } = await campaignWith(ctx.app);
    const { invite } = (await as(ctx.app, dm).post(`/api/campaigns/${id}/invites`, { maxUses: 2 })).json();
    const a = await register(ctx.app);
    await as(ctx.app, a).post(`/api/invites/${invite.code}/accept`);
    await as(ctx.app, a).post(`/api/invites/${invite.code}/accept`);
    const [row] = await ctx.sql`SELECT uses FROM campaign_invites WHERE code = ${invite.code}`;
    expect(row!.uses).toBe(1);
  });

  it("el DM cambia roles y expulsa; nadie expulsa al propietario", async () => {
    const { id, dm, players } = await campaignWith(ctx.app, { player: 2 });
    const [p0, p1] = players as [typeof dm, typeof dm];
    expect((await as(ctx.app, dm).patch(`/api/campaigns/${id}/members/${p0.id}`, { role: "co_dm" })).statusCode).toBe(200);
    // El co-DM gestiona, pero no cambia roles ni toca al propietario.
    expect((await as(ctx.app, p0).patch(`/api/campaigns/${id}/members/${p1.id}`, { role: "co_dm" })).statusCode).toBe(403);
    expect((await as(ctx.app, p0).delete(`/api/campaigns/${id}/members/${dm.id}`)).statusCode).toBe(404);
    expect((await as(ctx.app, p0).delete(`/api/campaigns/${id}/members/${p1.id}`)).statusCode).toBe(200);
    expect((await as(ctx.app, p1).get(`/api/campaigns/${id}`)).statusCode).toBe(404);
  });

  it("deja rastro en la auditoría sin datos sensibles", async () => {
    const { id, dm } = await campaignWith(ctx.app, { player: 1 });
    const rows = await ctx.sql`SELECT action, data FROM audit_log WHERE target = ${id} ORDER BY id`;
    expect(rows.map((r) => r.action)).toEqual(["campaign.create", "invite.create", "campaign.join"]);
    expect(JSON.stringify(rows)).not.toContain(dm.cookie);
  });
});
