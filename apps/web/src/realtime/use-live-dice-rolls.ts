import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import {
  fetchRollById,
  listRecentRolls,
  type DiceRoll,
} from "@/services/dice";
import type { Database } from "@/services/database.types";

type DiceRollRow = Database["public"]["Tables"]["dice_rolls"]["Row"];

const HISTORY_LIMIT = 30;

/**
 * Historial en vivo de tiradas en una sala.
 *
 * Fetch inicial (últimas HISTORY_LIMIT) + suscripción a INSERT sobre
 * dice_rolls filtrado por room_id. Cada INSERT dispara un fetchRollById
 * para hidratar el join con profiles (postgres_changes no incluye embeds).
 */
export function useLiveDiceRolls(roomId: string | undefined) {
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    (async () => {
      try {
        const fresh = await listRecentRolls(roomId, HISTORY_LIMIT);
        if (alive) setRolls(fresh);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`dice_rolls:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dice_rolls",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const raw = payload.new as DiceRollRow;
          const hydrated = await fetchRollById(raw.id);
          if (!hydrated || !alive) return;
          setRolls((prev) => {
            if (prev.some((r) => r.id === hydrated.id)) return prev;
            const next = [hydrated, ...prev];
            return next.slice(0, HISTORY_LIMIT);
          });
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  return { rolls, loading };
}
