import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// Viditelný útěk po odražení (viz zadání "ať hráč vidí bestii utíkat, ne
// teleport") — dokud GameState.enemyForcedRetreatUntilMs běží, ENEMY_ADVANCE
// (běžná pravděpodobnostní větev) použije advanceChance: 0 a
// retreatChance: enemyForcedRetreatChance místo hodnot noci.

function stateOnRoute(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    screen: "playing",
    enemyRoute: ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"],
    enemyStage: "right_hallway",
    elapsedMs: 10_000,
    ...overrides,
  };
}

describe("ENEMY_ADVANCE — forced retreat window", () => {
  it("with a 100% forced chance, the monster always retreats (deterministic, no advance possible)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({
      enemyForcedRetreatUntilMs: 20_000,
      enemyForcedRetreatChance: 1,
    });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("retreat");
    expect(result.enemyStage).toBe("outer_yard");
  });

  it("keeps stepping back one stage per tick while the window stays active", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = stateOnRoute({ enemyForcedRetreatUntilMs: 100_000, enemyForcedRetreatChance: 1 });

    state = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(state.enemyStage).toBe("outer_yard");
    state = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(state.enemyStage).toBe("outside");
    // Nowhere further back to go — stays, does not error/wrap.
    state = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(state.enemyStage).toBe("outside");
    expect(state.lastEnemyDecision).toBe("stay");
  });

  it("preserves the forced-retreat fields while the window is still active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({ enemyForcedRetreatUntilMs: 20_000, enemyForcedRetreatChance: 1 });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyForcedRetreatUntilMs).toBe(20_000);
    expect(result.enemyForcedRetreatChance).toBe(1);
  });

  it("clears both fields once the window has expired (elapsedMs past the deadline)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({
      elapsedMs: 20_000,
      enemyForcedRetreatUntilMs: 20_000, // elapsedMs is NOT < until, so already expired
      enemyForcedRetreatChance: 1,
    });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyForcedRetreatUntilMs).toBeNull();
    expect(result.enemyForcedRetreatChance).toBeNull();
  });

  it("normal GameState (no active window) never touches the forced-retreat fields", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({ enemyForcedRetreatUntilMs: null, enemyForcedRetreatChance: null });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyForcedRetreatUntilMs).toBeNull();
    expect(result.enemyForcedRetreatChance).toBeNull();
  });

  it("a weaker forced chance (e.g. 0.4, matching gave_up) never lets the monster advance while active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({ enemyForcedRetreatUntilMs: 20_000, enemyForcedRetreatChance: 0.4 });

    // Statistical assurance, not a single-sample check — advanceChance is
    // forced to 0 during the window, so across many rolls "advance" must
    // never occur (only "retreat"/"stay").
    for (let i = 0; i < 300; i++) {
      const result = reducer(state, { type: "ENEMY_ADVANCE" });
      expect(result.lastEnemyDecision).not.toBe("advance");
    }
  });
});
