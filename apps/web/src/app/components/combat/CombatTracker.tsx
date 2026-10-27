import { useState } from "react";
import { ChevronRight, Swords, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/services/i18n";
import type { CombatView, Table } from "@/realtime/use-table";
import { StartCombatPicker } from "./StartCombatPicker";

/** Orden de turnos de la mesa. El servidor tira la iniciativa, decide quién ve qué y quién puede pasar turno. */
export function CombatTracker({ table }: { table: Table }) {
  const { t } = useI18n();
  const { board, send } = table;
  const [picking, setPicking] = useState(false);
  if (!board?.scene) return null;
  const { combat, manage, tokens } = board;

  if (!combat) {
    if (picking && manage) {
      return (
        <StartCombatPicker
          tokens={tokens}
          onStart={(participants) => {
            send({ type: "combat.start", participants });
            setPicking(false);
          }}
          onCancel={() => setPicking(false)}
        />
      );
    }
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{t("combat.none")}</span>
        {manage && (
          <Button size="sm" onClick={() => setPicking(true)}>
            <Swords className="mr-1 size-3.5" />
            {t("combat.start")}
          </Button>
        )}
      </div>
    );
  }

  const outside = manage ? tokens.filter((x) => !combat.combatants.some((c) => c.tokenId === x.id)) : [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium">
            {t("combat.round")} {combat.round}
          </span>
          <span className="ml-2 text-muted-foreground">
            · {t("combat.turnOf")} <span className="text-foreground">{currentName(combat) ?? t("combat.hiddenTurn")}</span>
          </span>
        </div>
        <div className="flex gap-2">
          {combat.canAdvance && (
            <Button size="sm" onClick={() => send({ type: "combat.next", current: combat.current ?? undefined })} disabled={combat.combatants.length === 0}>
              <ChevronRight className="mr-1 size-3.5" />
              {t("combat.next")}
            </Button>
          )}
          {manage && (
            <Button size="sm" variant="outline" onClick={() => send({ type: "combat.end" })}>
              {t("combat.end")}
            </Button>
          )}
        </div>
      </div>

      <ol className="flex flex-col gap-1">
        {combat.combatants.map((c, i) => {
          const isCurrent = c.tokenId === combat.current;
          return (
            <li
              key={c.tokenId}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                isCurrent ? "border-primary bg-primary/10" : c.acted ? "border-border bg-input/10 text-muted-foreground" : "border-border bg-input/20",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                {isCurrent && <ChevronRight className="size-3.5 text-primary" />}
                <span className="w-5 text-right font-mono text-xs text-muted-foreground">{i + 1}.</span>
                <span className="truncate">{c.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono">
                  <span className="text-muted-foreground">init</span>{" "}
                  <span className={cn("text-foreground", isCurrent && "text-primary")}>{c.initiative}</span>
                  {c.roll !== null && c.bonus !== null && (
                    <span className="ml-1 text-muted-foreground">
                      (d20:{c.roll}
                      {c.bonus >= 0 ? `+${c.bonus}` : c.bonus})
                    </span>
                  )}
                </span>
                {manage && (
                  <button
                    type="button"
                    onClick={() => send({ type: "combat.remove", tokenId: c.tokenId })}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label={`${t("combat.remove")}: ${c.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {combat.combatants.length === 0 && (
          <li className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">{t("combat.empty")}</li>
        )}
      </ol>

      {outside.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && send({ type: "combat.add", participant: { tokenId: e.target.value } })}
          className="h-8 rounded-md border border-border bg-input/30 px-2 text-xs"
          aria-label={t("combat.addPick")}
        >
          <option value="">{t("combat.addPick")}</option>
          {outside.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

const currentName = (c: CombatView) => c.combatants.find((x) => x.tokenId === c.current)?.name ?? null;
