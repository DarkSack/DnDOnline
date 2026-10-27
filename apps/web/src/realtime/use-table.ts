import { useEffect, useRef, useState } from "react";
import type { Role } from "@/services/api";

// Espejo de apps/server/src/modules/table/visibility.ts (lo que el servidor deja ver a cada uno).
export type TableEvent =
  | { kind: "chat"; id: string; userId: string; displayName: string; body: string; visibility: "public" | "private"; createdAt: string }
  | {
      kind: "roll";
      id: string;
      userId: string;
      displayName: string;
      formula: string;
      mode: "normal" | "advantage" | "disadvantage";
      results: { count: number; sides: number; values: number[] }[] | null;
      discarded: number | null;
      total: number | null;
      visibility: "public" | "private" | "blind";
      createdAt: string;
    };

export type Presence = { id: string; displayName: string; role: Role };
export type TableStatus = "connecting" | "open" | "closed";

/** Conexión a la mesa de una campaña con reconexión exponencial; al reconectar, el servidor reenvía el historial. */
export function useTable(campaignId: string | undefined) {
  const [events, setEvents] = useState<TableEvent[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [status, setStatus] = useState<TableStatus>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    let attempt = 0;
    const open = () => {
      const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/campaigns/${campaignId}`);
      socket.current = ws;
      setStatus("connecting");
      ws.onopen = () => {
        attempt = 0;
        setStatus("open");
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "hello") setEvents(msg.history);
        else if (msg.type === "event") setEvents((prev) => [...prev, msg.event]);
        else if (msg.type === "presence") setPresence(msg.users);
        else if (msg.type === "error") setLastError(msg.error);
      };
      ws.onclose = (e) => {
        setStatus("closed");
        // 4403: ya no eres miembro; no tiene sentido reintentar.
        if (stopped || e.code === 4403) return;
        retry = setTimeout(open, Math.min(1000 * 2 ** attempt++, 15_000));
      };
    };
    open();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket.current?.close();
    };
  }, [campaignId]);

  const send = (msg: object) => {
    setLastError(null);
    socket.current?.send(JSON.stringify(msg));
  };
  return { events, presence, status, lastError, send };
}

export type Table = ReturnType<typeof useTable>;
