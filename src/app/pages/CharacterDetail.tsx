import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/services/use-auth";
import {
  deleteCharacter,
  getCharacter,
  updateCharacter,
  type Character,
} from "@/services/characters";
import {
  ABILITIES,
  ABILITY_LABELS,
  ABILITY_SHORT,
  ALIGNMENTS,
  abilityModifier,
  formatModifier,
  initiativeBonus,
  proficiencyBonus,
} from "@/engine/character";
import { StepIndicator } from "@/app/components/character/StepIndicator";
import { IdentityStep } from "@/app/components/character/steps/IdentityStep";
import { AbilitiesStep } from "@/app/components/character/steps/AbilitiesStep";
import { CombatStep } from "@/app/components/character/steps/CombatStep";
import { StoryStep } from "@/app/components/character/steps/StoryStep";

const STEPS = ["Identidad", "Atributos", "Combate", "Historia"] as const;

export default function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const c = await getCharacter(id);
        if (!alive) return;
        if (!c) {
          setNotFound(true);
          return;
        }
        setCharacter(c);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

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
      const updated = await updateCharacter(id, {
        name: draft.name,
        sheet: draft.sheet,
      });
      setCharacter(updated);
      setEditing(false);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    if (!confirm("¿Eliminar este personaje? Esta acción no se puede deshacer."))
      return;
    await deleteCharacter(id);
    navigate("/dashboard", { replace: true });
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>;
  }
  if (notFound || !character) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Personaje no encontrado.
        </p>
        <Link
          to="/dashboard"
          className="mt-2 inline-block text-xs text-primary hover:underline"
        >
          ← Volver
        </Link>
      </div>
    );
  }

  const isOwner = character.owner_id === user?.id;

  if (editing && draft) {
    return (
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
        <button
          type="button"
          onClick={cancelEdit}
          className="text-left text-xs text-muted-foreground hover:underline"
        >
          ← Cancelar edición
        </button>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl">Editar {draft.name}</h1>
          <StepIndicator steps={STEPS} current={step} onGoTo={setStep} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
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
                <AbilitiesStep
                  abilities={draft.sheet.abilities}
                  onChange={(patch) =>
                    setDraft({
                      ...draft,
                      sheet: {
                        ...draft.sheet,
                        abilities: { ...draft.sheet.abilities, ...patch },
                      },
                    })
                  }
                />
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
                    Atrás
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
                    disabled={step === STEPS.length - 1 || saving}
                  >
                    Siguiente
                  </Button>
                </div>
                <Button
                  type="button"
                  onClick={save}
                  disabled={saving || draft.name.trim().length === 0}
                >
                  {saving ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { sheet } = character;
  const alignmentLabel =
    ALIGNMENTS.find((a) => a.value === sheet.identity.alignment)?.label ?? "—";

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <Link
        to="/dashboard"
        className="text-xs text-muted-foreground hover:underline"
      >
        ← Dashboard
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {sheet.identity.avatarUrl ? (
            <img
              src={sheet.identity.avatarUrl}
              alt=""
              className="size-16 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border border-border bg-muted text-lg font-medium text-muted-foreground">
              {character.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-heading text-2xl">{character.name}</h1>
            <p className="text-xs text-muted-foreground">
              {sheet.identity.race} · {sheet.identity.className}
              {sheet.identity.subclass ? ` (${sheet.identity.subclass})` : ""} ·
              Nivel {sheet.identity.level}
            </p>
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}>
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Eliminar
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Combate</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">HP</dt>
                <dd className="font-mono text-lg">
                  {sheet.combat.hp}/{sheet.combat.hpMax}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">CA</dt>
                <dd className="font-mono text-lg">{sheet.combat.ac}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">VEL</dt>
                <dd className="font-mono text-lg">{sheet.combat.speed}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Iniciativa</dt>
                <dd className="font-mono text-lg">
                  {formatModifier(initiativeBonus(sheet))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Competencia</dt>
                <dd className="font-mono text-lg">
                  {formatModifier(proficiencyBonus(sheet.identity.level))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Alineamiento</dt>
                <dd className="text-xs">{alignmentLabel}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atributos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-3 gap-2 text-center">
              {ABILITIES.map((k) => {
                const s = sheet.abilities[k];
                return (
                  <li
                    key={k}
                    className="rounded-md border border-border bg-input/20 p-2"
                  >
                    <div className="text-[10px] text-muted-foreground">
                      {ABILITY_SHORT[k]}
                    </div>
                    <div className="font-mono text-lg">{s}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {formatModifier(abilityModifier(s))}
                    </div>
                    <div className="sr-only">{ABILITY_LABELS[k]}</div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {(sheet.story.description ||
        sheet.story.backstory ||
        sheet.story.personality ||
        sheet.story.ideals ||
        sheet.story.bonds ||
        sheet.story.flaws) && (
        <Card>
          <CardHeader>
            <CardTitle>Historia</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {sheet.story.description && (
              <section>
                <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Descripción
                </h3>
                <p className="whitespace-pre-wrap">{sheet.story.description}</p>
              </section>
            )}
            {sheet.story.backstory && (
              <section>
                <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Trasfondo
                </h3>
                <p className="whitespace-pre-wrap">{sheet.story.backstory}</p>
              </section>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {sheet.story.personality && (
                <section>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Personalidad
                  </h3>
                  <p className="whitespace-pre-wrap">
                    {sheet.story.personality}
                  </p>
                </section>
              )}
              {sheet.story.ideals && (
                <section>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Ideales
                  </h3>
                  <p className="whitespace-pre-wrap">{sheet.story.ideals}</p>
                </section>
              )}
              {sheet.story.bonds && (
                <section>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Vínculos
                  </h3>
                  <p className="whitespace-pre-wrap">{sheet.story.bonds}</p>
                </section>
              )}
              {sheet.story.flaws && (
                <section>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Defectos
                  </h3>
                  <p className="whitespace-pre-wrap">{sheet.story.flaws}</p>
                </section>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
