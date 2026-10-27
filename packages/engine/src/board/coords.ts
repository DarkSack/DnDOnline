import type { GridConfig, GridPos, Vec2, Viewport } from "./types";

/** Coordenada de mundo → celda. Los bordes van a la celda inferior/izquierda. */
export function worldToGrid(v: Vec2, grid: GridConfig): GridPos {
  return {
    col: Math.floor(v.x / grid.cellSize),
    row: Math.floor(v.y / grid.cellSize),
  };
}

/** Esquina superior-izquierda de la celda en mundo. */
export function gridToWorld(p: GridPos, grid: GridConfig): Vec2 {
  return { x: p.col * grid.cellSize, y: p.row * grid.cellSize };
}

/** Centro de la celda en mundo. */
export function gridCenter(p: GridPos, grid: GridConfig): Vec2 {
  return {
    x: (p.col + 0.5) * grid.cellSize,
    y: (p.row + 0.5) * grid.cellSize,
  };
}

/** Snap de un punto de mundo a la esquina de celda más cercana. */
export function snapToGrid(v: Vec2, grid: GridConfig): Vec2 {
  return gridToWorld(worldToGrid(v, grid), grid);
}

/** Pantalla (px del canvas) → mundo, dado el viewport. */
export function screenToWorld(screen: Vec2, vp: Viewport): Vec2 {
  return {
    x: (screen.x - vp.x) / vp.scale,
    y: (screen.y - vp.y) / vp.scale,
  };
}

/** Mundo → pantalla. */
export function worldToScreen(world: Vec2, vp: Viewport): Vec2 {
  return {
    x: world.x * vp.scale + vp.x,
    y: world.y * vp.scale + vp.y,
  };
}

/**
 * Zoom que mantiene un punto de pantalla fijo (zoom-to-cursor).
 * Devuelve el nuevo viewport.
 */
export function zoomAt(
  vp: Viewport,
  screenPoint: Vec2,
  newScale: number,
): Viewport {
  const world = screenToWorld(screenPoint, vp);
  return {
    scale: newScale,
    x: screenPoint.x - world.x * newScale,
    y: screenPoint.y - world.y * newScale,
  };
}

/**
 * Rango de celdas visibles dado un viewport y el tamaño del canvas.
 * Usado por el renderer para dibujar solo el grid necesario.
 */
export function visibleCellRange(
  vp: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  grid: GridConfig,
) {
  const topLeft = screenToWorld({ x: 0, y: 0 }, vp);
  const bottomRight = screenToWorld(
    { x: canvasWidth, y: canvasHeight },
    vp,
  );
  return {
    colStart: Math.floor(topLeft.x / grid.cellSize),
    rowStart: Math.floor(topLeft.y / grid.cellSize),
    colEnd: Math.ceil(bottomRight.x / grid.cellSize),
    rowEnd: Math.ceil(bottomRight.y / grid.cellSize),
  };
}

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;

export function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}
