import { z } from "zod";
import type { Sql } from "../../db/sql.ts";
import { can, type Role } from "../campaigns/permissions.ts";

const MAX_TOKENS = 300;
const coord = z.number().int().min(0).max(99);
const cell = z.string().regex(/^\d{1,2},\d{1,2}$/);
const layer = z.enum(["fog", "walls"]);

/** Mensajes del tablero por el socket de la mesa. Todos actúan sobre la escena activa de la campaña. */
export const boardMessages = [
  z.object({ type: z.literal("scene.activate"), sceneId: z.uuid().nullable() }),
  z.object({ type: z.literal("scene.paint"), layer, cells: z.array(cell).min(1).max(400), on: z.boolean() }),
  z.object({ type: z.literal("scene.clear"), layer }),
  z.object({
    type: z.literal("token.create"),
    kind: z.enum(["pc", "npc", "monster"]),
    name: z.string().trim().min(1).max(60),
    size: z.number().int().min(1).max(4).default(1),
    col: coord,
    row: coord,
    hp: z.number().int().min(0).max(9999).optional(),
    hpMax: z.number().int().min(1).max(9999).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    characterId: z.uuid().optional(),
  }),
  z.object({
    type: z.literal("token.update"),
    tokenId: z.uuid(),
    col: coord.optional(),
    row: coord.optional(),
    hp: z.number().int().min(0).max(9999).optional(),
    visible: z.boolean().optional(),
  }),
  z.object({ type: z.literal("token.delete"), tokenId: z.uuid() }),
] as const;

export type BoardMessage = z.infer<(typeof boardMessages)[number]>;
export const isBoardMessage = (m: { type: string }): m is BoardMessage => m.type.startsWith("scene.") || m.type.startsWith("token.");

/**
 * Aplica un mensaje del tablero si quien lo manda puede. Devuelve un código de error o null si hubo cambio.
 * Gestionar (DM, co-DM): todo. Jugadores: mover y cambiar los PG de las fichas de sus personajes.
 */
export async function applyBoardMessage(sql: Sql, campaignId: string, viewer: { userId: string; role: Role }, msg: BoardMessage): Promise<string | null> {
  const manage = can(viewer.role, "board.manage");
  if (msg.type === "scene.activate") {
    if (!manage) return "forbidden";
    const updated = await sql`
      UPDATE campaigns SET active_scene_id = ${msg.sceneId}
      WHERE id = ${campaignId} AND (${msg.sceneId}::uuid IS NULL OR EXISTS (SELECT 1 FROM scenes WHERE id = ${msg.sceneId} AND campaign_id = ${campaignId}))
      RETURNING 1`;
    return updated.length ? null : "not_found";
  }

  const [scene] = await sql<{ id: string; cols: number; rows: number }[]>`
    SELECT s.id, s.cols, s.rows FROM campaigns c JOIN scenes s ON s.id = c.active_scene_id WHERE c.id = ${campaignId}`;
  if (!scene) return "no_scene";
  const inGrid = (col: number, row: number) => col < scene.cols && row < scene.rows;

  if (msg.type === "scene.paint" || msg.type === "scene.clear") {
    if (!manage) return "forbidden";
    const column = sql(msg.layer);
    if (msg.type === "scene.clear") {
      await sql`UPDATE scenes SET ${column} = '{}' WHERE id = ${scene.id}`;
      return null;
    }
    const cells = msg.cells.filter((k) => {
      const [col, row] = k.split(",").map(Number) as [number, number];
      return inGrid(col, row);
    });
    if (msg.on) await sql`UPDATE scenes SET ${column} = ARRAY(SELECT DISTINCT unnest(${column} || ${cells}::text[])) WHERE id = ${scene.id}`;
    else await sql`UPDATE scenes SET ${column} = ARRAY(SELECT c FROM unnest(${column}) c WHERE c <> ALL(${cells}::text[])) WHERE id = ${scene.id}`;
    return null;
  }

  if (msg.type === "token.create") {
    if (!manage) return "forbidden";
    if (!inGrid(msg.col, msg.row)) return "invalid_input";
    const [count] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM tokens WHERE scene_id = ${scene.id}`;
    if (count!.n >= MAX_TOKENS) return "too_many";
    // Un PC solo puede enlazar un personaje que juega en esta campaña.
    if (msg.characterId) {
      const linked = await sql`SELECT 1 FROM characters WHERE id = ${msg.characterId} AND campaign_id = ${campaignId}`;
      if (!linked.length) return "not_found";
    }
    const hpMax = msg.hpMax ?? msg.hp ?? null;
    const hp = msg.hp === undefined ? hpMax : Math.min(msg.hp, hpMax ?? msg.hp);
    await sql`
      INSERT INTO tokens (scene_id, kind, name, col, "row", size, hp, hp_max, color, character_id)
      VALUES (${scene.id}, ${msg.kind}, ${msg.name}, ${msg.col}, ${msg.row}, ${msg.size}, ${hp}, ${hpMax},
              ${msg.color ?? null}, ${msg.characterId ?? null})`;
    return null;
  }

  const [token] = await sql<{ hpMax: number | null; ownerId: string | null }[]>`
    SELECT t.hp_max AS "hpMax", ch.owner_id AS "ownerId"
    FROM tokens t LEFT JOIN characters ch ON ch.id = t.character_id
    WHERE t.id = ${msg.tokenId} AND t.scene_id = ${scene.id}`;
  if (!token) return "not_found";

  if (msg.type === "token.delete") {
    if (!manage) return "forbidden";
    await sql`DELETE FROM tokens WHERE id = ${msg.tokenId}`;
    return null;
  }

  const controls = manage || (can(viewer.role, "character.bring") && token.ownerId === viewer.userId);
  if (!controls || (msg.visible !== undefined && !manage)) return "forbidden";
  if (!inGrid(msg.col ?? 0, msg.row ?? 0)) return "invalid_input";
  const hp = msg.hp === undefined ? undefined : Math.min(msg.hp, token.hpMax ?? msg.hp);
  await sql`
    UPDATE tokens SET
      col = ${msg.col ?? sql`col`},
      "row" = ${msg.row ?? sql`"row"`},
      hp = ${hp ?? sql`hp`},
      visible = ${msg.visible ?? sql`visible`}
    WHERE id = ${msg.tokenId}`;
  return null;
}
