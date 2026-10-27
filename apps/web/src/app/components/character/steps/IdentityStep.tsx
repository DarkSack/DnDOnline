import type { CharacterSheet } from "@dndonline/engine/character";
import { ALIGNMENTS, CLASSES, RACES } from "@dndonline/engine/character";
import {
  NumberField,
  SelectField,
  TextField,
} from "@/app/components/character/Field";
import { labelOf, useI18n } from "@/services/i18n";

export type IdentityStepProps = {
  name: string;
  onNameChange: (v: string) => void;
  identity: CharacterSheet["identity"];
  onIdentityChange: (patch: Partial<CharacterSheet["identity"]>) => void;
};

/** Opciones de la lista más el valor guardado si no está en ella (texto libre o de una lista antigua). */
const withCurrent = (list: readonly string[], current: string) => (list.includes(current) ? list : [...list, current]);

export function IdentityStep({
  name,
  onNameChange,
  identity,
  onIdentityChange,
}: IdentityStepProps) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label={t("char.name")}
        value={name}
        onChange={onNameChange}
        required
        className="sm:col-span-2"
      />
      <SelectField
        label={t("char.race")}
        value={identity.race}
        onChange={(race) => onIdentityChange({ race })}
        options={withCurrent(RACES, identity.race).map((v) => ({ value: v, label: labelOf(t, "race", v) }))}
      />
      <SelectField
        label={t("char.class")}
        value={identity.className}
        onChange={(className) => onIdentityChange({ className })}
        options={withCurrent(CLASSES, identity.className).map((v) => ({ value: v, label: labelOf(t, "class", v) }))}
      />
      <TextField
        label={t("char.subclass")}
        value={identity.subclass ?? ""}
        onChange={(subclass) => onIdentityChange({ subclass })}
        placeholder={t("char.subclassHint")}
      />
      <NumberField
        label={t("char.levelLong")}
        value={identity.level}
        min={1}
        max={20}
        onChange={(level) => onIdentityChange({ level })}
      />
      <TextField
        label={t("char.background")}
        value={identity.background ?? ""}
        onChange={(background) => onIdentityChange({ background })}
        placeholder={t("char.backgroundHint")}
      />
      <SelectField
        label={t("char.alignment")}
        value={identity.alignment ?? "true-neutral"}
        onChange={(alignment) => onIdentityChange({ alignment })}
        options={ALIGNMENTS.map((a) => ({ value: a.value, label: t(`alignment.${a.value}`) }))}
      />
      <TextField
        label={t("char.avatar")}
        value={identity.avatarUrl ?? ""}
        onChange={(avatarUrl) => onIdentityChange({ avatarUrl })}
        placeholder="https://…"
        className="sm:col-span-2"
      />
    </div>
  );
}
