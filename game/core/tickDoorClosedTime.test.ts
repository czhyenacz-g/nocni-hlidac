import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// Součet doby zavřených dveří za noc (viz zadání "jednoduché hodnocení podle
// doby zavřených dveří", GameState.totalDoorClosedMs, game/core/shiftRating.ts) —
// čistě prezentační statistika pro WinScreen.tsx, nikam se neukládá.

function stateAtDesk(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(NIGHT_01), isRunning: true, playerView: "desk", ...overrides };
}

describe("TICK — totalDoorClosedMs accumulation", () => {
  it("accumulates deltaMs while the door is closed", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDesk({ doorClosed: true, totalDoorClosedMs: 0 });

    const result = reducer(state, { type: "TICK", deltaMs: 5000 });

    expect(result.totalDoorClosedMs).toBe(5000);
  });

  it("does not accumulate while the door is open", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDesk({ doorClosed: false, totalDoorClosedMs: 0 });

    const result = reducer(state, { type: "TICK", deltaMs: 5000 });

    expect(result.totalDoorClosedMs).toBe(0);
  });

  it("keeps summing across multiple ticks (open+closed periods add up, single door)", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state = stateAtDesk({ doorClosed: true, totalDoorClosedMs: 0 });

    state = reducer(state, { type: "TICK", deltaMs: 5000 }); // closed: +5000
    state = { ...state, doorClosed: false };
    state = reducer(state, { type: "TICK", deltaMs: 3000 }); // open: +0
    state = { ...state, doorClosed: true };
    state = reducer(state, { type: "TICK", deltaMs: 2000 }); // closed: +2000

    expect(state.totalDoorClosedMs).toBe(7000);
  });

  it("starts at 0 for a fresh night (createInitialGameState)", () => {
    expect(createInitialGameState(NIGHT_01).totalDoorClosedMs).toBe(0);
  });

  it("resets to 0 on a new shift even if a stale non-zero value were somehow passed in as an override-less baseline", () => {
    // createInitialGameState never accepts totalDoorClosedMs as an override
    // (viz gameState.ts) — every fresh night starts clean, regardless of
    // what the previous run accumulated.
    const fresh = createInitialGameState(NIGHT_01, { gameMode: "hardcore" });
    expect(fresh.totalDoorClosedMs).toBe(0);
  });

  it("stops increasing once the night has ended (isRunning false blocks further TICKs)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDesk({ doorClosed: true, totalDoorClosedMs: 0, isRunning: false, screen: "win" });

    const result = reducer(state, { type: "TICK", deltaMs: 5000 });

    expect(result).toBe(state);
    expect(result.totalDoorClosedMs).toBe(0);
  });

  it("counts right up to the shift-ending tick (remainingMs hits 0 with the door closed), but never past it", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDesk({ doorClosed: true, totalDoorClosedMs: 0, remainingMs: 2000 });

    const finalTick = reducer(state, { type: "TICK", deltaMs: 5000 });
    expect(finalTick.screen).toBe("win");
    expect(finalTick.isRunning).toBe(false);
    expect(finalTick.totalDoorClosedMs).toBe(5000);

    // Any further TICK after the shift ended is a no-op (isRunning false).
    const afterEnd = reducer({ ...finalTick, doorClosed: true }, { type: "TICK", deltaMs: 5000 });
    expect(afterEnd.totalDoorClosedMs).toBe(5000);
  });

  it("does not accumulate during the door-death-reveal window (door is open by definition there, but the field is left untouched either way)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDesk({ doorClosed: false, totalDoorClosedMs: 1234, doorDeathRevealUntilMs: 5000, elapsedMs: 0 });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });

    expect(result.totalDoorClosedMs).toBe(1234);
  });

  it("does not accumulate during blackout (door is force-open, field left untouched)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = stateAtDesk({ doorClosed: false, totalDoorClosedMs: 500, gameStatus: "blackout", blackoutElapsedMs: 0 });

    const result = reducer(state, { type: "TICK", deltaMs: 1000 });

    expect(result.totalDoorClosedMs).toBe(500);
  });
});
