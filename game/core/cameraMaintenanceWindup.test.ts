import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";
import { CAMERA_MAINTENANCE_WINDUP_DURATION_MS } from "../balancing/constants";

// "CAMERA MAINTENANCE" na left_wall (viz LeftWallView.tsx,
// app/play/page.tsx#handleStartCameraMaintenanceRunWindup) — stejný "drž
// tlačítko, riskuj" vzor jako emergencyRunWindup.test.ts, ale nevyžaduje
// otevřené dveře a vyžaduje aspoň jednu skutečně vyřazenou kameru.

function stateAtLeftWall(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    playerView: "left_wall",
    cameraDamage: { ...createInitialGameState(NIGHT_01).cameraDamage, disabledCameraIds: ["door_hallway"] },
    ...overrides,
  };
}

describe("START_CAMERA_MAINTENANCE_WINDUP", () => {
  it("starts when on left_wall and a camera is disabled", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall();

    const result = reducer(state, { type: "START_CAMERA_MAINTENANCE_WINDUP" });
    expect(result.cameraMaintenanceWindup.active).toBe(true);
    expect(result.cameraMaintenanceWindup.progressMs).toBe(0);
  });

  it("can start even with the door closed (unlike emergency run)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ doorClosed: true });

    const result = reducer(state, { type: "START_CAMERA_MAINTENANCE_WINDUP" });
    expect(result.cameraMaintenanceWindup.active).toBe(true);
  });

  it("cannot start when no camera is disabled", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ cameraDamage: createInitialGameState(NIGHT_01).cameraDamage });

    const result = reducer(state, { type: "START_CAMERA_MAINTENANCE_WINDUP" });
    expect(result.cameraMaintenanceWindup.active).toBe(false);
  });

  it("cannot start when not on left_wall", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ playerView: "desk" });

    const result = reducer(state, { type: "START_CAMERA_MAINTENANCE_WINDUP" });
    expect(result.cameraMaintenanceWindup.active).toBe(false);
  });

  it("does not start a second parallel windup while one is already active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ cameraMaintenanceWindup: { active: true, startedAtMs: 0, progressMs: 500 } });

    const result = reducer(state, { type: "START_CAMERA_MAINTENANCE_WINDUP" });
    expect(result.cameraMaintenanceWindup.progressMs).toBe(500); // untouched, not reset to 0
  });
});

describe("CANCEL_CAMERA_MAINTENANCE_WINDUP", () => {
  it("resets an active windup back to inactive with no progress", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ cameraMaintenanceWindup: { active: true, startedAtMs: 0, progressMs: 1000 } });

    const result = reducer(state, { type: "CANCEL_CAMERA_MAINTENANCE_WINDUP" });
    expect(result.cameraMaintenanceWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("is a no-op when nothing is active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall();

    expect(reducer(state, { type: "CANCEL_CAMERA_MAINTENANCE_WINDUP" })).toBe(state);
  });
});

describe("TICK — camera maintenance windup progress", () => {
  it("accumulates progressMs while active, ready seq unchanged", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ cameraMaintenanceWindup: { active: true, startedAtMs: 0, progressMs: 0 } });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.cameraMaintenanceWindup.active).toBe(true);
    expect(result.cameraMaintenanceWindup.progressMs).toBe(1000);
    expect(result.cameraMaintenanceReadySeq).toBe(state.cameraMaintenanceReadySeq);
  });

  it("on reaching the full duration: resets to inactive and bumps cameraMaintenanceReadySeq by exactly one", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({
      cameraMaintenanceWindup: { active: true, startedAtMs: 0, progressMs: CAMERA_MAINTENANCE_WINDUP_DURATION_MS - 200 },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 500 });
    expect(result.cameraMaintenanceWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
    expect(result.cameraMaintenanceReadySeq).toBe(state.cameraMaintenanceReadySeq + 1);
  });
});

describe("leaving left_wall cancels an in-progress camera maintenance windup", () => {
  it("LOOK_AT_DESK cancels", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ cameraMaintenanceWindup: { active: true, startedAtMs: 0, progressMs: 700 } });

    const result = reducer(state, { type: "LOOK_AT_DESK" });
    expect(result.cameraMaintenanceWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("LOOK_AT_GENERATOR cancels", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ cameraMaintenanceWindup: { active: true, startedAtMs: 0, progressMs: 700 } });

    const result = reducer(state, { type: "LOOK_AT_GENERATOR" });
    expect(result.cameraMaintenanceWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });

  it("LOOK_AT_MAP cancels", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ cameraMaintenanceWindup: { active: true, startedAtMs: 0, progressMs: 700 } });

    const result = reducer(state, { type: "LOOK_AT_MAP" });
    expect(result.cameraMaintenanceWindup).toEqual({ active: false, startedAtMs: null, progressMs: 0 });
  });
});

describe("REPAIR_CAMERA", () => {
  it("removes the given camera from disabledCameraIds", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({
      cameraDamage: { ...createInitialGameState(NIGHT_01).cameraDamage, disabledCameraIds: ["door_hallway", "left_hallway"] },
    });

    const result = reducer(state, { type: "REPAIR_CAMERA", cameraId: "door_hallway" });
    expect(result.cameraDamage.disabledCameraIds).toEqual(["left_hallway"]);
  });

  it("leaves disabledCameraIds unchanged when that camera is not disabled", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({
      cameraDamage: { ...createInitialGameState(NIGHT_01).cameraDamage, disabledCameraIds: ["left_hallway"] },
    });

    const result = reducer(state, { type: "REPAIR_CAMERA", cameraId: "door_hallway" });
    expect(result.cameraDamage.disabledCameraIds).toEqual(["left_hallway"]);
  });

  it("is a no-op when the shift is not running", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtLeftWall({ isRunning: false });

    expect(reducer(state, { type: "REPAIR_CAMERA", cameraId: "door_hallway" })).toBe(state);
  });
});
