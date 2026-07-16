import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

function stateWithLight(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(NIGHT_01), isRunning: true, lightOn: true, ...overrides };
}

describe("TICK — room bulb lifetime", () => {
  it("does not drain remainingMs while the light is off", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithLight({ lightOn: false });

    const result = reducer(state, { type: "TICK", deltaMs: 5000 });

    expect(result.roomBulbs.nearRoom.remainingMs).toBe(30_000);
  });

  it("drains remainingMs while the light is really on", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithLight();

    const result = reducer(state, { type: "TICK", deltaMs: 5000 });

    expect(result.roomBulbs.nearRoom.remainingMs).toBe(25_000);
    expect(result.roomBulbs.nearRoom.broken).toBe(false);
  });

  it("breaks the bulb, zeroes remainingMs, and turns the switch off once it reaches 0", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateWithLight({
      roomBulbs: { nearRoom: { remainingMs: 2000, maxMs: 30_000, broken: false } },
    });

    const result = reducer(state, { type: "TICK", deltaMs: 5000 });

    expect(result.roomBulbs.nearRoom.remainingMs).toBe(0);
    expect(result.roomBulbs.nearRoom.broken).toBe(true);
    expect(result.lightOn).toBe(false);
    expect(result.bulbBreakSeq).toBe(1);
  });

  it("does not increment bulbBreakSeq again on subsequent ticks once already broken", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = stateWithLight({
      roomBulbs: { nearRoom: { remainingMs: 1000, maxMs: 30_000, broken: false } },
    });

    state = reducer(state, { type: "TICK", deltaMs: 5000 });
    expect(state.bulbBreakSeq).toBe(1);

    // Světlo je teď vypnuté (zásah reduceru), ale i kdyby si ho hráč znovu
    // "zapnul" (viz TOGGLE_LIGHT guard, testováno jinde), bulbBreakSeq se
    // nesmí zvýšit podruhé za tu samou poruchu.
    state = reducer({ ...state, lightOn: true }, { type: "TICK", deltaMs: 5000 });
    expect(state.bulbBreakSeq).toBe(1);
  });

  it("weak but unbroken bulb survives a shift transition with the same remainingMs (via createInitialGameState override)", () => {
    const roomBulbsOverride = { nearRoom: { remainingMs: 8000, maxMs: 30_000, broken: false } };
    const nextShiftState = createInitialGameState(NIGHT_01, { roomBulbs: roomBulbsOverride });

    expect(nextShiftState.roomBulbs.nearRoom.remainingMs).toBe(8000);
    expect(nextShiftState.roomBulbs.nearRoom.broken).toBe(false);
  });
});

describe("TOGGLE_LIGHT with a broken bulb", () => {
  it("does nothing when the bulb is broken (switch has no effect)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state: GameState = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      playerView: "desk",
      lightOn: false,
      roomBulbs: { nearRoom: { remainingMs: 0, maxMs: 30_000, broken: true } },
    };

    const result = reducer(state, { type: "TOGGLE_LIGHT" });

    expect(result.lightOn).toBe(false);
  });

  it("toggles normally when the bulb is healthy", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state: GameState = { ...createInitialGameState(NIGHT_01), isRunning: true, lightOn: false };

    const result = reducer(state, { type: "TOGGLE_LIGHT" });

    expect(result.lightOn).toBe(true);
  });
});
