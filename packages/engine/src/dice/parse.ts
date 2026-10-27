import type { DiceGroup, ParseResult } from "./types";

const MAX_COUNT = 100;
const MAX_SIDES = 1000;

/**
 * Parsea una fórmula de dados aditiva.
 *
 * Soporta:
 *  - "1d20"
 *  - "d20"          (implícito 1 dado)
 *  - "2d6+3"
 *  - "2d6 + 1d4 + 3"
 *  - "1d20-2"
 *  - "5"            (modificador puro, sin dados) — rechazado, se requiere ≥1 grupo
 *
 * No soporta (aún): "1d20-1d4", multiplicación, ventaja/desventaja.
 */
export function parseDiceFormula(input: string): ParseResult {
  const clean = input.trim();
  if (!clean) return { ok: false, error: "Fórmula vacía" };

  const normalized = clean.replace(/\s+/g, "");
  // Split manteniendo el signo con cada token: "2d6+1d4-3" → ["2d6","+1d4","-3"]
  const rawParts = normalized.split(/(?=[+-])/);

  const groups: DiceGroup[] = [];
  let modifier = 0;

  for (const raw of rawParts) {
    if (!raw) continue;
    const sign = raw.startsWith("-") ? -1 : 1;
    const body = raw.replace(/^[+-]/, "");
    if (!body) return { ok: false, error: `Token vacío en "${raw}"` };

    const diceMatch = body.match(/^(\d*)d(\d+)$/i);
    if (diceMatch) {
      if (sign === -1) {
        return { ok: false, error: "Restar dados aún no está soportado" };
      }
      const countStr = diceMatch[1];
      const count = countStr === "" ? 1 : Number.parseInt(countStr, 10);
      const sides = Number.parseInt(diceMatch[2], 10);
      if (!Number.isFinite(count) || count < 1 || count > MAX_COUNT) {
        return { ok: false, error: `Cantidad de dados inválida: ${count}` };
      }
      if (!Number.isFinite(sides) || sides < 2 || sides > MAX_SIDES) {
        return { ok: false, error: `Caras inválidas: d${sides}` };
      }
      groups.push({ count, sides });
      continue;
    }

    if (/^\d+$/.test(body)) {
      modifier += sign * Number.parseInt(body, 10);
      continue;
    }

    return { ok: false, error: `Token inválido: "${raw}"` };
  }

  if (groups.length === 0) {
    return { ok: false, error: "Debe haber al menos un grupo de dados" };
  }

  return { ok: true, expression: { groups, modifier } };
}
