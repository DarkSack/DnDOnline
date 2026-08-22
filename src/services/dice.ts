import { supabase } from "./supabase";
import type { Database } from "./database.types";
import type {
  DiceExpression,
  RollResults,
} from "@/engine/dice";

export type DiceRollRow = Database["public"]["Tables"]["dice_rolls"]["Row"];

export type DiceRoll = Omit<DiceRollRow, "results"> & {
  results: RollResults;
  actor: { id: string; username: string | null } | null;
};

type DiceRollRowWithProfile = DiceRollRow & {
  profiles: { id: string; username: string | null } | null;
};

function hydrate(row: DiceRollRowWithProfile | DiceRollRow): DiceRoll {
  const withProfile = row as DiceRollRowWithProfile;
  return {
    ...row,
    results: (row.results as RollResults) ?? [],
    actor: withProfile.profiles ?? null,
  };
}

export async function rollDice(input: {
  roomId: string;
  formula: string;
  expression: DiceExpression;
}): Promise<DiceRoll> {
  const { data, error } = await supabase.rpc("roll_dice", {
    p_room_id: input.roomId,
    p_formula: input.formula,
    p_dice: input.expression.groups as unknown,
    p_modifier: input.expression.modifier,
  });
  if (error) throw error;
  // La RPC devuelve la fila sin embed de profile — la reconstruimos con
  // los datos que ya tenemos vía useAuth, pero al llegar por realtime
  // sí tendrá profile hidratado.
  return hydrate(data as DiceRollRow);
}

export async function listRecentRolls(
  roomId: string,
  limit = 30,
): Promise<DiceRoll[]> {
  const { data, error } = await supabase
    .from("dice_rolls")
    .select("*, profiles:actor_id(id, username)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => hydrate(r as DiceRollRowWithProfile));
}

export async function fetchRollById(id: string): Promise<DiceRoll | null> {
  const { data, error } = await supabase
    .from("dice_rolls")
    .select("*, profiles:actor_id(id, username)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrate(data as DiceRollRowWithProfile) : null;
}
