import { useCallback } from "react";
import type { FederatedPointerEvent, Graphics, TextStyleOptions } from "pixi.js";
import {
  gridToWorld,
  kindColor,
  parseColor,
  type BoardEntity,
  type GridConfig,
} from "@/engine/board";

export type TokenProps = {
  entity: BoardEntity;
  grid: GridConfig;
  selected: boolean;
  dragging: boolean;
  onPointerDown: (entity: BoardEntity, e: FederatedPointerEvent) => void;
};

const SELECTION_RING_COLOR = 0x22c55e; // emerald-500

export function Token({
  entity,
  grid,
  selected,
  dragging,
  onPointerDown,
}: TokenProps) {
  const world = gridToWorld(entity.pos, grid);
  const sizePx = entity.size * grid.cellSize;
  const half = sizePx / 2;
  const radius = half - 3;
  const initial = entity.name.slice(0, 1).toUpperCase();
  const fill = parseColor(entity.color, kindColor(entity.kind));

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      // Sombra ligera
      g.circle(half + 1, half + 2, radius).fill({
        color: 0x000000,
        alpha: 0.35,
      });
      // Cuerpo del token
      g.circle(half, half, radius)
        .fill(fill)
        .stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
      // Ring de selección
      if (selected) {
        g.circle(half, half, radius + 4).stroke({
          color: SELECTION_RING_COLOR,
          width: 3,
          alpha: 0.9,
        });
      }
    },
    [half, radius, fill, selected],
  );

  const textStyle: TextStyleOptions = {
    fill: 0xffffff,
    fontSize: Math.max(12, sizePx * 0.4),
    fontWeight: "700",
    fontFamily: "system-ui, sans-serif",
  };

  return (
    <pixiContainer
      x={world.x}
      y={world.y}
      alpha={dragging ? 0.75 : 1}
      eventMode="static"
      cursor="grab"
      onPointerDown={(e: FederatedPointerEvent) => onPointerDown(entity, e)}
    >
      <pixiGraphics draw={draw} />
      <pixiText
        text={initial}
        anchor={0.5}
        x={half}
        y={half}
        style={textStyle}
      />
    </pixiContainer>
  );
}
