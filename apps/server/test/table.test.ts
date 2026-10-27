import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { ORIGIN, as, campaignWith, type Client, useApp } from "./helpers.ts";

const ctx = useApp();
let base = "";
const sockets: WebSocket[] = [];

beforeAll(async () => {
  const address = await ctx.app.listen({ port: 0, host: "127.0.0.1" });
  base = address.replace("http", "ws");
});
afterAll(() => sockets.forEach((s) => s.close()));

type Msg = { type: string; [k: string]: unknown };

/** Socket que acumula lo que recibe; `next(pred)` espera el primer mensaje nuevo que cumpla. */
async function connect(campaignId: string, who: Client, origin = ORIGIN) {
  const ws = new WebSocket(`${base}/ws/campaigns/${campaignId}`, { headers: { cookie: who.cookie, origin } });
  sockets.push(ws);
  const inbox: Msg[] = [];
  const waiters: { pred: (m: Msg) => boolean; resolve: (m: Msg) => void }[] = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString()) as Msg;
    inbox.push(m);
    const i = waiters.findIndex((w) => w.pred(m));
    if (i >= 0) waiters.splice(i, 1)[0]!.resolve(m);
  });
  const next = (pred: (m: Msg) => boolean) =>
    new Promise<Msg>((resolve, reject) => {
      waiters.push({ pred, resolve });
      setTimeout(() => reject(new Error("timeout esperando mensaje")), 3000);
    });
  const hello = await Promise.race([
    next((m) => m.type === "hello"),
    new Promise<never>((_, reject) => ws.once("error", reject)),
  ]);
  return { ws, inbox, next, hello, send: (m: object) => ws.send(JSON.stringify(m)) };
}

const isEvent = (pred: (e: Record<string, unknown>) => boolean) => (m: Msg) => m.type === "event" && pred(m.event as Record<string, unknown>);

/** Da tiempo a que lleguen (o no) los mensajes difundidos. */
const settle = () => new Promise((r) => setTimeout(r, 200));

describe("mesa en tiempo real", () => {
  it("rechaza otro origen, a no miembros y sin sesión antes del upgrade", async () => {
    const { id, dm } = await campaignWith(ctx.app);
    await expect(connect(id, dm, "https://malo.example")).rejects.toThrow(/403/);
    const { dm: outsider } = await campaignWith(ctx.app);
    await expect(connect(id, outsider)).rejects.toThrow(/404/);
    await expect(connect(id, { ...dm, cookie: "dndonline_session=falso" })).rejects.toThrow(/401/);
  });

  it("difunde el chat público a todos", async () => {
    const { id, dm, players } = await campaignWith(ctx.app, { player: 1 });
    const a = await connect(id, dm);
    const b = await connect(id, players[0]!);
    const got = b.next(isEvent((e) => e.body === "hola mesa"));
    a.send({ type: "chat.send", body: "hola mesa" });
    expect((await got).event).toMatchObject({ kind: "chat", displayName: "DM", visibility: "public" });
  });

  it("aísla susurros y tiradas privadas y secretas entre DM, jugadores y espectadores", async () => {
    const { id, dm, players, spectators } = await campaignWith(ctx.app, { player: 2, spectator: 1 });
    const d = await connect(id, dm);
    const roller = await connect(id, players[0]!);
    const other = await connect(id, players[1]!);
    const spec = await connect(id, spectators[0]!);

    roller.send({ type: "chat.send", body: "susurro secreto", visibility: "private" });
    roller.send({ type: "dice.roll", formula: "1d20+5", visibility: "private" });
    roller.send({ type: "dice.roll", formula: "1d20", visibility: "blind" });

    // Las dos esperas se registran antes de que llegue nada; el que tira puede recibirla antes que el DM.
    const [blindForDm, blindForRoller] = await Promise.all([
      d.next(isEvent((e) => e.visibility === "blind")),
      roller.next(isEvent((e) => e.visibility === "blind")),
    ]);
    expect(blindForDm.event).toMatchObject({ total: expect.any(Number) });
    expect(blindForRoller.event).toMatchObject({ total: null, results: null });
    await settle();

    expect(d.inbox.filter((m) => m.type === "event")).toHaveLength(3);
    expect(roller.inbox.filter((m) => m.type === "event")).toHaveLength(3);
    for (const outsider of [other, spec]) {
      expect(outsider.inbox.filter((m) => m.type === "event")).toHaveLength(0);
      expect(JSON.stringify(outsider.inbox)).not.toContain("susurro secreto");
    }

    // El historial pasa por el mismo filtro al reconectar.
    const again = await connect(id, players[1]!);
    expect(again.hello.history).toEqual([]);
    const rollerAgain = await connect(id, players[0]!);
    const blind = (rollerAgain.hello.history as Record<string, unknown>[]).find((e) => e.visibility === "blind");
    expect(blind).toMatchObject({ total: null, results: null, discarded: null });
  });

  it("los espectadores chatean pero no tiran dados", async () => {
    const { id, spectators } = await campaignWith(ctx.app, { spectator: 1 });
    const s = await connect(id, spectators[0]!);
    s.send({ type: "dice.roll", formula: "1d20" });
    expect(await s.next((m) => m.type === "error")).toEqual({ type: "error", error: "forbidden" });
  });

  it("la tirada la decide el servidor y respeta la fórmula", async () => {
    const { id, dm } = await campaignWith(ctx.app);
    const d = await connect(id, dm);
    d.send({ type: "dice.roll", formula: "3d6+2", mode: "advantage" });
    const { event } = (await d.next(isEvent((e) => e.kind === "roll"))) as unknown as { event: { total: number; results: { values: number[] }[]; discarded: null } };
    expect(event.results[0]!.values).toHaveLength(3);
    expect(event.total).toBe(event.results[0]!.values.reduce((a, v) => a + v, 2));
    expect(event.discarded).toBeNull(); // la ventaja solo aplica a 1d20

    d.send({ type: "dice.roll", formula: "1000d6" });
    expect(await d.next((m) => m.type === "error")).toEqual({ type: "error", error: "invalid_formula" });
  });

  it("al expulsar a alguien, su siguiente mensaje cierra el socket", async () => {
    const { id, dm, players } = await campaignWith(ctx.app, { player: 1 });
    const p = await connect(id, players[0]!);
    await as(ctx.app, dm).delete(`/api/campaigns/${id}/members/${players[0]!.id}`);
    const closed = new Promise<number>((r) => p.ws.on("close", (code) => r(code)));
    p.send({ type: "chat.send", body: "sigo aquí" });
    expect(await closed).toBe(4403);
  });

  it("limita la frecuencia por conexión y rechaza basura", async () => {
    const { id, dm } = await campaignWith(ctx.app);
    const d = await connect(id, dm);
    d.send({ type: "nada" });
    expect(await d.next((m) => m.type === "error")).toEqual({ type: "error", error: "invalid_input" });
    for (let i = 0; i < 15; i++) d.send({ type: "chat.send", body: `spam ${i}` });
    expect(await d.next((m) => m.error === "rate_limited")).toBeTruthy();
  });
});
