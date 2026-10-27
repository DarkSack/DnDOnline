import { describe, expect, it } from "vitest";
import { emptyCharacterSheet } from "./defaults";
import {
  abilityModifier,
  allModifiers,
  formatModifier,
  initiativeBonus,
  passivePerception,
  proficiencyBonus,
  savingThrowBonus,
  skillBonus,
} from "./modifiers";

describe("abilityModifier", () => {
  it("returns 0 for score 10", () => {
    expect(abilityModifier(10)).toBe(0);
  });
  it("returns +5 for score 20", () => {
    expect(abilityModifier(20)).toBe(5);
  });
  it("returns -1 for score 8", () => {
    expect(abilityModifier(8)).toBe(-1);
  });
  it("returns -5 for score 1", () => {
    expect(abilityModifier(1)).toBe(-5);
  });
  it("handles score > 20", () => {
    expect(abilityModifier(30)).toBe(10);
  });
});

describe("formatModifier", () => {
  it("prepends + for positive", () => {
    expect(formatModifier(3)).toBe("+3");
  });
  it("prepends + for zero", () => {
    expect(formatModifier(0)).toBe("+0");
  });
  it("keeps negative sign", () => {
    expect(formatModifier(-2)).toBe("-2");
  });
});

describe("proficiencyBonus", () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [16, 5],
    [17, 6],
    [20, 6],
  ])("level %i → +%i", (lvl, expected) => {
    expect(proficiencyBonus(lvl)).toBe(expected);
  });

  it("clamps at 2 for level 0/negative", () => {
    expect(proficiencyBonus(0)).toBe(2);
    expect(proficiencyBonus(-5)).toBe(2);
  });
});

describe("initiativeBonus", () => {
  it("derives from DEX when no override", () => {
    const sheet = emptyCharacterSheet();
    sheet.abilities.dex = 16;
    expect(initiativeBonus(sheet)).toBe(3);
  });

  it("uses override when set", () => {
    const sheet = emptyCharacterSheet();
    sheet.abilities.dex = 16;
    sheet.combat.initiativeBonus = 7;
    expect(initiativeBonus(sheet)).toBe(7);
  });

  it("respects override of 0 (not treated as missing)", () => {
    const sheet = emptyCharacterSheet();
    sheet.abilities.dex = 20;
    sheet.combat.initiativeBonus = 0;
    expect(initiativeBonus(sheet)).toBe(0);
  });
});

describe("allModifiers", () => {
  it("returns object with all 6 abilities", () => {
    const mods = allModifiers({
      str: 10,
      dex: 14,
      con: 16,
      int: 8,
      wis: 12,
      cha: 20,
    });
    expect(mods).toEqual({
      str: 0,
      dex: 2,
      con: 3,
      int: -1,
      wis: 1,
      cha: 5,
    });
  });
});

describe("competencias", () => {
  const sheet = () => {
    const s = emptyCharacterSheet();
    s.identity.level = 5; // competencia +3
    s.abilities.dex = 16; // +3
    s.abilities.wis = 12; // +1
    return s;
  };

  it("salvación: suma la competencia solo si la tiene", () => {
    const s = sheet();
    expect(savingThrowBonus(s, "dex")).toBe(3);
    s.proficiencies = { saves: ["dex"], skills: [] };
    expect(savingThrowBonus(s, "dex")).toBe(6);
    expect(savingThrowBonus(s, "wis")).toBe(1);
  });

  it("habilidad: competencia simple, pericia doble y la característica que toca", () => {
    const s = sheet();
    s.proficiencies = { saves: [], skills: ["stealth", "perception"], expertise: ["stealth"] };
    expect(skillBonus(s, "stealth")).toBe(3 + 6);
    expect(skillBonus(s, "perception")).toBe(1 + 3);
    expect(skillBonus(s, "acrobatics")).toBe(3);
    expect(passivePerception(s)).toBe(14);
  });

  it("pericia sin competencia no suma nada", () => {
    const s = sheet();
    s.proficiencies = { saves: [], skills: [], expertise: ["stealth"] };
    expect(skillBonus(s, "stealth")).toBe(3);
  });

  it("una ficha antigua sin competencias usa solo los modificadores", () => {
    const s = sheet();
    delete s.proficiencies;
    expect(savingThrowBonus(s, "dex")).toBe(3);
    expect(passivePerception(s)).toBe(11);
  });
});
