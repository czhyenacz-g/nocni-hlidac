import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";

// Trvalé vlastnictví brokovnice (viz game/core/shotgunEquipment.ts,
// app/play/page.tsx) — reducer sám nepočítá dobíjecí pravidlo, jen předává
// dál (START_SHIFT/RESTART_SHIFT) nebo zapíše finální hodnotu
// (APPLY_SHOTGUN_EFFECTS), stejný vzor jako gameMode/livesRemaining.

describe("START_SHIFT / RESTART_SHIFT default hasShotgun/shotgunAmmo", () => {
  it("defaults to false/0 when nothing is passed (brand new run)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, { type: "START_SHIFT" });

    expect(result.hasShotgun).toBe(false);
    expect(result.shotgunAmmo).toBe(0);
  });

  it("RESTART_SHIFT carries forward an explicitly passed hasShotgun/shotgunAmmo", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, { type: "RESTART_SHIFT", hasShotgun: true, shotgunAmmo: 1 });

    expect(result.hasShotgun).toBe(true);
    expect(result.shotgunAmmo).toBe(1);
  });

  it("hasDoubleBarrelShotgun defaults to false when nothing is passed", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, { type: "START_SHIFT" });

    expect(result.hasDoubleBarrelShotgun).toBe(false);
  });

  // Zadání (true ending odměna, part E): nový run s odemčenou dvouhlavňovkou
  // začíná rovnou s ní, ammo 2 — app/play/page.tsx#handleBeginShift je
  // zdroj pravdy pro TOHLE rozhodnutí (createFreshRunShotgunEquipment), tady
  // jen ověřujeme, že reducer skutečně zapíše, co dostane.
  it("START_SHIFT writes hasDoubleBarrelShotgun + full ammo through, as sent by the caller", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, {
      type: "START_SHIFT",
      hasShotgun: true,
      hasDoubleBarrelShotgun: true,
      shotgunAmmo: 2,
    });

    expect(result.hasShotgun).toBe(true);
    expect(result.hasDoubleBarrelShotgun).toBe(true);
    expect(result.shotgunAmmo).toBe(2);
  });

  it("RESTART_SHIFT writes hasDoubleBarrelShotgun through the same way", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = createInitialGameState(NIGHT_01);

    const result = reducer(state, {
      type: "RESTART_SHIFT",
      hasShotgun: true,
      hasDoubleBarrelShotgun: true,
      shotgunAmmo: 2,
    });

    expect(result.hasDoubleBarrelShotgun).toBe(true);
    expect(result.shotgunAmmo).toBe(2);
  });
});

describe("APPLY_SHOTGUN_EFFECTS", () => {
  it("writes hasShotgun/shotgunAmmo onto a running game", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, hasShotgun: false, shotgunAmmo: 0 };

    const result = reducer(state, { type: "APPLY_SHOTGUN_EFFECTS", hasShotgun: true, shotgunAmmo: 1 });

    expect(result.hasShotgun).toBe(true);
    expect(result.shotgunAmmo).toBe(1);
  });

  it("is a no-op while the game is not running", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: false, hasShotgun: false, shotgunAmmo: 0 };

    expect(reducer(state, { type: "APPLY_SHOTGUN_EFFECTS", hasShotgun: true, shotgunAmmo: 1 })).toBe(state);
  });
});
