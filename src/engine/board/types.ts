// Engine: tipos del tablero. Sin React, sin Pixi. Solo primitivas
// matemáticas y de dominio reutilizables por el renderer, el server
// side (Fase 5c: validación de movimientos) y los tests.

export type Vec2 = { x: number; y: number };

/** Coordenada en celdas del grid (enteros). */
export type GridPos = { col: number; row: number };

export type GridConfig = {
  /** Tamaño de una celda en unidades del mundo (px lógicos). */
  cellSize: number;
  /** Ancho del tablero en celdas. Si undefined = infinito. */
  cols?: number;
  /** Alto del tablero en celdas. Si undefined = infinito. */
  rows?: number;
};

export type EntityKind = "pc" | "npc" | "monster";

/** Tamaño de la criatura en celdas (D&D: 1=medium, 2=large, 3=huge, 4=gargantuan). */
export type EntitySize = 1 | 2 | 3 | 4;

export type BoardEntity = {
  id: string;
  kind: EntityKind;
  pos: GridPos;
  size: EntitySize;
  name: string;
  /** Color CSS/hex; el renderer lo interpreta. */
  color?: string;
  hp?: number;
  hpMax?: number;
  visible: boolean;
  /** Character asignado (para PCs). */
  characterId?: string;
};

export type Viewport = {
  /** Traslación en px de la cámara. */
  x: number;
  y: number;
  /** Factor de zoom (1 = 100%). */
  scale: number;
};

export const DEFAULT_CELL_SIZE = 64;

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };
