import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { computePowerDrainBreakdown } from "./powerDrain";
import { NIGHT_01 } from "../nights/night01";
import { computeNightScaling } from "../difficulty/nightScaling";
import { GameState } from "./types";

const NO_SCALING = computeNightScaling(1);

// Čistý základ pro budoucí přetížení generátoru (viz TODO.md) — DESTROY_DOOR
// zatím není napojená na žádné produkční UI, jen na tuhle mechaniku samotnou.
// Testy tady ověřují jen holý reducer/power-drain invariant, ne monster
// logiku (resolveImpAdvance zůstává beze změny, viz zadání).

function stateAtDoor(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    playerView: "door",
    ...overrides,
  };
}

describe("doorDestroyed — initial state", () => {
  it("createInitialGameState starts with doorDestroyed: false", () => {
    const state = createInitialGameState(NIGHT_01);
    expect(state.doorDestroyed).toBe(false);
  });
});

describe("DESTROY_DOOR", () => {
  it("destroys a currently closed door — doorDestroyed true, doorClosed forced to false", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: true });

    const result = reducer(state, { type: "DESTROY_DOOR" });

    expect(result.doorDestroyed).toBe(true);
    expect(result.doorClosed).toBe(false);
  });

  it("destroys a currently open door — doorDestroyed true, doorClosed stays false", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: false });

    const result = reducer(state, { type: "DESTROY_DOOR" });

    expect(result.doorDestroyed).toBe(true);
    expect(result.doorClosed).toBe(false);
  });
});

describe("TOGGLE_DOOR after DESTROY_DOOR", () => {
  it("is a no-op — door stays open, doorDestroyed stays true", () => {
    const reducer = createGameReducer(NIGHT_01);
    const destroyed = reducer(stateAtDoor({ doorClosed: true }), { type: "DESTROY_DOOR" });

    const result = reducer(destroyed, { type: "TOGGLE_DOOR" });

    expect(result).toBe(destroyed);
    expect(result.doorClosed).toBe(false);
    expect(result.doorDestroyed).toBe(true);
  });
});

describe("TOGGLE_DOOR without doorDestroyed — unchanged existing behavior", () => {
  it("still flips doorClosed normally when the door is intact", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: false });

    const result = reducer(state, { type: "TOGGLE_DOOR" });

    expect(result.doorClosed).toBe(true);
    expect(result.doorDestroyed).toBe(false);
  });
});

describe("power drain — destroyed (always open) door", () => {
  it("doorDestroyed with doorClosed false draws zero door drain, same as a normal open door", () => {
    const state = stateAtDoor({ doorClosed: false, doorDestroyed: true });
    const breakdown = computePowerDrainBreakdown(state, NIGHT_01, NO_SCALING);

    expect(breakdown.doorDrain).toBe(0);
  });
});
