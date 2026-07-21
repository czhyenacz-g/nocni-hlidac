import { describe, expect, it } from "vitest";
import { resolveTitanAdvance, resolveTitanStageStayMs } from "./resolveTitanAdvance";
import { createInitialGameState } from "../core/gameState";
import { NIGHT_15 } from "../nights/night15";
import { GameState } from "../core/types";
import { TITAN_AT_DOOR_STAGE_STAY_MS, TITAN_DOOR_BREACH_STAGE_STAY_MS, TITAN_STAGE_STAY_MS } from "../balancing/constants";

const ROUTE = NIGHT_15.enemy.routeVariants[0];

function titanState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(NIGHT_15), isRunning: true, ...overrides };
}

describe("resolveTitanAdvance — deterministic 20s-per-stage march, never retreats", () => {
  it("starts on the first route stage ('outside')", () => {
    const state = titanState();
    expect(state.enemyStage).toBe("outside");
    expect(state.enemyRoute).toEqual(ROUTE);
  });

  it("does not advance before TITAN_STAGE_STAY_MS elapses in the current stage", () => {
    const state = titanState({ elapsedMs: TITAN_STAGE_STAY_MS - 1, enemyLocationEnteredAtMs: 0 });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBeUndefined();
  });

  it("advances exactly one stage once TITAN_STAGE_STAY_MS elapses", () => {
    const state = titanState({ elapsedMs: TITAN_STAGE_STAY_MS, enemyLocationEnteredAtMs: 0, enemyStage: "outside" });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBe("outer_yard");
  });

  it("marches forward through every stage of the route, one at a time, never skipping", () => {
    let state = titanState();
    for (let i = 0; i < ROUTE.length - 2; i++) {
      const advanced = { ...state, elapsedMs: state.enemyLocationEnteredAtMs + TITAN_STAGE_STAY_MS };
      const result = resolveTitanAdvance({ state: advanced, night: NIGHT_15 });
      expect(result.enemyStage).toBe(ROUTE[i + 1]);
      state = { ...advanced, enemyStage: result.enemyStage!, enemyLocationEnteredAtMs: advanced.elapsedMs };
    }
    expect(state.enemyStage).toBe("breach");
  });

  it("never returns an earlier route index than the current one (no retreat, ever)", () => {
    for (const stage of ROUTE.slice(0, -1)) {
      const state = titanState({ enemyStage: stage, elapsedMs: TITAN_STAGE_STAY_MS, enemyLocationEnteredAtMs: 0 });
      const result = resolveTitanAdvance({ state, night: NIGHT_15 });
      const currentIndex = ROUTE.indexOf(stage);
      const resultIndex = result.enemyStage ? ROUTE.indexOf(result.enemyStage) : currentIndex;
      expect(resultIndex).toBeGreaterThanOrEqual(currentIndex);
    }
  });

  it("transitioning from 'breach' into 'attack' triggers the full player-death flow immediately, with a Titan-specific death reason", () => {
    const state = titanState({ enemyStage: "breach", elapsedMs: TITAN_STAGE_STAY_MS, enemyLocationEnteredAtMs: 0 });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBe("attack");
    expect(result.screen).toBe("death");
    expect(result.isRunning).toBe(false);
    // VLASTNÍ reason, NE sdílený s Impovým door_open_at_attack (viz zadání
    // "oprav dvojitý Game Over" — sdílená hodnota dřív způsobila zavádějící
    // "otevřené dveře" text/pozadí i u Titana).
    expect(result.deathReason).toBe("titan_door_breach");
    expect(result.deathReason).not.toBe("door_open_at_attack");
  });

  it("no-ops once in 'attack' — never advances further", () => {
    const state = titanState({ enemyStage: "attack", elapsedMs: 999_999, enemyLocationEnteredAtMs: 0 });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result).toEqual({});
  });

  it("no-ops once in 'graveyard' — never advances further", () => {
    const state = titanState({ enemyStage: "graveyard", elapsedMs: 999_999, enemyLocationEnteredAtMs: 0 });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result).toEqual({});
  });
});

