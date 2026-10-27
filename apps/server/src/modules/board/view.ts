import { computeVisibleCells } from "@dndonline/engine/board";
import type { Sql } from "../../db/sql.ts";
import { can, type Role } from "../campaigns/permissions.ts";

export type Scene = { id: string; name: string; cols: number; rows: number; cellSize: number; fog: string[]; walls: string[]; imageVersion: number };
export type Token = {
  id: string;
  kind: "pc" | "npc" | "monster";
  name: string;
  col: number;
  row: number;
  size: number;
  hp: number | null;
  hpMax: number | null;
  visible: boolean;
  color: string | null;
  characterId: string | null;
  /** Dueño del personaje enlazado: puede mover la ficha. */
  ownerId: string | null;
};
export type BoardState = { scene: Scene | null; tokens: Token[] };

export type TokenView = Omit<Token, "ownerId"> & { canMove: boolean };
export type BoardView = {
  scene: (Omit<Scene, "imageVersion"> & { imageUrl: string | null }) | null;
  tokens: TokenView[];
  /** Celdas que ve quien mira; null = todas (DM, o escena sin paredes). */
  mask: string[] | null;
  manage: boolean;
};

export async function loadBoard(sql: Sql, campaignId: string): Promise<BoardState> {
  const [scene] = await sql<Scene[]>`
    SELECT s.id, s.name, s.cols, s.rows, s.cell_size AS "cellSize", s.fog, s.walls, s.image_version AS "imageVersion"
    FROM campaigns c JOIN scenes s ON s.id = c.active_scene_id WHERE c.id = ${campaignId}`;
  if (!scene) return { scene: null, tokens: [] };
  const tokens = await sql<Token[]>`
    SELECT t.id, t.kind, t.name, t.col, t."row", t.size, t.hp, t.hp_max AS "hpMax", t.visible, t.color,
           t.character_id AS "characterId", ch.owner_id AS "ownerId"
    FROM tokens t LEFT JOIN characters ch ON ch.id = t.character_id
    WHERE t.scene_id = ${scene.id} ORDER BY t.created_at`;
  return { scene, tokens };
}

/**
 * Única puerta por la que el tablero llega a un cliente, igual que viewFor con el chat.
 * Quien no gestiona el tablero no recibe fichas ocultas, en la niebla o fuera de la vista de los PC,
 * ni los PG de enemigos y NPC, ni paredes que no ve.
 */
export function boardViewFor({ scene, tokens }: BoardState, viewer: { userId: string; role: Role }): BoardView {
  const manage = can(viewer.role, "board.manage");
  if (!scene) return { scene: null, tokens: [], mask: null, manage };
  const { imageVersion, ...rest } = scene;
  const imageUrl = imageVersion > 0 ? `/api/scenes/${scene.id}/image?v=${imageVersion}` : null;
  const plays = can(viewer.role, "character.bring");
  const mine = (t: Token) => plays && t.ownerId === viewer.userId;
  const strip = ({ ownerId: _ownerId, ...t }: Token): Omit<Token, "ownerId"> => t;

  if (manage) {
    return { scene: { ...rest, imageUrl }, tokens: tokens.map((t) => ({ ...strip(t), canMove: true })), mask: null, manage };
  }

  const fog = new Set(scene.fog);
  const walls = new Set(scene.walls);
  // Visión compartida del grupo: desde cada PC visible. Sin paredes no hay sombras.
  const sources = tokens.filter((t) => t.kind === "pc" && t.visible).map((t) => ({ col: t.col, row: t.row }));
  const mask = walls.size ? computeVisibleCells(sources, walls, scene) : null;
  const seen = (key: string) => !fog.has(key) && (!mask || mask.has(key));

  return {
    scene: { ...rest, walls: scene.walls.filter(seen), imageUrl },
    tokens: tokens
      .filter((t) => mine(t) || (t.visible && seen(`${t.col},${t.row}`)))
      .map((t) => ({
        ...strip(t),
        ...(t.kind === "pc" ? {} : { hp: null, hpMax: null }),
        canMove: mine(t),
      })),
    mask: mask ? [...mask] : null,
    manage,
  };
}
