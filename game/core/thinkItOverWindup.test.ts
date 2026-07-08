import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";
import { THINK_IT_OVER_WINDUP_DURATION_MS } from "../balancing/constants";

// "Nechat si to projít hlavou" na left_wall (viz LeftWallView.tsx,
// app/play/page.tsx) — vedlejší tlačítko vidět jen s brokovnicí, stejný
// "drž tlačítko" vzor jako emergencyRunWindup.test.ts, jen bez minihry na
// konci (jen textová hláška, viz thinkItOverReadySeq).

function stateAtLeftWallWithShotgun(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    playerView: "left_wall",
    hasShotgun: true,
    ...overrides,
  };
}

describe("START_THINK_IT_OVER_WINDUP", () => {
  it("starts when on left_wall and the player has the shotgun", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun();

    const result = reducer(state, { type: "START_THINK_IT_OVER_WINDUP" });
    expect(result.thinkItOverWindup.active).toBe(true);
    expect(result.thinkItOverWindup.progressMs).toBe(0);
  });

  it("cannot start without the shotgun", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({ hasShotgun: false });

    const result = reducer(state, { type: "START_THINK_IT_OVER_WINDUP" });
    expect(result.thinkItOverWindup.active).toBe(false);
  });

  it("cannot start when not on left_wall", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({ playerView: "desk" });

    const result = reducer(state, { type: "START_THINK_IT_OVER_WINDUP" });
    expect(result.thinkItOverWindup.active).toBe(false);
  });

  it("does not require the door to be open (unlike the emergency run)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({ doorClosed: true });

    const result = reducer(state, { type: "START_THINK_IT_OVER_WINDUP" });
    expect(result.thinkItOverWindup.active).toBe(true);
  });

  it("does not start a second parallel windup while one is already active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({ thinkItOverWindup: { active: true, startedAtMs: 0, progressMs: 500 } });

    const result = reducer(state, { type: "START_THINK_IT_OVER_WINDUP" });
    expect(result.thinkItOverWindup.progressMs).toBe(500); // untouched, not reset to 0
  });
});

describe("CANCEL_THINK_IT_OVER_WINDUP", () => {
  it("resets an active windup back to inactive with no progress", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({ thinkItOverWindup: { active: true, startedAtMs: 0, progressMs: 3000 } });

    const result = reducer(state, { type: "CANCEL_THINK_IT_OVER_WINDUP" });
    expect(result.thinkItOverWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("is a no-op when nothing is active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun();

    expect(reducer(state, { type: "CANCEL_THINK_IT_OVER_WINDUP" })).toBe(state);
  });
});

describe("TICK — think-it-over windup progress", () => {
  it("accumulates progressMs while active, ready seq unchanged", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({ thinkItOverWindup: { active: true, startedAtMs: 0, progressMs: 0 } });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.thinkItOverWindup.active).toBe(true);
    expect(result.thinkItOverWindup.progressMs).toBe(1000);
    expect(result.thinkItOverReadySeq).toBe(state.thinkItOverReadySeq);
  });

  it("does not accumulate progress while inactive", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun();

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.thinkItOverWindup).toEqual(state.thinkItOverWindup);
  });

  it("on reaching the full 10s duration: resets to inactive and bumps thinkItOverReadySeq by exactly one", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({
      thinkItOverWindup: { active: true, startedAtMs: 0, progressMs: THINK_IT_OVER_WINDUP_DURATION_MS - 200 },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 500 });
    expect(result.thinkItOverWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
    expect(result.thinkItOverReadySeq).toBe(state.thinkItOverReadySeq + 1);
  });

  it("blackout (power hitting 0) cancels an in-progress windup", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({
      power: 0.001,
      lightOn: true,
      thinkItOverWindup: { active: true, startedAtMs: 0, progressMs: 500 },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 100_000 });
    expect(result.gameStatus).toBe("blackout");
    expect(result.thinkItOverWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });
});

describe("leaving left_wall cancels an in-progress think-it-over windup", () => {
  it("LOOK_AT_DESK cancels", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({ thinkItOverWindup: { active: true, startedAtMs: 0, progressMs: 700 } });

    const result = reducer(state, { type: "LOOK_AT_DESK" });
    expect(result.thinkItOverWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("LOOK_AT_GENERATOR cancels", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({ thinkItOverWindup: { active: true, startedAtMs: 0, progressMs: 700 } });

    const result = reducer(state, { type: "LOOK_AT_GENERATOR" });
    expect(result.thinkItOverWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("LOOK_AT_MAP cancels", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWallWithShotgun({ thinkItOverWindup: { active: true, startedAtMs: 0, progressMs: 700 } });

    const result = reducer(state, { type: "LOOK_AT_MAP" });
    expect(result.thinkItOverWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });
});
