import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];

export async function listCampaignsIDm(userId: string) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("dm_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCampaign(id: string) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCampaign(input: {
  name: string;
  description?: string | null;
  dmId: string;
}) {
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: input.name,
      description: input.description ?? null,
      dm_id: input.dmId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaign(id: string) {
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}
