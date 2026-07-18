import { describe, expect, it } from "vitest";
import { canStartGeneratorOverloadWindup, createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { DEFAULT_NIGHT_FEATURES } from "../difficulty/nightConfig";
import { GENERATOR_OVERLOAD_DOOR_DURATION_MS, GENERATOR_OVERLOAD_WINDUP_DURATION_MS } from "../balancing/constants";
import { GameState } from "./types";

// Základ pro budoucí Titana (viz TODO.md) — přetížení generátoru dnes VŽDY
// zničí dveře, žádná podmínka na monstru/stage tu (schválně) neexistuje.

function stateAtGenerator(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01, { nightFeatures: { ...DEFAULT_NIGHT_FEATURES, generatorOverloadEnabled: true } }),
    isRunning: true,
    playerView: "generator",
    ...overrides,
  };
}

describe("canStartGeneratorOverloadWindup — button availability", () => {
  it("false when generatorOverloadEnabled is off (before night 5, non-admin)", () => {
    const state = stateAtGenerator({ nightFeatures: { ...DEFAULT_NIGHT_FEATURES, generatorOverloadEnabled: false } });
    expect(canStartGeneratorOverloadWindup(state)).toBe(false);
  });

  it("true when generatorOverloadEnabled is on (night 5+, or admin from night 1)", () => {
    expect(canStartGeneratorOverloadWindup(stateAtGenerator())).toBe(true);
  });

  it("false when not looking at the generator", () => {
    expect(canStartGeneratorOverloadWindup(stateAtGenerator({ playerView: "desk" }))).toBe(false);
  });

  it("false while the generator isn't in its normal state (fault/restarting)", () => {
    expect(canStartGeneratorOverloadWindup(stateAtGenerator({ generatorState: "criticalBeeping" }))).toBe(false);
    expect(canStartGeneratorOverloadWindup(stateAtGenerator({ generatorState: "restarting" }))).toBe(false);
  });

  it("false once the door is already destroyed", () => {
    expect(canStartGeneratorOverloadWindup(stateAtGenerator({ doorDestroyed: true, doorClosed: false }))).toBe(false);
  });

  it("false while an overload is already in progress", () => {
    expect(canStartGeneratorOverloadWindup(stateAtGenerator({ doorGeneratorOverloadUntilMs: 5000 }))).toBe(false);
  });

  it("false while the windup is already active (no double-fire)", () => {
    const state = stateAtGenerator({ generatorOverloadWindup: { active: true, startedAtMs: 0, progressMs: 100 } });
    expect(canStartGeneratorOverloadWindup(state)).toBe(false);
  });
});

describe("START_GENERATOR_OVERLOAD_WINDUP / CANCEL_GENERATOR_OVERLOAD_WINDUP", () => {
  it("starts the windup when allowed", () => {
    const reducer = createGameReducer(NIGHT_01);
    const result = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    expect(result.generatorOverloadWindup).toEqual({ active: true, startedAtMs: 0, progressMs: 0 });
  });

  it("is a no-op when not allowed (e.g. night feature off)", () => {
    const state = stateAtGenerator({ nightFeatures: { ...DEFAULT_NIGHT_FEATURES, generatorOverloadEnabled: false } });
    const reducer = createGameReducer(NIGHT_01);
    const result = reducer(state, { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    expect(result).toBe(state);
  });

  it("CANCEL stops an active windup", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const result = reducer(started, { type: "CANCEL_GENERATOR_OVERLOAD_WINDUP" });
    expect(result.generatorOverloadWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("navigating away from the generator view cancels an active windup", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const result = reducer(started, { type: "LOOK_AT_DESK" });
    expect(result.generatorOverloadWindup.active).toBe(false);
  });
});

describe("generator overload windup — reaches ready via TICK, same duration as emergency run windup", () => {
  it("does not become ready before GENERATOR_OVERLOAD_WINDUP_DURATION_MS", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const ticked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_WINDUP_DURATION_MS - 1 });
    expect(ticked.generatorOverloadWindup.active).toBe(true);
    expect(ticked.generatorOverloadReadySeq).toBe(0);
  });

  it("becomes ready (readySeq bumps, windup clears) once GENERATOR_OVERLOAD_WINDUP_DURATION_MS elapses", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator(), { type: "START_GENERATOR_OVERLOAD_WINDUP" });
    const ticked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_WINDUP_DURATION_MS });
    expect(ticked.generatorOverloadWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
    expect(ticked.generatorOverloadReadySeq).toBe(1);
  });
});

