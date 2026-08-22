import { supabase } from "./supabase";
import type { Database } from "./database.types";
import type { CharacterSheet } from "@/engine/character";
import { isCharacterSheet } from "@/engine/character";

export type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];

export type Character = Omit<CharacterRow, "sheet"> & {
  sheet: CharacterSheet;
};

function hydrate(row: CharacterRow): Character {
  const sheet = isCharacterSheet(row.sheet) ? row.sheet : null;
  if (!sheet) {
    throw new Error(
      `Character ${row.id} tiene un sheet con formato inválido o versión no soportada.`,
    );
  }
  return { ...row, sheet };
}

export async function listMyCharacters(ownerId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(hydrate);
}

export async function getCharacter(id: string): Promise<Character | null> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrate(data) : null;
}

export async function createCharacter(input: {
  ownerId: string;
  name: string;
  sheet: CharacterSheet;
}): Promise<Character> {
  const { data, error } = await supabase
    .from("characters")
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      sheet: input.sheet as unknown as Record<string, unknown>,
    })
    .select()
    .single();
  if (error) throw error;
  return hydrate(data);
}

export async function updateCharacter(
  id: string,
  patch: { name?: string; sheet?: CharacterSheet },
): Promise<Character> {
  const update: Database["public"]["Tables"]["characters"]["Update"] = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.sheet !== undefined)
    update.sheet = patch.sheet as unknown as Record<string, unknown>;

  const { data, error } = await supabase
    .from("characters")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return hydrate(data);
}

export async function deleteCharacter(id: string) {
  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) throw error;
}
