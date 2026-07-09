import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// Pomalejší, "o krok dřív" varianta door-light repelu — viz
// gameReducer.ts#updateDoorHallwayUvRepel, doorEncounter.ts
// #shouldDoorHallwayUvForceRetreat. Na rozdíl od at_door repelu
// (doorLightRepel.test.ts) tenhle prochází stejným "vzdání se" flow jako
// standoff u dveří (monsterRetreatedTo/monsterRetreatVerified), takže musí
// jít kamerou ověřit.

const REQUIRED_MS = NIGHT_01.enemy.doorHallwayUvRepelRequiredMs; // 7000
const AT_DOOR_REQUIRED_MS = NIGHT_01.enemy.doorLightRepelRequiredMs; // 1500

function stateInHallway(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    screen: "playing",
    enemyRoute: ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"],
    enemyStage: "door_hallway",
    ...overrides,
  };
}

describe("door-hallway UV repel — triggers only with door closed + UV really on + monster in door_hallway, for the full (slower) required duration", () => {
  it("closed door + UV on + monster in door_hallway, held for the required duration => retreat roar fires", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInHallway({ doorClosed: true, lightOn: true, doorHallwayUvRepelMs: REQUIRED_MS - 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq + 1);
  });

  it("open door: no hallway retreat even with UV on and monster in door_hallway", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInHallway({ doorClosed: false, lightOn: true, doorHallwayUvRepelMs: REQUIRED_MS - 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq);
    expect(result.doorHallwayUvRepelMs).toBe(0);
  });

  it("UV off: no accumulation, no retreat", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInHallway({ doorClosed: true, lightOn: false, doorHallwayUvRepelMs: REQUIRED_MS - 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq);
    expect(result.doorHallwayUvRepelMs).toBe(0);
  });

  it("broken bulb: switch reads as on in state, but isNearRoomLightActive is false => no accumulation, no retreat", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInHallway({
      doorClosed: true,
      lightOn: true,
      doorHallwayUvRepelMs: REQUIRED_MS - 50,
      roomBulbs: { nearRoom: { remainingMs: 0, maxMs: 10000, broken: true } },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq);
    expect(result.doorHallwayUvRepelMs).toBe(0);
  });

  it("shorter than the required duration: accumulates but does not yet trigger", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInHallway({ doorClosed: true, lightOn: true, doorHallwayUvRepelMs: 0 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq);
    expect(result.doorHallwayUvRepelMs).toBe(100);
  });

  it("resets to 0 the instant any condition breaks mid-accumulation (not just on completion)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInHallway({ doorClosed: true, lightOn: true, doorHallwayUvRepelMs: 4000 });

    const result = reducer({ ...state, lightOn: false }, { type: "TICK", deltaMs: 100 });
    expect(result.doorHallwayUvRepelMs).toBe(0);
  });

  it("is measurably slower than the at_door repel (required duration is much longer)", () => {
    expect(REQUIRED_MS).toBeGreaterThan(AT_DOOR_REQUIRED_MS);
    expect(REQUIRED_MS).toBe(7000);
  });
});

describe("door-hallway UV repel — completion moves the monster away and marks the retreat pending verification", () => {
  it("once the duration is reached: enemyStage moves to one of the retreat candidates on the active route (not door_hallway itself), and monsterRetreatedTo/lastEnemyDecision reflect it", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInHallway({ doorClosed: true, lightOn: true, doorHallwayUvRepelMs: REQUIRED_MS - 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.doorHallwayUvRepelMs).toBe(0);
    expect(result.lastEnemyDecision).toBe("hallway_light_repelled");
    expect(["outer_yard", "right_hallway", "left_hallway", "outside"]).toContain(result.enemyStage);
    expect(result.enemyStage).not.toBe("door_hallway");
    expect(result.monsterRetreatedTo).toBe(result.enemyStage);
  });

  it("on medium/hard (verification enabled): retreat starts unverified, same as a standoff give-up", () => {
    const reducer = createGameReducer(NIGHT_01, "medium");
    const state = stateInHallway({ doorClosed: true, lightOn: true, doorHallwayUvRepelMs: REQUIRED_MS - 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatedTo).not.toBeNull();
    expect(result.monsterRetreatVerified).toBe(false);
  });

  it("on easy (verification disabled): retreat is immediately considered verified", () => {
    const reducer = createGameReducer(NIGHT_01, "easy");
    const state = stateInHallway({ doorClosed: true, lightOn: true, doorHallwayUvRepelMs: REQUIRED_MS - 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatedTo).not.toBeNull();
    expect(result.monsterRetreatVerified).toBe(true);
  });

  it("bumps monsterRetreatRoarSeq — same audio trigger as the at_door repel (retreat roar + steps)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateInHallway({ doorClosed: true, lightOn: true, doorHallwayUvRepelMs: REQUIRED_MS - 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatRoarSeq).toBe(state.monsterRetreatRoarSeq + 1);
  });
});

describe("door-hallway UV repel — does not interfere with the at_door repel or door-hold standoff", () => {
  it("the existing at_door light repel still fires at its own (faster) required duration, unaffected by doorHallwayUvRepelMs", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state: GameState = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing",
      enemyRoute: ["at_door", "attack"],
      enemyStage: "at_door",
      doorClosed: true,
      lightOn: true,
      doorLightRepelMs: AT_DOOR_REQUIRED_MS - 50,
      doorHallwayUvRepelMs: 0,
    };

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.lastEnemyDecision).toBe("light_repelled");
    expect(result.enemyStage).toBe(NIGHT_01.enemy.monsterRetreatStage);
    // The at_door repel is the fast, unverified one — unchanged behavior.
    expect(result.monsterRetreatedTo).toBeNull();
  });

  it("a monster standing at_door never accumulates doorHallwayUvRepelMs (hallway-only condition)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state: GameState = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing",
      enemyRoute: ["at_door", "attack"],
      enemyStage: "at_door",
      doorClosed: true,
      lightOn: true,
      doorHallwayUvRepelMs: 0,
    };

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.doorHallwayUvRepelMs).toBe(0);
  });

  it("closed-door-only standoff/give_up at at_door still works unchanged (no UV involved)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const target = (NIGHT_01.enemy.doorHoldRangeMs.min + NIGHT_01.enemy.doorHoldRangeMs.max) / 2;
    const state: GameState = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing",
      enemyRoute: ["outer_yard", "right_hallway", "at_door", "attack"],
      enemyStage: "at_door",
      doorClosed: true,
      lightOn: false,
      enemyAtDoorSinceMs: 0,
      enemyDoorHoldTargetMs: target,
      enemyDoorHoldProgressMs: target - 1,
    };

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("gave_up");
    expect(result.enemyStage).not.toBe("at_door");
    expect(result.monsterRetreatedTo).not.toBeNull();
  });
});
