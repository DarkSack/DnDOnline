import type { CharacterStory } from "@dndonline/engine/character";
import { TextAreaField } from "@/app/components/character/Field";
import { useI18n } from "@/services/i18n";

export type StoryStepProps = {
  story: CharacterStory;
  onChange: (patch: Partial<CharacterStory>) => void;
};

export function StoryStep({ story, onChange }: StoryStepProps) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextAreaField
        label={t("char.description")}
        value={story.description ?? ""}
        onChange={(description) => onChange({ description })}
        placeholder={t("char.descriptionHint")}
        rows={3}
        className="sm:col-span-2"
      />
      <TextAreaField
        label={t("char.backstory")}
        value={story.backstory ?? ""}
        onChange={(backstory) => onChange({ backstory })}
        rows={5}
        className="sm:col-span-2"
      />
      <TextAreaField
        label={t("char.personality")}
        value={story.personality ?? ""}
        onChange={(personality) => onChange({ personality })}
        rows={2}
      />
      <TextAreaField
        label={t("char.ideals")}
        value={story.ideals ?? ""}
        onChange={(ideals) => onChange({ ideals })}
        rows={2}
      />
      <TextAreaField
        label={t("char.bonds")}
        value={story.bonds ?? ""}
        onChange={(bonds) => onChange({ bonds })}
        rows={2}
      />
      <TextAreaField
        label={t("char.flaws")}
        value={story.flaws ?? ""}
        onChange={(flaws) => onChange({ flaws })}
        rows={2}
      />
    </div>
  );
}
