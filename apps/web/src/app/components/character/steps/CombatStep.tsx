import type { AbilityScores, CharacterCombat } from "@dndonline/engine/character";
import { abilityModifier, formatModifier } from "@dndonline/engine/character";
import { NumberField } from "@/app/components/character/Field";
import { useI18n } from "@/services/i18n";

export type CombatStepProps = {
  combat: CharacterCombat;
  abilities: AbilityScores;
  onChange: (patch: Partial<CharacterCombat>) => void;
};

export function CombatStep({ combat, abilities, onChange }: CombatStepProps) {
  const { t } = useI18n();
  const dexMod = abilityModifier(abilities.dex);
  const initiative = combat.initiativeBonus ?? dexMod;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField
        label={t("char.hpMax")}
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
        label={t("char.hpCurrent")}
        value={combat.hp}
        min={0}
        max={combat.hpMax}
        onChange={(hp) => onChange({ hp })}
      />
      <NumberField
        label={t("char.acLong")}
        value={combat.ac}
        min={1}
        onChange={(ac) => onChange({ ac })}
      />
      <NumberField
        label={t("char.speedLong")}
        value={combat.speed}
        min={0}
        onChange={(speed) => onChange({ speed })}
      />
      <NumberField
        label={t("char.initiativeOverride")}
        value={combat.initiativeBonus ?? dexMod}
        hint={
          <span className="font-mono">
            {t("char.dexBase")}: {formatModifier(dexMod)} · {t("char.effective")}{" "}
            {formatModifier(initiative)}
          </span>
        }
        onChange={(initiativeBonus) => onChange({ initiativeBonus })}
        className="sm:col-span-2"
      />
    </div>
  );
}
