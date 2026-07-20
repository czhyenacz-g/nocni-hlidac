import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_15 } from "../nights/night15";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";
import { TITAN_STAGE_STAY_MS, GENERATOR_OVERLOAD_DOOR_DURATION_MS } from "../balancing/constants";
import { DEFAULT_NIGHT_FEATURES } from "../difficulty/nightConfig";

// Integrace přes skutečný reducer (ne jen izolovaný resolveTitanAdvance) —
// pokrývá ENEMY_ADVANCE dispatch, TICK-driven light/UV repel guardy, a debug
// akce, přesně tak, jak je hra doopravdy dispatchne.

function titanRunningState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_15, { nightFeatures: { ...DEFAULT_NIGHT_FEATURES, generatorOverloadEnabled: true } }),
    isRunning: true,
    ...overrides,
  };
}

describe("Titan night (NIGHT_15) — resolveNightDefinition wiring", () => {
  it("NIGHT_15's enemy is the registered Titan (id 'titan')", () => {
    expect(NIGHT_15.enemy.id).toBe("titan");
  });

  it("createInitialGameState(NIGHT_15) starts Titan on the first route stage with a single fixed route", () => {
    const state = createInitialGameState(NIGHT_15);
    expect(state.enemyStage).toBe("outside");
    expect(state.enemyRoute).toEqual(["outside", "outer_yard", "left_hallway", "door_hallway", "at_door", "breach", "attack"]);
  });
});

describe("ENEMY_ADVANCE dispatch for Titan — 20s-per-stage march", () => {
  it("does not move before TITAN_STAGE_STAY_MS elapses", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ elapsedMs: TITAN_STAGE_STAY_MS - 1 });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("outside");
  });

  it("advances exactly one stage once TITAN_STAGE_STAY_MS elapses", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ elapsedMs: TITAN_STAGE_STAY_MS });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("outer_yard");
  });

  it("reaching 'attack' finalizes player death (screen/isRunning/deathReason)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ enemyStage: "breach", elapsedMs: TITAN_STAGE_STAY_MS, enemyLocationEnteredAtMs: 0 });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("attack");
    expect(result.screen).toBe("death");
    expect(result.isRunning).toBe(false);
  });
});

describe("Titan ignores all defensive/retreat mechanics", () => {
  it("light repel at the door never moves Titan or resets its timer (TICK)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "at_door",
      doorClosed: true,
      lightOn: true,
      elapsedMs: 5000,
      enemyLocationEnteredAtMs: 0,
      doorLightRepelMs: 10_000, // would be far past doorLightRepelRequiredMs for Imp
    });
    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.enemyStage).toBe("at_door");
    expect(result.enemyLocationEnteredAtMs).toBe(0);
  });

  it("UV repel in the hallway never moves Titan or resets its timer (TICK)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "door_hallway",
      doorClosed: true,
      elapsedMs: 5000,
      enemyLocationEnteredAtMs: 0,
      doorHallwayUvRepelMs: 20_000,
      roomBulbs: { ...createInitialGameState(NIGHT_15).roomBulbs, nearRoom: { ...createInitialGameState(NIGHT_15).roomBulbs.nearRoom, broken: false } },
      lightOn: true,
    });
    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.enemyStage).toBe("door_hallway");
    expect(result.enemyLocationEnteredAtMs).toBe(0);
  });

  it("sonic cannon has no effect — Titan's resolver never rolls/consults it, stage only changes via the 20s timer", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "outer_yard",
      elapsedMs: 100,
      enemyLocationEnteredAtMs: 0,
      sonicCannonActive: true,
      activeCameraId: "outer_yard",
      cameraOpen: true,
    });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("outer_yard");
    expect(result.sonicCannonResultSeq).toBe(state.sonicCannonResultSeq);
  });

  it("forced-retreat fields are never set for Titan — they simply stay null/default", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ elapsedMs: TITAN_STAGE_STAY_MS });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyForcedRetreatUntilMs).toBeNull();
  });

  it("door waiting/gave_up standoff never applies — Titan passes through 'at_door' on its own timer regardless of door state", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({
      enemyStage: "at_door",
      doorClosed: true,
      elapsedMs: TITAN_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
    });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result.enemyStage).toBe("breach");
    expect(result.lastEnemyDecision).not.toBe("gave_up");
  });
});

