import { describe, expect, it } from "vitest";
import { createGameReducer, willGeneratorRestartSucceed } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// RESTART_GENERATOR (viz gameReducer.ts) — restart FUNKČNÍHO generátoru je
// omylem/zbytečná akce (penalizovaná "restarting" fází), na rozdíl od
// restartu po skutečné poruše. GameState.generatorAccidentalRestartSeq
// signalizuje jen ten první případ, ať GeneratorView.tsx ví, kdy zobrazit
// posměšnou hlášku ("To byla pěkný blbost...").

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(NIGHT_01), isRunning: true, screen: "playing", ...overrides };
}

describe("RESTART_GENERATOR — generatorAccidentalRestartSeq", () => {
  it("increments exactly once when restarting a generator that was running fine (\"normal\")", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ generatorState: "normal" });

    const result = reducer(state, { type: "RESTART_GENERATOR" });
    expect(result.generatorState).toBe("restarting");
    expect(result.generatorAccidentalRestartSeq).toBe(state.generatorAccidentalRestartSeq + 1);
  });

  it("does NOT increment when restarting during a real fault (silentFault)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ generatorState: "silentFault" });

    const result = reducer(state, { type: "RESTART_GENERATOR" });
    expect(result.generatorAccidentalRestartSeq).toBe(state.generatorAccidentalRestartSeq);
  });

  it("does NOT increment when restarting during a real fault (criticalBeeping)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ generatorState: "criticalBeeping" });

    const result = reducer(state, { type: "RESTART_GENERATOR" });
    expect(result.generatorAccidentalRestartSeq).toBe(state.generatorAccidentalRestartSeq);
    expect(result.generatorState).toBe("normal");
  });

  it("a second click while already \"restarting\" is a no-op and does not increment further", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ generatorState: "restarting", generatorAccidentalRestartSeq: 3 });

    const result = reducer(state, { type: "RESTART_GENERATOR" });
    expect(result).toBe(state);
    expect(result.generatorAccidentalRestartSeq).toBe(3);
  });

  it("does not increment while in blackout (RESTART_GENERATOR is a no-op there)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = baseState({ gameStatus: "blackout", generatorState: "normal" });

    const result = reducer(state, { type: "RESTART_GENERATOR" });
    expect(result).toBe(state);
    expect(result.generatorAccidentalRestartSeq).toBe(state.generatorAccidentalRestartSeq);
  });

  it("accumulates across repeated accidental restarts (restart, wait out penalty, restart again)", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = baseState({ generatorState: "normal" });

    state = reducer(state, { type: "RESTART_GENERATOR" });
    expect(state.generatorAccidentalRestartSeq).toBe(1);

    state = reducer(state, { type: "TICK", deltaMs: NIGHT_01.generator.restartPenaltyMs + 100 });
    expect(state.generatorState).toBe("normal");

    state = reducer(state, { type: "RESTART_GENERATOR" });
    expect(state.generatorAccidentalRestartSeq).toBe(2);
  });
});

// Sdílená podmínka pro app/play/page.tsx#handleRestartGenerator (viz
// game/core/playerProfileStats.ts#recordGeneratorRestarted) — musí přesně
// zrcadlit RESTART_GENERATOR "úspěšnou" větev výše, ať se statistika nikdy
// nerozejde od skutečného herního výsledku.
describe("willGeneratorRestartSucceed", () => {
  it("true during a real fault (silentFault)", () => {
    expect(willGeneratorRestartSucceed(baseState({ generatorState: "silentFault" }))).toBe(true);
  });

  it("true during a real fault (criticalBeeping)", () => {
    expect(willGeneratorRestartSucceed(baseState({ generatorState: "criticalBeeping" }))).toBe(true);
  });

  it("false for a functioning generator (would be the accidental-restart penalty, not a real fix)", () => {
    expect(willGeneratorRestartSucceed(baseState({ generatorState: "normal" }))).toBe(false);
  });

  it("false while already restarting (second click is a no-op)", () => {
    expect(willGeneratorRestartSucceed(baseState({ generatorState: "restarting" }))).toBe(false);
  });

  it("false during blackout, even with a real fault", () => {
    expect(willGeneratorRestartSucceed(baseState({ gameStatus: "blackout", generatorState: "silentFault" }))).toBe(false);
  });

  it("false while the game isn't running", () => {
    expect(willGeneratorRestartSucceed(baseState({ isRunning: false, generatorState: "silentFault" }))).toBe(false);
  });

  it("false during the door-death reveal window", () => {
    expect(willGeneratorRestartSucceed(baseState({ doorDeathRevealUntilMs: 5000, generatorState: "silentFault" }))).toBe(
      false,
    );
  });
});
