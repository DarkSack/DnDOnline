import { randomInt } from "node:crypto";
import { parseDiceFormula, rollExpression, type RolledGroup } from "@dndonline/engine/dice";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { z } from "zod";
import type { Sql } from "../../db/sql.ts";
import { HttpError, parse } from "../../http.ts";
import { authorize, can, roleIn, type Role } from "../campaigns/permissions.ts";
import { applyBoardMessage, boardMessages, isBoardMessage } from "../board/messages.ts";
import { boardViewFor, loadBoard } from "../board/view.ts";
import { requireUser } from "../identity/routes.ts";
import { viewFor, type TableEvent } from "./visibility.ts";

const ClientMessage = z.discriminatedUnion("type", [
  ...boardMessages,
  z.object({ type: z.literal("chat.send"), body: z.string().trim().min(1).max(2000), visibility: z.enum(["public", "private"]).default("public") }),
  z.object({
    type: z.literal("dice.roll"),
    formula: z.string().max(100),
    mode: z.enum(["normal", "advantage", "disadvantage"]).default("normal"),
    visibility: z.enum(["public", "private", "blind"]).default("public"),
  }),
]);

type Conn = { socket: WebSocket; userId: string; displayName: string; role: Role };

// Límite por conexión: ráfaga de 10 mensajes, recarga de 2 por segundo.
const BUCKET_SIZE = 10;
const REFILL_PER_MS = 2 / 1000;
const HISTORY = 50;

/**
 * shortcut: las salas viven en memoria de este proceso, así que hay una sola instancia del servidor.
 * Para escalar horizontalmente, publicar los eventos por Redis pub/sub y mantener aquí solo las conexiones locales.
 */
const rooms = new Map<string, Set<Conn>>();

const send = (socket: WebSocket, msg: unknown) => {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
};

/**
 * Relee los roles de todos los conectados antes de difundir: si a un co-DM lo bajan a jugador,
 * deja de recibir secretos aunque no haya mandado nada desde entonces. A quien ya no es miembro se le cierra.
 */
async function connsWithFreshRoles(sql: Sql, campaignId: string): Promise<Conn[]> {
  const room = rooms.get(campaignId);
  if (!room?.size) return [];
  const rows = await sql<{ userId: string; role: Role }[]>`
    SELECT user_id AS "userId", role FROM campaign_members WHERE campaign_id = ${campaignId}`;
  const roles = new Map(rows.map((r) => [r.userId, r.role]));
  for (const conn of room) {
    const role = roles.get(conn.userId);
    if (role) conn.role = role;
    else {
      room.delete(conn);
      conn.socket.close(4403, "forbidden");
    }
  }
  return [...room];
}

async function broadcast(sql: Sql, campaignId: string, event: TableEvent) {
  for (const conn of await connsWithFreshRoles(sql, campaignId)) {
    const visible = viewFor(event, conn);
    if (visible) send(conn.socket, { type: "event", event: visible });
  }
}

/** Manda a cada conectado su vista del tablero. Lo usan también las rutas HTTP de escenas. */
export async function broadcastBoard(sql: Sql, campaignId: string) {
  const conns = await connsWithFreshRoles(sql, campaignId);
  if (!conns.length) return;
  const state = await loadBoard(sql, campaignId);
  for (const conn of conns) send(conn.socket, { type: "board", board: boardViewFor(state, conn) });
}

function broadcastPresence(campaignId: string) {
  const conns = rooms.get(campaignId) ?? new Set();
  const users = [...new Map([...conns].map((c) => [c.userId, { id: c.userId, displayName: c.displayName, role: c.role }])).values()];
  for (const conn of conns) send(conn.socket, { type: "presence", users });
}

async function history(sql: Sql, campaignId: string): Promise<TableEvent[]> {
  const chats = await sql<{ id: string; userId: string; displayName: string; body: string; visibility: "public" | "private"; createdAt: Date }[]>`
    SELECT m.id::text, m.user_id AS "userId", u.display_name AS "displayName", m.body, m.visibility, m.created_at AS "createdAt"
    FROM chat_messages m JOIN users u ON u.id = m.user_id
    WHERE m.campaign_id = ${campaignId} ORDER BY m.id DESC LIMIT ${HISTORY}`;
  const rolls = await sql<
    { id: string; userId: string; displayName: string; formula: string; mode: "normal" | "advantage" | "disadvantage"; results: RolledGroup[]; discarded: number | null; total: number; visibility: "public" | "private" | "blind"; createdAt: Date }[]
  >`
    SELECT r.id::text, r.user_id AS "userId", u.display_name AS "displayName", r.formula, r.mode, r.results, r.discarded, r.total, r.visibility, r.created_at AS "createdAt"
    FROM dice_rolls r JOIN users u ON u.id = r.user_id
    WHERE r.campaign_id = ${campaignId} ORDER BY r.id DESC LIMIT ${HISTORY}`;
  const events: TableEvent[] = [
    ...chats.map((c) => ({ kind: "chat" as const, ...c, createdAt: c.createdAt.toISOString() })),
    ...rolls.map((r) => ({ kind: "roll" as const, ...r, createdAt: r.createdAt.toISOString() })),
  ];
  return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-HISTORY);
}

