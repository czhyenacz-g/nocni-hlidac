import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";
import { EMERGENCY_RUN_WINDUP_DURATION_MS } from "../balancing/constants";

// "Nouzově opustit místnost" na left_wall (viz LeftWallView.tsx,
// app/play/page.tsx#handleStartEmergencyRunWindup) — stejný "drž tlačítko,
// riskuj" vzor jako bulbReplacement.test.ts, ne okamžité spuštění.

function stateAtLeftWall(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    playerView: "left_wall",
    doorClosed: false,
    ...overrides,
  };
}

describe("START_EMERGENCY_RUN_WINDUP", () => {
  it("starts when on left_wall, door open, and the night feature flags are on (default)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall();

    const result = reducer(state, { type: "START_EMERGENCY_RUN_WINDUP" });
    expect(result.emergencyRunWindup.active).toBe(true);
    expect(result.emergencyRunWindup.progressMs).toBe(0);
  });

  it("cannot start when the door is closed", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ doorClosed: true });

    const result = reducer(state, { type: "START_EMERGENCY_RUN_WINDUP" });
    expect(result.emergencyRunWindup.active).toBe(false);
  });

  it("cannot start when not on left_wall", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ playerView: "desk" });

    const result = reducer(state, { type: "START_EMERGENCY_RUN_WINDUP" });
    expect(result.emergencyRunWindup.active).toBe(false);
  });

  it("cannot start when emergencyRunsEnabled is off", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ nightFeatures: { ...createInitialGameState(NIGHT_01).nightFeatures, emergencyRunsEnabled: false } });

    const result = reducer(state, { type: "START_EMERGENCY_RUN_WINDUP" });
    expect(result.emergencyRunWindup.active).toBe(false);
  });

  it("cannot start when batteryRunEnabled is off", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ nightFeatures: { ...createInitialGameState(NIGHT_01).nightFeatures, batteryRunEnabled: false } });

    const result = reducer(state, { type: "START_EMERGENCY_RUN_WINDUP" });
    expect(result.emergencyRunWindup.active).toBe(false);
  });

  it("does not start a second parallel windup while one is already active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ emergencyRunWindup: { active: true, startedAtMs: 0, progressMs: 500 } });

    const result = reducer(state, { type: "START_EMERGENCY_RUN_WINDUP" });
    expect(result.emergencyRunWindup.progressMs).toBe(500); // untouched, not reset to 0
  });
});

describe("CANCEL_EMERGENCY_RUN_WINDUP", () => {
  it("resets an active windup back to inactive with no progress", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ emergencyRunWindup: { active: true, startedAtMs: 0, progressMs: 1500 } });

    const result = reducer(state, { type: "CANCEL_EMERGENCY_RUN_WINDUP" });
    expect(result.emergencyRunWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("is a no-op when nothing is active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall();

    expect(reducer(state, { type: "CANCEL_EMERGENCY_RUN_WINDUP" })).toBe(state);
  });
});

describe("TICK — emergency run windup progress", () => {
  it("accumulates progressMs while active, does not launch anything yet, ready seq unchanged", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ emergencyRunWindup: { active: true, startedAtMs: 0, progressMs: 0 } });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.emergencyRunWindup.active).toBe(true);
    expect(result.emergencyRunWindup.progressMs).toBe(1000);
    expect(result.emergencyRunReadySeq).toBe(state.emergencyRunReadySeq);
  });

  it("does not accumulate progress while inactive", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall();

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.emergencyRunWindup).toEqual(state.emergencyRunWindup);
  });

  it("on reaching the full duration: resets to inactive and bumps emergencyRunReadySeq by exactly one", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({
      emergencyRunWindup: { active: true, startedAtMs: 0, progressMs: EMERGENCY_RUN_WINDUP_DURATION_MS - 200 },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 500 });
    expect(result.emergencyRunWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
    expect(result.emergencyRunReadySeq).toBe(state.emergencyRunReadySeq + 1);
  });

  it("blackout (power hitting 0) cancels an in-progress windup", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({
      power: 0.001,
      lightOn: true,
      emergencyRunWindup: { active: true, startedAtMs: 0, progressMs: 500 },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 100_000 });
    expect(result.gameStatus).toBe("blackout");
    expect(result.emergencyRunWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });
});

describe("leaving left_wall cancels an in-progress windup", () => {
  it("LOOK_AT_DESK cancels", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ emergencyRunWindup: { active: true, startedAtMs: 0, progressMs: 700 } });

    const result = reducer(state, { type: "LOOK_AT_DESK" });
    expect(result.emergencyRunWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("LOOK_AT_GENERATOR cancels", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ emergencyRunWindup: { active: true, startedAtMs: 0, progressMs: 700 } });

    const result = reducer(state, { type: "LOOK_AT_GENERATOR" });
    expect(result.emergencyRunWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("LOOK_AT_MAP cancels", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ emergencyRunWindup: { active: true, startedAtMs: 0, progressMs: 700 } });

    const result = reducer(state, { type: "LOOK_AT_MAP" });
    expect(result.emergencyRunWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });
});
