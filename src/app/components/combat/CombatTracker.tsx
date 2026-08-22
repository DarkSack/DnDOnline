import { useCallback, useState } from "react";
import { ChevronRight, Swords, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  nextTurn,
  removeCombatant,
  type Combatant,
  type CombatState,
} from "@/engine/combat";
import { endCombat, saveCombat } from "@/services/combat";
import { useLiveCombat } from "@/realtime/use-live-combat";
import { cn } from "@/lib/utils";
import { StartCombatPicker } from "./StartCombatPicker";

export type CombatTrackerProps = {
  roomId: string;
  isDm: boolean;
};

export function CombatTracker({ roomId, isDm }: CombatTrackerProps) {
  const { combat, loading } = useLiveCombat(roomId);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState(false);

  const doNextTurn = useCallback(async () => {
    if (!combat) return;
    setPending(true);
    try {
      await saveCombat(nextTurn(combat));
    } finally {
      setPending(false);
    }
  }, [combat]);

  const doEnd = useCallback(async () => {
    if (!combat) return;
    setPending(true);
    try {
      await endCombat(combat.id);
    } finally {
      setPending(false);
    }
  }, [combat]);

  const doRemove = useCallback(
    async (c: Combatant) => {
      if (!combat) return;
      setPending(true);
      try {
        await saveCombat(removeCombatant(combat, c.entity_id));
      } finally {
        setPending(false);
      }
    },
    [combat],
  );

  if (loading) {
    return <p className="text-xs text-muted-foreground">Cargando…</p>;
  }

  if (!combat) {
    return (
      <div className="flex flex-col gap-2">
        {picking ? (
          <StartCombatPicker
            roomId={roomId}
            onDone={() => setPicking(false)}
            onCancel={() => setPicking(false)}
          />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Sin combate activo.
            </span>
            {isDm && (
              <Button size="sm" onClick={() => setPicking(true)}>
                <Swords className="mr-1 size-3.5" />
                Iniciar combate
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <ActiveCombat
      combat={combat}
      isDm={isDm}
      pending={pending}
      onNext={doNextTurn}
      onEnd={doEnd}
      onRemove={doRemove}
    />
  );
}

type ActiveCombatProps = {
  combat: CombatState;
  isDm: boolean;
  pending: boolean;
  onNext: () => void;
  onEnd: () => void;
  onRemove: (c: Combatant) => void;
};

function ActiveCombat({
  combat,
  isDm,
  pending,
  onNext,
  onEnd,
  onRemove,
}: ActiveCombatProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium">Ronda {combat.round}</span>
          <span className="ml-2 text-muted-foreground">
            · Turno de{" "}
            <span className="text-foreground">
              {combat.combatants[combat.current_turn_idx]?.name ?? "—"}
            </span>
          </span>
        </div>
        {isDm && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onNext}
              disabled={pending || combat.combatants.length === 0}
            >
              <ChevronRight className="mr-1 size-3.5" />
              Siguiente turno
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onEnd}
              disabled={pending}
            >
              Terminar combate
            </Button>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {combat.combatants.map((c, i) => {
          const isCurrent = i === combat.current_turn_idx;
          const hasActed = i < combat.current_turn_idx;
          return (
            <li
              key={`${c.entity_id}-${c.order_idx}`}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                isCurrent
                  ? "border-primary bg-primary/10"
                  : hasActed
                    ? "border-border bg-input/10 text-muted-foreground"
                    : "border-border bg-input/20",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isCurrent && (
                  <ChevronRight className="size-3.5 text-primary" />
                )}
                <span className="w-5 text-right font-mono text-xs text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="truncate">{c.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono">
                  <span className="text-muted-foreground">init</span>{" "}
                  <span
                    className={cn(
                      "text-foreground",
                      isCurrent && "text-primary",
                    )}
                  >
                    {c.initiative}
                  </span>
                  <span className="ml-1 text-muted-foreground">
                    (d20:{c.roll}
                    {c.bonus >= 0 ? `+${c.bonus}` : c.bonus})
                  </span>
                </span>
                {isDm && (
                  <button
                    type="button"
                    onClick={() => onRemove(c)}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Quitar del combate"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {combat.combatants.length === 0 && (
          <li className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            Sin combatientes. Termina el combate.
          </li>
        )}
      </ul>
    </div>
  );
}
