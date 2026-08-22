import { useCallback } from "react";
import type { Graphics } from "pixi.js";
import type { GridConfig } from "@/engine/board";

export type FogLayerProps = {
  grid: GridConfig;
  /** Set de celdas ocultas en formato "col,row". */
  fog: Set<string>;
  /**
   * Si true (viewer es DM), la niebla se pinta semitransparente para
   * que el DM vea lo que hay debajo. Los players la ven opaca.
   */
  translucent: boolean;
};

const OPAQUE = 0.92;
const TRANSLUCENT = 0.45;
const COLOR = 0x0a0a0a;

/**
 * Dibuja rectángulos negros sobre las celdas ocultas.
 * Solo se dibuja lo estrictamente necesario — no hay culling porque
 * el fog set típicamente es <= grid.cols * grid.rows y se recorre entero.
 */
export function FogLayer({ grid, fog, translucent }: FogLayerProps) {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (fog.size === 0) return;
      const alpha = translucent ? TRANSLUCENT : OPAQUE;
      for (const key of fog) {
        const [c, r] = key.split(",").map(Number);
        if (!Number.isFinite(c) || !Number.isFinite(r)) continue;
        g.rect(c * grid.cellSize, r * grid.cellSize, grid.cellSize, grid.cellSize);
      }
      g.fill({ color: COLOR, alpha });
    },
    [grid.cellSize, fog, translucent],
  );

  return <pixiGraphics draw={draw} />;
}
