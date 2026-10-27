import type { Ability, Alignment, Skill } from "./types";

export const RACES = [
  "Humano",
  "Elfo",
  "Enano",
  "Mediano",
  "Gnomo",
  "Semielfo",
  "Semiorco",
  "Tiflin",
  "Dracónido",
  "Otro",
] as const;

export const CLASSES = [
  "Bárbaro",
  "Bardo",
  "Clérigo",
  "Druida",
  "Guerrero",
  "Monje",
  "Paladín",
  "Explorador",
  "Pícaro",
  "Hechicero",
  "Brujo",
  "Mago",
  "Otro",
] as const;

export const ALIGNMENTS: { value: Alignment; label: string }[] = [
  { value: "lawful-good", label: "Legal bueno" },
  { value: "neutral-good", label: "Neutral bueno" },
  { value: "chaotic-good", label: "Caótico bueno" },
  { value: "lawful-neutral", label: "Legal neutral" },
  { value: "true-neutral", label: "Neutral verdadero" },
  { value: "chaotic-neutral", label: "Caótico neutral" },
  { value: "lawful-evil", label: "Legal malvado" },
  { value: "neutral-evil", label: "Neutral malvado" },
  { value: "chaotic-evil", label: "Caótico malvado" },
];

/** Característica de cada habilidad (SRD 5.2.1). El orden es el de la ficha. */
export const SKILL_ABILITY: Readonly<Record<Skill, Ability>> = {
  acrobatics: "dex",
  "animal-handling": "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  "sleight-of-hand": "dex",
  stealth: "dex",
  survival: "wis",
};

export const SKILLS = Object.keys(SKILL_ABILITY) as Skill[];

/** Standard Array de D&D 5e — clásico y balanceado. */
export const STANDARD_ARRAY: readonly number[] = [15, 14, 13, 12, 10, 8] as const;
