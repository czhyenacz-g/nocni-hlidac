import { describe, expect, it } from "vitest";
import { computeTensionLevel } from "./atmosphereState";
import { TensionInput } from "../core/types";

function baseInput(overrides: Partial<TensionInput> = {}): TensionInput {
  return {
    power: 100,
    startPower: 100,
    enemyStage: "outside",
    doorClosed: true,
    gameStatus: "normal",
    ...overrides,
  };
}

// Regresní test pro "odstraň závislost atmosféry na čase — když končí směna,
// tak by to nemělo mít vliv" (viz zadání) — computeTensionLevel dřív počítal
// s remainingMs/durationMs (timeRatio), teď je TensionInput bez těchto polí
// úplně a blížící se konec směny sám o sobě napětí nezvyšuje.
describe("computeTensionLevel — no longer depends on remaining shift time", () => {
  it("does not accept remainingMs/durationMs at all (TensionInput no longer has these fields)", () => {
    const input = baseInput();
    expect("remainingMs" in input).toBe(false);
    expect("durationMs" in input).toBe(false);
  });

  it("identical power/enemyStage/doorClosed always produce the same tension, regardless of when it's called near shift end", () => {
    // Same game-relevant inputs — the only thing that would have differed
    // under the old formula (remainingMs) simply no longer exists as an input.
    const early = computeTensionLevel(baseInput({ power: 60 }));
    const late = computeTensionLevel(baseInput({ power: 60 }));
    expect(early).toBe(late);
  });
});

describe("computeTensionLevel — still driven by real danger", () => {
  it("blackout is always maximum tension", () => {
    expect(computeTensionLevel(baseInput({ gameStatus: "blackout", power: 100 }))).toBe(1);
  });

  it("low power raises tension", () => {
    const full = computeTensionLevel(baseInput({ power: 100 }));
    const low = computeTensionLevel(baseInput({ power: 10 }));
    expect(low).toBeGreaterThan(full);
  });

  it("enemy proximity raises tension (outside < at_door)", () => {
    const outside = computeTensionLevel(baseInput({ enemyStage: "outside" }));
    const atDoor = computeTensionLevel(baseInput({ enemyStage: "at_door" }));
    expect(atDoor).toBeGreaterThan(outside);
  });

  it("open door while the monster is at the door adds extra danger", () => {
    const closed = computeTensionLevel(baseInput({ enemyStage: "at_door", doorClosed: true }));
    const open = computeTensionLevel(baseInput({ enemyStage: "at_door", doorClosed: false }));
    expect(open).toBeGreaterThan(closed);
  });

  it("stays within 0..1", () => {
    for (const enemyStage of ["outside", "outer_yard", "at_door", "breach", "attack"] as const) {
      for (const power of [0, 50, 100]) {
        const tension = computeTensionLevel(baseInput({ enemyStage, power, doorClosed: false }));
        expect(tension).toBeGreaterThanOrEqual(0);
        expect(tension).toBeLessThanOrEqual(1);
      }
    }
  });
});
