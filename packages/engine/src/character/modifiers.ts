import { SKILL_ABILITY } from "./constants";
import type { Ability, AbilityScores, CharacterSheet, Skill } from "./types";

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

/** Tirada de salvación: modificador + competencia si la tiene. */
export function savingThrowBonus(sheet: CharacterSheet, ability: Ability): number {
  const proficient = sheet.proficiencies?.saves.includes(ability) ?? false;
  return abilityModifier(sheet.abilities[ability]) + (proficient ? proficiencyBonus(sheet.identity.level) : 0);
}

/** Habilidad: modificador de su característica + competencia (doble con pericia). */
export function skillBonus(sheet: CharacterSheet, skill: Skill): number {
  const p = sheet.proficiencies;
  const times = p?.skills.includes(skill) ? (p.expertise?.includes(skill) ? 2 : 1) : 0;
  return abilityModifier(sheet.abilities[SKILL_ABILITY[skill]]) + times * proficiencyBonus(sheet.identity.level);
}

/** Percepción pasiva: 10 + bonus de Percepción. */
export function passivePerception(sheet: CharacterSheet): number {
  return 10 + skillBonus(sheet, "perception");
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
