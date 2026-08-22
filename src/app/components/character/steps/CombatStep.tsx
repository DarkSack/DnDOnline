import type { AbilityScores, CharacterCombat } from "@/engine/character";
import { abilityModifier, formatModifier } from "@/engine/character";
import { NumberField } from "@/app/components/character/Field";

export type CombatStepProps = {
  combat: CharacterCombat;
  abilities: AbilityScores;
  onChange: (patch: Partial<CharacterCombat>) => void;
};

export function CombatStep({ combat, abilities, onChange }: CombatStepProps) {
  const dexMod = abilityModifier(abilities.dex);
  const initiative = combat.initiativeBonus ?? dexMod;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField
        label="Puntos de golpe máximos"
        value={combat.hpMax}
        min={1}
        onChange={(hpMax) =>
          onChange({
            hpMax,
            // Si estás creando, HP actual sigue el máximo.
            hp: Math.min(combat.hp, hpMax),
          })
        }
      />
      <NumberField
        label="Puntos de golpe actuales"
        value={combat.hp}
        min={0}
        max={combat.hpMax}
        onChange={(hp) => onChange({ hp })}
      />
      <NumberField
        label="Clase de armadura"
        value={combat.ac}
        min={1}
        onChange={(ac) => onChange({ ac })}
      />
      <NumberField
        label="Velocidad (pies)"
        value={combat.speed}
        min={0}
        onChange={(speed) => onChange({ speed })}
      />
      <NumberField
        label="Bonus de iniciativa (override)"
        value={combat.initiativeBonus ?? dexMod}
        hint={
          <span className="font-mono">
            DES base: {formatModifier(dexMod)} · efectiva{" "}
            {formatModifier(initiative)}
          </span>
        }
        onChange={(initiativeBonus) => onChange({ initiativeBonus })}
        className="sm:col-span-2"
      />
    </div>
  );
}
