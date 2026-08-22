import { useMemo } from "react";
import type { FederatedPointerEvent } from "pixi.js";
import type { BoardEntity, GridConfig } from "@/engine/board";
import { Token } from "./Token";

export type EntitiesLayerProps = {
  entities: BoardEntity[];
  grid: GridConfig;
  selectedId: string | null;
  draggingId: string | null;
  onTokenPointerDown: (
    entity: BoardEntity,
    e: FederatedPointerEvent,
  ) => void;
};

export function EntitiesLayer({
  entities,
  grid,
  selectedId,
  draggingId,
  onTokenPointerDown,
}: EntitiesLayerProps) {
  // Orden por row para que los tokens de abajo se pinten encima
  // (efecto isométrico básico). El token siendo arrastrado siempre al final.
  const sorted = useMemo(() => {
    return [...entities].sort((a, b) => {
      if (a.id === draggingId) return 1;
      if (b.id === draggingId) return -1;
      return a.pos.row - b.pos.row;
    });
  }, [entities, draggingId]);

  return (
    <pixiContainer>
      {sorted.map((e) => (
        <Token
          key={e.id}
          entity={e}
          grid={grid}
          selected={e.id === selectedId}
          dragging={e.id === draggingId}
          onPointerDown={onTokenPointerDown}
        />
      ))}
    </pixiContainer>
  );
}
