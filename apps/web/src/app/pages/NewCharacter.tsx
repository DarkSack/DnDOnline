import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createCharacter } from "@/services/characters";
import { useI18n } from "@/services/i18n";
import { emptyCharacterSheet, type CharacterSheet } from "@dndonline/engine/character";
import { StepIndicator } from "@/app/components/character/StepIndicator";
import { CHARACTER_STEPS } from "@/app/components/character/characterSteps";
import { IdentityStep } from "@/app/components/character/steps/IdentityStep";
import { AbilitiesStep } from "@/app/components/character/steps/AbilitiesStep";
import { CombatStep } from "@/app/components/character/steps/CombatStep";
import { StoryStep } from "@/app/components/character/steps/StoryStep";

export default function NewCharacterPage() {
  const { t, tError } = useI18n();
  const steps = CHARACTER_STEPS.map(t);
  const navigate = useNavigate();
  // Desde la página de una campaña: el personaje nace ya vinculado a ella.
  const campaignId = useSearchParams()[0].get("campaign");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [sheet, setSheet] = useState<CharacterSheet>(() =>
    emptyCharacterSheet(),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const identityValid = name.trim().length > 0;
  const canAdvance = step === 0 ? identityValid : true;
  const isLast = step === steps.length - 1;

  const onNext = (e: FormEvent) => {
    e.preventDefault();
    if (!canAdvance) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const onBack = () => setStep((s) => Math.max(0, s - 1));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identityValid) return;
    setPending(true);
    setError(null);
    try {
      const created = await createCharacter({
        name: name.trim(),
        sheet,
        campaignId,
      });
      navigate(`/characters/${created.id}`, { replace: true });
    } catch (err) {
      setError(tError((err as { code?: string }).code ?? "internal"));
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <Link
        to={campaignId ? `/campaigns/${campaignId}` : "/dashboard"}
        className="text-xs text-muted-foreground hover:underline"
      >
        {t("common.back")}
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl">{t("char.new")}</h1>
        <StepIndicator steps={steps} current={step} onGoTo={setStep} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[step]}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={isLast ? onSubmit : onNext}
            className="flex flex-col gap-6"
          >
            {step === 0 && (
              <IdentityStep
                name={name}
                onNameChange={setName}
                identity={sheet.identity}
                onIdentityChange={(patch) =>
                  setSheet((s) => ({
                    ...s,
                    identity: { ...s.identity, ...patch },
                  }))
                }
              />
            )}
            {step === 1 && (
              <AbilitiesStep sheet={sheet} onChange={setSheet} />
            )}
            {step === 2 && (
              <CombatStep
                combat={sheet.combat}
                abilities={sheet.abilities}
                onChange={(patch) =>
                  setSheet((s) => ({
                    ...s,
                    combat: { ...s.combat, ...patch },
                  }))
                }
              />
            )}
            {step === 3 && (
              <StoryStep
                story={sheet.story}
                onChange={(patch) =>
                  setSheet((s) => ({
                    ...s,
                    story: { ...s.story, ...patch },
                  }))
                }
              />
            )}

            {error && (
              <p role="alert" className="text-xs text-destructive">{error}</p>
            )}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBack}
                disabled={step === 0 || pending}
              >
                {t("common.prev")}
              </Button>
              {isLast ? (
                <Button type="submit" disabled={pending || !identityValid}>
                  {pending ? t("common.saving") : t("char.create")}
                </Button>
              ) : (
                <Button type="submit" disabled={!canAdvance}>
                  {t("common.next")}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
