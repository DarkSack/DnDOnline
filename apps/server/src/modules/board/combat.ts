import { randomInt } from "node:crypto";
import { initiativeBonus, type CharacterSheet } from "@dndonline/engine/character";
import { addCombatant, currentCombatant, nextTurn, removeCombatant, sortCombatants, type Combatant, type CombatState } from "@dndonline/engine/combat";
import type postgres from "postgres";
import { z } from "zod";
import type { Sql } from "../../db/sql.ts";
import { can, type Role } from "../campaigns/permissions.ts";

type Tx = postgres.TransactionSql;

// Sin bonus, un PC usa el de su ficha (override o DES); el resto, 0.
const participant = z.object({ tokenId: z.uuid(), bonus: z.number().int().min(-20).max(20).optional() });

export const combatMessages = [
  z.object({ type: z.literal("combat.start"), participants: z.array(participant).min(1).max(50) }),
  z.object({ type: z.literal("combat.add"), participant }),
  // current: de quién creía el cliente que era el turno. Si ya cambió, no se avanza otra vez (doble clic, DM y jugador a la vez).
  z.object({ type: z.literal("combat.next"), current: z.uuid().optional() }),
  z.object({ type: z.literal("combat.remove"), tokenId: z.uuid() }),
  z.object({ type: z.literal("combat.end") }),
] as const;

export type CombatMessage = z.infer<(typeof combatMessages)[number]>;
export const isCombatMessage = (m: { type: string }): m is CombatMessage => m.type.startsWith("combat.");

export async function loadCombat(sql: Sql, campaignId: string, sceneId: string): Promise<CombatState | null> {
  const [row] = await sql<CombatState[]>`
    SELECT round, current_turn_idx, combatants FROM combats WHERE campaign_id = ${campaignId} AND scene_id = ${sceneId}`;
  return row ?? null;
}

// FOR UPDATE: dos DM pulsando a la vez no se pisan el estado.
const lock = async (tx: Tx, campaignId: string) =>
  (await tx<CombatState[]>`SELECT round, current_turn_idx, combatants FROM combats WHERE campaign_id = ${campaignId} FOR UPDATE`)[0];

const save = (tx: Tx, campaignId: string, s: CombatState) => tx`
  UPDATE combats SET round = ${s.round}, current_turn_idx = ${s.current_turn_idx}, combatants = ${tx.json(s.combatants)}
  WHERE campaign_id = ${campaignId}`;

/** Tira la iniciativa en el servidor: 1d20 + bonus. Las fichas tienen que estar en la escena. */
async function roll(tx: Tx, sceneId: string, list: z.infer<typeof participant>[]): Promise<Omit<Combatant, "order_idx">[] | string> {
  const ids = list.map((p) => p.tokenId);
  if (new Set(ids).size !== ids.length) return "invalid_input";
  const tokens = await tx<{ id: string; name: string; sheet: CharacterSheet | null }[]>`
    SELECT t.id, t.name, ch.sheet FROM tokens t LEFT JOIN characters ch ON ch.id = t.character_id
    WHERE t.scene_id = ${sceneId} AND t.id = ANY(${ids}::uuid[])`;
  if (tokens.length !== ids.length) return "not_found";
  const byId = new Map(tokens.map((t) => [t.id, t]));
  return list.map((p) => {
    const t = byId.get(p.tokenId)!;
    const bonus = p.bonus ?? (t.sheet ? initiativeBonus(t.sheet) : 0);
    const d20 = randomInt(1, 21);
    return { entity_id: t.id, name: t.name, bonus, roll: d20, initiative: d20 + bonus };
  });
}

/** Saca una ficha borrada del combate, conservando de quién es el turno. */
export const dropFromCombat = (sql: Sql, campaignId: string, tokenId: string) =>
  sql.begin(async (tx) => {
    const state = await lock(tx, campaignId);
    if (state?.combatants.some((c) => c.entity_id === tokenId)) await save(tx, campaignId, removeCombatant(state, tokenId));
  });

/**
 * DM y co-DM dirigen el combate de la escena activa. Un jugador solo puede pasar el turno cuando es el de una ficha suya.
 * Devuelve un código de error o null si hubo cambio.
 */
export function applyCombatMessage(sql: Sql, campaignId: string, sceneId: string, viewer: { userId: string; role: Role }, msg: CombatMessage) {
  const manage = can(viewer.role, "board.manage");
  return sql.begin(async (tx): Promise<string | null> => {
    if (msg.type === "combat.start") {
      if (!manage) return "forbidden";
      const rolled = await roll(tx, sceneId, msg.participants);
      if (typeof rolled === "string") return rolled;
      const combatants = sortCombatants(rolled.map((c, i) => ({ ...c, order_idx: i })));
      const created = await tx`
        INSERT INTO combats (campaign_id, scene_id, combatants) VALUES (${campaignId}, ${sceneId}, ${tx.json(combatants)})
        ON CONFLICT (campaign_id) DO NOTHING RETURNING 1`;
      return created.length ? null : "combat_active";
    }

    const state = await lock(tx, campaignId);
    if (!state) return "no_combat";

    if (msg.type === "combat.next") {
      const current = currentCombatant(state);
      if (!manage) {
        const [owner] = current
          ? await tx<{ ownerId: string }[]>`
              SELECT ch.owner_id AS "ownerId" FROM tokens t JOIN characters ch ON ch.id = t.character_id WHERE t.id = ${current.entity_id}`
          : [];
        if (!can(viewer.role, "character.bring") || owner?.ownerId !== viewer.userId) return "forbidden";
      }
      if (msg.current && current?.entity_id !== msg.current) return "stale_turn";
      await save(tx, campaignId, nextTurn(state));
      return null;
    }

    if (!manage) return "forbidden";
    if (msg.type === "combat.end") {
      await tx`DELETE FROM combats WHERE campaign_id = ${campaignId}`;
      return null;
    }
    if (msg.type === "combat.remove") {
      if (!state.combatants.some((c) => c.entity_id === msg.tokenId)) return "not_found";
      await save(tx, campaignId, removeCombatant(state, msg.tokenId));
      return null;
    }
    if (state.combatants.some((c) => c.entity_id === msg.participant.tokenId)) return "invalid_input";
    const rolled = await roll(tx, sceneId, [msg.participant]);
    if (typeof rolled === "string") return rolled;
    await save(tx, campaignId, addCombatant(state, rolled[0]!));
    return null;
  });
}
