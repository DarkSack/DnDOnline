import { Copy, Eye, EyeOff, Minus, Plus, Trash2, X } from "lucide-react";
import type { BoardEntity } from "@/engine/board";
import { cn } from "@/lib/utils";

export type TokenActionsPanelProps = {
  entity: BoardEntity;
  canControl: boolean;
  isDm: boolean;
  onHpDelta: (delta: number) => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
};

/**
 * HUD flotante para la entidad seleccionada. Renderizado por Board
 * (fuera de BoardCanvas) para acceso a servicios de persistencia.
 */
export function TokenActionsPanel({
  entity,
  canControl,
  isDm,
  onHpDelta,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  onClose,
}: TokenActionsPanelProps) {
  const hasHp = entity.hp !== undefined && entity.hpMax !== undefined;
  const kindLabel =
    entity.kind === "pc"
      ? "Personaje"
      : entity.kind === "npc"
        ? "NPC"
        : "Enemigo";

  return (
    <div
      className={cn(
        "absolute left-2 top-2 z-10 flex w-[min(240px,calc(100%-1rem))] flex-col gap-2",
        "rounded-md border border-border bg-background/90 p-3 text-xs shadow-md backdrop-blur",
        !entity.visible && "opacity-70 ring-1 ring-dashed ring-muted-foreground/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-foreground">
            {entity.name}
            {!entity.visible && (
              <span className="ml-2 rounded bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wide">
                Oculto
              </span>
            )}
          </div>
          <div className="text-muted-foreground">
            {kindLabel}
            {entity.size > 1 && ` · ${entity.size}×${entity.size}`} · [
            {entity.pos.col},{entity.pos.row}]
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded hover:bg-muted"
          aria-label="Cerrar"
        >
          <X className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      {hasHp && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">HP</span>
          <button
            type="button"
            disabled={!canControl}
            onClick={() => onHpDelta(-1)}
            className="rounded border border-border p-1 hover:bg-muted disabled:opacity-40"
            aria-label="Restar HP"
          >
            <Minus className="size-3" />
          </button>
          <span className="min-w-[64px] text-center font-mono">
            {entity.hp}/{entity.hpMax}
          </span>
          <button
            type="button"
            disabled={!canControl}
            onClick={() => onHpDelta(1)}
            className="rounded border border-border p-1 hover:bg-muted disabled:opacity-40"
            aria-label="Sumar HP"
          >
            <Plus className="size-3" />
          </button>
          <button
            type="button"
            disabled={!canControl}
            onClick={() => onHpDelta(-5)}
            className="ml-1 rounded border border-border px-1.5 text-[10px] hover:bg-muted disabled:opacity-40"
          >
            −5
          </button>
          <button
            type="button"
            disabled={!canControl}
            onClick={() => onHpDelta(5)}
            className="rounded border border-border px-1.5 text-[10px] hover:bg-muted disabled:opacity-40"
          >
            +5
          </button>
        </div>
      )}

      {isDm && (
        <div className="flex items-center gap-1 border-t border-border pt-2">
          <button
            type="button"
            onClick={onToggleVisibility}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-muted"
            title={entity.visible ? "Ocultar" : "Mostrar"}
          >
            {entity.visible ? (
              <Eye className="size-3" />
            ) : (
              <EyeOff className="size-3" />
            )}
            <span className="text-[10px]">
              {entity.visible ? "Ocultar" : "Mostrar"}
            </span>
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-muted"
            title="Duplicar"
          >
            <Copy className="size-3" />
            <span className="text-[10px]">Duplicar</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto flex items-center gap-1 rounded border border-destructive/40 px-2 py-1 text-destructive hover:bg-destructive/10"
            title="Eliminar"
          >
            <Trash2 className="size-3" />
            <span className="text-[10px]">Eliminar</span>
          </button>
        </div>
      )}
    </div>
  );
}
