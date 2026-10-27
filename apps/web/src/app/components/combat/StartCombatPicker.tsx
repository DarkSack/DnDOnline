import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/services/i18n";
import type { TokenView } from "@/realtime/use-table";

export type Participant = { tokenId: string; bonus?: number };

type Picked = { token: TokenView; checked: boolean; bonus: string };

/** Elige qué fichas del tablero entran al combate. La iniciativa la tira el servidor. */
export function StartCombatPicker({
  tokens,
  onStart,
  onCancel,
}: {
  tokens: TokenView[];
  onStart: (participants: Participant[]) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<Picked[]>(() => tokens.filter((x) => x.visible).map((token) => ({ token, checked: true, bonus: "" })));
  const [error, setError] = useState<string | null>(null);

  const patch = (id: string, p: Partial<Picked>) => setItems((prev) => prev.map((x) => (x.token.id === id ? { ...x, ...p } : x)));

  const submit = () => {
    const participants = items
      .filter((x) => x.checked)
      .map((x) => {
        const bonus = Number.parseInt(x.bonus, 10);
        return Number.isFinite(bonus) ? { tokenId: x.token.id, bonus } : { tokenId: x.token.id };
      });
    if (participants.length === 0) return setError(t("combat.pickOne"));
    onStart(participants);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-muted-foreground">{t("combat.noTokens")}</p>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("combat.rollHelp")}</p>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
        {items.map((x) => (
          <li key={x.token.id} className="flex items-center gap-2 rounded-md border border-border bg-input/20 px-2 py-1.5 text-sm">
            <input
              type="checkbox"
              checked={x.checked}
              onChange={(e) => patch(x.token.id, { checked: e.target.checked })}
              className="size-4"
              aria-label={x.token.name}
            />
            <span className="flex-1 truncate">
              {x.token.name}
              <span className="ml-2 text-[10px] text-muted-foreground">{t(`kind.${x.token.kind}`)}</span>
            </span>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              {t("combat.bonus")}
              <input
                type="number"
                min={-20}
                max={20}
                value={x.bonus}
                placeholder={x.token.kind === "pc" ? "auto" : "0"}
                disabled={!x.checked}
                onChange={(e) => patch(x.token.id, { bonus: e.target.value })}
                className="w-14 rounded border border-border bg-input/30 px-1.5 py-0.5 text-right font-mono text-xs"
              />
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button onClick={submit} size="sm">
          {t("combat.start")}
        </Button>
      </div>
    </div>
  );
}
