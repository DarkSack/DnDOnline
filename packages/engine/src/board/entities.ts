import type { EntityKind } from "./types";

/** Color por defecto según el kind (hex numérico para Pixi). */
export function kindColor(kind: EntityKind): number {
  switch (kind) {
    case "pc":
      return 0x3b82f6; // blue-500
    case "npc":
      return 0xf59e0b; // amber-500
    case "monster":
      return 0xef4444; // red-500
  }
}

/** Convierte "#3b82f6" a 0x3b82f6. Si input inválido, devuelve fallback. */
export function parseColor(css: string | undefined, fallback: number): number {
  if (!css) return fallback;
  const clean = css.startsWith("#") ? css.slice(1) : css;
  const n = Number.parseInt(clean, 16);
  return Number.isFinite(n) ? n : fallback;
}
