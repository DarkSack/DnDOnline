import type { DiceExpression, RollResults } from "./types";

/** "2d6+3" a partir del AST. */
export function formatExpression(expr: DiceExpression): string {
  const parts = expr.groups.map((g) => `${g.count}d${g.sides}`);
  let out = parts.join(" + ");
  if (expr.modifier > 0) out += ` + ${expr.modifier}`;
  else if (expr.modifier < 0) out += ` − ${Math.abs(expr.modifier)}`;
  return out;
}

/**
 * Breakdown legible de un resultado.
 *   [3, 5] + [4] + 3  →  "3 + 5 + 4 + 3 = 15"
 */
export function formatBreakdown(
  results: RollResults,
  modifier: number,
): string {
  const parts: string[] = [];
  for (const group of results) {
    parts.push(...group.values.map((v) => String(v)));
  }
  if (modifier > 0) parts.push(`${modifier}`);
  else if (modifier < 0) parts.push(`(${modifier})`);
  return parts.join(" + ");
}

/** Suma total (verificable en cliente). */
export function computeTotal(
  results: RollResults,
  modifier: number,
): number {
  let sum = modifier;
  for (const group of results) {
    for (const v of group.values) sum += v;
  }
  return sum;
}

/** Detecta un crítico natural 20 en la primera d20 rolled. Cosmético. */
export function isCrit(results: RollResults): boolean {
  const firstD20 = results.find((g) => g.sides === 20);
  return firstD20?.values.includes(20) ?? false;
}

/** Detecta un fumble natural 1 en la primera d20. */
export function isFumble(results: RollResults): boolean {
  const firstD20 = results.find((g) => g.sides === 20);
  if (!firstD20) return false;
  return firstD20.values.every((v) => v === 1);
}
