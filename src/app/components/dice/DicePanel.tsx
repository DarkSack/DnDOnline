import { useMemo, useState, type FormEvent } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  computeTotal,
  formatBreakdown,
  isCrit,
  isFumble,
  parseDiceFormula,
  type RollResults,
} from "@/engine/dice";
import { rollDice, type DiceRoll } from "@/services/dice";
import { useLiveDiceRolls } from "@/realtime/use-live-dice-rolls";
import { cn } from "@/lib/utils";

export type DicePanelProps = {
  roomId: string;
};

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100] as const;

export function DicePanel({ roomId }: DicePanelProps) {
  const { rolls, loading } = useLiveDiceRolls(roomId);
  const [formula, setFormula] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!formula.trim()) return null;
    return parseDiceFormula(formula);
  }, [formula]);

  const submit = async (rawFormula: string) => {
    setError(null);
    const trimmed = rawFormula.trim();
    if (!trimmed) return;
    const p = parseDiceFormula(trimmed);
    if (!p.ok) {
      setError(p.error);
      return;
    }
    setPending(true);
    try {
      await rollDice({
        roomId,
        formula: trimmed,
        expression: p.expression,
      });
      // El INSERT llega vía realtime; limpiamos el input.
      setFormula("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo tirar");
    } finally {
      setPending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(formula);
  };

  const quickRoll = (sides: number) => submit(`1d${sides}`);

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="1d20 + 5"
            disabled={pending}
            className="flex-1 rounded-md border border-border bg-input/30 px-3 py-2 font-mono text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button
            type="submit"
            disabled={pending || !parsed?.ok}
            size="sm"
          >
            <Dices className="mr-1 size-3.5" />
            Tirar
          </Button>
        </div>
        {parsed && !parsed.ok && formula.trim() && (
          <p className="text-xs text-destructive">{parsed.error}</p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-1">
          {QUICK_DICE.map((sides) => (
            <button
              key={sides}
              type="button"
              disabled={pending}
              onClick={() => quickRoll(sides)}
              className="rounded-md border border-border bg-input/20 px-2 py-1 text-xs font-mono hover:bg-input/40 disabled:opacity-40"
            >
              d{sides}
            </button>
          ))}
        </div>
      </form>

      <DiceHistory rolls={rolls} loading={loading} />
    </div>
  );
}

function DiceHistory({
  rolls,
  loading,
}: {
  rolls: DiceRoll[];
  loading: boolean;
}) {
  if (loading && rolls.length === 0) {
    return <p className="text-xs text-muted-foreground">Cargando…</p>;
  }
  if (rolls.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Sin tiradas aún en esta sala.
      </p>
    );
  }
  return (
    <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
      {rolls.map((r) => (
        <DiceHistoryItem key={r.id} roll={r} />
      ))}
    </ul>
  );
}

function DiceHistoryItem({ roll }: { roll: DiceRoll }) {
  const results = roll.results as RollResults;
  const modifier = roll.total - computeTotal(results, 0);
  const crit = isCrit(results);
  const fumble = isFumble(results);
  const actorName =
    roll.actor?.username ?? roll.actor?.id?.slice(0, 8) ?? "?";
  const time = new Date(roll.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li
      className={cn(
        "flex items-start justify-between gap-2 rounded-md border border-border bg-input/20 px-2 py-1.5 text-xs",
        crit && "border-emerald-500/50 bg-emerald-500/5",
        fumble && "border-destructive/50 bg-destructive/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium">{actorName}</span>
          <span className="font-mono text-muted-foreground">
            {roll.formula}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {time}
          </span>
        </div>
        <div className="font-mono text-muted-foreground">
          {formatBreakdown(results, modifier)}
        </div>
      </div>
      <div
        className={cn(
          "flex flex-col items-end font-mono",
          crit && "text-emerald-500",
          fumble && "text-destructive",
        )}
      >
        <span className="text-lg font-bold leading-none">{roll.total}</span>
        {crit && (
          <span className="text-[10px] uppercase tracking-wide">Crítico</span>
        )}
        {fumble && (
          <span className="text-[10px] uppercase tracking-wide">Pifia</span>
        )}
      </div>
    </li>
  );
}
