import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import {
  listRoomMembers,
  type RoomMemberWithProfile,
} from "@/services/rooms";
import type { Database } from "@/services/database.types";

type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];

/**
 * Fetch inicial + suscripción postgres_changes sobre room_members
 * filtrado por roomId. Mantiene la lista sincronizada:
 *  - INSERT: refetch (para hidratar el join con profiles).
 *  - DELETE: remoción local.
 *  - UPDATE: merge local.
 */
export function useLiveRoomMembers(roomId: string | undefined) {
  const [members, setMembers] = useState<RoomMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    const refetch = async () => {
      try {
        const fresh = await listRoomMembers(roomId);
        if (alive) setMembers(fresh);
      } catch {
        // silencioso: mantener la lista actual si el refetch falla.
      }
    };

    (async () => {
      await refetch();
      if (alive) setLoading(false);
    })();

    const ch = supabase
      .channel(`room-members:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          refetch();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const old = payload.old as Partial<RoomMemberRow>;
          if (!old?.user_id) return;
          setMembers((prev) =>
            prev.filter((m) => m.user_id !== old.user_id),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const next = payload.new as RoomMemberRow;
          setMembers((prev) =>
            prev.map((m) =>
              m.user_id === next.user_id ? { ...m, ...next } : m,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  return { members, loading };
}
