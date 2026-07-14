import { describe, expect, it } from "vitest";
import { isMonsterMinStayBlocking } from "./monsterMinStay";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

function stateWith(overrides: Partial<GameState>): GameState {
  return { ...createInitialGameState(NIGHT_01), isRunning: true, ...overrides };
}

describe("isMonsterMinStayBlocking", () => {
  it("blocks 'outside' before 6000ms have elapsed since entering it", () => {
    const state = stateWith({ enemyStage: "outside", enemyLocationEnteredAtMs: 1000, elapsedMs: 1000 + 5999 });
    expect(isMonsterMinStayBlocking(state)).toBe(true);
  });

  it("allows 'outside' once 6000ms have elapsed", () => {
    const state = stateWith({ enemyStage: "outside", enemyLocationEnteredAtMs: 1000, elapsedMs: 1000 + 6000 });
    expect(isMonsterMinStayBlocking(state)).toBe(false);
  });

  it("blocks 'left_hallway' before 5000ms", () => {
    const state = stateWith({ enemyStage: "left_hallway", enemyLocationEnteredAtMs: 2000, elapsedMs: 2000 + 4999 });
    expect(isMonsterMinStayBlocking(state)).toBe(true);
  });

  it("allows 'left_hallway' at/after 5000ms", () => {
    const state = stateWith({ enemyStage: "left_hallway", enemyLocationEnteredAtMs: 2000, elapsedMs: 2000 + 5000 });
    expect(isMonsterMinStayBlocking(state)).toBe(false);
  });

  it("blocks 'right_hallway' before 5000ms", () => {
    const state = stateWith({ enemyStage: "right_hallway", enemyLocationEnteredAtMs: 0, elapsedMs: 4999 });
    expect(isMonsterMinStayBlocking(state)).toBe(true);
  });

  it("allows 'right_hallway' at/after 5000ms", () => {
    const state = stateWith({ enemyStage: "right_hallway", enemyLocationEnteredAtMs: 0, elapsedMs: 5000 });
    expect(isMonsterMinStayBlocking(state)).toBe(false);
  });

  it("blocks 'door_hallway' before 4000ms", () => {
    const state = stateWith({ enemyStage: "door_hallway", enemyLocationEnteredAtMs: 500, elapsedMs: 500 + 3999 });
    expect(isMonsterMinStayBlocking(state)).toBe(true);
  });

  it("allows 'door_hallway' at/after 4000ms", () => {
    const state = stateWith({ enemyStage: "door_hallway", enemyLocationEnteredAtMs: 500, elapsedMs: 500 + 4000 });
    expect(isMonsterMinStayBlocking(state)).toBe(false);
  });

  it("never blocks 'outer_yard' — deliberately excluded from MONSTER_MIN_LOCATION_STAY_MS", () => {
    const state = stateWith({ enemyStage: "outer_yard", enemyLocationEnteredAtMs: 0, elapsedMs: 1 });
    expect(isMonsterMinStayBlocking(state)).toBe(false);
  });

  it("never blocks 'at_door' — has its own standoff/door behavior instead", () => {
    const state = stateWith({ enemyStage: "at_door", enemyLocationEnteredAtMs: 0, elapsedMs: 1 });
    expect(isMonsterMinStayBlocking(state)).toBe(false);
  });

  it("never blocks 'breach'/'attack' — no config entry", () => {
    expect(isMonsterMinStayBlocking(stateWith({ enemyStage: "breach", enemyLocationEnteredAtMs: 0, elapsedMs: 1 }))).toBe(false);
    expect(isMonsterMinStayBlocking(stateWith({ enemyStage: "attack", enemyLocationEnteredAtMs: 0, elapsedMs: 1 }))).toBe(false);
  });
});
