import { useCallback } from "react";
import type { Graphics } from "pixi.js";
import type { GridConfig } from "@/engine/board";
import { boardPalette } from "./palette";

export type VisibilityLayerProps = {
  grid: GridConfig;
  /** Celdas visibles. Todas las demás dentro del tablero se oscurecen. */
  visible: Set<string>;
};

const SHADOW_COLOR = boardPalette.shadow;
const SHADOW_ALPHA = 0.85;

/**
 * Oscurece las celdas fuera del set `visible`. Solo se renderiza para
 * non-DM. Se aplica encima del grid + entidades pero debajo de fog
 * manual, así fog opaca sobreescribe.
 */
export function VisibilityLayer({ grid, visible }: VisibilityLayerProps) {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      const cols = grid.cols ?? 0;
      const rows = grid.rows ?? 0;
      if (cols === 0 || rows === 0) return;
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          if (visible.has(`${c},${r}`)) continue;
          g.rect(
            c * grid.cellSize,
            r * grid.cellSize,
            grid.cellSize,
            grid.cellSize,
          );
        }
      }
      g.fill({ color: SHADOW_COLOR, alpha: SHADOW_ALPHA });
    },
    [grid.cellSize, grid.cols, grid.rows, visible],
  );
  return <pixiGraphics draw={draw} />;
}
