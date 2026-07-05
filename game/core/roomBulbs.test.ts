import { describe, expect, it } from "vitest";
import { applyDailyBulbService, createDefaultRoomBulbs, isNearRoomLightActive } from "./roomBulbs";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";

describe("createDefaultRoomBulbs", () => {
  it("starts a new campaign with 30000ms remaining, not broken", () => {
    const bulbs = createDefaultRoomBulbs();
    expect(bulbs.nearRoom.remainingMs).toBe(30_000);
    expect(bulbs.nearRoom.maxMs).toBe(30_000);
    expect(bulbs.nearRoom.broken).toBe(false);
  });
});

describe("isNearRoomLightActive", () => {
  it("is false when the light switch is off, even with a healthy bulb", () => {
    const state = { ...createInitialGameState(NIGHT_01), lightOn: false };
    expect(isNearRoomLightActive(state)).toBe(false);
  });

  it("is true when the switch is on and the bulb is healthy", () => {
    const state = { ...createInitialGameState(NIGHT_01), lightOn: true };
    expect(isNearRoomLightActive(state)).toBe(true);
  });

  it("is false when the bulb is broken, even if the switch is (incorrectly) on", () => {
    const state = {
      ...createInitialGameState(NIGHT_01),
      lightOn: true,
      roomBulbs: { nearRoom: { remainingMs: 5000, maxMs: 30_000, broken: true } },
    };
    expect(isNearRoomLightActive(state)).toBe(false);
  });

  it("is false when remainingMs has hit 0, even if broken hasn't been set", () => {
    const state = {
      ...createInitialGameState(NIGHT_01),
      lightOn: true,
      roomBulbs: { nearRoom: { remainingMs: 0, maxMs: 30_000, broken: false } },
    };
    expect(isNearRoomLightActive(state)).toBe(false);
  });
});

describe("applyDailyBulbService", () => {
  it("replaces a broken bulb when bulbsRemaining > 0, decrementing the stock", () => {
    const roomBulbs = { nearRoom: { remainingMs: 0, maxMs: 30_000, broken: true } };
    const result = applyDailyBulbService(roomBulbs, 10);

    expect(result.bulbsRemaining).toBe(9);
    expect(result.roomBulbs.nearRoom.broken).toBe(false);
    expect(result.roomBulbs.nearRoom.remainingMs).toBe(30_000);
  });

  it("leaves a broken bulb broken when bulbsRemaining is 0", () => {
    const roomBulbs = { nearRoom: { remainingMs: 0, maxMs: 30_000, broken: true } };
    const result = applyDailyBulbService(roomBulbs, 0);

    expect(result.bulbsRemaining).toBe(0);
    expect(result.roomBulbs.nearRoom.broken).toBe(true);
    expect(result.roomBulbs.nearRoom.remainingMs).toBe(0);
  });

  it("does not touch a weak but unbroken bulb", () => {
    const roomBulbs = { nearRoom: { remainingMs: 3000, maxMs: 30_000, broken: false } };
    const result = applyDailyBulbService(roomBulbs, 10);

    expect(result.bulbsRemaining).toBe(10);
    expect(result.roomBulbs.nearRoom.remainingMs).toBe(3000);
    expect(result.roomBulbs.nearRoom.broken).toBe(false);
  });
});
