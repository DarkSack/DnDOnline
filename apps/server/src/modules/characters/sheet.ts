import type { CharacterSheet } from "@dndonline/engine/character";
import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const score = z.number().int().min(1).max(30);

// Solo https: la imagen la carga el navegador de quien mira la ficha (DM incluido).
const avatarUrl = z.union([z.literal(""), z.url({ protocol: /^https$/ }).max(500)]);

/** Validación de la ficha versionada del motor. Las claves desconocidas se descartan. */
export const Sheet = z.object({
  version: z.literal(1),
  identity: z.object({
    race: text(40).min(1),
    className: text(40).min(1),
    subclass: text(60).optional(),
    level: z.number().int().min(1).max(20),
    background: text(80).optional(),
    alignment: z
      .enum([
        "lawful-good",
        "neutral-good",
        "chaotic-good",
        "lawful-neutral",
        "true-neutral",
        "chaotic-neutral",
        "lawful-evil",
        "neutral-evil",
        "chaotic-evil",
      ])
      .optional(),
    avatarUrl: avatarUrl.optional(),
  }),
  abilities: z.object({ str: score, dex: score, con: score, int: score, wis: score, cha: score }),
  combat: z
    .object({
      hp: z.number().int().min(0).max(9999),
      hpMax: z.number().int().min(1).max(9999),
      ac: z.number().int().min(0).max(50),
      speed: z.number().int().min(0).max(500),
      initiativeBonus: z.number().int().min(-20).max(20).optional(),
    })
    .refine((c) => c.hp <= c.hpMax),
  story: z.object({
    backstory: text(4000).optional(),
    description: text(4000).optional(),
    personality: text(1000).optional(),
    ideals: text(1000).optional(),
    bonds: text(1000).optional(),
    flaws: text(1000).optional(),
  }),
}) satisfies z.ZodType<CharacterSheet>;

export const CharacterName = text(80).min(1);
