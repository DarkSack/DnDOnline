import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type RoomMessageRow = Database["public"]["Tables"]["room_messages"]["Row"];

export type RoomMessage = RoomMessageRow & {
  actor: { id: string; username: string | null } | null;
};

type RoomMessageWithProfile = RoomMessageRow & {
  profiles: { id: string; username: string | null } | null;
};

function hydrate(row: RoomMessageWithProfile | RoomMessageRow): RoomMessage {
  const withProfile = row as RoomMessageWithProfile;
  return { ...row, actor: withProfile.profiles ?? null };
}

export async function listRecentMessages(
  roomId: string,
  limit = 100,
): Promise<RoomMessage[]> {
  const { data, error } = await supabase
    .from("room_messages")
    .select("*, profiles:actor_id(id, username)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  // Devolver en orden cronológico (viejo → nuevo).
  return (data ?? [])
    .map((r) => hydrate(r as RoomMessageWithProfile))
    .reverse();
}

export async function fetchMessageById(
  id: string,
): Promise<RoomMessage | null> {
  const { data, error } = await supabase
    .from("room_messages")
    .select("*, profiles:actor_id(id, username)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrate(data as RoomMessageWithProfile) : null;
}

export async function sendMessage(input: {
  roomId: string;
  actorId: string;
  body: string;
}): Promise<void> {
  const body = input.body.trim();
  if (!body) return;
  const { error } = await supabase.from("room_messages").insert({
    room_id: input.roomId,
    actor_id: input.actorId,
    body: body.slice(0, 2000),
  });
  if (error) throw error;
}
