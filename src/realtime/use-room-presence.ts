import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export type PresencePayload = {
  user_id: string;
  username: string | null;
  online_at: string;
};

/**
 * Trackea al usuario actual como presente en el canal y devuelve la
 * lista completa de usuarios conectados (deduplicada por user_id).
 *
 * Recibe el channel de useRoomChannel; no lo abre ni lo cierra.
 */
export function useRoomPresence(
  channel: RealtimeChannel | null,
  me: PresencePayload | null,
) {
  const [present, setPresent] = useState<PresencePayload[]>([]);

  useEffect(() => {
    if (!channel || !me) return;

    const sync = () => {
      const state = channel.presenceState<PresencePayload>();
      const flat = Object.values(state).flat();
      const dedup = new Map<string, PresencePayload>();
      for (const entry of flat) dedup.set(entry.user_id, entry);
      setPresent([...dedup.values()]);
    };

    channel.on("presence", { event: "sync" }, sync);
    channel.on("presence", { event: "join" }, sync);
    channel.on("presence", { event: "leave" }, sync);

    // Track after subscription; canal.track es no-op si aún no SUBSCRIBED
    // pero Supabase lo encola. Reintentamos al cambiar canal.
    let tracked = false;
    const attemptTrack = async () => {
      const res = await channel.track(me);
      if (res === "ok") tracked = true;
    };
    attemptTrack();

    return () => {
      if (tracked) channel.untrack();
      setPresent([]);
    };
  }, [channel, me]);

  return present;
}
