import WebSocket from "ws";
import { ORIGIN, type Client } from "./helpers.ts";

export type Msg = { type: string; [k: string]: unknown };

const open: WebSocket[] = [];
export const closeAll = () => open.forEach((s) => s.close());

/** Socket de la mesa que acumula lo que recibe; `next(pred)` espera el primer mensaje nuevo que cumpla. */
export async function connectTable(base: string, campaignId: string, who: Client, origin = ORIGIN) {
  const ws = new WebSocket(`${base}/ws/campaigns/${campaignId}`, { headers: { cookie: who.cookie, origin } });
  open.push(ws);
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
  const hello = await Promise.race([next((m) => m.type === "hello"), new Promise<never>((_, reject) => ws.once("error", reject))]);
  return { ws, inbox, next, hello, send: (m: object) => ws.send(JSON.stringify(m)) };
}
