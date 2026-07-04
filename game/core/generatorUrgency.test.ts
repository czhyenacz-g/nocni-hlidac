import { describe, expect, it } from "vitest";
import { isGeneratorArrowUrgent } from "./generatorUrgency";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

const generator = NIGHT_01.generator;

function stateWith(overrides: Partial<GameState>): GameState {
  return { ...createInitialGameState(NIGHT_01), ...overrides };
}

describe("isGeneratorArrowUrgent", () => {
  it("does not blink while normal", () => {
    const state = stateWith({ generatorState: "normal" });
    expect(isGeneratorArrowUrgent(state, generator)).toBe(false);
  });

  it("does not blink during silentFault (quiet phase) — no signal has happened yet", () => {
    const state = stateWith({ generatorState: "silentFault", generatorSilentSinceMs: 0, elapsedMs: 9999 });
    expect(isGeneratorArrowUrgent(state, generator)).toBe(false);
  });

  it("does not blink the instant criticalBeeping starts — beeping/drain come first", () => {
    const criticalBeepingStartMs = 0 + generator.silentGraceMs;
    const state = stateWith({
      generatorState: "criticalBeeping",
      generatorSilentSinceMs: 0,
      elapsedMs: criticalBeepingStartMs,
    });
    expect(isGeneratorArrowUrgent(state, generator)).toBe(false);
  });

  it("starts blinking only after the delay following criticalBeeping's start", () => {
    const criticalBeepingStartMs = 0 + generator.silentGraceMs;
    const state = stateWith({
      generatorState: "criticalBeeping",
      generatorSilentSinceMs: 0,
      elapsedMs: criticalBeepingStartMs + 2000,
    });
    expect(isGeneratorArrowUrgent(state, generator)).toBe(true);
  });

  it("never blinks during restarting", () => {
    const state = stateWith({ generatorState: "restarting", elapsedMs: 999999 });
    expect(isGeneratorArrowUrgent(state, generator)).toBe(false);
  });
});
