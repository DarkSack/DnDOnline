import type { Ability, AbilityScores } from "@/engine/character";
import {
  ABILITIES,
  ABILITY_LABELS,
  STANDARD_ARRAY,
  abilityModifier,
  formatModifier,
} from "@/engine/character";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/app/components/character/Field";

export type AbilitiesStepProps = {
  abilities: AbilityScores;
  onChange: (patch: Partial<AbilityScores>) => void;
};

export function AbilitiesStep({ abilities, onChange }: AbilitiesStepProps) {
  const applyStandardArray = () => {
    // Reparte 15/14/13/12/10/8 en orden STR..CHA como preset arrancable.
    const values = [...STANDARD_ARRAY];
    const patch: Partial<AbilityScores> = {};
    ABILITIES.forEach((k, i) => {
      patch[k] = values[i] ?? 10;
    });
    onChange(patch);
  };

  const resetAll10 = () => {
    onChange({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={applyStandardArray}
        >
          Standard Array (15/14/13/12/10/8)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetAll10}
        >
          Reiniciar a 10
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {ABILITIES.map((key: Ability) => {
          const score = abilities[key];
          const mod = abilityModifier(score);
          return (
            <NumberField
              key={key}
              label={ABILITY_LABELS[key]}
              value={score}
              min={1}
              max={30}
              hint={
                <span className="font-mono">{formatModifier(mod)}</span>
              }
              onChange={(v) => onChange({ [key]: v } as Partial<AbilityScores>)}
            />
          );
        })}
      </div>
    </div>
  );
}
