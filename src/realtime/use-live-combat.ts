import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { getActiveCombat } from "@/services/combat";
import type { CombatState } from "@/engine/combat";
import type { Database } from "@/services/database.types";

type CombatRow = Database["public"]["Tables"]["combats"]["Row"];

/**
 * Combate activo en vivo. Fetch inicial + postgres_changes.
 *  - INSERT (active): reemplaza el estado.
 *  - UPDATE: si active pasa a false, deja de mostrarlo; si sigue activo, refleja.
 *  - DELETE: limpia.
 */
export function useLiveCombat(roomId: string | undefined) {
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    (async () => {
      try {
        const fresh = await getActiveCombat(roomId);
        if (alive) setCombat(fresh);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const rowToState = (row: CombatRow): CombatState => ({
      ...row,
      combatants: (row.combatants as CombatState["combatants"]) ?? [],
    });

    const ch = supabase
      .channel(`combats:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "combats",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as CombatRow;
          if (row.active) setCombat(rowToState(row));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "combats",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as CombatRow;
          setCombat(row.active ? rowToState(row) : null);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "combats",
          filter: `room_id=eq.${roomId}`,
        },
        () => setCombat(null),
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  return { combat, loading };
}
