import { describe, expect, it } from "vitest";
import { resolveDoorMonsterOverlay } from "./doorMonsterOverlay";

// Regresní testy pro "at_door obrázky" (viz zadání) — Imp používá
// imp_at_door, Titan používá titan_at_door, oba VÝHRADNĚ při otevřených
// dveřích; mimo at_door se nikdy nepoužijí; breach zůstává beze změny
// (nezávisí na doorClosed).

function baseInput(overrides: Partial<Parameters<typeof resolveDoorMonsterOverlay>[0]> = {}) {
  return { doorClosed: false, isImpAtDoor: false, isTitanAtDoor: false, isTitanBreach: false, ...overrides };
}

describe("resolveDoorMonsterOverlay — Imp at_door", () => {
  it("open door + Imp at_door -> imp_at_door", () => {
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: false, isImpAtDoor: true }))).toBe("imp_at_door");
  });

  it("closed door + Imp at_door -> null (obrázek se nepoužije)", () => {
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: true, isImpAtDoor: true }))).toBeNull();
  });

  it("open door but Imp NOT at_door -> null", () => {
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: false, isImpAtDoor: false }))).toBeNull();
  });
});

describe("resolveDoorMonsterOverlay — Titan at_door", () => {
  it("open door + Titan at_door -> titan_at_door", () => {
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: false, isTitanAtDoor: true }))).toBe("titan_at_door");
  });

  it("closed door + Titan at_door -> null (obrázek se nepoužije, breach beze změny)", () => {
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: true, isTitanAtDoor: true }))).toBeNull();
  });

  it("open door but Titan NOT at_door -> null", () => {
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: false, isTitanAtDoor: false }))).toBeNull();
  });
});

describe("resolveDoorMonsterOverlay — Titan breach stays unaffected by door state", () => {
  it("breach + open door -> titan_breach", () => {
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: false, isTitanBreach: true }))).toBe("titan_breach");
  });

  it("breach + closed door -> STILL titan_breach (breach obrázky zůstávají beze změny)", () => {
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: true, isTitanBreach: true }))).toBe("titan_breach");
  });

  it("breach takes priority over isTitanAtDoor if both were somehow true", () => {
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: false, isTitanAtDoor: true, isTitanBreach: true }))).toBe(
      "titan_breach",
    );
  });
});

describe("resolveDoorMonsterOverlay — never used outside at_door/breach", () => {
  it("all flags false -> null regardless of door state", () => {
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: false }))).toBeNull();
    expect(resolveDoorMonsterOverlay(baseInput({ doorClosed: true }))).toBeNull();
  });
});
