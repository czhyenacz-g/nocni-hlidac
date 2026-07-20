import { describe, expect, it } from "vitest";
import { isTitanEncounterActive } from "./titanEncounter";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { NIGHT_15 } from "../nights/night15";
import { GameState } from "./types";

function titanState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(NIGHT_15), screen: "playing", isRunning: true, ...overrides };
}

describe("isTitanEncounterActive", () => {
  it("false on a non-Titan night, regardless of stage/screen", () => {
    const state = { ...createInitialGameState(NIGHT_01), screen: "playing" as const };
    expect(isTitanEncounterActive(state, NIGHT_01)).toBe(false);
  });

  it("true on a Titan night while playing and not yet graveyarded", () => {
    expect(isTitanEncounterActive(titanState({ enemyStage: "outside" }), NIGHT_15)).toBe(true);
    expect(isTitanEncounterActive(titanState({ enemyStage: "at_door" }), NIGHT_15)).toBe(true);
    expect(isTitanEncounterActive(titanState({ enemyStage: "attack" }), NIGHT_15)).toBe(true);
  });

  it("false once Titan is graveyarded (killed by overload)", () => {
    expect(isTitanEncounterActive(titanState({ enemyStage: "graveyard" }), NIGHT_15)).toBe(false);
  });

  it("false once screen leaves 'playing' (death, win, menu, ...)", () => {
    expect(isTitanEncounterActive(titanState({ screen: "death" }), NIGHT_15)).toBe(false);
    expect(isTitanEncounterActive(titanState({ screen: "win" }), NIGHT_15)).toBe(false);
    expect(isTitanEncounterActive(titanState({ screen: "menu" }), NIGHT_15)).toBe(false);
  });
});
