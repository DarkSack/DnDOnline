import type { Ability, AbilityScores, CharacterProficiencies, CharacterSheet, Skill } from "@dndonline/engine/character";
import {
  ABILITIES,
  SKILL_ABILITY,
  SKILLS,
  STANDARD_ARRAY,
  abilityModifier,
  formatModifier,
  savingThrowBonus,
  skillBonus,
} from "@dndonline/engine/character";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/app/components/character/Field";
import { useI18n } from "@/services/i18n";

export type AbilitiesStepProps = {
  sheet: CharacterSheet;
  onChange: (sheet: CharacterSheet) => void;
};

const toggle = <T,>(list: T[], item: T, on: boolean) => (on ? [...list, item] : list.filter((x) => x !== item));

/** Atributos y competencias (salvaciones, habilidades, pericia), con los bonus ya calculados. */
export function AbilitiesStep({ sheet, onChange }: AbilitiesStepProps) {
  const { t } = useI18n();
  const prof: CharacterProficiencies = sheet.proficiencies ?? { saves: [], skills: [] };
  const expertise = prof.expertise ?? [];

  const setAbilities = (patch: Partial<AbilityScores>) => onChange({ ...sheet, abilities: { ...sheet.abilities, ...patch } });
  const setProf = (patch: Partial<CharacterProficiencies>) => onChange({ ...sheet, proficiencies: { ...prof, expertise, ...patch } });

  const applyStandardArray = () => {
    // Reparte 15/14/13/12/10/8 en orden STR..CHA como preset arrancable.
    const patch: Partial<AbilityScores> = {};
    ABILITIES.forEach((k, i) => {
      patch[k] = STANDARD_ARRAY[i] ?? 10;
    });
    setAbilities(patch);
  };

  const setSkill = (skill: Skill, on: boolean) =>
    // Sin competencia no hay pericia.
    setProf({ skills: toggle(prof.skills, skill, on), expertise: on ? expertise : expertise.filter((s) => s !== skill) });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={applyStandardArray}>
            {t("char.standardArray")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAbilities({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 })}>
            {t("char.reset10")}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {ABILITIES.map((key: Ability) => (
            <NumberField
              key={key}
              label={t(`ability.${key}`)}
              value={sheet.abilities[key]}
              min={1}
              max={30}
              hint={<span className="font-mono">{formatModifier(abilityModifier(sheet.abilities[key]))}</span>}
              onChange={(v) => setAbilities({ [key]: v })}
            />
          ))}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-medium text-muted-foreground">{t("char.saves")}</legend>
        <div className="grid gap-1 sm:grid-cols-3">
          {ABILITIES.map((key) => (
            <label key={key} className="flex items-center gap-2 rounded-md border border-border bg-input/20 px-2 py-1.5 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={prof.saves.includes(key)}
                onChange={(e) => setProf({ saves: toggle(prof.saves, key, e.target.checked) })}
              />
              <span className="flex-1 truncate">{t(`ability.${key}`)}</span>
              <span className="font-mono text-xs">{formatModifier(savingThrowBonus(sheet, key))}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-medium text-muted-foreground">{t("char.skills")}</legend>
        <p className="text-[10px] text-muted-foreground">{t("char.expertiseHelp")}</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {SKILLS.map((skill) => {
            const proficient = prof.skills.includes(skill);
            const name = t(`skill.${skill}`);
            return (
              <li key={skill} className="flex items-center gap-2 rounded-md border border-border bg-input/20 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={proficient}
                  onChange={(e) => setSkill(skill, e.target.checked)}
                  aria-label={`${t("char.proficient")}: ${name}`}
                />
                <span className="flex-1 truncate">
                  {name} <span className="text-[10px] text-muted-foreground">{t(`abilityShort.${SKILL_ABILITY[skill]}`)}</span>
                </span>
                <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <input
                    type="checkbox"
                    className="size-3.5"
                    disabled={!proficient}
                    checked={expertise.includes(skill)}
                    onChange={(e) => setProf({ expertise: toggle(expertise, skill, e.target.checked) })}
                    aria-label={`${t("char.expertise")}: ${name}`}
                  />
                  {t("char.expertise")}
                </label>
                <span className="w-8 text-right font-mono text-xs">{formatModifier(skillBonus(sheet, skill))}</span>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}
