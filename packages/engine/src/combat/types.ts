// Engine: combate. Puro TS, sin React ni red.

export type Combatant = {
  entity_id: string;
  name: string;
  /** Resultado ya sumado (roll + bonus). Es la clave de orden. */
  initiative: number;
  bonus: number;
  /** Valor del d20 al inicio, útil para desempates y display. */
  roll: number;
  /** Índice estable dentro del combate; NO se reordena al añadir/quitar. */
  order_idx: number;
};

/** Estado del combate en curso; dónde se guarda lo decide quien lo usa. */
export type CombatState = {
  round: number;
  /** Índice dentro del array (posición ordenada), no order_idx. */
  current_turn_idx: number;
  combatants: Combatant[];
};
