import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { createDefaultRoomBulbs } from "./roomBulbs";
import { DEFAULT_NIGHT_FEATURES } from "../difficulty/nightConfig";

describe("createInitialGameState — object param (refactor away from 11 positional args)", () => {
  it("uses fresh defaults when called with no options", () => {
    const state = createInitialGameState(NIGHT_01);
    expect(state.roomBulbs).toEqual(createDefaultRoomBulbs());
    expect(state.bulbsRemaining).toBe(10);
    expect(state.nightFeatures).toEqual(DEFAULT_NIGHT_FEATURES);
    expect(state.gameMode).toBe("normal");
    expect(state.livesRemaining).toBe(3);
    expect(state.hasShotgun).toBe(false);
    expect(state.shotgunAmmo).toBe(0);
    expect(state.hasDoubleBarrelShotgun).toBe(false);
    expect(state.monsterKilledThisRun).toBe(false);
  });

  it("16. preserves every provided option value, none silently dropped or swapped", () => {
    const customRoomBulbs = { nearRoom: { remainingMs: 1234, maxMs: 30_000, broken: true } };
    const state = createInitialGameState(NIGHT_01, {
      roomBulbs: customRoomBulbs,
      bulbsRemaining: 7,
      nightFeatures: { ...DEFAULT_NIGHT_FEATURES, emergencyRunsEnabled: false },
      gameMode: "hardcore",
      livesRemaining: 1,
      hasShotgun: true,
      shotgunAmmo: 2,
      hasDoubleBarrelShotgun: true,
      officeDoorLockMs: 9999,
      monsterKilledThisRun: true,
    });

    expect(state.roomBulbs).toEqual(customRoomBulbs);
    expect(state.bulbsRemaining).toBe(7);
    expect(state.nightFeatures.emergencyRunsEnabled).toBe(false);
    expect(state.gameMode).toBe("hardcore");
    expect(state.livesRemaining).toBe(1);
    expect(state.hasShotgun).toBe(true);
    expect(state.shotgunAmmo).toBe(2);
    expect(state.hasDoubleBarrelShotgun).toBe(true);
    expect(state.officeDoorLockMs).toBe(9999);
    expect(state.monsterKilledThisRun).toBe(true);
  });

  it("a partial options object only overrides the given fields, rest stay default", () => {
    const state = createInitialGameState(NIGHT_01, { gameMode: "hardcore", livesRemaining: 1 });
    expect(state.gameMode).toBe("hardcore");
    expect(state.livesRemaining).toBe(1);
    expect(state.bulbsRemaining).toBe(10);
    expect(state.hasShotgun).toBe(false);
  });
});
