import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/services/supabase";

export type ChannelStatus =
  | "idle"
  | "connecting"
  | "subscribed"
  | "closed"
  | "error";

/**
 * Crea y suscribe un canal Supabase por sala. Devuelve el canal (mientras
 * está subscribed) y el estado de conexión. El canal se destruye al
 * desmontar o al cambiar el roomId.
 *
 * Los presencia / postgres_changes / broadcast se enganchan sobre el
 * mismo canal desde otros hooks, así todos los hooks colaboran en una
 * sola conexión WebSocket por sala.
 */
export function useRoomChannel(roomId: string | undefined) {
  // Crear el canal es puro: no abre conexión hasta subscribe().
  const channel = useMemo<RealtimeChannel | null>(
    () =>
      roomId
        ? supabase.channel(`room:${roomId}`, {
            config: {
              broadcast: { self: false, ack: true },
              presence: { key: "" }, // se sobreescribe en track()
            },
          })
        : null,
    [roomId],
  );

  const [rawStatus, setRawStatus] = useState<
    "idle" | "subscribed" | "closed" | "error"
  >("idle");

  useEffect(() => {
    if (!channel) return;
    channel.subscribe((s) => {
      if (s === "SUBSCRIBED") setRawStatus("subscribed");
      else if (s === "CHANNEL_ERROR") setRawStatus("error");
      else if (s === "CLOSED") setRawStatus("closed");
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channel]);

  // Derivado: si tenemos canal pero aún no ha respondido, estamos conectando.
  const status: ChannelStatus =
    channel && rawStatus === "idle" ? "connecting" : rawStatus;

  return { channel, status } as const;
}
