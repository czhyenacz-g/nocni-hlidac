import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// Viz GameState.enemyStageVisitSeq — centrální wrapper (withEnemyStageVisitSeed
// v gameReducer.ts) kolem celého reduceru zvýší tohle číslo přesně tehdy, když
// se enemyStage skutečně změní na jinou hodnotu (ne při každém dispatchi, ne
// při jiných změnách stavu). Slouží jako seed pro výběr monster/fleeing
// obrázku kamery (viz cameraAssets.object13.ts), ať se obrázek nedrží
// navěky stejný pro danou kameru.

function stateOnRoute(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    screen: "playing",
    enemyRoute: ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"],
    enemyStage: "outer_yard",
    elapsedMs: 10_000,
    ...overrides,
  };
}

describe("GameState.enemyStageVisitSeq", () => {
  it("increments when ENEMY_ADVANCE actually changes enemyStage", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({ enemyStageVisitSeq: 5 });

    // Force a deterministic advance via a 100% forced-retreat-like setup is
    // awkward here (that decreases stage) — instead just assert the general
    // invariant using a direct action that changes enemyStage: CONFIRM_MONSTER_HIT
    // moves enemyStage to night.enemy.monsterRetreatStage ("outside").
    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT", alreadyDefeatedBefore: false });

    expect(result.enemyStage).not.toBe(state.enemyStage);
    expect(result.enemyStageVisitSeq).toBe(6);
  });

  it("does NOT increment when an action leaves enemyStage unchanged", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({ enemyStageVisitSeq: 5, doorClosed: false });

    const result = reducer(state, { type: "TOGGLE_DOOR" });

    expect(result.enemyStage).toBe(state.enemyStage);
    expect(result.enemyStageVisitSeq).toBe(5);
  });

  it("stays at 0 through createInitialGameState (fresh state)", () => {
    const state = createInitialGameState(NIGHT_01);
    expect(state.enemyStageVisitSeq).toBe(0);
  });
});
