import { describe, expect, it } from "vitest";
import { parseDiceFormula } from "./parse";

describe("parseDiceFormula", () => {
  it("parses 1d20", () => {
    const r = parseDiceFormula("1d20");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.expression.groups).toEqual([{ count: 1, sides: 20 }]);
      expect(r.expression.modifier).toBe(0);
    }
  });

  it("implicit 1 for 'd20'", () => {
    const r = parseDiceFormula("d20");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.expression.groups).toEqual([{ count: 1, sides: 20 }]);
  });

  it("handles positive modifier", () => {
    const r = parseDiceFormula("1d20+5");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.expression.modifier).toBe(5);
  });

  it("handles negative modifier", () => {
    const r = parseDiceFormula("1d20-2");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.expression.modifier).toBe(-2);
  });

  it("handles multiple dice groups", () => {
    const r = parseDiceFormula("2d6+1d4+3");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.expression.groups).toEqual([
        { count: 2, sides: 6 },
        { count: 1, sides: 4 },
      ]);
      expect(r.expression.modifier).toBe(3);
    }
  });

  it("ignores whitespace", () => {
    const r = parseDiceFormula("  2 d 6  +  3  ");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.expression.groups).toEqual([{ count: 2, sides: 6 }]);
      expect(r.expression.modifier).toBe(3);
    }
  });

  it("case insensitive", () => {
    const r = parseDiceFormula("1D20");
    expect(r.ok).toBe(true);
  });

  it("rejects empty input", () => {
    const r = parseDiceFormula("");
    expect(r.ok).toBe(false);
  });

  it("rejects modifier-only", () => {
    const r = parseDiceFormula("5");
    expect(r.ok).toBe(false);
  });

  it("rejects subtracting dice (not supported)", () => {
    const r = parseDiceFormula("1d20-1d4");
    expect(r.ok).toBe(false);
  });

  it("rejects nonsense tokens", () => {
    const r = parseDiceFormula("hello");
    expect(r.ok).toBe(false);
  });

  it("rejects too many dice", () => {
    const r = parseDiceFormula("101d6");
    expect(r.ok).toBe(false);
  });

  it("rejects too many sides", () => {
    const r = parseDiceFormula("1d10000");
    expect(r.ok).toBe(false);
  });

  it("rejects d1", () => {
    const r = parseDiceFormula("1d1");
    expect(r.ok).toBe(false);
  });

  it("accumulates multiple positive/negative modifiers", () => {
    const r = parseDiceFormula("1d20+3+2-1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.expression.modifier).toBe(4);
  });
});
