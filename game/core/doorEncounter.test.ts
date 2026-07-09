import { describe, expect, it } from "vitest";
import {
  isDoorAttackBlockedByClosedDoor,
  isDoorAttackLethal,
  isMonsterAtDoor,
  resolveDoorMonsterEncounter,
  shouldDoorLightForceRetreat,
  wouldMonsterAttackAtDoor,
} from "./doorEncounter";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { EnemyStage, GameState } from "./types";

function stateWith(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(NIGHT_01), ...overrides };
}

const NOT_AT_DOOR_STAGES: EnemyStage[] = ["outside", "outer_yard", "left_hallway", "right_hallway", "door_hallway"];

describe("isMonsterAtDoor", () => {
  it("true for at_door", () => {
    expect(isMonsterAtDoor(stateWith({ enemyStage: "at_door" }))).toBe(true);
  });

  it("true for breach (same treatment as at_door)", () => {
    expect(isMonsterAtDoor(stateWith({ enemyStage: "breach" }))).toBe(true);
  });

  it("false for every other stage", () => {
    for (const stage of NOT_AT_DOOR_STAGES) {
      expect(isMonsterAtDoor(stateWith({ enemyStage: stage }))).toBe(false);
    }
  });
});

describe("wouldMonsterAttackAtDoor", () => {
  it("matches isMonsterAtDoor exactly (no separate attack roll today)", () => {
    for (const stage of [...NOT_AT_DOOR_STAGES, "at_door", "breach"] as EnemyStage[]) {
      const state = stateWith({ enemyStage: stage });
      expect(wouldMonsterAttackAtDoor(state)).toBe(isMonsterAtDoor(state));
    }
  });
});

describe("isDoorAttackBlockedByClosedDoor / isDoorAttackLethal", () => {
  it("blocked when at door and door is closed", () => {
    const state = stateWith({ enemyStage: "at_door", doorClosed: true });
    expect(isDoorAttackBlockedByClosedDoor(state)).toBe(true);
    expect(isDoorAttackLethal(state)).toBe(false);
  });

  it("lethal when at door and door is open", () => {
    const state = stateWith({ enemyStage: "at_door", doorClosed: false });
    expect(isDoorAttackLethal(state)).toBe(true);
    expect(isDoorAttackBlockedByClosedDoor(state)).toBe(false);
  });

  it("neither blocked nor lethal when the monster is not at the door, regardless of door state", () => {
    const awayClosed = stateWith({ enemyStage: "left_hallway", doorClosed: true });
    const awayOpen = stateWith({ enemyStage: "left_hallway", doorClosed: false });
    expect(isDoorAttackBlockedByClosedDoor(awayClosed)).toBe(false);
    expect(isDoorAttackLethal(awayClosed)).toBe(false);
    expect(isDoorAttackBlockedByClosedDoor(awayOpen)).toBe(false);
    expect(isDoorAttackLethal(awayOpen)).toBe(false);
  });

  it("breach behaves the same as at_door", () => {
    expect(isDoorAttackBlockedByClosedDoor(stateWith({ enemyStage: "breach", doorClosed: true }))).toBe(true);
    expect(isDoorAttackLethal(stateWith({ enemyStage: "breach", doorClosed: false }))).toBe(true);
  });
});

describe("shouldDoorLightForceRetreat", () => {
  it("true only when at door AND door closed AND light on, all at once", () => {
    expect(shouldDoorLightForceRetreat(stateWith({ enemyStage: "at_door", doorClosed: true, lightOn: true }))).toBe(true);
  });

  it("false if the door is open, even with light on and monster at the door", () => {
    expect(shouldDoorLightForceRetreat(stateWith({ enemyStage: "at_door", doorClosed: false, lightOn: true }))).toBe(false);
  });

  it("false if the light is off, even with door closed and monster at the door", () => {
    expect(shouldDoorLightForceRetreat(stateWith({ enemyStage: "at_door", doorClosed: true, lightOn: false }))).toBe(false);
  });

  it("false if the monster is not at the door, even with door closed and light on", () => {
    expect(shouldDoorLightForceRetreat(stateWith({ enemyStage: "left_hallway", doorClosed: true, lightOn: true }))).toBe(
      false,
    );
  });
});

describe("resolveDoorMonsterEncounter", () => {
  it("summarizes a blocked-attack situation consistently with the individual helpers", () => {
    const state = stateWith({ enemyStage: "at_door", doorClosed: true, lightOn: false });
    const summary = resolveDoorMonsterEncounter(state);
    expect(summary).toEqual({
      atDoor: true,
      wouldAttack: true,
      blockedByClosedDoor: true,
      lethal: false,
      lightForcingRetreat: false,
      hallwayUvForcingRetreat: false,
    });
  });

  it("summarizes a lethal situation consistently with the individual helpers", () => {
    const state = stateWith({ enemyStage: "at_door", doorClosed: false, lightOn: false });
    const summary = resolveDoorMonsterEncounter(state);
    expect(summary).toEqual({
      atDoor: true,
      wouldAttack: true,
      blockedByClosedDoor: false,
      lethal: true,
      lightForcingRetreat: false,
      hallwayUvForcingRetreat: false,
    });
  });

  it("summarizes a light-forcing-retreat situation consistently with the individual helpers", () => {
    const state = stateWith({ enemyStage: "at_door", doorClosed: true, lightOn: true });
    const summary = resolveDoorMonsterEncounter(state);
    expect(summary).toEqual({
      atDoor: true,
      wouldAttack: true,
      blockedByClosedDoor: true,
      lethal: false,
      lightForcingRetreat: true,
      hallwayUvForcingRetreat: false,
    });
  });

  it("summarizes a hallway-uv-forcing-retreat situation consistently with the individual helpers", () => {
    const state = stateWith({ enemyStage: "door_hallway", doorClosed: true, lightOn: true });
    const summary = resolveDoorMonsterEncounter(state);
    expect(summary).toEqual({
      atDoor: false,
      wouldAttack: false,
      blockedByClosedDoor: false,
      lethal: false,
      lightForcingRetreat: false,
      hallwayUvForcingRetreat: true,
    });
  });

  it("summarizes a monster-away situation as all-false", () => {
    const state = stateWith({ enemyStage: "right_hallway", doorClosed: true, lightOn: true });
    const summary = resolveDoorMonsterEncounter(state);
    expect(summary).toEqual({
      atDoor: false,
      wouldAttack: false,
      blockedByClosedDoor: false,
      lethal: false,
      hallwayUvForcingRetreat: false,
      lightForcingRetreat: false,
    });
  });
});
