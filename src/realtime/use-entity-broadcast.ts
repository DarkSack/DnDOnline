import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GridPos } from "@/engine/board";

const EVENT_MOVE = "entity:move";
const EVENT_END = "entity:end";

type MovePayload = { id: string; col: number; row: number; from: string };
type EndPayload = { id: string; from: string };

/**
 * Broadcasts efímeros de posición para el drag colaborativo.
 * - Emitir cuando el usuario mueve un token localmente.
 * - Recibir movimientos de OTROS usuarios y almacenarlos en un mapa
 *   transitorio que el renderer superpone sobre el estado autoritativo.
 *
 * El commit final (posición persistida) llega vía postgres_changes en
 * useLiveEntities; al recibirlo, el mapa transitorio se limpia.
 */
export function useEntityBroadcast(
  channel: RealtimeChannel | null,
  myUserId: string | undefined,
) {
  const [transient, setTransient] = useState<Map<string, GridPos>>(
    () => new Map(),
  );
  // Último tick enviado por entidad para throttle simple.
  const lastSentRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!channel) return;

    const onMove = (raw: { payload: MovePayload }) => {
      const p = raw.payload;
      if (!p || p.from === myUserId) return;
      setTransient((prev) => {
        const next = new Map(prev);
        next.set(p.id, { col: p.col, row: p.row });
        return next;
      });
    };

    const onEnd = (raw: { payload: EndPayload }) => {
      const p = raw.payload;
      if (!p || p.from === myUserId) return;
      setTransient((prev) => {
        if (!prev.has(p.id)) return prev;
        const next = new Map(prev);
        next.delete(p.id);
        return next;
      });
    };

    channel.on("broadcast", { event: EVENT_MOVE }, onMove);
    channel.on("broadcast", { event: EVENT_END }, onEnd);

    return () => {
      // Los .on() de Supabase no se pueden desregistrar granularmente,
      // pero el canal se destruye cuando cambia el roomId.
    };
  }, [channel, myUserId]);

  const broadcastMove = useCallback(
    (id: string, pos: GridPos) => {
      if (!channel || !myUserId) return;
      const now = performance.now();
      const last = lastSentRef.current.get(id) ?? 0;
      // Throttle 60 fps aprox.
      if (now - last < 16) return;
      lastSentRef.current.set(id, now);
      channel.send({
        type: "broadcast",
        event: EVENT_MOVE,
        payload: { id, col: pos.col, row: pos.row, from: myUserId },
      });
    },
    [channel, myUserId],
  );

  const broadcastEnd = useCallback(
    (id: string) => {
      if (!channel || !myUserId) return;
      lastSentRef.current.delete(id);
      channel.send({
        type: "broadcast",
        event: EVENT_END,
        payload: { id, from: myUserId },
      });
    },
    [channel, myUserId],
  );

  /** Descarta manualmente una posición transitoria (p.ej. tras UPDATE). */
  const clearTransient = useCallback((id: string) => {
    setTransient((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return { transient, broadcastMove, broadcastEnd, clearTransient };
}
