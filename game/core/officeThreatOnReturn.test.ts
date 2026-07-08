import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// APPLY_OFFICE_THREAT_ON_RETURN (viz game/minigame/officeThreat.ts,
// app/play/page.tsx#handleEmergencyMiniGameComplete) — hrozba přenesená z
// EmergencyMiniGame do hlavní hry. Musí jen posunout enemyStage blíž ke
// kanceláři, NIKDY nezpůsobit smrt/útok samo o sobě (viz zadání).

const FULL_ROUTE = ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"] as const;

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    screen: "playing",
    enemyRoute: [...FULL_ROUTE],
    enemyStage: "outside",
    ...overrides,
  };
}

describe("APPLY_OFFICE_THREAT_ON_RETURN — maps intensity to enemyStage", () => {
  it("low threat moves the monster to right_hallway/left_hallway (not yet door_hallway/at_door)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState();

    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "low" });
    expect(result.enemyStage).toBe("right_hallway");
    expect(result.lastEnemyDecision).toBe("office_threat_on_return");
  });

  it("medium threat sets the monster to door_hallway (the hallway right before the camera room)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState();

    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "medium" });
    expect(result.enemyStage).toBe("door_hallway");
  });

  it("high threat sets the monster to at_door but does NOT cause instant death", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState();

    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" });
    expect(result.enemyStage).toBe("at_door");
    expect(result.screen).toBe("playing");
    expect(result.isRunning).toBe(true);
    expect(result.deathReason).toBeNull();
  });

  it("high threat initializes enemyAtDoorSinceMs (same reset as a normal ENEMY_ADVANCE move into at_door)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ elapsedMs: 5000 });

    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" });
    expect(result.enemyAtDoorSinceMs).toBe(5000);
    expect(result.enemyDoorHoldTargetMs).toBeNull();
    expect(result.enemyDoorHoldProgressMs).toBe(0);
  });

  it("resets any stale monsterRetreatedTo/monsterRetreatVerified from an earlier, unrelated encounter", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ monsterRetreatedTo: "left_hallway", monsterRetreatVerified: false });

    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "medium" });
    expect(result.monsterRetreatedTo).toBeNull();
    expect(result.monsterRetreatVerified).toBe(false);
  });
});

describe("APPLY_OFFICE_THREAT_ON_RETURN — safety guards", () => {
  it("is a no-op if the game is not running (e.g. already dead)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ isRunning: false });

    expect(reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" })).toBe(state);
  });

  it("is a no-op during blackout", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ gameStatus: "blackout" });

    expect(reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" })).toBe(state);
  });

  it("is a no-op during a pending door-death reveal", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ doorDeathRevealUntilMs: 9999 });

    expect(reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" })).toBe(state);
  });

  it("is a safe no-op if the current route has no candidate stage for the requested intensity", () => {
    const reducer = createGameReducer(NIGHT_01);
    // A route with none of the "high" candidates (at_door/breach/door_hallway).
    const state = baseState({ enemyRoute: ["outside", "outer_yard", "right_hallway"] });

    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" });
    expect(result).toBe(state);
  });
});
