import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import {
  fetchMessageById,
  listRecentMessages,
  type RoomMessage,
  type RoomMessageRow,
} from "@/services/messages";

const HISTORY_LIMIT = 100;

/**
 * Chat de sala en vivo. Fetch inicial de las últimas 100 + INSERT
 * postgres_changes filtrado. Cada INSERT hidrata con profile via
 * fetchMessageById (postgres_changes no incluye embed).
 */
export function useLiveMessages(roomId: string | undefined) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    (async () => {
      try {
        const fresh = await listRecentMessages(roomId, HISTORY_LIMIT);
        if (alive) setMessages(fresh);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`room_messages:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const raw = payload.new as RoomMessageRow;
          const hydrated = await fetchMessageById(raw.id);
          if (!hydrated || !alive) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === hydrated.id)) return prev;
            const next = [...prev, hydrated];
            return next.slice(-HISTORY_LIMIT);
          });
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  return { messages, loading };
}
