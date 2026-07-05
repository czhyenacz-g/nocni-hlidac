import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";
import { BULB_REPLACE_DURATION_MS } from "../balancing/constants";

function stateAtDoorWithBrokenBulb(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    playerView: "door",
    doorClosed: false,
    roomBulbs: { nearRoom: { remainingMs: 0, maxMs: 30_000, broken: true } },
    ...overrides,
  };
}

describe("START_BULB_REPLACEMENT", () => {
  it("cannot start when the bulb is not broken", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      roomBulbs: { nearRoom: { remainingMs: 5000, maxMs: 30_000, broken: false } },
    });

    const result = reducer(state, { type: "START_BULB_REPLACEMENT" });
    expect(result.bulbReplacement.active).toBe(false);
  });

  it("cannot start when the door is closed", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({ doorClosed: true });

    const result = reducer(state, { type: "START_BULB_REPLACEMENT" });
    expect(result.bulbReplacement.active).toBe(false);
  });

  it("cannot start when not in DoorView", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({ playerView: "desk" });

    const result = reducer(state, { type: "START_BULB_REPLACEMENT" });
    expect(result.bulbReplacement.active).toBe(false);
  });

  it("starts when playerView is door, door is open, and the bulb is broken", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb();

    const result = reducer(state, { type: "START_BULB_REPLACEMENT" });
    expect(result.bulbReplacement.active).toBe(true);
    expect(result.bulbReplacement.progressMs).toBe(0);
  });

  it("does not start a second parallel replacement while one is already active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: 2000 },
    });

    const result = reducer(state, { type: "START_BULB_REPLACEMENT" });
    // Beze změny — druhý START je no-op, progress se neresetuje na 0.
    expect(result.bulbReplacement.progressMs).toBe(2000);
  });
});

describe("bulbsRemaining — replacement guards and consumption", () => {
  it("cannot start when there are no spare bulbs left", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({ bulbsRemaining: 0 });

    const result = reducer(state, { type: "START_BULB_REPLACEMENT" });
    expect(result.bulbReplacement.active).toBe(false);
  });

  it("does not decrement bulbsRemaining on start", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({ bulbsRemaining: 3 });

    const result = reducer(state, { type: "START_BULB_REPLACEMENT" });
    expect(result.bulbsRemaining).toBe(3);
  });

  it("decrements bulbsRemaining by exactly 1 on successful completion", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      bulbsRemaining: 3,
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: BULB_REPLACE_DURATION_MS - 1000 },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.bulbsRemaining).toBe(2);
    expect(result.roomBulbs.nearRoom.broken).toBe(false);
  });

  it("does not decrement bulbsRemaining while replacement is merely in progress", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      bulbsRemaining: 3,
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: 1000 },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.bulbsRemaining).toBe(3);
  });

  it("does not decrement bulbsRemaining if the player releases before completion (CANCEL)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      bulbsRemaining: 3,
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: 2000 },
    });

    const result = reducer(state, { type: "CANCEL_BULB_REPLACEMENT" });
    expect(result.bulbsRemaining).toBe(3);
    expect(result.bulbReplacement.active).toBe(false);
    expect(result.bulbReplacement.progressMs).toBe(0);
    expect(result.roomBulbs.nearRoom.broken).toBe(true);
  });

  it("does not decrement bulbsRemaining if the player dies mid-replacement", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state: GameState = {
      ...stateAtDoorWithBrokenBulb({
        bulbsRemaining: 3,
        bulbReplacement: { active: true, startedAtMs: 0, progressMs: 2000 },
      }),
      enemyRoute: ["at_door", "attack"],
      enemyStage: "at_door",
      doorClosed: false,
    };

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.bulbsRemaining).toBe(3);
  });
});

describe("CANCEL_BULB_REPLACEMENT", () => {
  it("is a no-op when no replacement is active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb();

    const result = reducer(state, { type: "CANCEL_BULB_REPLACEMENT" });
    expect(result).toBe(state);
  });

  it("resets progress to 0 and lets the player start again by holding", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: 2500 },
    });

    const cancelled = reducer(state, { type: "CANCEL_BULB_REPLACEMENT" });
    expect(cancelled.bulbReplacement).toEqual({ active: false, startedAtMs: null, progressMs: 0 });

    const restarted = reducer(cancelled, { type: "START_BULB_REPLACEMENT" });
    expect(restarted.bulbReplacement.active).toBe(true);
    expect(restarted.bulbReplacement.progressMs).toBe(0);
  });
});

describe("TICK — bulb replacement progress", () => {
  it("increases progressMs while active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: 1000 },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.bulbReplacement.progressMs).toBe(2000);
    expect(result.bulbReplacement.active).toBe(true);
  });

  it("repairs the bulb to full lifetime and deactivates after the full hold duration", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: BULB_REPLACE_DURATION_MS - 1000 },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result.bulbReplacement.active).toBe(false);
    expect(result.bulbReplacement.progressMs).toBe(0);
    expect(result.roomBulbs.nearRoom.broken).toBe(false);
    expect(result.roomBulbs.nearRoom.remainingMs).toBe(30_000);
  });

  it("does not drain the (still broken) bulb's remainingMs while replacement is pending, even if lightOn is somehow true", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      lightOn: true,
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: 0 },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    // Bulb je pořád "broken" celou dobu výměny, takže isNearRoomLightActive
    // je pořád false a normální drain (updateRoomBulbs) se nespustí.
    expect(result.roomBulbs.nearRoom.remainingMs).toBe(0);
  });
});

describe("TOGGLE_DOOR / navigating away cancels bulb replacement", () => {
  it("cancels the replacement (no repair) if the player closes the door mid-replacement", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: 2000 },
    });

    const result = reducer(state, { type: "TOGGLE_DOOR" });
    expect(result.doorClosed).toBe(true);
    expect(result.bulbReplacement.active).toBe(false);
    expect(result.roomBulbs.nearRoom.broken).toBe(true);
  });

  it("cancels the replacement if the player looks away to the desk", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: 2000 },
    });

    const result = reducer(state, { type: "LOOK_AT_DESK" });
    expect(result.bulbReplacement.active).toBe(false);
  });
});

describe("Death during bulb replacement", () => {
  it("uses bulb_replacement_attack as the death reason when the monster attacks while replacement is active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state: GameState = {
      ...stateAtDoorWithBrokenBulb({
        bulbReplacement: { active: true, startedAtMs: 0, progressMs: 2000 },
      }),
      enemyRoute: ["at_door", "attack"],
      enemyStage: "at_door",
      doorClosed: false,
    };

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.deathReason).toBe("bulb_replacement_attack");
    expect(result.doorDeathRevealUntilMs).not.toBeNull();
  });

  it("uses the regular door_open_at_attack reason when no replacement is active", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state: GameState = {
      ...stateAtDoorWithBrokenBulb(),
      enemyRoute: ["at_door", "attack"],
      enemyStage: "at_door",
      doorClosed: false,
    };

    const result = reducer(state, { type: "ENEMY_ADVANCE" });
    expect(result.deathReason).toBe("door_open_at_attack");
  });
});

describe("Restart resets bulb replacement", () => {
  it("is never active right after RESTART_SHIFT, even if it was active before", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDoorWithBrokenBulb({
      bulbReplacement: { active: true, startedAtMs: 0, progressMs: 3000 },
    });

    const result = reducer(state, { type: "RESTART_SHIFT" });
    expect(result.bulbReplacement.active).toBe(false);
    expect(result.bulbReplacement.progressMs).toBe(0);
  });
});