// Oprava "příliš dlouhé animace prorážení dveří" (viz zadání) — at_door a
// breach mají VLASTNÍ, mnohem kratší dobu setrvání než zbytek trasy
// (TITAN_STAGE_STAY_MS = 20000ms), ať jsou to rychlé přechodové fáze těsně
// před finálním útokem, ne další plnohodnotná čekací lokace. at_door
// (TITAN_AT_DOOR_STAGE_STAY_MS = 7000ms) a breach (TITAN_DOOR_BREACH_STAGE_STAY_MS
// = 1000ms) mají KAŽDÝ svou VLASTNÍ hodnotu (viz zadání "zvyš at_door na 7s").
describe("resolveTitanStageStayMs — per-stage dwell time (fast door-breach transitions)", () => {
  it("at_door uses TITAN_AT_DOOR_STAGE_STAY_MS (~7s), breach uses the shorter TITAN_DOOR_BREACH_STAGE_STAY_MS (~1s)", () => {
    expect(resolveTitanStageStayMs("at_door")).toBe(TITAN_AT_DOOR_STAGE_STAY_MS);
    expect(resolveTitanStageStayMs("breach")).toBe(TITAN_DOOR_BREACH_STAGE_STAY_MS);
    expect(TITAN_AT_DOOR_STAGE_STAY_MS).toBeLessThan(TITAN_STAGE_STAY_MS);
    expect(TITAN_DOOR_BREACH_STAGE_STAY_MS).toBeLessThan(TITAN_AT_DOOR_STAGE_STAY_MS);
  });

  it("every other real route stage uses the full TITAN_STAGE_STAY_MS (unaffected — route speed before the door is unchanged)", () => {
    for (const stage of ["outside", "outer_yard", "left_hallway", "door_hallway"] as const) {
      expect(resolveTitanStageStayMs(stage)).toBe(TITAN_STAGE_STAY_MS);
    }
  });

  it("does NOT advance out of 'at_door' before TITAN_AT_DOOR_STAGE_STAY_MS elapses", () => {
    const state = titanState({
      enemyStage: "at_door",
      elapsedMs: TITAN_AT_DOOR_STAGE_STAY_MS - 1,
      enemyLocationEnteredAtMs: 0,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBeUndefined();
    expect(result.lastEnemyDecision).toBe("stay");
  });

  it("advances from 'at_door' to 'breach' exactly once TITAN_AT_DOOR_STAGE_STAY_MS elapses — NOT the full 20s", () => {
    const state = titanState({
      enemyStage: "at_door",
      elapsedMs: TITAN_AT_DOOR_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBe("breach");
  });

  it("does NOT advance out of 'breach' before TITAN_DOOR_BREACH_STAGE_STAY_MS elapses", () => {
    const state = titanState({
      enemyStage: "breach",
      elapsedMs: TITAN_DOOR_BREACH_STAGE_STAY_MS - 1,
      enemyLocationEnteredAtMs: 0,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBeUndefined();
  });

  it("advances from 'breach' to 'attack' (death) exactly once TITAN_DOOR_BREACH_STAGE_STAY_MS elapses — NOT the full 20s", () => {
    const state = titanState({
      enemyStage: "breach",
      elapsedMs: TITAN_DOOR_BREACH_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBe("attack");
    expect(result.screen).toBe("death");
  });

  it("earlier hallway stages still require the full TITAN_STAGE_STAY_MS — route speed before the door is unchanged", () => {
    const state = titanState({
      enemyStage: "door_hallway",
      elapsedMs: TITAN_AT_DOOR_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBeUndefined();
  });
});

// Oprava race condition (viz zadání "kritický race condition v závěru Titan
// encounteru") — dokud u dveří běží generátorové přetížení, Titanův vlastní
// postupový časovač se musí úplně zastavit, ať se garantovaně nedostane do
// "attack" dřív, než přetížení stihne doběhnout.
describe("resolveTitanAdvance — freezes at the door while a generator overload is running", () => {
  it("does not advance from 'at_door' to 'breach' while an overload is running, even long past TITAN_AT_DOOR_STAGE_STAY_MS", () => {
    const state = titanState({
      enemyStage: "at_door",
      elapsedMs: TITAN_AT_DOOR_STAGE_STAY_MS * 10,
      enemyLocationEnteredAtMs: 0,
      doorGeneratorOverloadUntilMs: TITAN_AT_DOOR_STAGE_STAY_MS * 20,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBeUndefined();
    expect(result.lastEnemyDecision).toBe("stay");
  });

  it("does not advance from 'breach' to 'attack' (death) while an overload is running", () => {
    const state = titanState({
      enemyStage: "breach",
      elapsedMs: TITAN_DOOR_BREACH_STAGE_STAY_MS * 10,
      enemyLocationEnteredAtMs: 0,
      doorGeneratorOverloadUntilMs: TITAN_DOOR_BREACH_STAGE_STAY_MS * 20,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBeUndefined();
    expect(result.screen).toBeUndefined();
  });

  it("resumes advancing normally once the overload is no longer running (doorGeneratorOverloadUntilMs back to null)", () => {
    const state = titanState({
      enemyStage: "at_door",
      elapsedMs: TITAN_AT_DOOR_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
      doorGeneratorOverloadUntilMs: null,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBe("breach");
  });

  it("an overload running away from the door (not at_door/breach) does not freeze Titan's march", () => {
    const state = titanState({
      enemyStage: "left_hallway",
      elapsedMs: TITAN_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
      doorGeneratorOverloadUntilMs: TITAN_STAGE_STAY_MS * 5,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBe("door_hallway");
  });
});

// Titan rozbíjí žárovku u dveří, PŘESNĚ při vstupu do "at_door" (viz zadání
// "Titan při at_door rozbije žárovku").
describe("resolveTitanAdvance — breaks the near-room bulb entering 'at_door' if the light is on", () => {
  function stateEnteringAtDoor(overrides: Partial<GameState> = {}): GameState {
    return titanState({
      enemyStage: "door_hallway",
      elapsedMs: TITAN_STAGE_STAY_MS,
      enemyLocationEnteredAtMs: 0,
      ...overrides,
    });
  }

  it("light on, bulb healthy -> breaks the bulb and bumps bulbBreakSeq exactly once, while still advancing to at_door", () => {
    const state = stateEnteringAtDoor({
      lightOn: true,
      roomBulbs: { nearRoom: { remainingMs: 20_000, maxMs: 30_000, broken: false } },
      bulbBreakSeq: 0,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBe("at_door");
    expect(result.roomBulbs?.nearRoom.broken).toBe(true);
    expect(result.roomBulbs?.nearRoom.remainingMs).toBe(0);
    expect(result.bulbBreakSeq).toBe(1);
  });

  it("light off -> nothing happens to the bulb (still healthy, bulbBreakSeq unchanged)", () => {
    const state = stateEnteringAtDoor({
      lightOn: false,
      roomBulbs: { nearRoom: { remainingMs: 20_000, maxMs: 30_000, broken: false } },
      bulbBreakSeq: 0,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBe("at_door");
    expect(result.roomBulbs).toBeUndefined();
    expect(result.bulbBreakSeq).toBeUndefined();
  });

  it("light on but the bulb is already broken -> does not break it a second time (bulbBreakSeq unchanged)", () => {
    const state = stateEnteringAtDoor({
      lightOn: true,
      roomBulbs: { nearRoom: { remainingMs: 0, maxMs: 30_000, broken: true } },
      bulbBreakSeq: 3,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.enemyStage).toBe("at_door");
    // isNearRoomLightActive is false once the bulb is already broken, so the
    // "light on" branch never fires — no roomBulbs/bulbBreakSeq key at all.
    expect(result.roomBulbs).toBeUndefined();
    expect(result.bulbBreakSeq).toBeUndefined();
  });

  it("a broken bulb stays broken (survives through breach/attack unaffected by this transition)", () => {
    const state = stateEnteringAtDoor({
      lightOn: true,
      roomBulbs: { nearRoom: { remainingMs: 15_000, maxMs: 30_000, broken: false } },
      bulbBreakSeq: 0,
    });
    const result = resolveTitanAdvance({ state, night: NIGHT_15 });
    expect(result.roomBulbs?.nearRoom.broken).toBe(true);
  });
});