describe("Generator overload remains the sole way to kill Titan", () => {
  it("overload completing while Titan is at the door moves it to graveyard (existing behavior, unchanged)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const started = reducer(titanRunningState({ elapsedMs: 0, enemyStage: "at_door", playerView: "generator" }), {
      type: "START_GENERATOR_OVERLOAD",
    });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.enemyStage).toBe("graveyard");
    expect(finished.doorDestroyed).toBe(true);
  });

  it("overload completing while Titan is NOT at the door does not kill it", () => {
    const reducer = createGameReducer(NIGHT_15);
    const started = reducer(titanRunningState({ elapsedMs: 0, enemyStage: "left_hallway", playerView: "generator" }), {
      type: "START_GENERATOR_OVERLOAD",
    });
    const finished = reducer(started, { type: "TICK", deltaMs: GENERATOR_OVERLOAD_DOOR_DURATION_MS });
    expect(finished.enemyStage).toBe("left_hallway");
    expect(finished.doorDestroyed).toBe(true);
  });

  it("Titan in graveyard never advances again via ENEMY_ADVANCE", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ enemyStage: "graveyard", elapsedMs: 999_999, enemyLocationEnteredAtMs: 0 });
    const result = reducer(state, { type: "ENEMY_ADVANCE", currentNight: 15 });
    expect(result).toBe(state);
  });
});

describe("DEBUG_START_TITAN / DEBUG_ADVANCE_TITAN_STAGE", () => {
  it("DEBUG_START_TITAN sets Titan to the first route stage with a fresh route, when the active night is Titan's", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ enemyStage: "breach", elapsedMs: 40_000 });
    const result = reducer(state, { type: "DEBUG_START_TITAN" });
    expect(result.enemyStage).toBe("outside");
    expect(result.enemyRoute).toEqual(NIGHT_15.enemy.routeVariants[0]);
  });

  it("DEBUG_START_TITAN is a no-op when the active night is NOT Titan's", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };
    const result = reducer(state, { type: "DEBUG_START_TITAN" });
    expect(result).toBe(state);
  });

  it("DEBUG_ADVANCE_TITAN_STAGE moves Titan exactly one stage forward along the real route", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ enemyStage: "outside" });
    const result = reducer(state, { type: "DEBUG_ADVANCE_TITAN_STAGE" });
    expect(result.enemyStage).toBe("outer_yard");
  });

  it("DEBUG_ADVANCE_TITAN_STAGE never skips straight to graveyard", () => {
    const reducer = createGameReducer(NIGHT_15);
    let state = titanRunningState({ enemyStage: "outside" });
    for (let i = 0; i < 10; i++) {
      state = reducer(state, { type: "DEBUG_ADVANCE_TITAN_STAGE" });
      expect(state.enemyStage).not.toBe("graveyard");
    }
  });

  it("DEBUG_ADVANCE_TITAN_STAGE is a no-op once Titan is in 'attack' or 'graveyard'", () => {
    const reducer = createGameReducer(NIGHT_15);
    const attackState = titanRunningState({ enemyStage: "attack" });
    expect(reducer(attackState, { type: "DEBUG_ADVANCE_TITAN_STAGE" })).toBe(attackState);
    const graveyardState = titanRunningState({ enemyStage: "graveyard" });
    expect(reducer(graveyardState, { type: "DEBUG_ADVANCE_TITAN_STAGE" })).toBe(graveyardState);
  });

  it("DEBUG_ADVANCE_TITAN_STAGE is a no-op when the active night is NOT Titan's", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };
    const result = reducer(state, { type: "DEBUG_ADVANCE_TITAN_STAGE" });
    expect(result).toBe(state);
  });

  it("both debug actions are no-ops when the run isn't active (isRunning false)", () => {
    const reducer = createGameReducer(NIGHT_15);
    const state = titanRunningState({ isRunning: false });
    expect(reducer(state, { type: "DEBUG_START_TITAN" })).toBe(state);
    expect(reducer(state, { type: "DEBUG_ADVANCE_TITAN_STAGE" })).toBe(state);
  });
});
