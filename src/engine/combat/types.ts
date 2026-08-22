// Engine: combate. Puro TS, sin React ni Supabase.

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

export type CombatState = {
  id: string;
  room_id: string;
  active: boolean;
  round: number;
  /** Índice dentro del array (posición ordenada), no order_idx. */
  current_turn_idx: number;
  combatants: Combatant[];
  created_at: string;
  ended_at: string | null;
};
