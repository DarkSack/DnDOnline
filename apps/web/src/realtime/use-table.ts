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

// Espejo de apps/server/src/modules/board/view.ts: lo que el servidor deja ver del tablero a cada uno.
export type TokenView = {
  id: string;
  kind: "pc" | "npc" | "monster";
  name: string;
  col: number;
  row: number;
  size: number;
  hp: number | null;
  hpMax: number | null;
  visible: boolean;
  color: string | null;
  characterId: string | null;
  canMove: boolean;
};
export type BoardView = {
  scene: { id: string; name: string; cols: number; rows: number; cellSize: number; fog: string[]; walls: string[]; imageUrl: string | null } | null;
  tokens: TokenView[];
  /** Celdas visibles; null = todas. */
  mask: string[] | null;
  manage: boolean;
  combat: CombatView | null;
};
export type CombatantView = {
  tokenId: string;
  name: string;
  initiative: number;
  /** null en enemigos y NPC para quien no dirige. */
  roll: number | null;
  bonus: number | null;
  acted: boolean;
};
export type CombatView = {
  round: number;
  /** Ficha a la que le toca; null si no la ves. */
  current: string | null;
  combatants: CombatantView[];
  canAdvance: boolean;
};

export type Presence = { id: string; displayName: string; role: Role };
export type TableStatus = "connecting" | "open" | "closed";

/** Conexión a la mesa de una campaña con reconexión exponencial; al reconectar, el servidor reenvía el historial. */
export function useTable(campaignId: string | undefined) {
  const [events, setEvents] = useState<TableEvent[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [status, setStatus] = useState<TableStatus>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  // Sube con cada error: quien espera respuesta a un mensaje sabe que no llegará un tablero nuevo.
  const [errors, setErrors] = useState(0);
  const [board, setBoard] = useState<BoardView | null>(null);
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
        if (msg.type === "hello") {
          setEvents(msg.history);
          setBoard(msg.board);
        } else if (msg.type === "event") setEvents((prev) => [...prev, msg.event]);
        else if (msg.type === "board") setBoard(msg.board);
        else if (msg.type === "presence") setPresence(msg.users);
        else if (msg.type === "error") {
          setLastError(msg.error);
          setErrors((n) => n + 1);
        }
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
  return { events, presence, status, lastError, errors, board, send };
}

export type Table = ReturnType<typeof useTable>;
