import { emptyCharacterSheet } from "@dndonline/engine/character";
import { describe, expect, it } from "vitest";
import { as, campaignWith, register, useApp } from "./helpers.ts";

const ctx = useApp();

const sheet = () => emptyCharacterSheet();

describe("personajes", () => {
  it("el dueño crea, lista, lee, edita y borra su personaje", async () => {
    const me = await register(ctx.app);
    const created = await as(ctx.app, me).post("/api/characters", { name: "Aria", sheet: sheet() });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();

    const { characters } = (await as(ctx.app, me).get("/api/characters")).json();
    expect(characters).toEqual([expect.objectContaining({ id, name: "Aria", className: "Guerrero", level: 1, campaignId: null })]);

    const edited = { ...sheet(), identity: { ...sheet().identity, level: 3 } };
    expect((await as(ctx.app, me).patch(`/api/characters/${id}`, { name: "Aria la Roja", sheet: edited })).statusCode).toBe(200);
    const read = (await as(ctx.app, me).get(`/api/characters/${id}`)).json();
    expect(read).toMatchObject({ canEdit: true, character: { name: "Aria la Roja", sheet: { identity: { level: 3 } } } });

    // Un PATCH parcial no toca lo demás.
    await as(ctx.app, me).patch(`/api/characters/${id}`, { name: "Aria" });
    expect((await as(ctx.app, me).get(`/api/characters/${id}`)).json().character.sheet.identity.level).toBe(3);

    expect((await as(ctx.app, me).delete(`/api/characters/${id}`)).statusCode).toBe(200);
    expect((await as(ctx.app, me).get(`/api/characters/${id}`)).statusCode).toBe(404);
  });

  it("rechaza fichas inválidas y descarta claves desconocidas", async () => {
    const me = await register(ctx.app);
    const bad = [
      { ...sheet(), version: 2 },
      { ...sheet(), identity: { ...sheet().identity, level: 0 } },
      { ...sheet(), abilities: { ...sheet().abilities, str: 31 } },
      { ...sheet(), combat: { ...sheet().combat, hp: 11, hpMax: 10 } },
      { ...sheet(), identity: { ...sheet().identity, avatarUrl: "javascript:alert(1)" } },
      { ...sheet(), identity: { ...sheet().identity, avatarUrl: "http://sin-tls.example/a.png" } },
    ];
    for (const s of bad) expect((await as(ctx.app, me).post("/api/characters", { name: "X", sheet: s })).statusCode).toBe(400);
    expect((await as(ctx.app, me).post("/api/characters", { name: "   ", sheet: sheet() })).statusCode).toBe(400);

    const withJunk = { ...sheet(), isAdmin: true, identity: { ...sheet().identity, avatarUrl: "https://example.com/a.png", extra: "x" } };
    const { id } = (await as(ctx.app, me).post("/api/characters", { name: "Limpio", sheet: withJunk })).json();
    const stored = (await as(ctx.app, me).get(`/api/characters/${id}`)).json().character.sheet;
    expect(stored).not.toHaveProperty("isAdmin");
    expect(stored.identity).not.toHaveProperty("extra");
    expect(stored.identity.avatarUrl).toBe("https://example.com/a.png");
  });

  it("nadie ajeno ve, edita ni borra un personaje: 404", async () => {
    const me = await register(ctx.app);
    const other = await register(ctx.app);
    const { id } = (await as(ctx.app, me).post("/api/characters", { name: "Secreto", sheet: sheet() })).json();
    expect((await as(ctx.app, other).get(`/api/characters/${id}`)).statusCode).toBe(404);
    expect((await as(ctx.app, other).patch(`/api/characters/${id}`, { name: "Robado" })).statusCode).toBe(404);
    expect((await as(ctx.app, other).delete(`/api/characters/${id}`)).statusCode).toBe(404);
    expect((await as(ctx.app, other).get("/api/characters")).json().characters).toEqual([]);
  });

  it("en una campaña, el DM ve la ficha pero no la edita; los demás jugadores no la ven", async () => {
    const { id: campaignId, dm, players, spectators } = await campaignWith(ctx.app, { player: 2, spectator: 1 });
    const [owner, otherPlayer] = players as [typeof dm, typeof dm];
    const { id } = (await as(ctx.app, owner).post("/api/characters", { name: "Bram", sheet: sheet(), campaignId })).json();

    const asDm = (await as(ctx.app, dm).get(`/api/characters/${id}`)).json();
    expect(asDm).toMatchObject({ canEdit: false, character: { name: "Bram", campaignId, ownerName: "player0" } });
    expect((await as(ctx.app, dm).patch(`/api/characters/${id}`, { name: "Otro" })).statusCode).toBe(403);
    expect((await as(ctx.app, dm).delete(`/api/characters/${id}`)).statusCode).toBe(403);

    expect((await as(ctx.app, otherPlayer).get(`/api/characters/${id}`)).statusCode).toBe(404);
    expect((await as(ctx.app, spectators[0]!).get(`/api/characters/${id}`)).statusCode).toBe(404);

    // Listado de la campaña: el DM ve todos; cada jugador, solo los suyos.
    await as(ctx.app, otherPlayer).post("/api/characters", { name: "Cora", sheet: sheet(), campaignId });
    const names = async (who: typeof dm) =>
      ((await as(ctx.app, who).get(`/api/campaigns/${campaignId}/characters`)).json().characters as { name: string }[]).map((c) => c.name).sort();
    expect(await names(dm)).toEqual(["Bram", "Cora"]);
    expect(await names(owner)).toEqual(["Bram"]);
    expect(await names(spectators[0]!)).toEqual([]);
  });

  it("solo se lleva un personaje a campañas donde se juega", async () => {
    const { id: campaignId, spectators } = await campaignWith(ctx.app, { spectator: 1 });
    const outsider = await register(ctx.app);
    const mine = (await as(ctx.app, outsider).post("/api/characters", { name: "Intruso", sheet: sheet() })).json();
    expect((await as(ctx.app, outsider).post("/api/characters", { name: "X", sheet: sheet(), campaignId })).statusCode).toBe(404);
    expect((await as(ctx.app, outsider).patch(`/api/characters/${mine.id}`, { campaignId })).statusCode).toBe(404);
    expect((await as(ctx.app, spectators[0]!).post("/api/characters", { name: "X", sheet: sheet(), campaignId })).statusCode).toBe(403);
  });

  it("al expulsar a un jugador, su personaje sale de la campaña y el DM deja de verlo", async () => {
    const { id: campaignId, dm, players } = await campaignWith(ctx.app, { player: 1 });
    const { id } = (await as(ctx.app, players[0]!).post("/api/characters", { name: "Dara", sheet: sheet(), campaignId })).json();
    expect((await as(ctx.app, dm).get(`/api/characters/${id}`)).statusCode).toBe(200);

    await as(ctx.app, dm).delete(`/api/campaigns/${campaignId}/members/${players[0]!.id}`);
    expect((await as(ctx.app, dm).get(`/api/characters/${id}`)).statusCode).toBe(404);
    expect((await as(ctx.app, players[0]!).get(`/api/characters/${id}`)).json().character.campaignId).toBeNull();
  });
});
