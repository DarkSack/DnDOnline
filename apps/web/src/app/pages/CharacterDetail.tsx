import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type CampaignSummary } from "@/services/api";
import {
  deleteCharacter,
  getCharacter,
  updateCharacter,
  type Character,
} from "@/services/characters";
import { labelOf, useI18n, type I18nKey } from "@/services/i18n";
import {
  ABILITIES,
  abilityModifier,
  formatModifier,
  initiativeBonus,
  passivePerception,
  proficiencyBonus,
  savingThrowBonus,
  SKILLS,
  skillBonus,
} from "@dndonline/engine/character";
import { StepIndicator } from "@/app/components/character/StepIndicator";
import { CHARACTER_STEPS } from "@/app/components/character/characterSteps";
import { IdentityStep } from "@/app/components/character/steps/IdentityStep";
import { AbilitiesStep } from "@/app/components/character/steps/AbilitiesStep";
import { CombatStep } from "@/app/components/character/steps/CombatStep";
import { StoryStep } from "@/app/components/character/steps/StoryStep";

export default function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, tError } = useI18n();
  const steps = CHARACTER_STEPS.map(t);
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const load = useCallback(
    () =>
      getCharacter(id ?? "")
        .then(({ character: c, canEdit }) => {
          setCharacter(c);
          setIsOwner(canEdit);
        }, () => setNotFound(true))
        .finally(() => setLoading(false)),
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = () => {
    if (!character) return;
    setDraft(character);
    setStep(0);
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (!draft || !id) return;
    setSaving(true);
    setError(null);
    try {
      await updateCharacter(id, {
        name: draft.name.trim(),
        sheet: draft.sheet,
      });
      await load();
      setEditing(false);
      setDraft(null);
    } catch (err) {
      setError(tError((err as { code?: string }).code ?? "internal"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    if (!confirm(t("char.deleteConfirm")))
      return;
    await deleteCharacter(id);
    navigate("/dashboard", { replace: true });
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">{t("common.loading")}</p>;
  }
  if (notFound || !character) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{t("char.notFound")}</p>
        <Link
          to="/dashboard"
          className="mt-2 inline-block text-xs text-primary hover:underline"
        >
          {t("common.back")}
        </Link>
      </div>
    );
  }

  if (editing && draft) {
    return (
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
        <button
          type="button"
          onClick={cancelEdit}
          className="text-left text-xs text-muted-foreground hover:underline"
        >
          {t("char.cancelEdit")}
        </button>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl">
            {t("common.edit")} {draft.name}
          </h1>
          <StepIndicator steps={steps} current={step} onGoTo={setStep} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{steps[step]}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {step === 0 && (
                <IdentityStep
                  name={draft.name}
                  onNameChange={(name) => setDraft({ ...draft, name })}
                  identity={draft.sheet.identity}
                  onIdentityChange={(patch) =>
                    setDraft({
                      ...draft,
                      sheet: {
                        ...draft.sheet,
                        identity: { ...draft.sheet.identity, ...patch },
                      },
                    })
                  }
                />
              )}
              {step === 1 && (
                <AbilitiesStep sheet={draft.sheet} onChange={(sheet) => setDraft({ ...draft, sheet })} />
              )}
              {step === 2 && (
                <CombatStep
                  combat={draft.sheet.combat}
                  abilities={draft.sheet.abilities}
                  onChange={(patch) =>
                    setDraft({
                      ...draft,
                      sheet: {
                        ...draft.sheet,
                        combat: { ...draft.sheet.combat, ...patch },
                      },
                    })
                  }
                />
              )}
              {step === 3 && (
                <StoryStep
                  story={draft.sheet.story}
                  onChange={(patch) =>
                    setDraft({
                      ...draft,
                      sheet: {
                        ...draft.sheet,
                        story: { ...draft.sheet.story, ...patch },
                      },
                    })
                  }
                />
              )}
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0 || saving}
                  >
                    {t("common.prev")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                    disabled={step === steps.length - 1 || saving}
                  >
                    {t("common.next")}
                  </Button>
                </div>
                <Button
                  type="button"
                  onClick={save}
                  disabled={saving || draft.name.trim().length === 0}
                >
                  {saving ? t("common.saving") : t("char.save")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { sheet } = character;
  const alignmentLabel = sheet.identity.alignment ? t(`alignment.${sheet.identity.alignment}`) : "—";

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <Link
        to={!isOwner && character.campaignId ? `/campaigns/${character.campaignId}` : "/dashboard"}
        className="text-xs text-muted-foreground hover:underline"
      >
        {t("common.back")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {sheet.identity.avatarUrl ? (
            <img
              src={sheet.identity.avatarUrl}
              alt=""
              className="size-16 rounded-full object-cover ring-2 ring-gold/50 ring-offset-2 ring-offset-background"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-accent font-heading text-xl font-semibold text-accent-foreground ring-2 ring-gold/50 ring-offset-2 ring-offset-background">
              {character.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-heading text-2xl">{character.name}</h1>
            <p className="text-xs text-muted-foreground">
              {labelOf(t, "race", sheet.identity.race)} · {labelOf(t, "class", sheet.identity.className)}
              {sheet.identity.subclass ? ` (${sheet.identity.subclass})` : ""} · {t("char.levelLong")} {sheet.identity.level}
            </p>
            {isOwner ? (
              <CampaignPicker
                value={character.campaignId}
                onChange={async (campaignId) => {
                  await updateCharacter(character.id, { campaignId });
                  await load();
                }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("char.by")} {character.ownerName}
                {character.campaignName ? ` · ${character.campaignName}` : ""}
              </p>
            )}
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}>
              {t("common.edit")}
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              {t("common.delete")}
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("char.step.combat")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t("char.hp")}</dt>
                <dd className="font-mono text-lg">
                  {sheet.combat.hp}/{sheet.combat.hpMax}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("char.ac")}</dt>
                <dd className="font-mono text-lg">{sheet.combat.ac}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("char.speed")}</dt>
                <dd className="font-mono text-lg">{sheet.combat.speed}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("char.initiative")}</dt>
                <dd className="font-mono text-lg">
                  {formatModifier(initiativeBonus(sheet))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("char.proficiencyBonus")}</dt>
                <dd className="font-mono text-lg">
                  {formatModifier(proficiencyBonus(sheet.identity.level))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("char.alignment")}</dt>
                <dd className="text-xs">{alignmentLabel}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("char.step.abilities")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-3 gap-2 text-center">
              {ABILITIES.map((k) => {
                const s = sheet.abilities[k];
                return (
                  <li
                    key={k}
                    className="frame-vellum rounded-md border border-border bg-card p-2"
                  >
                    <div className="font-heading text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                      {t(`abilityShort.${k}`)}
                    </div>
                    <div className="font-mono text-2xl leading-tight font-semibold">
                      {s}
                    </div>
                    <div className="font-mono text-xs text-gold">
                      {formatModifier(abilityModifier(s))}
                    </div>
                    <div className="sr-only">{t(`ability.${k}`)}</div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <ProficienciesCard sheet={sheet} />

      <StoryCard story={sheet.story} />
    </div>
  );
}

const STORY: [keyof Character["sheet"]["story"], I18nKey][] = [
  ["description", "char.description"],
  ["backstory", "char.backstory"],
  ["personality", "char.personality"],
  ["ideals", "char.ideals"],
  ["bonds", "char.bonds"],
  ["flaws", "char.flaws"],
];

function StoryCard({ story }: { story: Character["sheet"]["story"] }) {
  const { t } = useI18n();
  const filled = STORY.filter(([k]) => story[k]);
  if (!filled.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("char.step.story")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        {filled.map(([k, label]) => (
          <section key={k} className={k === "description" || k === "backstory" ? "sm:col-span-2" : undefined}>
            <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{t(label)}</h3>
            <p className="whitespace-pre-wrap">{story[k]}</p>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

/** Salvaciones y habilidades con su bonus; ● competencia, ◆ pericia. */
function ProficienciesCard({ sheet }: { sheet: Character["sheet"] }) {
  const { t } = useI18n();
  const prof = sheet.proficiencies;
  const mark = (on: boolean, double = false) => (
    <span aria-hidden className={on ? "text-gold" : "text-muted-foreground/40"}>
      {double ? "◆" : on ? "●" : "○"}
    </span>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("char.proficiencies")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm sm:grid-cols-[1fr_2fr]">
        <section>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t("char.saves")}</h3>
          <ul className="flex flex-col gap-1">
            {ABILITIES.map((k) => {
              const on = prof?.saves.includes(k) ?? false;
              return (
                <li key={k} className="flex items-center gap-2">
                  {mark(on)}
                  <span className="flex-1">{t(`ability.${k}`)}</span>
                  <span className="font-mono">{formatModifier(savingThrowBonus(sheet, k))}</span>
                  {on && <span className="sr-only">{t("char.proficient")}</span>}
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t("char.skills")}</h3>
          <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {SKILLS.map((skill) => {
              const on = prof?.skills.includes(skill) ?? false;
              const double = on && (prof?.expertise?.includes(skill) ?? false);
              return (
                <li key={skill} className="flex items-center gap-2">
                  {mark(on, double)}
                  <span className="flex-1">{t(`skill.${skill}`)}</span>
                  <span className="font-mono">{formatModifier(skillBonus(sheet, skill))}</span>
                  {on && <span className="sr-only">{t(double ? "char.expertise" : "char.proficient")}</span>}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("char.passivePerception")}: <span className="font-mono text-foreground">{passivePerception(sheet)}</span>
          </p>
        </section>
      </CardContent>
    </Card>
  );
}

/** Campaña donde juega el personaje; su DM podrá ver la ficha. Solo campañas donde el dueño no es espectador. */
function CampaignPicker({ value, onChange }: { value: string | null; onChange: (campaignId: string | null) => Promise<void> }) {
  const { t, tError } = useI18n();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ campaigns: CampaignSummary[] }>("/api/campaigns").then(
      (r) => setCampaigns(r.campaigns.filter((c) => c.role !== "spectator")),
      () => setCampaigns([]),
    );
  }, []);

  return (
    <label className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {t("char.campaign")}
      <select
        value={value ?? ""}
        disabled={pending}
        onChange={async (e) => {
          setPending(true);
          setError(null);
          try {
            await onChange(e.target.value || null);
          } catch (err) {
            setError(tError((err as { code?: string }).code ?? "internal"));
          } finally {
            setPending(false);
          }
        }}
        className="rounded-md border border-border px-2 py-1 text-xs"
      >
        <option value="">{t("char.noCampaign")}</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {error && <span role="alert" className="text-destructive">{error}</span>}
    </label>
  );
}
