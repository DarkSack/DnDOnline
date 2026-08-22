import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BoardEntity } from "@/engine/board";
import { listEntities } from "@/services/entities";
import { startCombat } from "@/services/combat";

export type StartCombatPickerProps = {
  roomId: string;
  onDone: () => void;
  onCancel: () => void;
};

type Picked = {
  entity: BoardEntity;
  checked: boolean;
  bonus: number;
};

export function StartCombatPicker({
  roomId,
  onDone,
  onCancel,
}: StartCombatPickerProps) {
  const [items, setItems] = useState<Picked[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listEntities(roomId)
      .then((list) => {
        if (!alive) return;
        setItems(
          list
            .filter((e) => e.visible)
            .map((entity) => ({ entity, checked: true, bonus: 0 })),
        );
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [roomId]);

  const toggle = (id: string, patch: Partial<Picked>) => {
    setItems((prev) =>
      prev
        ? prev.map((p) => (p.entity.id === id ? { ...p, ...patch } : p))
        : prev,
    );
  };

  const submit = async () => {
    if (!items) return;
    const participants = items
      .filter((p) => p.checked)
      .map((p) => ({
        entity_id: p.entity.id,
        name: p.entity.name,
        bonus: Number.isFinite(p.bonus) ? p.bonus : 0,
      }));
    if (participants.length === 0) {
      setError("Selecciona al menos un combatiente");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await startCombat({ roomId, participants });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar");
      setPending(false);
    }
  };

  if (!items) {
    return <p className="text-sm text-muted-foreground">Cargando entidades…</p>;
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-muted-foreground">
          No hay entidades visibles en el tablero. Colócalas primero.
        </p>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Iniciativa se rollea server-side: 1d20 + bonus por combatiente.
      </p>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
        {items.map((p) => (
          <li
            key={p.entity.id}
            className="flex items-center gap-2 rounded-md border border-border bg-input/20 px-2 py-1.5 text-sm"
          >
            <input
              type="checkbox"
              checked={p.checked}
              onChange={(e) =>
                toggle(p.entity.id, { checked: e.target.checked })
              }
              className="size-4"
            />
            <span className="flex-1 truncate">
              {p.entity.name}
              <span className="ml-2 text-[10px] text-muted-foreground">
                {p.entity.kind === "pc"
                  ? "PC"
                  : p.entity.kind === "npc"
                    ? "NPC"
                    : "Enemigo"}
              </span>
            </span>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              bonus
              <input
                type="number"
                value={p.bonus}
                disabled={!p.checked}
                onChange={(e) =>
                  toggle(p.entity.id, { bonus: Number(e.target.value) })
                }
                className="w-14 rounded border border-border bg-input/30 px-1.5 py-0.5 text-right font-mono text-xs"
              />
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={pending} size="sm">
          {pending ? "Iniciando…" : "Iniciar combate"}
        </Button>
      </div>
    </div>
  );
}
