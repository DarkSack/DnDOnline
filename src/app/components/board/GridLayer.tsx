import { useCallback } from "react";
import type { Graphics } from "pixi.js";
import {
  visibleCellRange,
  type GridConfig,
  type Viewport,
} from "@/engine/board";

export type GridLayerProps = {
  grid: GridConfig;
  viewport: Viewport;
  canvasSize: { w: number; h: number };
};

const LINE_COLOR = 0x555555;
const LINE_ALPHA = 0.4;
const BG_COLOR = 0x1a1a1a;
const BG_ALPHA = 0.35;

export function GridLayer({ grid, viewport, canvasSize }: GridLayerProps) {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (canvasSize.w <= 0 || canvasSize.h <= 0) return;

      const range = visibleCellRange(
        viewport,
        canvasSize.w,
        canvasSize.h,
        grid,
      );

      // Clampear a los límites del tablero si están definidos.
      const colStart =
        grid.cols !== undefined
          ? Math.max(0, range.colStart)
          : range.colStart;
      const colEnd =
        grid.cols !== undefined
          ? Math.min(grid.cols, range.colEnd)
          : range.colEnd;
      const rowStart =
        grid.rows !== undefined
          ? Math.max(0, range.rowStart)
          : range.rowStart;
      const rowEnd =
        grid.rows !== undefined
          ? Math.min(grid.rows, range.rowEnd)
          : range.rowEnd;

      // Fondo del área del tablero (solo si está acotado).
      if (grid.cols !== undefined && grid.rows !== undefined) {
        g.rect(
          0,
          0,
          grid.cols * grid.cellSize,
          grid.rows * grid.cellSize,
        ).fill({ color: BG_COLOR, alpha: BG_ALPHA });
      }

      // Líneas verticales
      for (let c = colStart; c <= colEnd; c += 1) {
        const x = c * grid.cellSize;
        g.moveTo(x, rowStart * grid.cellSize);
        g.lineTo(x, rowEnd * grid.cellSize);
      }
      // Líneas horizontales
      for (let r = rowStart; r <= rowEnd; r += 1) {
        const y = r * grid.cellSize;
        g.moveTo(colStart * grid.cellSize, y);
        g.lineTo(colEnd * grid.cellSize, y);
      }

      // Grosor de línea inversamente proporcional al zoom para que se
      // mantenga visualmente constante.
      g.stroke({
        color: LINE_COLOR,
        alpha: LINE_ALPHA,
        width: 1 / viewport.scale,
      });
    },
    [grid, viewport, canvasSize.w, canvasSize.h],
  );

  return <pixiGraphics draw={draw} />;
}
