import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";

describe("TICK power drain with currentNight", () => {
  it("drains power at the base rate on night 1 (or when currentNight is omitted)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, doorClosed: true };

    const withoutNight = reducer(state, { type: "TICK", deltaMs: 1000 });
    const withNight1 = reducer(state, { type: "TICK", deltaMs: 1000, currentNight: 1 });

    expect(withoutNight.power).toBeCloseTo(withNight1.power, 5);
  });

  it("drains power faster on a later night (currentNight 5, +25%)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, doorClosed: true };

    const night1 = reducer(state, { type: "TICK", deltaMs: 1000, currentNight: 1 });
    const night5 = reducer(state, { type: "TICK", deltaMs: 1000, currentNight: 5 });

    expect(night5.power).toBeLessThan(night1.power);
  });

  it("does not scale recharge (idle, no drain source, night 5 vs night 1 identical)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };

    const night1 = reducer(state, { type: "TICK", deltaMs: 1000, currentNight: 1 });
    const night5 = reducer(state, { type: "TICK", deltaMs: 1000, currentNight: 5 });

    expect(night5.power).toBeCloseTo(night1.power, 5);
  });
});

describe("TICK stress time slowdown with currentNight (viz zadání 'lze tam zohlednit počet nocí')", () => {
  it("same stress slows remainingMs down more on a later night (currentNight 10 vs 1)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };

    const night1 = reducer(state, { type: "TICK", deltaMs: 1000, currentNight: 1, stressLevel: 1 });
    const night10 = reducer(state, { type: "TICK", deltaMs: 1000, currentNight: 10, stressLevel: 1 });

    // Night 1: scale 0.5 -> remainingMs drops by 500. Night 10: scale 0.25 -> drops by 250.
    expect(night10.remainingMs).toBeGreaterThan(night1.remainingMs);
  });

  it("with no stress, night number makes no difference to remainingMs", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };

    const night1 = reducer(state, { type: "TICK", deltaMs: 1000, currentNight: 1, stressLevel: 0 });
    const night10 = reducer(state, { type: "TICK", deltaMs: 1000, currentNight: 10, stressLevel: 0 });

    expect(night10.remainingMs).toBeCloseTo(night1.remainingMs, 5);
  });
});
