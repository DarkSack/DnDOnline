import { describe, expect, it } from "vitest";
import {
  computeTotal,
  formatBreakdown,
  formatExpression,
  isCrit,
  isFumble,
} from "./format";

describe("formatExpression", () => {
  it("formats single group with positive mod", () => {
    expect(
      formatExpression({ groups: [{ count: 1, sides: 20 }], modifier: 5 }),
    ).toBe("1d20 + 5");
  });

  it("formats with negative mod", () => {
    expect(
      formatExpression({ groups: [{ count: 1, sides: 20 }], modifier: -3 }),
    ).toBe("1d20 − 3");
  });

  it("formats multiple groups without mod", () => {
    expect(
      formatExpression({
        groups: [
          { count: 2, sides: 6 },
          { count: 1, sides: 4 },
        ],
        modifier: 0,
      }),
    ).toBe("2d6 + 1d4");
  });
});

describe("formatBreakdown", () => {
  it("joins values and modifier", () => {
    expect(
      formatBreakdown([{ count: 2, sides: 6, values: [3, 5] }], 4),
    ).toBe("3 + 5 + 4");
  });

  it("wraps negative modifier in parens", () => {
    expect(
      formatBreakdown([{ count: 1, sides: 20, values: [10] }], -2),
    ).toBe("10 + (-2)");
  });

  it("omits modifier when zero", () => {
    expect(
      formatBreakdown([{ count: 1, sides: 20, values: [15] }], 0),
    ).toBe("15");
  });
});

describe("computeTotal", () => {
  it("sums values and modifier", () => {
    expect(
      computeTotal([{ count: 2, sides: 6, values: [3, 5] }], 4),
    ).toBe(12);
  });

  it("handles empty groups", () => {
    expect(computeTotal([], 7)).toBe(7);
  });

  it("supports negative modifier", () => {
    expect(computeTotal([{ count: 1, sides: 4, values: [3] }], -1)).toBe(2);
  });
});

describe("isCrit / isFumble", () => {
  it("detects nat 20 on d20", () => {
    expect(isCrit([{ count: 1, sides: 20, values: [20] }])).toBe(true);
  });

  it("does not flag crit if no d20", () => {
    expect(isCrit([{ count: 1, sides: 6, values: [6] }])).toBe(false);
  });

  it("detects fumble when all d20 rolls are 1", () => {
    expect(isFumble([{ count: 2, sides: 20, values: [1, 1] }])).toBe(true);
  });

  it("not fumble if one d20 isn't 1", () => {
    expect(isFumble([{ count: 2, sides: 20, values: [1, 5] }])).toBe(false);
  });

  it("no fumble without d20", () => {
    expect(isFumble([{ count: 1, sides: 6, values: [1] }])).toBe(false);
  });
});