describe("START_GENERATOR_OVERLOAD — the actual 10s overload", () => {
  it("locks the door (doorGeneratorOverloadUntilMs set), forces it open, and behaves energetically like a restart", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtGenerator({ elapsedMs: 1000, doorClosed: true });
    const result = reducer(state, { type: "START_GENERATOR_OVERLOAD" });

    expect(result.doorClosed).toBe(false);
    expect(result.doorGeneratorOverloadUntilMs).toBe(1000 + GENERATOR_OVERLOAD_DOOR_DURATION_MS);
    // Stejná energetická logika jako RESTART_GENERATOR — generatorState
    // "restarting" + generatorRestartUntilMs, beze změny updateGenerator.
    expect(result.generatorState).toBe("restarting");
    expect(result.generatorRestartUntilMs).toBe(1000 + GENERATOR_OVERLOAD_DOOR_DURATION_MS);
    expect(result.doorDestroyed).toBe(false);
  });

  it("is a no-op if the generator isn't normal, or the door is already destroyed/overloading", () => {
    const reducer = createGameReducer(NIGHT_01);
    const faulted = stateAtGenerator({ generatorState: "criticalBeeping" });
    expect(reducer(faulted, { type: "START_GENERATOR_OVERLOAD" })).toBe(faulted);

    const destroyed = stateAtGenerator({ doorDestroyed: true, doorClosed: false });
    expect(reducer(destroyed, { type: "START_GENERATOR_OVERLOAD" })).toBe(destroyed);

    const overloading = stateAtGenerator({ doorGeneratorOverloadUntilMs: 5000 });
    expect(reducer(overloading, { type: "START_GENERATOR_OVERLOAD" })).toBe(overloading);
  });
});

describe("TOGGLE_DOOR — locked for the whole 10s overload, not just after", () => {
  it("is a no-op while doorGeneratorOverloadUntilMs is set", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state: GameState = { ...stateAtGenerator(), playerView: "door", doorClosed: false, doorGeneratorOverloadUntilMs: 5000 };
    const result = reducer(state, { type: "TOGGLE_DOOR" });
    expect(result).toBe(state);
    expect(result.doorClosed).toBe(false);
  });
});

describe("overload completion via TICK — destroys the door after exactly GENERATOR_OVERLOAD_DOOR_DURATION_MS", () => {
  it("keeps the door locked (not yet destroyed) 1ms before the deadline", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator({ elapsedMs: 0 }), { type: "START_GENERATOR_OVERLOAD" });
    const ticked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS - 1 });
    expect(ticked.doorDestroyed).toBe(false);
    expect(ticked.doorGeneratorOverloadUntilMs).not.toBeNull();
    expect(ticked.doorClosed).toBe(false);
  });

  it("destroys the door exactly once GENERATOR_OVERLOAD_DOOR_DURATION_MS elapses, and clears the lock", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator({ elapsedMs: 0 }), { type: "START_GENERATOR_OVERLOAD" });
    const ticked = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(ticked.doorDestroyed).toBe(true);
    expect(ticked.doorClosed).toBe(false);
    expect(ticked.doorGeneratorOverloadUntilMs).toBeNull();
    // Stejný tik už také vrátí generátor zpátky na "normal" — identická
    // energetická logika jako RESTART_GENERATOR (updateGenerator beze změny).
    expect(ticked.generatorState).toBe("normal");
  });

  it("the door stays destroyed and TOGGLE_DOOR remains a no-op afterwards", () => {
    const reducer = createGameReducer(NIGHT_01);
    const started = reducer(stateAtGenerator({ elapsedMs: 0 }), { type: "START_GENERATOR_OVERLOAD" });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    const doorState: GameState = { ...finished, playerView: "door" };
    const toggled = reducer(doorState, { type: "TOGGLE_DOOR" });
    expect(toggled).toBe(doorState);
    expect(toggled.doorClosed).toBe(false);
  });
});

describe("RESTART_GENERATOR — unaffected by the new overload mechanism", () => {
  it("still fixes a real fault normally", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtGenerator({ generatorState: "criticalBeeping" });
    const result = reducer(state, { type: "RESTART_GENERATOR" });
    expect(result.generatorState).toBe("normal");
    expect(result.doorGeneratorOverloadUntilMs).toBeNull();
    expect(result.doorDestroyed).toBe(false);
  });

  it("still applies the accidental-restart penalty for a healthy generator, without touching the door", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtGenerator();
    const result = reducer(state, { type: "RESTART_GENERATOR" });
    expect(result.generatorState).toBe("restarting");
    expect(result.doorGeneratorOverloadUntilMs).toBeNull();
    expect(result.doorDestroyed).toBe(false);
    expect(result.doorClosed).toBe(false);
  });
});
