import type { DiceExpression, RolledGroup } from "./types";

export type RollMode = "normal" | "advantage" | "disadvantage";

/** Entero uniforme en [1, sides]. En el servidor es `crypto.randomInt`. */
export type DieRng = (sides: number) => number;

export type RollOutcome = {
  results: RolledGroup[];
  /** Con ventaja/desventaja: el d20 descartado. */
  discarded: number | null;
  total: number;
};

/**
 * Lanza una expresión. Ventaja y desventaja solo aplican si la expresión
 * empieza por exactamente 1d20 (regla de 5e); si no, se ignoran.
 */
export function rollExpression(expr: DiceExpression, rng: DieRng, mode: RollMode = "normal"): RollOutcome {
  const results = expr.groups.map((g) => ({
    count: g.count,
    sides: g.sides,
    values: Array.from({ length: g.count }, () => rng(g.sides)),
  }));
  let discarded: number | null = null;
  const first = results[0];
  if (mode !== "normal" && first && first.sides === 20 && first.count === 1) {
    const other = rng(20);
    const [kept, drop] =
      (mode === "advantage") === other > first.values[0] ? [other, first.values[0]] : [first.values[0], other];
    first.values = [kept];
    discarded = drop;
  }
  const total = results.reduce((s, g) => s + g.values.reduce((a, v) => a + v, 0), expr.modifier);
  return { results, discarded, total };
}
