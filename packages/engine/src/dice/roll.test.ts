import { describe, expect, it } from "vitest";
import { rollExpression } from "./roll";

const seq = (...values: number[]) => () => values.shift()!;

describe("rollExpression", () => {
  it("suma grupos y modificador", () => {
    const r = rollExpression({ groups: [{ count: 2, sides: 6 }], modifier: 3 }, seq(4, 5));
    expect(r.total).toBe(12);
    expect(r.discarded).toBeNull();
  });

  it("ventaja se queda con el mayor d20", () => {
    const r = rollExpression({ groups: [{ count: 1, sides: 20 }], modifier: 0 }, seq(7, 15), "advantage");
    expect(r.results[0].values).toEqual([15]);
    expect(r.discarded).toBe(7);
  });

  it("desventaja se queda con el menor d20", () => {
    const r = rollExpression({ groups: [{ count: 1, sides: 20 }], modifier: 2 }, seq(7, 15), "disadvantage");
    expect(r.total).toBe(9);
    expect(r.discarded).toBe(15);
  });

  it("ignora ventaja si no empieza por 1d20", () => {
    const r = rollExpression({ groups: [{ count: 2, sides: 20 }], modifier: 0 }, seq(3, 4), "advantage");
    expect(r.total).toBe(7);
    expect(r.discarded).toBeNull();
  });
});
