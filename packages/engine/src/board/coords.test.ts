import { describe, expect, it } from "vitest";
import {
  clampScale,
  gridCenter,
  gridToWorld,
  MAX_SCALE,
  MIN_SCALE,
  screenToWorld,
  snapToGrid,
  visibleCellRange,
  worldToGrid,
  worldToScreen,
  zoomAt,
} from "./coords";

const G = { cellSize: 64 };

describe("worldToGrid / gridToWorld", () => {
  it("origin maps to (0,0)", () => {
    expect(worldToGrid({ x: 0, y: 0 }, G)).toEqual({ col: 0, row: 0 });
  });

  it("floors negative coords", () => {
    expect(worldToGrid({ x: -1, y: -1 }, G)).toEqual({ col: -1, row: -1 });
  });

  it("gridToWorld returns top-left of cell", () => {
    expect(gridToWorld({ col: 2, row: 3 }, G)).toEqual({ x: 128, y: 192 });
  });

  it("gridCenter returns center of cell", () => {
    expect(gridCenter({ col: 2, row: 3 }, G)).toEqual({ x: 160, y: 224 });
  });

  it("snapToGrid aligns to cell top-left", () => {
    expect(snapToGrid({ x: 100, y: 50 }, G)).toEqual({ x: 64, y: 0 });
  });
});

describe("screenToWorld / worldToScreen", () => {
  it("inverse of each other", () => {
    const vp = { x: 100, y: 50, scale: 2 };
    const world = { x: 30, y: 40 };
    const back = screenToWorld(worldToScreen(world, vp), vp);
    expect(back.x).toBeCloseTo(30);
    expect(back.y).toBeCloseTo(40);
  });

  it("respects scale", () => {
    const vp = { x: 0, y: 0, scale: 2 };
    expect(worldToScreen({ x: 10, y: 10 }, vp)).toEqual({ x: 20, y: 20 });
  });
});

describe("zoomAt", () => {
  it("keeps screen point fixed", () => {
    const vp = { x: 0, y: 0, scale: 1 };
    const point = { x: 100, y: 100 };
    const next = zoomAt(vp, point, 2);
    // World coord under `point` should be the same before and after.
    const beforeWorld = screenToWorld(point, vp);
    const afterWorld = screenToWorld(point, next);
    expect(afterWorld.x).toBeCloseTo(beforeWorld.x);
    expect(afterWorld.y).toBeCloseTo(beforeWorld.y);
  });
});

describe("clampScale", () => {
  it("clamps below MIN_SCALE", () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE);
  });
  it("clamps above MAX_SCALE", () => {
    expect(clampScale(100)).toBe(MAX_SCALE);
  });
  it("passes through valid values", () => {
    expect(clampScale(1)).toBe(1);
  });
});

describe("visibleCellRange", () => {
  it("returns range covering the whole canvas at zoom 1", () => {
    const range = visibleCellRange(
      { x: 0, y: 0, scale: 1 },
      256,
      128,
      G,
    );
    expect(range.colStart).toBe(0);
    expect(range.rowStart).toBe(0);
    expect(range.colEnd).toBe(4);
    expect(range.rowEnd).toBe(2);
  });

  it("shifts by pan", () => {
    const range = visibleCellRange(
      { x: -128, y: 0, scale: 1 },
      256,
      64,
      G,
    );
    expect(range.colStart).toBe(2);
    expect(range.colEnd).toBe(6);
  });
});
