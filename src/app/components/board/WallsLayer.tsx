import { useCallback } from "react";
import type { Graphics } from "pixi.js";
import type { GridConfig } from "@/engine/board";

export type WallsLayerProps = {
  grid: GridConfig;
  walls: Set<string>;
};

const WALL_COLOR = 0x18181b; // zinc-900
const WALL_STROKE = 0x27272a; // zinc-800

/** Renderiza celdas de pared como bloques sólidos con borde. */
export function WallsLayer({ grid, walls }: WallsLayerProps) {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (walls.size === 0) return;
      for (const key of walls) {
        const [c, r] = key.split(",").map(Number);
        if (!Number.isFinite(c) || !Number.isFinite(r)) continue;
        g.rect(
          c * grid.cellSize,
          r * grid.cellSize,
          grid.cellSize,
          grid.cellSize,
        );
      }
      g.fill({ color: WALL_COLOR, alpha: 0.95 });
      g.stroke({ color: WALL_STROKE, width: 1, alpha: 1 });
    },
    [grid.cellSize, walls],
  );
  return <pixiGraphics draw={draw} />;
}
