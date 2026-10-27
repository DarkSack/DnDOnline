import { useMemo, useState, type FormEvent } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseDiceFormula, type RollMode } from "@dndonline/engine/dice";
import { cn } from "@/lib/utils";
import { useI18n } from "@/services/i18n";
import type { Table, TableEvent } from "@/realtime/use-table";

type RollEvent = Extract<TableEvent, { kind: "roll" }>;
type Visibility = RollEvent["visibility"];

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100] as const;

/** Tiradas resueltas en el servidor; aquí solo se valida la fórmula para avisar antes de enviar. */
export function TableDice({ table, canRoll }: { table: Table; canRoll: boolean }) {
  const { t } = useI18n();
  const [formula, setFormula] = useState("");
  const [mode, setMode] = useState<RollMode>("normal");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const rolls = table.events.filter((e): e is RollEvent => e.kind === "roll").reverse();
  const parsed = useMemo(() => (formula.trim() ? parseDiceFormula(formula) : null), [formula]);
  const open = table.status === "open";

  const roll = (f: string) => table.send({ type: "dice.roll", formula: f.trim(), mode, visibility });
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed?.ok) return;
    roll(formula);
    setFormula("");
  };

  return (
    <div className="flex flex-col gap-3">
      {canRoll && (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="1d20 + 5"
              aria-label="Fórmula"
              maxLength={100}
              className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 font-mono text-sm"
            />
            <Button type="submit" size="sm" disabled={!open || !parsed?.ok}>
              <Dices className="mr-1 size-3.5" />
              {t("table.roll")}
            </Button>
          </div>
          {parsed && !parsed.ok && <p className="text-xs text-destructive">{parsed.error}</p>}
          <div className="flex flex-wrap gap-2">
            <select aria-label="Modo" value={mode} onChange={(e) => setMode(e.target.value as RollMode)} className="rounded-md border border-border px-2 py-1 text-xs">
              <option value="normal">{t("table.mode.normal")}</option>
              <option value="advantage">{t("table.mode.advantage")}</option>
              <option value="disadvantage">{t("table.mode.disadvantage")}</option>
            </select>
            <select
              aria-label="Visibilidad"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="rounded-md border border-border px-2 py-1 text-xs"
            >
              <option value="public">{t("table.vis.public")}</option>
              <option value="private">{t("table.vis.private")}</option>
              <option value="blind">{t("table.vis.blind")}</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-1">
            {QUICK_DICE.map((sides) => (
              <button
                key={sides}
                type="button"
                disabled={!open}
                onClick={() => roll(`1d${sides}`)}
                className="rounded-md border border-border bg-input/20 px-2 py-1 font-mono text-xs hover:bg-input/40 disabled:opacity-40"
              >
                d{sides}
              </button>
            ))}
          </div>
        </form>
      )}

      {rolls.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("table.noRolls")}</p>
      ) : (
        <ul aria-live="polite" className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
          {rolls.map((r) => (
            <RollItem key={r.id} roll={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RollItem({ roll: r }: { roll: RollEvent }) {
  const { t, locale } = useI18n();
  const d20 = r.results?.[0]?.sides === 20 && r.results[0].count === 1 ? r.results[0].values[0] : null;
  return (
    <li className="rounded-md border border-border bg-input/10 px-2 py-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
        <span className="font-medium text-foreground">{r.displayName}</span>
        <code className="font-mono">{r.formula}</code>
        {r.mode !== "normal" && <span>{t(`table.mode.${r.mode}`)}</span>}
        {r.visibility !== "public" && <span className="rounded bg-arcane/15 px-1 text-arcane">{t(`table.vis.${r.visibility}`)}</span>}
        <span className="ml-auto">{new Date(r.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      {r.total === null ? (
        <p className="italic text-muted-foreground">{t("table.hidden")}</p>
      ) : (
        <p className="flex flex-wrap items-baseline gap-2">
          <span className={cn("font-heading text-xl font-semibold", d20 === 20 && "text-gold", d20 === 1 && "text-blood")}>{r.total}</span>
          <span className="font-mono text-muted-foreground">
            {r.results?.map((g) => `[${g.values.join(", ")}]`).join(" + ")}
            {r.discarded !== null && ` (${t("table.discarded")}: ${r.discarded})`}
          </span>
        </p>
      )}
    </li>
  );
}
