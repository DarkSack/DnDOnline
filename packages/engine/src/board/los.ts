import type { GridConfig, GridPos } from "./types";

/**
 * Bresenham line algorithm en coordenadas de grid.
 * Devuelve todas las celdas atravesadas de `from` a `to`, incluyendo
 * ambos extremos.
 */
export function bresenhamLine(from: GridPos, to: GridPos): GridPos[] {
  const cells: GridPos[] = [];
  let x0 = from.col;
  let y0 = from.row;
  const x1 = to.col;
  const y1 = to.row;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  // Guarda mínima contra bucle infinito en inputs corruptos.
  let steps = 0;
  const MAX_STEPS = 10_000;

  while (steps < MAX_STEPS) {
    cells.push({ col: x0, row: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    steps += 1;
  }
  return cells;
}

/**
 * ¿Hay línea de visión clara entre dos celdas?
 * Una pared cualquiera del camino (excluidos origen y destino) bloquea.
 * El destino puede ser una pared (verás la pared, pero no lo que hay detrás).
 */
export function hasLineOfSight(
  from: GridPos,
  to: GridPos,
  walls: Set<string>,
): boolean {
  if (from.col === to.col && from.row === to.row) return true;
  const line = bresenhamLine(from, to);
  // Chequear las celdas intermedias (i=1..len-2).
  for (let i = 1; i < line.length - 1; i += 1) {
    const c = line[i];
    if (walls.has(`${c.col},${c.row}`)) return false;
  }
  return true;
}

/**
 * Distancia Chebyshev (rey de ajedrez): 1 por celda en cualquier
 * dirección (incluyendo diagonales). Es el estándar en D&D 5e para
 * medidas simplificadas.
 */
export function chebyshev(a: GridPos, b: GridPos): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

/**
 * Computa el set de celdas visibles desde uno o varios orígenes,
 * respetando paredes. Opcionalmente limitado por rango (chebyshev).
 *
 * Coste: O(sources * cols * rows * avgLineLength). Para 30×30 con
 * pocos orígenes es despreciable; memoiza en el consumidor.
 */
export function computeVisibleCells(
  sources: GridPos[],
  walls: Set<string>,
  grid: GridConfig,
  range?: number,
): Set<string> {
  const visible = new Set<string>();
  if (sources.length === 0) return visible;
  const cols = grid.cols ?? 0;
  const rows = grid.rows ?? 0;
  if (cols === 0 || rows === 0) return visible;

  for (const src of sources) {
    // El origen siempre es visible (aunque sea una pared).
    visible.add(`${src.col},${src.row}`);
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        if (range !== undefined && chebyshev(src, { col: c, row: r }) > range)
          continue;
        if (hasLineOfSight(src, { col: c, row: r }, walls)) {
          visible.add(`${c},${r}`);
        }
      }
    }
  }
  return visible;
}
