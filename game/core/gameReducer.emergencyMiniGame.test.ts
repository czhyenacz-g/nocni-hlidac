import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { MAX_POWER } from "../balancing/constants";

// Napojení EmergencyMiniGame do hlavní hry (viz
// game/core/emergencyMiniGameIntegration.ts, app/play/page.tsx
// handleEmergencyMiniGameComplete) — RECHARGE_POWER a EMERGENCY_MINIGAME_DIED
// jsou dvě jediné akce, kterými se výsledek minihry projeví v GameState.

describe("RECHARGE_POWER", () => {
  it("increases power by amount", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, power: 50 };

    const result = reducer(state, { type: "RECHARGE_POWER", amount: 35 });

    expect(result.power).toBe(85);
  });

  it("clamps to MAX_POWER, never overshoots", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, power: MAX_POWER - 10 };

    const result = reducer(state, { type: "RECHARGE_POWER", amount: 35 });

    expect(result.power).toBe(MAX_POWER);
  });

  it("is a no-op for amount <= 0", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, power: 50 };

    expect(reducer(state, { type: "RECHARGE_POWER", amount: 0 })).toBe(state);
    expect(reducer(state, { type: "RECHARGE_POWER", amount: -5 })).toBe(state);
  });

  it("is a no-op while the game is not running", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: false, power: 50 };

    expect(reducer(state, { type: "RECHARGE_POWER", amount: 35 })).toBe(state);
  });
});

describe("EMERGENCY_MINIGAME_DIED", () => {
  it("sends the game into the existing death flow with deathReason 'emergency_run'", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, screen: "playing" as const };

    const result = reducer(state, { type: "EMERGENCY_MINIGAME_DIED" });

    expect(result.screen).toBe("death");
    expect(result.deathReason).toBe("emergency_run");
    expect(result.isRunning).toBe(false);
  });

  it("is a no-op if the game is already stopped", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: false };

    expect(reducer(state, { type: "EMERGENCY_MINIGAME_DIED" })).toBe(state);
  });
});
