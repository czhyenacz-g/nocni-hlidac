import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// Blackout scare sequence (viz GAME_DESIGN.md "Blackout scare sequence",
// gameReducer.ts TICK "gameStatus === blackout" větev): power 0 -> blackout
// -> vzdálené/blízké kroky (blackoutPhaseSeq) -> roar těsně před smrtí
// (blackoutRoarSeq) -> smrt (deathReason "blackout_timeout"). Tenhle test
// pokrývá jen reducer/seq stav — audio přehrávání řeší app/play/page.tsx a
// není tu testované (viz report).

const DURATION_MS = NIGHT_01.blackout.durationMs; // 12000
const ROAR_LEAD_MS = NIGHT_01.blackout.roarLeadMs; // 1000
const ROAR_THRESHOLD_MS = DURATION_MS - ROAR_LEAD_MS; // 11000
const [PHASE_1_MS, PHASE_2_MS, PHASE_3_MS] = NIGHT_01.blackout.phaseThresholdsMs; // 2000, 5000, 8000

function blackoutState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(NIGHT_01),
    isRunning: true,
    screen: "playing",
    power: 0,
    gameStatus: "blackout",
    blackoutElapsedMs: 0,
    ...overrides,
  };
}

describe("power reaching 0 starts the blackout scare sequence", () => {
  it("power dropping to 0 during a normal TICK sets gameStatus to blackout with blackoutElapsedMs 0", () => {
    const reducer = createGameReducer(NIGHT_01);
    // Force real power drain: light on, huge deltaMs guarantees power <= 0 this tick.
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, screen: "playing" as const, lightOn: true, power: 1 };

    const result = reducer(state, { type: "TICK", deltaMs: 60_000 });

    expect(result.gameStatus).toBe("blackout");
    expect(result.power).toBe(0);
    expect(result.blackoutElapsedMs).toBe(0);
  });

  it("does not instantly kill the player in the same tick power reaches 0", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, screen: "playing" as const, lightOn: true, power: 1 };

    const result = reducer(state, { type: "TICK", deltaMs: 60_000 });

    expect(result.screen).toBe("playing");
    expect(result.isRunning).toBe(true);
  });
});

describe("blackout TICK branch does not re-trigger the sequence every tick", () => {
  it("staying in blackout across multiple TICKs keeps accumulating blackoutElapsedMs without resetting gameStatus/blackoutElapsedMs", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = blackoutState();

    state = reducer(state, { type: "TICK", deltaMs: 500 });
    expect(state.gameStatus).toBe("blackout");
    expect(state.blackoutElapsedMs).toBe(500);

    state = reducer(state, { type: "TICK", deltaMs: 500 });
    expect(state.gameStatus).toBe("blackout");
    expect(state.blackoutElapsedMs).toBe(1000);
  });
});

describe("blackout phase seq — steps far/near fire at the configured thresholds, in order", () => {
  it("crossing the first threshold increments blackoutPhaseSeq exactly once", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = blackoutState({ blackoutElapsedMs: PHASE_1_MS - 100 });

    const result = reducer(state, { type: "TICK", deltaMs: 200 });
    expect(result.blackoutPhaseSeq).toBe(state.blackoutPhaseSeq + 1);
  });

  it("phase seq increments happen in order across the sequence (phase 1 before phase 2 before phase 3)", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = blackoutState();
    const seqAtStart = state.blackoutPhaseSeq;

    state = reducer(state, { type: "TICK", deltaMs: PHASE_1_MS + 1 });
    expect(state.blackoutPhaseSeq).toBe(seqAtStart + 1);

    state = reducer(state, { type: "TICK", deltaMs: PHASE_2_MS - PHASE_1_MS });
    expect(state.blackoutPhaseSeq).toBe(seqAtStart + 2);

    state = reducer(state, { type: "TICK", deltaMs: PHASE_3_MS - PHASE_2_MS });
    expect(state.blackoutPhaseSeq).toBe(seqAtStart + 3);
  });

  it("not crossing any threshold this tick leaves blackoutPhaseSeq unchanged", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = blackoutState({ blackoutElapsedMs: 100 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.blackoutPhaseSeq).toBe(state.blackoutPhaseSeq);
  });
});

