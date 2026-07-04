import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";

describe("TICK remainingMs with stressLevel", () => {
  it("ticks down at normal speed when stressLevel is 0 or omitted", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };

    const withoutStress = reducer(state, { type: "TICK", deltaMs: 1000 });
    const withZeroStress = reducer(state, { type: "TICK", deltaMs: 1000, stressLevel: 0 });

    expect(withoutStress.remainingMs).toBeCloseTo(NIGHT_01.durationMs - 1000, 5);
    expect(withZeroStress.remainingMs).toBeCloseTo(NIGHT_01.durationMs - 1000, 5);
  });

  it("ticks down at half speed at max stress (MAX_STRESS_TIME_SLOWDOWN 0.5)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };

    const result = reducer(state, { type: "TICK", deltaMs: 1000, stressLevel: 1 });

    expect(result.remainingMs).toBeCloseTo(NIGHT_01.durationMs - 500, 5);
  });

  it("never jumps remainingMs upward, even if stress drops between ticks", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = { ...createInitialGameState(NIGHT_01), isRunning: true };

    state = reducer(state, { type: "TICK", deltaMs: 1000, stressLevel: 1 });
    const afterHighStress = state.remainingMs;

    state = reducer(state, { type: "TICK", deltaMs: 1000, stressLevel: 0 });
    expect(state.remainingMs).toBeLessThan(afterHighStress);
  });

  it("elapsedMs keeps advancing at real wall-clock speed regardless of stress", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };

    const result = reducer(state, { type: "TICK", deltaMs: 1000, stressLevel: 1 });

    expect(result.elapsedMs).toBe(1000);
  });
});
