import type { CharacterSheet } from "./types";

/**
 * Sheet en blanco. Todo lo demás en el creator es una edición sobre este.
 */
export function emptyCharacterSheet(): CharacterSheet {
  return {
    version: 1,
    identity: {
      race: "Humano",
      className: "Guerrero",
      level: 1,
      background: "",
      alignment: "true-neutral",
      avatarUrl: "",
    },
    abilities: {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    },
    combat: {
      hp: 10,
      hpMax: 10,
      ac: 10,
      speed: 30,
    },
    story: {
      backstory: "",
      description: "",
      personality: "",
      ideals: "",
      bonds: "",
      flaws: "",
    },
  };
}

/**
 * Type guard mínimo. La validación exhaustiva de sheet la haremos con
 * zod o similar cuando estabilicemos la forma en Fase 9.
 */
export function isCharacterSheet(v: unknown): v is CharacterSheet {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<CharacterSheet>;
  return s.version === 1 && !!s.identity && !!s.abilities && !!s.combat;
}
