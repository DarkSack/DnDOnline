import type { CharacterSheet } from "@/engine/character";
import { ALIGNMENTS, CLASSES, RACES } from "@/engine/character";
import {
  NumberField,
  SelectField,
  TextField,
} from "@/app/components/character/Field";

export type IdentityStepProps = {
  name: string;
  onNameChange: (v: string) => void;
  identity: CharacterSheet["identity"];
  onIdentityChange: (patch: Partial<CharacterSheet["identity"]>) => void;
};

export function IdentityStep({
  name,
  onNameChange,
  identity,
  onIdentityChange,
}: IdentityStepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Nombre del personaje"
        value={name}
        onChange={onNameChange}
        required
        className="sm:col-span-2"
      />
      <SelectField
        label="Raza"
        value={identity.race}
        onChange={(race) => onIdentityChange({ race })}
        options={RACES}
      />
      <SelectField
        label="Clase"
        value={identity.className}
        onChange={(className) => onIdentityChange({ className })}
        options={CLASSES}
      />
      <TextField
        label="Subclase"
        value={identity.subclass ?? ""}
        onChange={(subclass) => onIdentityChange({ subclass })}
        placeholder="Opcional (ej. Campeón)"
      />
      <NumberField
        label="Nivel"
        value={identity.level}
        min={1}
        max={20}
        onChange={(level) => onIdentityChange({ level })}
      />
      <TextField
        label="Trasfondo"
        value={identity.background ?? ""}
        onChange={(background) => onIdentityChange({ background })}
        placeholder="Ej. Soldado, Erudito"
      />
      <SelectField
        label="Alineamiento"
        value={identity.alignment ?? "true-neutral"}
        onChange={(alignment) => onIdentityChange({ alignment })}
        options={ALIGNMENTS}
      />
      <TextField
        label="URL de avatar"
        value={identity.avatarUrl ?? ""}
        onChange={(avatarUrl) => onIdentityChange({ avatarUrl })}
        placeholder="https://…"
        className="sm:col-span-2"
      />
    </div>
  );
}
