import type { EntityKind, EntitySize } from "./types";

/**
 * Plantilla de criatura para el catálogo del DM. Sin comportamiento
 * (eso vive en engine/combat en Fase 9); solo defaults para spawn.
 */
export type CreatureTemplate = {
  /** Identificador estable, útil como key y para presets. */
  slug: string;
  name: string;
  kind: EntityKind;
  size: EntitySize;
  /** HP inicial y máximo (mismo valor al aparecer). */
  hp: number;
  /** Color hex, opcional; si undefined el renderer usa color por kind. */
  color?: string;
  /** Emoji/inicial visual auxiliar para el catálogo. */
  glyph?: string;
};

export const CREATURE_CATALOG: readonly CreatureTemplate[] = [
  { slug: "goblin", name: "Goblin", kind: "monster", size: 1, hp: 7, glyph: "👺" },
  { slug: "orco", name: "Orco", kind: "monster", size: 1, hp: 15, glyph: "🧌" },
  { slug: "esqueleto", name: "Esqueleto", kind: "monster", size: 1, hp: 13, glyph: "💀" },
  { slug: "zombi", name: "Zombi", kind: "monster", size: 1, hp: 22, glyph: "🧟" },
  { slug: "lobo", name: "Lobo", kind: "monster", size: 1, hp: 11, glyph: "🐺" },
  { slug: "bandido", name: "Bandido", kind: "monster", size: 1, hp: 11, glyph: "🗡️" },
  { slug: "ogro", name: "Ogro", kind: "monster", size: 2, hp: 59, glyph: "👹" },
  {
    slug: "dragon",
    name: "Dragón joven",
    kind: "monster",
    size: 3,
    hp: 178,
    color: "#dc2626",
    glyph: "🐉",
  },
  { slug: "guardia", name: "Guardia", kind: "npc", size: 1, hp: 11, glyph: "🛡️" },
  { slug: "npc", name: "NPC", kind: "npc", size: 1, hp: 8, glyph: "🧑" },
] as const;
