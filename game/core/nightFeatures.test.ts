import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";
import { DEFAULT_NIGHT_FEATURES, NightFeatureFlags } from "../difficulty/nightConfig";

function stateWithFeatures(features: Partial<NightFeatureFlags>, overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01, { nightFeatures: { ...DEFAULT_NIGHT_FEATURES, ...features } }),
    isRunning: true,
    ...overrides,
  };
}

describe("nightFeatures — generatorFaultsEnabled", () => {
  it("generatorFaultsEnabled=false: TICK past the rolled fault moment never enters silentFault", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithFeatures({ generatorFaultsEnabled: false }, { generatorFaultAtMs: 0 });

    const result = reducer(state, { type: "TICK", deltaMs: 5000 });

    expect(result.generatorState).toBe("normal");
  });

  it("generatorFaultsEnabled=true (default): TICK past the rolled fault moment does enter silentFault", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithFeatures({}, { generatorFaultAtMs: 0 });

    const result = reducer(state, { type: "TICK", deltaMs: 5000 });

    expect(result.generatorState).toBe("silentFault");
  });
});

describe("nightFeatures — bulbLifetimeEnabled", () => {
  it("bulbLifetimeEnabled=false: remainingMs never drains even with the light on", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithFeatures({ bulbLifetimeEnabled: false }, { lightOn: true });

    const result = reducer(state, { type: "TICK", deltaMs: 10_000 });

    expect(result.roomBulbs.nearRoom.remainingMs).toBe(state.roomBulbs.nearRoom.remainingMs);
  });

  it("bulbLifetimeEnabled=true (default): remainingMs drains with the light on", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithFeatures({}, { lightOn: true });

    const result = reducer(state, { type: "TICK", deltaMs: 10_000 });

    expect(result.roomBulbs.nearRoom.remainingMs).toBeLessThan(state.roomBulbs.nearRoom.remainingMs);
  });
});

describe("nightFeatures — bulbReplacementEnabled", () => {
  function stateAtDoorWithBulb(features: Partial<NightFeatureFlags>): GameState {
    return stateWithFeatures(features, {
      playerView: "door",
      doorClosed: false,
      roomBulbs: { nearRoom: { remainingMs: 0, maxMs: 30_000, broken: true } },
    });
  }

  it("bulbReplacementEnabled=false: START_BULB_REPLACEMENT cannot start", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBulb({ bulbReplacementEnabled: false });

    const result = reducer(state, { type: "START_BULB_REPLACEMENT" });

    expect(result.bulbReplacement.active).toBe(false);
  });

  it("bulbReplacementEnabled=true (default): START_BULB_REPLACEMENT can start", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBulb({});

    const result = reducer(state, { type: "START_BULB_REPLACEMENT" });

    expect(result.bulbReplacement.active).toBe(true);
  });
});

describe("nightFeatures — monsterRetreatVerificationEnabled", () => {
  function stateGivingUpAtDoor(features: Partial<NightFeatureFlags>): GameState {
    return stateWithFeatures(features, {
      enemyStage: "at_door",
      doorClosed: true,
      enemyAtDoorSinceMs: 0,
      enemyDoorHoldTargetMs: 100,
      enemyDoorHoldProgressMs: 100,
    });
  }

  it("monsterRetreatVerificationEnabled=false: retreat is immediately verified, no camera check needed", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateGivingUpAtDoor({ monsterRetreatVerificationEnabled: false });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });

    expect(result.lastEnemyDecision).toBe("gave_up");
    expect(result.monsterRetreatVerified).toBe(true);

    // Opening the door afterwards must not be treated as "returned unverified".
    const doorState = { ...result, playerView: "door" as const };
    const afterToggle = reducer(doorState, { type: "TOGGLE_DOOR" });
    expect(afterToggle.doorClosed).toBe(false);
    expect(afterToggle.lastEnemyDecision).not.toBe("returned_unverified");
  });

  it("monsterRetreatVerificationEnabled=true (default): retreat requires verification before opening the door safely", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateGivingUpAtDoor({});

    const result = reducer(state, { type: "ENEMY_ADVANCE" });

    expect(result.lastEnemyDecision).toBe("gave_up");
    expect(result.monsterRetreatVerified).toBe(false);

    const doorState = { ...result, playerView: "door" as const };
    const afterToggle = reducer(doorState, { type: "TOGGLE_DOOR" });
    expect(afterToggle.lastEnemyDecision).toBe("returned_unverified");
  });
});