export async function tableRoutes(app: FastifyInstance, { sql, publicOrigin }: { sql: Sql; publicOrigin: string }) {
  app.get(
    "/ws/campaigns/:id",
    {
      websocket: true,
      // Todo se valida antes del upgrade: los fallos responden con HTTP normal.
      preValidation: async (req) => {
        // Sin esta comprobación, otra web podría abrir el socket con la cookie de la víctima.
        if (req.headers.origin !== publicOrigin) throw new HttpError(403, "bad_origin");
        const user = requireUser(req);
        const { id } = parse(z.object({ id: z.uuid() }), req.params);
        await authorize(sql, id, user.id, "campaign.read");
      },
    },
    async (socket, req) => {
      const user = req.user!;
      const { id: campaignId } = req.params as { id: string };
      const role = await roleIn(sql, campaignId, user.id);
      if (!role) return socket.close(4403, "forbidden");

      const conn: Conn = { socket, userId: user.id, displayName: user.displayName, role };
      let room = rooms.get(campaignId);
      if (!room) rooms.set(campaignId, (room = new Set()));
      room.add(conn);

      let tokens = BUCKET_SIZE;
      let last = Date.now();
      // Los mensajes se procesan en orden: una tirada no adelanta a un chat anterior.
      let queue = Promise.resolve();

      socket.on("message", (raw) => {
        queue = queue.then(() => handle(raw.toString())).catch((err) => {
          req.log.error(err);
          send(socket, { type: "error", error: "internal" });
        });
      });
      socket.on("close", () => {
        room.delete(conn);
        if (room.size === 0) rooms.delete(campaignId);
        broadcastPresence(campaignId);
      });

      send(socket, {
        type: "hello",
        role,
        history: (await history(sql, campaignId)).map((e) => viewFor(e, conn)).filter(Boolean),
        board: boardViewFor(await loadBoard(sql, campaignId), conn),
      });
      broadcastPresence(campaignId);

      async function handle(raw: string) {
        const now = Date.now();
        tokens = Math.min(BUCKET_SIZE, tokens + (now - last) * REFILL_PER_MS);
        last = now;
        if (tokens < 1) return send(socket, { type: "error", error: "rate_limited" });
        tokens -= 1;

        let msg: z.infer<typeof ClientMessage>;
        try {
          msg = ClientMessage.parse(JSON.parse(raw));
        } catch {
          return send(socket, { type: "error", error: "invalid_input" });
        }

        // Autorización por mensaje contra la base: un rol cambiado o una expulsión cuentan al instante.
        const current = await roleIn(sql, campaignId, user.id);
        if (!current) return socket.close(4403, "forbidden");
        conn.role = current;

        if (isBoardMessage(msg)) {
          const error = await applyBoardMessage(sql, campaignId, conn, msg);
          if (error) return send(socket, { type: "error", error });
          return broadcastBoard(sql, campaignId);
        }

        if (msg.type === "chat.send") {
          if (!can(current, "table.chat")) return send(socket, { type: "error", error: "forbidden" });
          const [row] = await sql<{ id: string; createdAt: Date }[]>`
            INSERT INTO chat_messages (campaign_id, user_id, body, visibility)
            VALUES (${campaignId}, ${user.id}, ${msg.body}, ${msg.visibility})
            RETURNING id::text, created_at AS "createdAt"`;
          await broadcast(sql, campaignId, {
            kind: "chat",
            id: row!.id,
            userId: user.id,
            displayName: user.displayName,
            body: msg.body,
            visibility: msg.visibility,
            createdAt: row!.createdAt.toISOString(),
          });
          return;
        }

        if (!can(current, "table.roll")) return send(socket, { type: "error", error: "forbidden" });
        const parsed = parseDiceFormula(msg.formula);
        if (!parsed.ok) return send(socket, { type: "error", error: "invalid_formula" });
        const outcome = rollExpression(parsed.expression, (sides) => randomInt(1, sides + 1), msg.mode);
        const [row] = await sql<{ id: string; createdAt: Date }[]>`
          INSERT INTO dice_rolls (campaign_id, user_id, formula, mode, results, discarded, total, visibility)
          VALUES (${campaignId}, ${user.id}, ${msg.formula}, ${msg.mode}, ${sql.json(outcome.results)}, ${outcome.discarded}, ${outcome.total}, ${msg.visibility})
          RETURNING id::text, created_at AS "createdAt"`;
        await broadcast(sql, campaignId, {
          kind: "roll",
          id: row!.id,
          userId: user.id,
          displayName: user.displayName,
          formula: msg.formula,
          mode: msg.mode,
          results: outcome.results,
          discarded: outcome.discarded,
          total: outcome.total,
          visibility: msg.visibility,
          createdAt: row!.createdAt.toISOString(),
        });
      }
    },
  );
}
