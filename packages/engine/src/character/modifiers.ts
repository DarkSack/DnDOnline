import type { Ability, AbilityScores, CharacterSheet } from "./types";

/**
 * Modificador de habilidad D&D 5e: floor((score - 10) / 2).
 * Funciona con scores fuera del rango típico (1-30).
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** Bonus de competencia por nivel D&D 5e. */
export function proficiencyBonus(level: number): number {
  if (level < 1) return 2;
  return Math.ceil(level / 4) + 1;
}

/** Iniciativa efectiva: override manual o modificador de DEX. */
export function initiativeBonus(sheet: CharacterSheet): number {
  return (
    sheet.combat.initiativeBonus ?? abilityModifier(sheet.abilities.dex)
  );
}

/** Todas las mods a la vez, útil para renderizar bloques de stats. */
export function allModifiers(
  abilities: AbilityScores,
): Record<Ability, number> {
  return {
    str: abilityModifier(abilities.str),
    dex: abilityModifier(abilities.dex),
    con: abilityModifier(abilities.con),
    int: abilityModifier(abilities.int),
    wis: abilityModifier(abilities.wis),
    cha: abilityModifier(abilities.cha),
  };
}
