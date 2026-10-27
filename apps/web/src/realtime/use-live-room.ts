import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { getRoom, type RoomWithCampaign } from "@/services/rooms";
import type { Database } from "@/services/database.types";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];

/**
 * Suscripción a UPDATEs de la fila de la sala (active_map_id, fog, etc.).
 * Retorna el room hidratado con embed de campaign.
 *
 * El fetch inicial usa getRoom para traer también la campaña; los UPDATE
 * mergean los campos sueltos manteniendo el embed.
 */
export function useLiveRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<RoomWithCampaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    (async () => {
      try {
        const r = await getRoom(roomId);
        if (alive) setRoom(r);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`room-row:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const next = payload.new as RoomRow;
          setRoom((prev) => (prev ? { ...prev, ...next } : prev));
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  return { room, loading };
}
