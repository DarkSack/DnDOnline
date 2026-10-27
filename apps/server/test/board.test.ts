import { emptyCharacterSheet } from "@dndonline/engine/character";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ORIGIN, as, campaignWith, register, type Client, useApp } from "./helpers.ts";
import { closeAll, connectTable, type Msg } from "./ws.ts";

const ctx = useApp();
let base = "";

beforeAll(async () => {
  const address = await ctx.app.listen({ port: 0, host: "127.0.0.1" });
  base = address.replace("http", "ws");
});
afterAll(closeAll);

type TokenView = { id: string; name: string; col: number; row: number; hp: number | null; visible: boolean; canMove: boolean };
type Board = { scene: { id: string; fog: string[]; walls: string[]; imageUrl: string | null } | null; tokens: TokenView[]; mask: string[] | null; manage: boolean };
const boardOf = (m: Msg) => m.board as Board;
const names = (b: Board) => b.tokens.map((t) => t.name).sort();

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const putImage = (who: Client, sceneId: string, body: Buffer, type = "image/png") =>
  ctx.app.inject({ method: "PUT", url: `/api/scenes/${sceneId}/image`, headers: { origin: ORIGIN, cookie: who.cookie, "content-type": type }, payload: body });

/** Campaña con escena activa de 10×10, el DM conectado y un jugador con su personaje en la campaña. */
async function table(extra: { spectator?: number } = {}) {
  const c = await campaignWith(ctx.app, { player: 2, ...extra });
  const { id: sceneId } = (await as(ctx.app, c.dm).post(`/api/campaigns/${c.id}/scenes`, { name: "Cripta", cols: 10, rows: 10 })).json();
  const dm = await connectTable(base, c.id, c.dm);
  /** Manda un mensaje del DM y espera su tablero resultante. */
  const dmDo = async (msg: object, until: (b: Board) => boolean = () => true) => {
    const got = dm.next((m) => m.type === "board" && until(boardOf(m)));
    dm.send(msg);
    return boardOf(await got);
  };
  await dmDo({ type: "scene.activate", sceneId });
  const player = c.players[0]!;
  const { id: characterId } = (
    await as(ctx.app, player).post("/api/characters", { name: "Aria", sheet: emptyCharacterSheet(), campaignId: c.id })
  ).json();
  return { ...c, sceneId, ws: dm, dmDo, player, characterId };
}

