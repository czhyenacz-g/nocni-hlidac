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

describe("APPLY_OFFICE_THREAT_ON_RETURN — high threat prefers at_door over breach", () => {
  it("picks at_door when both at_door and breach are in the route (at_door listed first)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ enemyRoute: ["outside", "outer_yard", "door_hallway", "breach", "at_door", "attack"] });

    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" });
    expect(result.enemyStage).toBe("at_door");
  });

  it("falls back to breach only when at_door is not in the route", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ enemyRoute: ["outside", "outer_yard", "door_hallway", "breach", "attack"] });

    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" });
    expect(result.enemyStage).toBe("breach");
  });
});

describe("APPLY_OFFICE_THREAT_ON_RETURN — grace period", () => {
  it("high threat sets enemyDoorAttackGraceUntilMs into the future", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ elapsedMs: 10_000 });

    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" });
    expect(result.enemyDoorAttackGraceUntilMs).not.toBeNull();
    expect(result.enemyDoorAttackGraceUntilMs!).toBeGreaterThan(10_000);
  });

  it("medium threat also sets a grace period", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ elapsedMs: 10_000 });

    const result = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "medium" });
    expect(result.enemyDoorAttackGraceUntilMs!).toBeGreaterThan(10_000);
  });

  it("low threat sets a shorter grace period than medium/high", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ elapsedMs: 0 });

    const low = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "low" });
    const medium = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "medium" });
    const high = reducer(state, { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" });

    expect(low.enemyDoorAttackGraceUntilMs!).toBeLessThan(medium.enemyDoorAttackGraceUntilMs!);
    expect(low.enemyDoorAttackGraceUntilMs!).toBeLessThan(high.enemyDoorAttackGraceUntilMs!);
  });
});

describe("ENEMY_ADVANCE during the office-threat grace period — no instant death", () => {
  it("open door + at_door + grace active does NOT kill the player", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterThreat = reducer(
      baseState({ doorClosed: false, playerView: "desk" }),
      { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" },
    );
    expect(afterThreat.enemyStage).toBe("at_door");

    const result = reducer(afterThreat, { type: "ENEMY_ADVANCE" });
    expect(result.screen).toBe("playing");
    expect(result.isRunning).toBe(true);
    expect(result.deathReason).toBeNull();
    expect(result.lastEnemyDecision).toBe("office_threat_grace");
  });

  it("still no death even if the player is looking straight at the door during grace", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterThreat = reducer(
      baseState({ doorClosed: false, playerView: "door" }),
      { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" },
    );

    const result = reducer(afterThreat, { type: "ENEMY_ADVANCE" });
    expect(result.doorDeathRevealUntilMs).toBeNull();
    expect(result.screen).toBe("playing");
  });

  it("closing the door during grace still produces a blocked attack + door bang, not death", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterThreat = reducer(baseState({ doorClosed: false }), { type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: "high" });
    const doorClosedDuringGrace = { ...afterThreat, doorClosed: true };

    const result = reducer(doorClosedDuringGrace, { type: "ENEMY_ADVANCE" });
    expect(result.screen).toBe("playing");
    expect(result.deathReason).toBeNull();
    expect(result.doorBangSeq).toBe(doorClosedDuringGrace.doorBangSeq + 1);
  });

  it("after the grace period elapses, an open door + at_door ENEMY_ADVANCE causes normal death", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterThreat = reducer(baseState({ doorClosed: false, elapsedMs: 0 }), {
      type: "APPLY_OFFICE_THREAT_ON_RETURN",
      intensity: "high",
    });
    // Fast-forward elapsedMs well past the grace window without changing enemyStage/doorClosed.
    const graceExpired = { ...afterThreat, elapsedMs: afterThreat.enemyDoorAttackGraceUntilMs! + 1 };

    const result = reducer(graceExpired, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("attack");
    expect(result.deathReason).toBe("door_open_at_attack");
  });
});

describe("ENEMY_ADVANCE without any office threat — normal door encounter is unaffected", () => {
  it("open door + at_door with no grace set (enemyDoorAttackGraceUntilMs null) still causes normal death", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ enemyStage: "at_door", doorClosed: false, enemyDoorAttackGraceUntilMs: null });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.enemyStage).toBe("attack");
    expect(result.deathReason).toBe("door_open_at_attack");
  });
});
