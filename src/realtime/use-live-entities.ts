import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { listEntities, toBoardEntity, type EntityRow } from "@/services/entities";
import type { BoardEntity } from "@/engine/board";

/**
 * Fetch inicial + suscripción postgres_changes sobre entities filtrado
 * por roomId. Reconciliación autoritativa: cada INSERT/UPDATE/DELETE
 * modifica el estado local para que refleje la DB.
 */
export function useLiveEntities(roomId: string | undefined) {
  const [entities, setEntities] = useState<BoardEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    (async () => {
      try {
        const fresh = await listEntities(roomId);
        if (alive) setEntities(fresh);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`entities:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "entities",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const e = toBoardEntity(payload.new as EntityRow);
          setEntities((prev) =>
            prev.some((x) => x.id === e.id) ? prev : [...prev, e],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "entities",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const e = toBoardEntity(payload.new as EntityRow);
          setEntities((prev) => prev.map((x) => (x.id === e.id ? e : x)));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "entities",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const old = payload.old as Partial<EntityRow>;
          if (!old?.id) return;
          setEntities((prev) => prev.filter((x) => x.id !== old.id));
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  return { entities, loading };
}
