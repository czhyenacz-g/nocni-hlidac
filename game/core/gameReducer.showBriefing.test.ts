import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { GameState } from "./types";
import { NIGHT_01 } from "../nights/night01";

// Regrese: SHOW_BRIEFING dřív volalo createInitialGameState(night) BEZ
// argumentů, což tiše přepsalo gameMode zpátky na "normal", livesRemaining
// na 3 a brokovnici na "žádná" — i když šlo jen o přechod na briefing
// obrazovku mezi smrtí/výhrou a další nocí STEJNÉHO runu (viz
// app/play/page.tsx#handleBeginShift, větev "restart", která tenhle state
// čte jako "předchozí run"). V Hardcore to tiše převedlo run na Normal
// (proto "Zbývající životy: 2" po druhé smrti) a při přechodu do další noci
// to smazalo admin/test brokovnici. SHOW_BRIEFING teď musí gameMode/
// livesRemaining/hasShotgun/hasDoubleBarrelShotgun/shotgunAmmo zachovat
// beze změny — přesně to, co jeho vlastní komentář v gameActions.ts vždy
// sliboval ("jen přechod na screen, žádná jiná změna stavu").

describe("SHOW_BRIEFING preserves gameMode/livesRemaining (Part A regression)", () => {
  it("preserves gameMode 'hardcore' and livesRemaining 0 after a Hardcore death", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "hardcore", 0), screen: "death" as const };

    const result = reducer(state, { type: "SHOW_BRIEFING" });

    expect(result.gameMode).toBe("hardcore");
    expect(result.livesRemaining).toBe(0);
    expect(result.screen).toBe("briefing");
  });

  it("preserves gameMode 'normal' and a positive livesRemaining", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "normal", 2), screen: "death" as const };

    const result = reducer(state, { type: "SHOW_BRIEFING" });

    expect(result.gameMode).toBe("normal");
    expect(result.livesRemaining).toBe(2);
  });

  it("full round trip: Hardcore death -> SHOW_BRIEFING -> RESTART_SHIFT with the (correctly preserved) state still reads as Hardcore, not Normal", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state: GameState = {
      ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "hardcore", 1),
      screen: "playing",
      isRunning: true,
    };

    // Hardcore death: reducer's own death-resolution path already sets
    // livesRemaining to 0 for hardcore (see gameReducer death handlers) — a
    // minimal stand-in here is the reducer's own EMERGENCY_MINIGAME_DIED path.
    state = reducer(state, { type: "EMERGENCY_MINIGAME_DIED" });
    expect(state.gameMode).toBe("hardcore");
    expect(state.livesRemaining).toBe(0);

    const briefing = reducer(state, { type: "SHOW_BRIEFING" });
    expect(briefing.gameMode).toBe("hardcore");
    expect(briefing.livesRemaining).toBe(0);

    // app/play/page.tsx#handleBeginShift reads exactly these two fields off
    // `state` after SHOW_BRIEFING to decide isFreshRun/gameMode for the next
    // RESTART_SHIFT dispatch — asserting they're still "hardcore"/0 here is
    // what actually prevents the Normal-lives-text regression.
    expect(briefing.gameMode).not.toBe("normal");
  });
});

describe("SHOW_BRIEFING preserves shotgun equipment (Part B regression)", () => {
  it("preserves hasShotgun across the briefing transition", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "normal", 3, true, 1, false),
      screen: "win" as const,
    };

    const result = reducer(state, { type: "SHOW_BRIEFING" });

    expect(result.hasShotgun).toBe(true);
    expect(result.shotgunAmmo).toBe(1);
  });

  it("preserves hasDoubleBarrelShotgun across the briefing transition", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "normal", 3, true, 2, true),
      screen: "win" as const,
    };

    const result = reducer(state, { type: "SHOW_BRIEFING" });

    expect(result.hasShotgun).toBe(true);
    expect(result.hasDoubleBarrelShotgun).toBe(true);
    expect(result.shotgunAmmo).toBe(2);
  });

  it("a player without a shotgun stays without one (no accidental grant)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "normal", 3), screen: "win" as const };

    const result = reducer(state, { type: "SHOW_BRIEFING" });

    expect(result.hasShotgun).toBe(false);
    expect(result.hasDoubleBarrelShotgun).toBe(false);
  });

  it("an admin/test-granted shotgun (via APPLY_SHOTGUN_EFFECTS, before the normal night-10 unlock) survives SHOW_BRIEFING", () => {
    const reducer = createGameReducer(NIGHT_01);
    let state: GameState = {
      ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "normal", 3),
      screen: "playing",
      isRunning: true,
    };

    // Simulates an admin/test early shotgun loot + safe emergency return.
    state = reducer(state, { type: "APPLY_SHOTGUN_EFFECTS", hasShotgun: true, shotgunAmmo: 1 });
    expect(state.hasShotgun).toBe(true);

    // Survive the night -> WinScreen -> "POKRAČOVAT" -> SHOW_BRIEFING for the next night.
    const briefing = reducer({ ...state, screen: "win" as const }, { type: "SHOW_BRIEFING" });

    expect(briefing.hasShotgun).toBe(true);
    expect(briefing.shotgunAmmo).toBe(1);
  });

  it("behaves identically for Hardcore as for Normal regarding shotgun preservation (no mode-specific difference in the design)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01, undefined, undefined, undefined, "hardcore", 1, true, 1, false),
      screen: "win" as const,
    };

    const result = reducer(state, { type: "SHOW_BRIEFING" });

    expect(result.gameMode).toBe("hardcore");
    expect(result.hasShotgun).toBe(true);
    expect(result.shotgunAmmo).toBe(1);
  });
});

describe("RESTART_SHIFT keeps carrying shotgun equipment through explicitly (unaffected by this fix, already correct)", () => {
  it("hasShotgun true stays true, ammo recharges to the passed value", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, { type: "RESTART_SHIFT", hasShotgun: true, shotgunAmmo: 1 });

    expect(result.hasShotgun).toBe(true);
    expect(result.shotgunAmmo).toBe(1);
  });

  it("hasDoubleBarrelShotgun true stays true, ammo recharges to 2", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, { type: "RESTART_SHIFT", hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 2 });

    expect(result.hasDoubleBarrelShotgun).toBe(true);
    expect(result.shotgunAmmo).toBe(2);
  });
});
