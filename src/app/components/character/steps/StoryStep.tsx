import type { CharacterStory } from "@/engine/character";
import { TextAreaField } from "@/app/components/character/Field";

export type StoryStepProps = {
  story: CharacterStory;
  onChange: (patch: Partial<CharacterStory>) => void;
};

export function StoryStep({ story, onChange }: StoryStepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextAreaField
        label="Descripción física"
        value={story.description ?? ""}
        onChange={(description) => onChange({ description })}
        placeholder="Apariencia, edad, rasgos distintivos…"
        rows={3}
        className="sm:col-span-2"
      />
      <TextAreaField
        label="Trasfondo / historia"
        value={story.backstory ?? ""}
        onChange={(backstory) => onChange({ backstory })}
        rows={5}
        className="sm:col-span-2"
      />
      <TextAreaField
        label="Personalidad"
        value={story.personality ?? ""}
        onChange={(personality) => onChange({ personality })}
        rows={2}
      />
      <TextAreaField
        label="Ideales"
        value={story.ideals ?? ""}
        onChange={(ideals) => onChange({ ideals })}
        rows={2}
      />
      <TextAreaField
        label="Vínculos"
        value={story.bonds ?? ""}
        onChange={(bonds) => onChange({ bonds })}
        rows={2}
      />
      <TextAreaField
        label="Defectos"
        value={story.flaws ?? ""}
        onChange={(flaws) => onChange({ flaws })}
        rows={2}
      />
    </div>
  );
}
