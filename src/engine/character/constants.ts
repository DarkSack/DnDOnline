import type { Ability, Alignment } from "./types";

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
  "Artificiero",
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

export const ABILITY_LABELS: Record<Ability, string> = {
  str: "Fuerza",
  dex: "Destreza",
  con: "Constitución",
  int: "Inteligencia",
  wis: "Sabiduría",
  cha: "Carisma",
};

export const ABILITY_SHORT: Record<Ability, string> = {
  str: "FUE",
  dex: "DES",
  con: "CON",
  int: "INT",
  wis: "SAB",
  cha: "CAR",
};

/** Standard Array de D&D 5e — clásico y balanceado. */
export const STANDARD_ARRAY: readonly number[] = [15, 14, 13, 12, 10, 8] as const;