describe("tablero", () => {
  it("el jugador no recibe fichas ocultas, ni en la niebla, ni los PG de enemigos", async () => {
    const t = await table();
    await t.dmDo({ type: "token.create", kind: "monster", name: "Goblin", col: 1, row: 1, hp: 7 });
    let b = await t.dmDo({ type: "token.create", kind: "monster", name: "Orco", col: 2, row: 2, hp: 15 });
    const orc = b.tokens.find((x) => x.name === "Orco")!;
    await t.dmDo({ type: "token.update", tokenId: orc.id, visible: false });
    await t.dmDo({ type: "token.create", kind: "monster", name: "Bandido", col: 5, row: 5, hp: 11 });
    b = await t.dmDo({ type: "scene.paint", layer: "fog", cells: ["5,5"], on: true });

    expect(names(b)).toEqual(["Bandido", "Goblin", "Orco"]);
    expect(b.tokens.find((x) => x.name === "Goblin")!.hp).toBe(7);

    const p = await connectTable(base, t.id, t.player);
    const seen = boardOf(p.hello);
    expect(names(seen)).toEqual(["Goblin"]);
    expect(seen.tokens[0]).toMatchObject({ hp: null, canMove: false });
    expect(seen.manage).toBe(false);
    expect(JSON.stringify(p.inbox)).not.toMatch(/Orco|Bandido/);
  });

  it("las paredes tapan lo que los PC no ven", async () => {
    const t = await table();
    await t.dmDo({ type: "token.create", kind: "pc", name: "Aria", col: 0, row: 0, characterId: t.characterId });
    await t.dmDo({ type: "token.create", kind: "monster", name: "Lobo", col: 5, row: 0 });
    const wall = Array.from({ length: 10 }, (_, row) => `2,${row}`);
    await t.dmDo({ type: "scene.paint", layer: "walls", cells: wall, on: true });

    const p = await connectTable(base, t.id, t.player);
    const seen = boardOf(p.hello);
    expect(names(seen)).toEqual(["Aria"]);
    expect(seen.mask).toContain("0,0");
    expect(seen.mask).not.toContain("5,0");
    expect(JSON.stringify(p.inbox)).not.toContain("Lobo");

    // Sin paredes, el lobo aparece.
    const visible = p.next((m) => m.type === "board" && names(boardOf(m)).includes("Lobo"));
    t.ws.send({ type: "scene.clear", layer: "walls" });
    expect(boardOf(await visible).mask).toBeNull();
  });

  it("cada jugador mueve solo sus fichas y no gestiona el tablero", async () => {
    const t = await table({ spectator: 1 });
    await t.dmDo({ type: "token.create", kind: "pc", name: "Aria", col: 0, row: 0, characterId: t.characterId });
    const b = await t.dmDo({ type: "token.create", kind: "monster", name: "Goblin", col: 3, row: 3 });
    const aria = b.tokens.find((x) => x.name === "Aria")!;
    const goblin = b.tokens.find((x) => x.name === "Goblin")!;

    const p = await connectTable(base, t.id, t.player);
    expect(boardOf(p.hello).tokens.find((x) => x.id === aria.id)!.canMove).toBe(true);
    const moved = p.next((m) => m.type === "board" && boardOf(m).tokens.some((x) => x.id === aria.id && x.col === 4));
    p.send({ type: "token.update", tokenId: aria.id, col: 4, row: 1 });
    await moved;

    const error = () => p.next((m) => m.type === "error");
    for (const msg of [
      { type: "token.update", tokenId: goblin.id, col: 1, row: 1 },
      { type: "token.update", tokenId: aria.id, visible: false },
      { type: "token.create", kind: "monster", name: "X", col: 0, row: 0 },
      { type: "token.delete", tokenId: goblin.id },
      { type: "scene.paint", layer: "fog", cells: ["0,0"], on: true },
      { type: "scene.activate", sceneId: null },
    ]) {
      const got = error();
      p.send(msg);
      expect(await got).toEqual({ type: "error", error: "forbidden" });
    }
    const outside = error();
    p.send({ type: "token.update", tokenId: aria.id, col: 10, row: 0 });
    expect(await outside).toEqual({ type: "error", error: "invalid_input" });

    // El otro jugador y el espectador no mueven la ficha de Aria.
    for (const who of [t.players[1]!, t.spectators[0]!]) {
      const s = await connectTable(base, t.id, who);
      const got = s.next((m) => m.type === "error");
      s.send({ type: "token.update", tokenId: aria.id, col: 0, row: 0 });
      expect(await got).toEqual({ type: "error", error: "forbidden" });
    }
  });

  it("un PC solo enlaza personajes de esta campaña", async () => {
    const t = await table();
    const outsider = await register(ctx.app);
    const { id: foreign } = (await as(ctx.app, outsider).post("/api/characters", { name: "Ajeno", sheet: emptyCharacterSheet() })).json();
    const got = t.ws.next((m) => m.type === "error");
    t.ws.send({ type: "token.create", kind: "pc", name: "Ajeno", col: 0, row: 0, characterId: foreign });
    expect(await got).toEqual({ type: "error", error: "not_found" });
  });

  it("solo el DM y el co-DM gestionan escenas", async () => {
    const t = await table();
    expect((await as(ctx.app, t.player).get(`/api/campaigns/${t.id}/scenes`)).statusCode).toBe(403);
    expect((await as(ctx.app, t.player).post(`/api/campaigns/${t.id}/scenes`, { name: "X" })).statusCode).toBe(403);
    expect((await as(ctx.app, t.player).patch(`/api/scenes/${t.sceneId}`, { name: "X" })).statusCode).toBe(403);
    expect((await as(ctx.app, t.player).delete(`/api/scenes/${t.sceneId}`)).statusCode).toBe(403);
    const { scenes } = (await as(ctx.app, t.dm).get(`/api/campaigns/${t.id}/scenes`)).json();
    expect(scenes).toEqual([expect.objectContaining({ id: t.sceneId, active: true, cols: 10 })]);
  });

  it("imágenes: solo PNG, JPEG o WebP reales; los jugadores solo ven la de la escena activa", async () => {
    const t = await table();
    const dm = t.dm;
    const { id: prepared } = (await as(ctx.app, dm).post(`/api/campaigns/${t.id}/scenes`, { name: "Preparada" })).json();

    expect((await putImage(dm, prepared, PNG)).statusCode).toBe(200);
    expect((await putImage(dm, prepared, PNG, "image/jpeg")).json()).toEqual({ error: "invalid_image" });
    expect((await putImage(dm, prepared, Buffer.from("<svg onload=alert(1)>"), "image/png")).statusCode).toBe(400);
    expect((await putImage(dm, prepared, PNG, "image/gif")).statusCode).toBe(415);
    expect((await putImage(dm, prepared, Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]))).json()).toEqual({ error: "too_large" });
    expect((await putImage(t.player, prepared, PNG)).statusCode).toBe(403);

    const asDm = await as(ctx.app, dm).get(`/api/scenes/${prepared}/image`);
    expect(asDm.statusCode).toBe(200);
    expect(asDm.headers["content-type"]).toBe("image/png");
    expect(asDm.headers["x-content-type-options"]).toBe("nosniff");
    expect((await as(ctx.app, t.player).get(`/api/scenes/${prepared}/image`)).statusCode).toBe(404);

    const shown = await t.dmDo({ type: "scene.activate", sceneId: prepared });
    expect(shown.scene!.imageUrl).toMatch(new RegExp(`/api/scenes/${prepared}/image\\?v=1$`));
    expect((await as(ctx.app, t.player).get(`/api/scenes/${prepared}/image`)).statusCode).toBe(200);
    const outsider = await register(ctx.app);
    expect((await as(ctx.app, outsider).get(`/api/scenes/${prepared}/image`)).statusCode).toBe(404);
  });

  it("al borrar la escena activa, la mesa se queda sin tablero", async () => {
    const t = await table();
    const p = await connectTable(base, t.id, t.player);
    expect(boardOf(p.hello).scene).not.toBeNull();
    const cleared = p.next((m) => m.type === "board" && boardOf(m).scene === null);
    expect((await as(ctx.app, t.dm).delete(`/api/scenes/${t.sceneId}`)).statusCode).toBe(200);
    await cleared;
  });
});
