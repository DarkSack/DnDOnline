import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type MapRow = Database["public"]["Tables"]["maps"]["Row"];

export type CampaignMap = MapRow & {
  /** URL pública (bucket público). null si no hay imagen. */
  backgroundUrl: string | null;
};

function toUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("maps").getPublicUrl(path);
  return data.publicUrl;
}

function hydrate(row: MapRow): CampaignMap {
  return { ...row, backgroundUrl: toUrl(row.background_path) };
}

export async function listMaps(campaignId: string): Promise<CampaignMap[]> {
  const { data, error } = await supabase
    .from("maps")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(hydrate);
}

export async function getMap(id: string): Promise<CampaignMap | null> {
  const { data, error } = await supabase
    .from("maps")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrate(data) : null;
}

/**
 * Sube un archivo al bucket 'maps' y crea la fila en public.maps.
 * Path convention: campaignId/<uuid>.<ext>
 */
export async function createMapFromFile(input: {
  campaignId: string;
  name: string;
  file: File;
  cols?: number;
  rows?: number;
  cellSize?: number;
}): Promise<CampaignMap> {
  const ext = input.file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${input.campaignId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("maps")
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type || undefined,
    });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("maps")
    .insert({
      campaign_id: input.campaignId,
      name: input.name,
      background_path: path,
      cols: input.cols ?? 30,
      rows: input.rows ?? 30,
      cell_size: input.cellSize ?? 64,
    })
    .select()
    .single();
  if (error) {
    // Rollback del blob si el insert falla.
    await supabase.storage.from("maps").remove([path]);
    throw error;
  }
  return hydrate(data);
}

export async function deleteMap(map: CampaignMap): Promise<void> {
  const { error } = await supabase.from("maps").delete().eq("id", map.id);
  if (error) throw error;
  if (map.background_path) {
    await supabase.storage.from("maps").remove([map.background_path]);
  }
}

export async function updateMap(
  id: string,
  patch: Partial<{
    name: string;
    cols: number;
    rows: number;
    cellSize: number;
  }>,
): Promise<void> {
  const update: Database["public"]["Tables"]["maps"]["Update"] = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.cols !== undefined) update.cols = patch.cols;
  if (patch.rows !== undefined) update.rows = patch.rows;
  if (patch.cellSize !== undefined) update.cell_size = patch.cellSize;
  const { error } = await supabase.from("maps").update(update).eq("id", id);
  if (error) throw error;
}