describe("blackout roar seq — fires exactly once, shortly before death, after the phase sequence", () => {
  it("crossing roarThresholdMs (durationMs - roarLeadMs) increments blackoutRoarSeq exactly once", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = blackoutState({ blackoutElapsedMs: ROAR_THRESHOLD_MS - 100 });

    const result = reducer(state, { type: "TICK", deltaMs: 200 });
    expect(result.blackoutRoarSeq).toBe(state.blackoutRoarSeq + 1);
  });

  it("does not fire before the threshold is reached", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = blackoutState({ blackoutElapsedMs: ROAR_THRESHOLD_MS - 500 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.blackoutRoarSeq).toBe(state.blackoutRoarSeq);
  });

  it("does not fire again on a later tick once already past the threshold", () => {
    const reducer = createGameReducer(NIGHT_01);
    const afterRoar = blackoutState({ blackoutElapsedMs: ROAR_THRESHOLD_MS + 100 });

    const result = reducer(afterRoar, { type: "TICK", deltaMs: 100 });
    expect(result.blackoutRoarSeq).toBe(afterRoar.blackoutRoarSeq);
  });

  it("roar fires strictly before the final death tick (roarThresholdMs < durationMs)", () => {
    expect(ROAR_THRESHOLD_MS).toBeLessThan(DURATION_MS);
  });
});

describe("blackout death — happens only once blackoutElapsedMs reaches durationMs", () => {
  it("does not die just before durationMs", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = blackoutState({ blackoutElapsedMs: DURATION_MS - 100 });

    const result = reducer(state, { type: "TICK", deltaMs: 50 });
    expect(result.screen).toBe("playing");
    expect(result.isRunning).toBe(true);
  });

  it("dies exactly on the tick that reaches durationMs, with deathReason blackout_timeout", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = blackoutState({ blackoutElapsedMs: DURATION_MS - 100 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.screen).toBe("death");
    expect(result.isRunning).toBe(false);
    expect(result.deathReason).toBe("blackout_timeout");
  });

  it("the roar has already fired by the time death happens (roarSeq incremented before the death tick)", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = blackoutState({ blackoutElapsedMs: ROAR_THRESHOLD_MS - 50 });
    const seqBeforeRoar = state.blackoutRoarSeq;

    state = reducer(state, { type: "TICK", deltaMs: 100 }); // crosses roar threshold
    expect(state.blackoutRoarSeq).toBe(seqBeforeRoar + 1);
    expect(state.screen).toBe("playing");

    state = reducer(state, { type: "TICK", deltaMs: DURATION_MS - state.blackoutElapsedMs }); // reaches death
    expect(state.screen).toBe("death");
    expect(state.deathReason).toBe("blackout_timeout");
    expect(state.blackoutRoarSeq).toBe(seqBeforeRoar + 1);
  });
});

describe("blackout TICK no-ops once the player is already dead", () => {
  it("TICK returns the state unchanged when isRunning is false (already dead)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = blackoutState({
      blackoutElapsedMs: DURATION_MS,
      isRunning: false,
      screen: "death",
      deathReason: "blackout_timeout",
    });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });
    expect(result).toBe(state);
  });
});

describe("blackout can still be survived if the shift ends first (existing behaviour, unaffected by the scare sequence)", () => {
  it("wins instead of dying when remainingMs hits 0 before durationMs, even past the roar threshold", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = blackoutState({ blackoutElapsedMs: ROAR_THRESHOLD_MS + 50, remainingMs: 50 });

    const result = reducer(state, { type: "TICK", deltaMs: 100 });
    expect(result.screen).toBe("win");
  });
});
