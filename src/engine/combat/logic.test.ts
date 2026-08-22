import { describe, expect, it } from "vitest";
import {
  addCombatant,
  currentCombatant,
  hasActedThisRound,
  nextTurn,
  removeCombatant,
  sortCombatants,
  updateInitiative,
} from "./logic";
import type { Combatant, CombatState } from "./types";

const mk = (partial: Partial<Combatant> & { name: string }): Combatant => ({
  entity_id: partial.entity_id ?? partial.name,
  name: partial.name,
  initiative: partial.initiative ?? 10,
  bonus: partial.bonus ?? 0,
  roll: partial.roll ?? partial.initiative ?? 10,
  order_idx: partial.order_idx ?? 0,
});

const mkState = (combatants: Combatant[]): CombatState => ({
  id: "c1",
  room_id: "r1",
  active: true,
  round: 1,
  current_turn_idx: 0,
  combatants,
  created_at: new Date().toISOString(),
  ended_at: null,
});

describe("sortCombatants", () => {
  it("orders by initiative desc", () => {
    const list = [
      mk({ name: "A", initiative: 10 }),
      mk({ name: "B", initiative: 18 }),
      mk({ name: "C", initiative: 5 }),
    ];
    expect(sortCombatants(list).map((c) => c.name)).toEqual([
      "B",
      "A",
      "C",
    ]);
  });

  it("breaks ties by roll then bonus then name", () => {
    const list = [
      mk({ name: "Zed", initiative: 15, roll: 12 }),
      mk({ name: "Ana", initiative: 15, roll: 12 }),
      mk({ name: "Bob", initiative: 15, roll: 14 }),
    ];
    expect(sortCombatants(list).map((c) => c.name)).toEqual([
      "Bob", // higher roll
      "Ana", // alphabetically before Zed
      "Zed",
    ]);
  });
});

describe("nextTurn", () => {
  it("advances index", () => {
    const s = mkState([
      mk({ name: "A", order_idx: 0 }),
      mk({ name: "B", order_idx: 1 }),
    ]);
    expect(nextTurn(s).current_turn_idx).toBe(1);
  });

  it("wraps and increments round", () => {
    const s = mkState([
      mk({ name: "A", order_idx: 0 }),
      mk({ name: "B", order_idx: 1 }),
    ]);
    s.current_turn_idx = 1;
    const next = nextTurn(s);
    expect(next.current_turn_idx).toBe(0);
    expect(next.round).toBe(2);
  });

  it("no-op with empty combatants", () => {
    const s = mkState([]);
    expect(nextTurn(s)).toEqual(s);
  });
});

describe("addCombatant", () => {
  it("inserts sorted; adjusts current_turn_idx if inserted before", () => {
    const s = mkState([
      mk({ name: "A", initiative: 15, order_idx: 0 }),
      mk({ name: "B", initiative: 10, order_idx: 1 }),
    ]);
    s.current_turn_idx = 1; // B's turn
    // Insert C with init 20 (will go to position 0)
    const next = addCombatant(s, {
      entity_id: "C",
      name: "C",
      initiative: 20,
      bonus: 0,
      roll: 20,
    });
    expect(next.combatants.map((c) => c.name)).toEqual(["C", "A", "B"]);
    expect(next.current_turn_idx).toBe(2); // still B
  });

  it("does not shift current if inserted after", () => {
    const s = mkState([
      mk({ name: "A", initiative: 15, order_idx: 0 }),
      mk({ name: "B", initiative: 10, order_idx: 1 }),
    ]);
    s.current_turn_idx = 0; // A's turn
    const next = addCombatant(s, {
      entity_id: "C",
      name: "C",
      initiative: 5, // last
      bonus: 0,
      roll: 5,
    });
    expect(next.combatants.map((c) => c.name)).toEqual(["A", "B", "C"]);
    expect(next.current_turn_idx).toBe(0);
  });
});

describe("removeCombatant", () => {
  it("decrements current if removed before", () => {
    const s = mkState([
      mk({ name: "A", order_idx: 0 }),
      mk({ name: "B", order_idx: 1 }),
      mk({ name: "C", order_idx: 2 }),
    ]);
    s.current_turn_idx = 2; // C's turn
    const next = removeCombatant(s, "A");
    expect(next.combatants.map((c) => c.name)).toEqual(["B", "C"]);
    expect(next.current_turn_idx).toBe(1); // still C
  });

  it("keeps current if removed is current (next inherits)", () => {
    const s = mkState([
      mk({ name: "A", order_idx: 0 }),
      mk({ name: "B", order_idx: 1 }),
      mk({ name: "C", order_idx: 2 }),
    ]);
    s.current_turn_idx = 1; // B's turn
    const next = removeCombatant(s, "B");
    expect(next.combatants.map((c) => c.name)).toEqual(["A", "C"]);
    expect(next.current_turn_idx).toBe(1); // now C
  });

  it("clamps current if remove last combatant while current", () => {
    const s = mkState([
      mk({ name: "A", order_idx: 0 }),
      mk({ name: "B", order_idx: 1 }),
    ]);
    s.current_turn_idx = 1; // B
    const next = removeCombatant(s, "B");
    expect(next.combatants.map((c) => c.name)).toEqual(["A"]);
    expect(next.current_turn_idx).toBe(0);
  });

  it("no-op on unknown id", () => {
    const s = mkState([mk({ name: "A", order_idx: 0 })]);
    expect(removeCombatant(s, "X")).toEqual(s);
  });
});

describe("updateInitiative", () => {
  it("re-sorts and preserves whose turn it is", () => {
    const s = mkState([
      mk({ entity_id: "A", name: "A", initiative: 15, order_idx: 0 }),
      mk({ entity_id: "B", name: "B", initiative: 10, order_idx: 1 }),
    ]);
    s.current_turn_idx = 1; // B
    const next = updateInitiative(s, "B", 20);
    expect(next.combatants.map((c) => c.entity_id)).toEqual(["B", "A"]);
    expect(next.current_turn_idx).toBe(0); // still B, now at position 0
  });
});

describe("currentCombatant / hasActedThisRound", () => {
  it("currentCombatant", () => {
    const s = mkState([
      mk({ name: "A", order_idx: 0 }),
      mk({ name: "B", order_idx: 1 }),
    ]);
    s.current_turn_idx = 1;
    expect(currentCombatant(s)?.name).toBe("B");
  });

  it("hasActedThisRound is true for combatants before current", () => {
    const s = mkState([
      mk({ name: "A", order_idx: 0 }),
      mk({ name: "B", order_idx: 1 }),
    ]);
    s.current_turn_idx = 1;
    expect(hasActedThisRound(s, s.combatants[0])).toBe(true);
    expect(hasActedThisRound(s, s.combatants[1])).toBe(false);
  });
});
