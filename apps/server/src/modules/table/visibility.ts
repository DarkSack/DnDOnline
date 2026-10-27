import type { RolledGroup, RollMode } from "@dndonline/engine/dice";
import { can, type Role } from "../campaigns/permissions.ts";

export type ChatEvent = {
  kind: "chat";
  id: string;
  userId: string;
  displayName: string;
  body: string;
  /** private = susurro a los DM. */
  visibility: "public" | "private";
  createdAt: string;
};

export type RollEvent = {
  kind: "roll";
  id: string;
  userId: string;
  displayName: string;
  formula: string;
  mode: RollMode;
  /** null cuando quien mira no puede ver el resultado (tirada secreta propia). */
  results: RolledGroup[] | null;
  discarded: number | null;
  total: number | null;
  /** private = la ven quien tira y los DM; blind = solo los DM, quien tira sabe que tiró pero no el resultado. */
  visibility: "public" | "private" | "blind";
  createdAt: string;
};

export type TableEvent = ChatEvent | RollEvent;

export type Viewer = { userId: string; role: Role };

/**
 * Única puerta por la que un evento de la mesa llega a un cliente (historial y difusión en vivo).
 * Devuelve null si el espectador no debe saber ni que existe.
 */
export function viewFor(event: TableEvent, viewer: Viewer): TableEvent | null {
  if (event.visibility === "public" || can(viewer.role, "table.see_private")) return event;
  if (event.userId !== viewer.userId) return null;
  if (event.kind === "roll" && event.visibility === "blind") return { ...event, results: null, discarded: null, total: null };
  return event;
}
