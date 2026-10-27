// Engine: dados. Puro TS, sin React ni Supabase — testeable en Node
// y ejecutable server-side dentro de una Edge Function si en el futuro
// queremos validar allí.

export type DiceGroup = {
  /** Nº de dados a lanzar (1-100). */
  count: number;
  /** Caras (2-1000). */
  sides: number;
};

export type DiceExpression = {
  groups: DiceGroup[];
  /** Sumado al total final. Puede ser negativo. */
  modifier: number;
};

/** Resultado de UN grupo, tal como lo devuelve el server. */
export type RolledGroup = {
  count: number;
  sides: number;
  values: number[];
};

/** Payload completo persistido en dice_rolls.results. */
export type RollResults = RolledGroup[];

export type ParseResult =
  | { ok: true; expression: DiceExpression }
  | { ok: false; error: string };
