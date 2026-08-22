import { supabase } from "./supabase";
import type { Database } from "./database.types";
import type {
  BoardEntity,
  EntityKind,
  EntitySize,
  GridPos,
} from "@/engine/board";

export type EntityRow = Database["public"]["Tables"]["entities"]["Row"];

export function toBoardEntity(r: EntityRow): BoardEntity {
  return {
    id: r.id,
    kind: r.kind as EntityKind,
    name: r.name,
    pos: { col: r.col, row: r.row },
    size: Math.min(4, Math.max(1, r.size)) as EntitySize,
    hp: r.hp ?? undefined,
    hpMax: r.hp_max ?? undefined,
    visible: r.visible,
    color: r.color ?? undefined,
    characterId: r.character_id ?? undefined,
  };
}

export async function listEntities(roomId: string): Promise<BoardEntity[]> {
  const { data, error } = await supabase
    .from("entities")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toBoardEntity);
}

export type CreateEntityInput = {
  roomId: string;
  kind: EntityKind;
  name: string;
  pos: GridPos;
  size?: EntitySize;
  hp?: number;
  hpMax?: number;
  visible?: boolean;
  characterId?: string;
  color?: string;
};

export async function createEntity(
  input: CreateEntityInput,
): Promise<BoardEntity> {
  const { data, error } = await supabase
    .from("entities")
    .insert({
      room_id: input.roomId,
      kind: input.kind,
      name: input.name,
      col: input.pos.col,
      row: input.pos.row,
      size: input.size ?? 1,
      hp: input.hp ?? null,
      hp_max: input.hpMax ?? null,
      visible: input.visible ?? true,
      character_id: input.characterId ?? null,
      color: input.color ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toBoardEntity(data);
}

export async function updateEntityPosition(
  id: string,
  pos: GridPos,
): Promise<void> {
  const { error } = await supabase
    .from("entities")
    .update({ col: pos.col, row: pos.row })
    .eq("id", id);
  if (error) throw error;
}

export async function updateEntity(
  id: string,
  patch: Partial<{
    name: string;
    hp: number | null;
    hpMax: number | null;
    visible: boolean;
    size: EntitySize;
    color: string | null;
  }>,
): Promise<void> {
  const update: Database["public"]["Tables"]["entities"]["Update"] = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.hp !== undefined) update.hp = patch.hp;
  if (patch.hpMax !== undefined) update.hp_max = patch.hpMax;
  if (patch.visible !== undefined) update.visible = patch.visible;
  if (patch.size !== undefined) update.size = patch.size;
  if (patch.color !== undefined) update.color = patch.color;

  const { error } = await supabase.from("entities").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteEntity(id: string): Promise<void> {
  const { error } = await supabase.from("entities").delete().eq("id", id);
  if (error) throw error;
}
