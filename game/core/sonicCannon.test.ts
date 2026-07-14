import { describe, expect, it } from "vitest";
import { isSonicCannonAffectingEnemy, isSonicCannonRunning, shouldPlaySonicCannonToggleClick } from "./sonicCannon";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

function stateWith(overrides: Partial<GameState>): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    playerView: "desk",
    cameraOpen: true,
    cameraViewMode: "detail",
    activeCameraId: "outer_yard",
    sonicCannonActive: true,
    enemyStage: "outer_yard",
    ...overrides,
  };
}

describe("isSonicCannonRunning", () => {
  it("false when sonicCannonActive is false", () => {
    expect(isSonicCannonRunning(stateWith({ sonicCannonActive: false }))).toBe(false);
  });

  it("false when playerView is not 'desk' (door/generator/left_wall/...)", () => {
    expect(isSonicCannonRunning(stateWith({ playerView: "door" }))).toBe(false);
  });

  it("false when cameraOpen is false (overview or no camera)", () => {
    expect(isSonicCannonRunning(stateWith({ cameraOpen: false }))).toBe(false);
  });

  it("true when active, on desk, and camera detail open — regardless of which camera or where the monster is", () => {
    expect(isSonicCannonRunning(stateWith({ activeCameraId: "door_hallway", enemyStage: "left_hallway" }))).toBe(true);
  });
});

describe("isSonicCannonAffectingEnemy", () => {
  it("false when the cannon isn't running at all", () => {
    expect(isSonicCannonAffectingEnemy(stateWith({ sonicCannonActive: false }), NIGHT_01)).toBe(false);
  });

  it("false on an empty camera — running but pointed where the monster isn't", () => {
    const state = stateWith({ activeCameraId: "outer_yard", enemyStage: "left_hallway" });
    expect(isSonicCannonAffectingEnemy(state, NIGHT_01)).toBe(false);
  });

  it("false on the wrong camera — monster is on a different camera-visible stage", () => {
    const state = stateWith({ activeCameraId: "right_hallway", enemyStage: "door_hallway" });
    expect(isSonicCannonAffectingEnemy(state, NIGHT_01)).toBe(false);
  });

  it("true when running and aimed exactly at the camera showing the monster", () => {
    const state = stateWith({ activeCameraId: "door_hallway", enemyStage: "door_hallway" });
    expect(isSonicCannonAffectingEnemy(state, NIGHT_01)).toBe(true);
  });

  it("false for 'outside' — no camera shows it, so the cannon can never be aimed there", () => {
    const state = stateWith({ activeCameraId: "outer_yard", enemyStage: "outside" });
    expect(isSonicCannonAffectingEnemy(state, NIGHT_01)).toBe(false);
  });
});

describe("shouldPlaySonicCannonToggleClick", () => {
  it("false -> true (first ever toggle, seq 0 -> 1): plays", () => {
    expect(shouldPlaySonicCannonToggleClick(1, 0)).toBe(true);
  });

  it("true -> false after a manual/auto-off toggle (seq keeps incrementing): plays", () => {
    expect(shouldPlaySonicCannonToggleClick(4, 3)).toBe(true);
  });

  it("unchanged seq (re-render without a real toggle): does not play", () => {
    expect(shouldPlaySonicCannonToggleClick(3, 3)).toBe(false);
  });

  it("reset/menu teardown (seq back to 0): never plays, even if the previous value was non-zero", () => {
    expect(shouldPlaySonicCannonToggleClick(0, 5)).toBe(false);
  });

  it("fresh mount at 0 with no prior toggles: does not play", () => {
    expect(shouldPlaySonicCannonToggleClick(0, 0)).toBe(false);
  });
});
