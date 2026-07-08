import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// Ověření současného door-light repel flow (viz GAME_DESIGN.md "Světlo a
// dveře", gameReducer.ts#updateDoorLightRepel) — NEMĚNÍ chování, jen ho
// pokrývá testy, protože dřív žádný dedikovaný test neexistoval.

const REQUIRED_MS = NIGHT_01.enemy.doorLightRepelRequiredMs; // 1500
const RETREAT_STAGE = NIGHT_01.enemy.monsterRetreatStage; // "outside"

function stateAtDoor(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    screen: "playing",
    enemyRoute: ["at_door", "attack"],
    enemyStage: "at_door",
    ...overrides,
  };
}

describe("door-light repel — triggers only with door closed + light really on + monster at door, for the full required duration", () => {
  it("closed door + light on + monster at door, held for the required duration => retreat roar fires", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: true, lightOn: true, doorLightRepelMs: REQUIRED_MS - 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq + 1);
  });

  it("open door: no retreat roar even with light on and monster at the door", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: false, lightOn: true, doorLightRepelMs: REQUIRED_MS - 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq);
    // Accumulator resets to 0 the instant a required condition (closed door) isn't met.
    expect(result.doorLightRepelMs).toBe(0);
  });

  it("light not really on (off, or bulb broken — both reflected as lightOn: false): no retreat roar", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: true, lightOn: false, doorLightRepelMs: REQUIRED_MS - 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq);
    expect(result.doorLightRepelMs).toBe(0);
  });

  it("shorter than the required duration: accumulates but does not yet trigger", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: true, lightOn: true, doorLightRepelMs: 0 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq);
    expect(result.doorLightRepelMs).toBe(100);
  });

  it("once the duration is reached: enemyStage resets to the configured retreat stage and the standoff/hold fields clear", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({
      doorClosed: true,
      lightOn: true,
      doorLightRepelMs: REQUIRED_MS - 50,
      enemyAtDoorSinceMs: 0,
      enemyDoorHoldTargetMs: 5000,
      enemyDoorHoldProgressMs: 1000,
    });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.enemyStage).toBe(RETREAT_STAGE);
    expect(result.lastEnemyDecision).toBe("light_repelled");
    expect(result.doorLightRepelMs).toBe(0);
    expect(result.enemyAtDoorSinceMs).toBeNull();
    expect(result.enemyDoorHoldTargetMs).toBeNull();
    expect(result.enemyDoorHoldProgressMs).toBe(0);
  });

  it("resets to 0 the instant any condition breaks mid-accumulation (not just on completion)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: true, lightOn: true, doorLightRepelMs: 900 });

    // Light turns off before the required duration is reached.
    const result = reducer({ ...state, lightOn: false }, { type: "TICK", deltaMs: 100 });
    expect(result.doorLightRepelMs).toBe(0);
  });
});

describe("door-light repel — does not touch retreat verification", () => {
  it("light-repel does NOT set monsterRetreatedTo/monsterRetreatVerified — verification stays whatever it already was", () => {
    const reducer = createGameReducer(NIGHT_01, "medium");
    const state = stateAtDoor({
      doorClosed: true,
      lightOn: true,
      doorLightRepelMs: REQUIRED_MS - 50,
      monsterRetreatedTo: null,
      monsterRetreatVerified: false,
    });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatedTo).toBeNull();
    expect(result.monsterRetreatVerified).toBe(false);
  });

  it("a pending unverified retreat from an earlier standoff give-up survives a light-repel unrelated to it", () => {
    const reducer = createGameReducer(NIGHT_01, "medium");
    const state = stateAtDoor({
      doorClosed: true,
      lightOn: true,
      doorLightRepelMs: REQUIRED_MS - 50,
      monsterRetreatedTo: "left_hallway",
      monsterRetreatVerified: false,
    });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    // Light-repel resets enemyStage to RETREAT_STAGE but must not silently
    // "fix" an already-pending, unrelated verification requirement.
    expect(result.monsterRetreatedTo).toBe("left_hallway");
    expect(result.monsterRetreatVerified).toBe(false);
  });
});
