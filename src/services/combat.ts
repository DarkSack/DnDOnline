import { supabase } from "./supabase";
import type { Database } from "./database.types";
import type { Combatant, CombatState } from "@/engine/combat";

export type CombatRow = Database["public"]["Tables"]["combats"]["Row"];

function hydrate(row: CombatRow): CombatState {
  return {
    ...row,
    combatants: ((row.combatants as Combatant[] | null) ?? []).map((c) => ({
      entity_id: c.entity_id,
      name: c.name,
      initiative: c.initiative,
      bonus: c.bonus ?? 0,
      roll: c.roll ?? 0,
      order_idx: c.order_idx ?? 0,
    })),
  };
}

export async function getActiveCombat(
  roomId: string,
): Promise<CombatState | null> {
  const { data, error } = await supabase
    .from("combats")
    .select("*")
    .eq("room_id", roomId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrate(data) : null;
}

export type StartCombatInput = {
  roomId: string;
  participants: Array<{ entity_id: string; name: string; bonus: number }>;
};

export async function startCombat(
  input: StartCombatInput,
): Promise<CombatState> {
  const { data, error } = await supabase.rpc("start_combat", {
    p_room_id: input.roomId,
    p_participants: input.participants as unknown,
  });
  if (error) throw error;
  return hydrate(data as CombatRow);
}

/** UPDATE plano — RLS enforces DM. */
export async function saveCombat(state: CombatState): Promise<void> {
  const { error } = await supabase
    .from("combats")
    .update({
      round: state.round,
      current_turn_idx: state.current_turn_idx,
      combatants: state.combatants as unknown,
    })
    .eq("id", state.id);
  if (error) throw error;
}

export async function endCombat(id: string): Promise<void> {
  const { error } = await supabase
    .from("combats")
    .update({ active: false, ended_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
