// Engine: tipos de personaje. Sin React, sin DOM. Debe poder ejecutarse
// en Node para tests y en un Edge Function para validación server-side.

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ABILITIES: readonly Ability[] = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
] as const;

export type AbilityScores = Record<Ability, number>;

export type Alignment =
  | "lawful-good"
  | "neutral-good"
  | "chaotic-good"
  | "lawful-neutral"
  | "true-neutral"
  | "chaotic-neutral"
  | "lawful-evil"
  | "neutral-evil"
  | "chaotic-evil";

export type CharacterIdentity = {
  race: string;
  className: string;
  subclass?: string;
  level: number;
  background?: string;
  alignment?: Alignment;
  avatarUrl?: string;
};

export type CharacterCombat = {
  hp: number;
  hpMax: number;
  ac: number;
  speed: number;
  /** Override manual; si es undefined se deriva del modificador de DEX. */
  initiativeBonus?: number;
};

export type CharacterStory = {
  backstory?: string;
  description?: string;
  personality?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
};

/**
 * Ficha de personaje. Versionada para poder migrar en el futuro sin
 * romper las fichas ya guardadas.
 */
export type CharacterSheetV1 = {
  version: 1;
  identity: CharacterIdentity;
  abilities: AbilityScores;
  combat: CharacterCombat;
  story: CharacterStory;
};

export type CharacterSheet = CharacterSheetV1;
