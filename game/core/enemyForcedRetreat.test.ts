import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// Viditelný útěk po odražení (viz zadání "ať hráč vidí bestii utíkat, ne
// teleport") — dokud GameState.enemyForcedRetreatUntilMs běží, ENEMY_ADVANCE
// (běžná pravděpodobnostní větev) použije advanceChance: 0 a
// retreatChance: enemyForcedRetreatChance místo hodnot noci. Navíc
// enemyForcedRetreatNextStepAtMs (viz zadání "uteklo moc rychle") hlídá, že
// mezi jednotlivými kroky uplyne aspoň celá night.enemyTickMs perioda, i
// když ENEMY_ADVANCE dispatch přijde dřív (vlastní na repelu nezávislý
// interval, viz gameLoop.ts).

const ENEMY_TICK_MS = NIGHT_01.enemyTickMs; // 2000

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
  it("with a 100% forced chance and the next step already due, the monster always retreats (deterministic, no advance possible)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({
      enemyForcedRetreatUntilMs: 20_000,
      enemyForcedRetreatChance: 1,
      enemyForcedRetreatNextStepAtMs: 10_000, // due exactly now
    });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("retreat");
    expect(result.enemyStage).toBe("outer_yard");
  });

  it("does NOT move yet if the next step isn't due (ENEMY_ADVANCE fired before a full enemyTickMs elapsed since the repel)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({
      enemyForcedRetreatUntilMs: 20_000,
      enemyForcedRetreatChance: 1,
      enemyForcedRetreatNextStepAtMs: 11_500, // not due yet (elapsedMs is 10_000)
    });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("stay");
    expect(result.enemyStage).toBe("right_hallway");
    // Untouched — still waiting for the same deadline, not reset.
    expect(result.enemyForcedRetreatNextStepAtMs).toBe(11_500);
    expect(result.enemyForcedRetreatUntilMs).toBe(20_000);
  });

  it("keeps stepping back one stage per full enemyTickMs interval while the window stays active", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = stateOnRoute({
      enemyForcedRetreatUntilMs: 100_000,
      enemyForcedRetreatChance: 1,
      enemyForcedRetreatNextStepAtMs: 10_000,
    });

    state = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(state.enemyStage).toBe("outer_yard");
    expect(state.enemyForcedRetreatNextStepAtMs).toBe(10_000 + ENEMY_TICK_MS);

    // Simulate the wall-clock catching up to the next allowed step.
    state = { ...state, elapsedMs: state.enemyForcedRetreatNextStepAtMs! };
    state = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(state.enemyStage).toBe("outside");

    // Nowhere further back to go — stays, does not error/wrap.
    state = { ...state, elapsedMs: state.enemyForcedRetreatNextStepAtMs! };
    state = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(state.enemyStage).toBe("outside");
    expect(state.lastEnemyDecision).toBe("stay");
  });

  it("preserves the forced-retreat fields while the window is still active, advancing next-step by one full enemyTickMs", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({
      enemyForcedRetreatUntilMs: 20_000,
      enemyForcedRetreatChance: 1,
      enemyForcedRetreatNextStepAtMs: 10_000,
    });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyForcedRetreatUntilMs).toBe(20_000);
    expect(result.enemyForcedRetreatChance).toBe(1);
    expect(result.enemyForcedRetreatNextStepAtMs).toBe(10_000 + ENEMY_TICK_MS);
  });

  it("clears all three fields once the window has expired (elapsedMs past the deadline)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({
      elapsedMs: 20_000,
      enemyForcedRetreatUntilMs: 20_000, // elapsedMs is NOT < until, so already expired
      enemyForcedRetreatChance: 1,
      enemyForcedRetreatNextStepAtMs: 20_000,
    });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyForcedRetreatUntilMs).toBeNull();
    expect(result.enemyForcedRetreatChance).toBeNull();
    expect(result.enemyForcedRetreatNextStepAtMs).toBeNull();
  });

  it("normal GameState (no active window) never touches the forced-retreat fields", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({
      enemyForcedRetreatUntilMs: null,
      enemyForcedRetreatChance: null,
      enemyForcedRetreatNextStepAtMs: null,
    });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyForcedRetreatUntilMs).toBeNull();
    expect(result.enemyForcedRetreatChance).toBeNull();
    expect(result.enemyForcedRetreatNextStepAtMs).toBeNull();
  });

  it("a weaker forced chance (e.g. 0.4, matching gave_up) never lets the monster advance while active and the step is due", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateOnRoute({
      enemyForcedRetreatUntilMs: 20_000,
      enemyForcedRetreatChance: 0.4,
      enemyForcedRetreatNextStepAtMs: 10_000,
    });

    // Statistical assurance, not a single-sample check — advanceChance is
    // forced to 0 during the window, so across many rolls "advance" must
    // never occur (only "retreat"/"stay").
    for (let i = 0; i < 300; i++) {
      const result = reducer(state, { type: "ENEMY_ADVANCE" });
      expect(result.lastEnemyDecision).not.toBe("advance");
    }
  });
});
