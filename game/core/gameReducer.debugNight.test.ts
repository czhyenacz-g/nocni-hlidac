import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";

// Admin-only debug nástroj (viz zadání "testovací nástroj pro late-run
// scény", GameState.debugNightOverride, DebugPanel.tsx) — SET_DEBUG_NIGHT
// smí měnit JEN debugNightOverride, nikdy žádné jiné pole GameState.

describe("SET_DEBUG_NIGHT", () => {
  it("1. sets night to 30", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, { type: "SET_DEBUG_NIGHT", night: 30 });

    expect(result.debugNightOverride).toBe(30);
  });

  it("2. clamps a value below 1 up to 1", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    expect(reducer(state, { type: "SET_DEBUG_NIGHT", night: 0 }).debugNightOverride).toBe(1);
    expect(reducer(state, { type: "SET_DEBUG_NIGHT", night: -5 }).debugNightOverride).toBe(1);
  });

  it("3. preserves gameMode", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "hardcore" as const) };

    const result = reducer(state, { type: "SET_DEBUG_NIGHT", night: 30 });

    expect(result.gameMode).toBe("hardcore");
  });

  it("4. preserves livesRemaining", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), livesRemaining: 2 };

    const result = reducer(state, { type: "SET_DEBUG_NIGHT", night: 30 });

    expect(result.livesRemaining).toBe(2);
  });

  it("5. preserves hasShotgun", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), hasShotgun: true };

    const result = reducer(state, { type: "SET_DEBUG_NIGHT", night: 30 });

    expect(result.hasShotgun).toBe(true);
  });

  it("6. preserves hasDoubleBarrelShotgun", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), hasShotgun: true, hasDoubleBarrelShotgun: true };

    const result = reducer(state, { type: "SET_DEBUG_NIGHT", night: 30 });

    expect(result.hasDoubleBarrelShotgun).toBe(true);
  });

  it("7. preserves shotgunAmmo", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), hasShotgun: true, shotgunAmmo: 2 };

    const result = reducer(state, { type: "SET_DEBUG_NIGHT", night: 30 });

    expect(result.shotgunAmmo).toBe(2);
  });

  it("8. preserves monsterKilledThisRun", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), monsterKilledThisRun: true };

    const result = reducer(state, { type: "SET_DEBUG_NIGHT", night: 30 });

    expect(result.monsterKilledThisRun).toBe(true);
  });

  it("9. does not change screen", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), screen: "playing" as const };

    const result = reducer(state, { type: "SET_DEBUG_NIGHT", night: 30 });

    expect(result.screen).toBe("playing");
  });

  it("a fresh GameState starts with debugNightOverride null", () => {
    const state = createInitialGameState(NIGHT_01);
    expect(state.debugNightOverride).toBeNull();
  });

  it("START_SHIFT resets debugNightOverride back to null", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), debugNightOverride: 30 };

    const result = reducer(state, { type: "START_SHIFT" });

    expect(result.debugNightOverride).toBeNull();
  });
});
