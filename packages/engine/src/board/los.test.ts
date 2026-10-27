import { describe, expect, it } from "vitest";
import {
  bresenhamLine,
  chebyshev,
  computeVisibleCells,
  hasLineOfSight,
} from "./los";

describe("bresenhamLine", () => {
  it("returns single cell when from === to", () => {
    expect(bresenhamLine({ col: 3, row: 4 }, { col: 3, row: 4 })).toEqual([
      { col: 3, row: 4 },
    ]);
  });

  it("horizontal line", () => {
    expect(bresenhamLine({ col: 0, row: 0 }, { col: 3, row: 0 })).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
    ]);
  });

  it("vertical line reversed", () => {
    expect(bresenhamLine({ col: 0, row: 3 }, { col: 0, row: 0 })).toEqual([
      { col: 0, row: 3 },
      { col: 0, row: 2 },
      { col: 0, row: 1 },
      { col: 0, row: 0 },
    ]);
  });

  it("diagonal", () => {
    expect(bresenhamLine({ col: 0, row: 0 }, { col: 3, row: 3 })).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 1 },
      { col: 2, row: 2 },
      { col: 3, row: 3 },
    ]);
  });
});

describe("hasLineOfSight", () => {
  it("clear path with no walls", () => {
    expect(
      hasLineOfSight({ col: 0, row: 0 }, { col: 5, row: 0 }, new Set()),
    ).toBe(true);
  });

  it("blocked by wall in the middle", () => {
    const walls = new Set(["2,0"]);
    expect(
      hasLineOfSight({ col: 0, row: 0 }, { col: 5, row: 0 }, walls),
    ).toBe(false);
  });

  it("wall at destination does not block (you see the wall)", () => {
    const walls = new Set(["5,0"]);
    expect(
      hasLineOfSight({ col: 0, row: 0 }, { col: 5, row: 0 }, walls),
    ).toBe(true);
  });

  it("wall at source does not block", () => {
    const walls = new Set(["0,0"]);
    expect(
      hasLineOfSight({ col: 0, row: 0 }, { col: 5, row: 0 }, walls),
    ).toBe(true);
  });

  it("same cell always visible", () => {
    const walls = new Set(["3,3"]);
    expect(
      hasLineOfSight({ col: 3, row: 3 }, { col: 3, row: 3 }, walls),
    ).toBe(true);
  });
});

describe("chebyshev", () => {
  it("uses max of absolute deltas", () => {
    expect(chebyshev({ col: 0, row: 0 }, { col: 3, row: 5 })).toBe(5);
    expect(chebyshev({ col: 2, row: 2 }, { col: 5, row: 4 })).toBe(3);
  });

  it("returns 0 for same cell", () => {
    expect(chebyshev({ col: 1, row: 1 }, { col: 1, row: 1 })).toBe(0);
  });
});

describe("computeVisibleCells", () => {
  const grid = { cellSize: 64, cols: 5, rows: 3 };

  it("empty sources returns empty set", () => {
    expect(computeVisibleCells([], new Set(), grid).size).toBe(0);
  });

  it("sees all cells with no walls", () => {
    const v = computeVisibleCells([{ col: 0, row: 0 }], new Set(), grid);
    expect(v.size).toBe(15);
  });

  it("restricted by range", () => {
    const v = computeVisibleCells(
      [{ col: 2, row: 1 }],
      new Set(),
      grid,
      1,
    );
    // 3x3 alrededor de (2,1) = 9 celdas
    expect(v.size).toBe(9);
    expect(v.has("2,1")).toBe(true);
    expect(v.has("3,2")).toBe(true);
    expect(v.has("0,0")).toBe(false);
  });

  it("union of multiple sources", () => {
    const v = computeVisibleCells(
      [{ col: 0, row: 0 }, { col: 4, row: 2 }],
      new Set(),
      grid,
    );
    expect(v.size).toBe(15);
  });

  it("walls block visibility beyond them", () => {
    // Fila horizontal de paredes al medio
    const walls = new Set(["0,1", "1,1", "2,1", "3,1", "4,1"]);
    const v = computeVisibleCells([{ col: 0, row: 0 }], walls, grid);
    // Row 0: 5 celdas visibles
    // Row 1: las paredes (destino) sí, pero solo las alcanzables por LOS
    // Row 2: nada (bloqueado)
    expect(v.has("0,2")).toBe(false);
    expect(v.has("4,2")).toBe(false);
  });
});
