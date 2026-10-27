import type { Combatant, CombatState } from "./types";

/**
 * Orden por iniciativa descendente. Desempate por roll natural, luego
 * por bonus, luego alfabético — mismo criterio que la RPC start_combat.
 */
export function sortCombatants(list: Combatant[]): Combatant[] {
  return [...list].sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    if (b.roll !== a.roll) return b.roll - a.roll;
    if (b.bonus !== a.bonus) return b.bonus - a.bonus;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Avanza al siguiente turno. Si estamos en el último combatiente,
 * incrementa la ronda y vuelve al índice 0.
 */
export function nextTurn(state: CombatState): CombatState {
  if (state.combatants.length === 0) return state;
  const nextIdx = state.current_turn_idx + 1;
  if (nextIdx >= state.combatants.length) {
    return { ...state, round: state.round + 1, current_turn_idx: 0 };
  }
  return { ...state, current_turn_idx: nextIdx };
}

/**
 * Añade un combatiente mid-combate en su posición ordenada por
 * iniciativa. Si se inserta ANTES del turno actual, incrementa el
 * índice para que siga apuntando a la misma persona.
 */
export function addCombatant(
  state: CombatState,
  combatant: Omit<Combatant, "order_idx">,
): CombatState {
  const maxOrderIdx = state.combatants.reduce(
    (acc, c) => Math.max(acc, c.order_idx),
    -1,
  );
  const full: Combatant = { ...combatant, order_idx: maxOrderIdx + 1 };
  const merged = sortCombatants([...state.combatants, full]);
  const insertedAt = merged.findIndex((c) => c.order_idx === full.order_idx);
  const nextCurrent =
    insertedAt <= state.current_turn_idx
      ? state.current_turn_idx + 1
      : state.current_turn_idx;
  return {
    ...state,
    combatants: merged,
    current_turn_idx: Math.min(nextCurrent, merged.length - 1),
  };
}

/**
 * Elimina un combatiente. Si iba antes del turno actual, decrementa
 * el índice. Si es el combatiente actual, mantiene el índice
 * (el siguiente hereda el turno).
 */
export function removeCombatant(
  state: CombatState,
  entityId: string,
): CombatState {
  const idx = state.combatants.findIndex((c) => c.entity_id === entityId);
  if (idx === -1) return state;
  const combatants = state.combatants.filter((c) => c.entity_id !== entityId);
  if (combatants.length === 0) {
    return { ...state, combatants, current_turn_idx: 0 };
  }
  let current = state.current_turn_idx;
  if (idx < current) current = current - 1;
  current = Math.min(current, combatants.length - 1);
  return { ...state, combatants, current_turn_idx: current };
}

/**
 * Cambia la iniciativa de un combatiente y re-ordena. Ajusta
 * current_turn_idx para que siga apuntando a la misma persona.
 */
export function updateInitiative(
  state: CombatState,
  entityId: string,
  newInitiative: number,
): CombatState {
  if (state.combatants.length === 0) return state;
  const currentEntityId =
    state.combatants[state.current_turn_idx]?.entity_id ?? null;

  const patched = state.combatants.map((c) =>
    c.entity_id === entityId ? { ...c, initiative: newInitiative } : c,
  );
  const sorted = sortCombatants(patched);
  const nextIdx = sorted.findIndex((c) => c.entity_id === currentEntityId);

  return {
    ...state,
    combatants: sorted,
    current_turn_idx: nextIdx >= 0 ? nextIdx : 0,
  };
}

/** Devuelve el combatiente cuyo turno es ahora, o null. */
export function currentCombatant(state: CombatState): Combatant | null {
  return state.combatants[state.current_turn_idx] ?? null;
}

/** Ha actuado esta ronda = está antes del turno actual. */
export function hasActedThisRound(
  state: CombatState,
  combatant: Combatant,
): boolean {
  const idx = state.combatants.indexOf(combatant);
  return idx < state.current_turn_idx;
}
