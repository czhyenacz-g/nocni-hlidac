import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { DEFAULT_DIFFICULTY, DIFFICULTY_RULES } from "../difficulty/difficultyConfig";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// Standoff u dveří — ústup je teď VŽDY o jeden krok zpět na trase
// (stepBackOneStage, ne náhodný pick), takže je deterministický i bez
// mockování Math.random: z "at_door" na téhle trase je to vždy "door_hallway".
function stateAtGaveUp(): GameState {
  const base = createInitialGameState(NIGHT_01);
  return {
    ...base,
    isRunning: true,
    enemyRoute: ["right_hallway", "door_hallway", "at_door", "attack"],
    enemyStage: "at_door",
    doorClosed: true,
    playerView: "door",
    enemyAtDoorSinceMs: 0,
    enemyDoorHoldTargetMs: 100,
    enemyDoorHoldProgressMs: 0,
    elapsedMs: 0,
  };
}

describe("difficultyConfig", () => {
  it("default difficulty is medium", () => {
    expect(DEFAULT_DIFFICULTY).toBe("medium");
  });

  it("easy has monster_check_or_return disabled", () => {
    expect(DIFFICULTY_RULES.easy.monster_check_or_return).toBe(false);
  });

  it("medium has monster_check_or_return enabled", () => {
    expect(DIFFICULTY_RULES.medium.monster_check_or_return).toBe(true);
  });

  it("hard has monster_check_or_return enabled", () => {
    expect(DIFFICULTY_RULES.hard.monster_check_or_return).toBe(true);
  });
});

describe("monster_check_or_return rule", () => {
  it("easy: door can be opened right after the monster gives up, no camera check needed", () => {
    const reducer = createGameReducer(NIGHT_01, "easy");
    const gaveUp = reducer(stateAtGaveUp(), { type: "ENEMY_ADVANCE" });

    expect(gaveUp.monsterRetreatedTo).not.toBeNull();
    expect(gaveUp.monsterRetreatVerified).toBe(true);

    const opened = reducer(gaveUp, { type: "TOGGLE_DOOR" });
    expect(opened.doorClosed).toBe(false);
    expect(opened.enemyStage).not.toBe("at_door");
  });

  it("medium/hard: player must find the monster on the correct camera before it's safe to open", () => {
    const reducer = createGameReducer(NIGHT_01, "medium");
    const gaveUp = reducer(stateAtGaveUp(), { type: "ENEMY_ADVANCE" });

    expect(gaveUp.monsterRetreatVerified).toBe(false);
    expect(gaveUp.monsterRetreatedTo).toBe("door_hallway");

    const verified = reducer(gaveUp, { type: "OPEN_CAMERA", cameraId: "door_hallway" });
    expect(verified.monsterRetreatVerified).toBe(true);
  });

  it("medium/hard: opening the door without verifying sends the monster back to door_hallway, not all the way to at_door", () => {
    const reducer = createGameReducer(NIGHT_01, "hard");
    const gaveUp = reducer(stateAtGaveUp(), { type: "ENEMY_ADVANCE" });

    const opened = reducer(gaveUp, { type: "TOGGLE_DOOR" });
    expect(opened.doorClosed).toBe(false);
    expect(opened.enemyStage).toBe("door_hallway");
    expect(opened.lastEnemyDecision).toBe("returned_unverified");
    expect(opened.monsterRetreatedTo).toBeNull();
    expect(opened.monsterRetreatVerified).toBe(false);
  });

  it("medium/hard: after verifying with the correct camera, opening the door is safe", () => {
    const reducer = createGameReducer(NIGHT_01, "medium");
    const gaveUp = reducer(stateAtGaveUp(), { type: "ENEMY_ADVANCE" });
    const verified = reducer(gaveUp, { type: "OPEN_CAMERA", cameraId: "door_hallway" });

    const opened = reducer(verified, { type: "TOGGLE_DOOR" });
    expect(opened.doorClosed).toBe(false);
    expect(opened.enemyStage).not.toBe("at_door");
    expect(opened.monsterRetreatedTo).toBeNull();
  });
});
