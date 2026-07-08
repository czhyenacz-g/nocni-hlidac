import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// Door encounter revize (viz game/core/doorEncounter.ts) — monstrum u dveří
// + útok + otevřené/zavřené dveře. Zablokovaný útok na zavřené dveře musí
// bušit do dveří (doorBangSeq) a NIKDY zabít; otevřené dveře musí zabít
// stejným existujícím death flow jako dřív.

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

describe("ENEMY_ADVANCE — open door at attack = death (existing flow preserved)", () => {
  it("playerView door: reveal window set, deathReason door_open_at_attack, screen stays 'playing'", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: false, playerView: "door" });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.deathReason).toBe("door_open_at_attack");
    expect(result.doorDeathRevealUntilMs).not.toBeNull();
    expect(result.screen).toBe("playing");
    expect(result.isRunning).toBe(true);
  });

  it("playerView not door: instant death, screen 'death', isRunning false", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: false, playerView: "desk" });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.deathReason).toBe("door_open_at_attack");
    expect(result.screen).toBe("death");
    expect(result.isRunning).toBe(false);
  });

  it("does not bump doorBangSeq on a lethal (open-door) attack", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: false, playerView: "door" });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.doorBangSeq).toBe(state.doorBangSeq);
  });
});

describe("ENEMY_ADVANCE — closed door at attack = blocked, no death, door bang", () => {
  it("no death, screen stays 'playing', deathReason stays null", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: true });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.screen).toBe("playing");
    expect(result.isRunning).toBe(true);
    expect(result.deathReason).toBeNull();
  });

  it("bumps doorBangSeq by exactly 1", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: true });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.doorBangSeq).toBe(state.doorBangSeq + 1);
  });

  it("still bumps doorBangSeq on the tick where the monster finally gives up (last blocked attempt)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({
      doorClosed: true,
      enemyAtDoorSinceMs: 0,
      enemyDoorHoldTargetMs: 1000,
      enemyDoorHoldProgressMs: 1000 - NIGHT_01.enemyTickMs, // next tick reaches the target -> "gave_up"
    });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.lastEnemyDecision).toBe("gave_up");
    expect(result.doorBangSeq).toBe(state.doorBangSeq + 1);
  });

  it("bang keeps incrementing tick after tick while the standoff continues (not a one-shot)", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = stateAtDoor({ doorClosed: true, enemyDoorHoldTargetMs: 999_999 });

    state = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(state.doorBangSeq).toBe(1);
    state = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(state.doorBangSeq).toBe(2);
  });
});

describe("Door bang does not fire outside a blocked-attack tick", () => {
  it("monster not at the door: ENEMY_ADVANCE never bumps doorBangSeq, regardless of door state", () => {
    const reducer = createGameReducer(NIGHT_01);
    const awayClosed: GameState = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      enemyRoute: ["left_hallway", "door_hallway", "at_door", "attack"],
      enemyStage: "left_hallway",
      doorClosed: true,
    };

    const result = reducer(awayClosed, { type: "ENEMY_ADVANCE" });
    expect(result.doorBangSeq).toBe(awayClosed.doorBangSeq);
  });

  it("TICK alone (no ENEMY_ADVANCE) never bumps doorBangSeq, even with the monster standing at a closed door", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: true });

    const result = reducer(state, { type: "TICK", deltaMs: 500 });
    expect(result.doorBangSeq).toBe(state.doorBangSeq);
  });

  it("no ambient/random bang while the monster is simply present at the door before any attack tick runs", () => {
    // Freshly-created state: monster at the door, but no action has been
    // dispatched yet — doorBangSeq must still be at its initial value.
    const state = stateAtDoor({ doorClosed: true });
    expect(state.doorBangSeq).toBe(0);
  });
});

describe("Blocked attack never uses the death/jumpscare flow", () => {
  it("doorDeathRevealUntilMs stays null when the attack is blocked", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoor({ doorClosed: true });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.doorDeathRevealUntilMs).toBeNull();
  });
});

describe("Retreat verification is unaffected by the revision", () => {
  it("light-repel does not set monsterRetreatVerified or clear a pending verification requirement", () => {
    const reducer = createGameReducer(NIGHT_01, "medium");
    // Simulates: monster already gave up once before (pending, unverified),
    // then somehow ends up back at a closed+lit door — light-repel firing
    // again must not silently satisfy the still-pending verification.
    const state = stateAtDoor({
      doorClosed: true,
      lightOn: true,
      doorLightRepelMs: NIGHT_01.enemy.doorLightRepelRequiredMs - 50,
      monsterRetreatedTo: "left_hallway",
      monsterRetreatVerified: false,
    });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.monsterRetreatVerified).toBe(false);
    expect(result.monsterRetreatedTo).toBe("left_hallway");
  });

  it("gave_up still requires verification on medium/hard when the feature flag is on (unchanged)", () => {
    const reducer = createGameReducer(NIGHT_01, "medium");
    const state = stateAtDoor({
      doorClosed: true,
      enemyAtDoorSinceMs: 0,
      enemyDoorHoldTargetMs: 1000,
      enemyDoorHoldProgressMs: 1000 - NIGHT_01.enemyTickMs,
    });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.monsterRetreatVerified).toBe(false);
  });

  it("gave_up does not require verification on easy (unchanged)", () => {
    const reducer = createGameReducer(NIGHT_01, "easy");
    const state = stateAtDoor({
      doorClosed: true,
      enemyAtDoorSinceMs: 0,
      enemyDoorHoldTargetMs: 1000,
      enemyDoorHoldProgressMs: 1000 - NIGHT_01.enemyTickMs,
    });

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.monsterRetreatVerified).toBe(true);
  });
});
