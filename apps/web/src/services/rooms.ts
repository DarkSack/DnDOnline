import { supabase } from "./supabase";
import type { Database, RoomRole } from "./database.types";

export type Room = Database["public"]["Tables"]["rooms"]["Row"];
export type RoomMember = Database["public"]["Tables"]["room_members"]["Row"];

export type RoomWithCampaign = Room & {
  campaigns: { id: string; name: string; dm_id: string } | null;
};

export async function listRoomsForCampaign(campaignId: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export type PlayerRoomEntry = {
  room: RoomWithCampaign;
  character_id: string | null;
};

export async function listRoomsWhereIPlay(
  userId: string,
): Promise<PlayerRoomEntry[]> {
  const { data, error } = await supabase
    .from("room_members")
    .select("character_id, rooms(*, campaigns(id, name, dm_id))")
    .eq("user_id", userId)
    .eq("role", "player");
  if (error) throw error;
  return (data ?? [])
    .map((row) => ({
      room: row.rooms as unknown as RoomWithCampaign | null,
      character_id: row.character_id,
    }))
    .filter((entry): entry is PlayerRoomEntry => entry.room !== null);
}

export async function getRoom(id: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*, campaigns(id, name, dm_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as RoomWithCampaign | null;
}

export async function createRoom(input: { campaignId: string; name: string }) {
  const { data, error } = await supabase
    .from("rooms")
    .insert({ campaign_id: input.campaignId, name: input.name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoom(id: string) {
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) throw error;
}

export async function joinRoomByCode(code: string) {
  const { data, error } = await supabase.rpc("join_room", { code });
  if (error) throw error;
  return data as Room;
}

export type RoomMemberWithProfile = RoomMember & {
  profiles: { id: string; username: string | null } | null;
  characters: { id: string; name: string } | null;
};

export async function listRoomMembers(
  roomId: string,
): Promise<RoomMemberWithProfile[]> {
  const { data, error } = await supabase
    .from("room_members")
    .select("*, profiles(id, username), characters(id, name)")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoomMemberWithProfile[];
}

export async function leaveRoom(roomId: string, userId: string) {
  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setActiveMap(
  roomId: string,
  mapId: string | null,
) {
  const { error } = await supabase
    .from("rooms")
    .update({ active_map_id: mapId })
    .eq("id", roomId);
  if (error) throw error;
}

export async function setFog(roomId: string, cells: string[]) {
  const { error } = await supabase
    .from("rooms")
    .update({ fog: cells })
    .eq("id", roomId);
  if (error) throw error;
}

export async function setWalls(roomId: string, cells: string[]) {
  const { error } = await supabase
    .from("rooms")
    .update({ walls: cells })
    .eq("id", roomId);
  if (error) throw error;
}

export async function setMemberCharacter(
  roomId: string,
  userId: string,
  characterId: string | null,
) {
  const { error } = await supabase
    .from("room_members")
    .update({ character_id: characterId })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

export function roleLabel(role: RoomRole): string {
  return role === "dm" ? "DM" : "Jugador";
}
