import { describe, expect, it } from "vitest";
import {
  DOUBLE_BARREL_SHOTGUN_MAX_AMMO,
  SHOTGUN_MAX_AMMO,
  applyShotgunEmergencyReturn,
  canRequestAmmo,
  createFreshRunShotgunEquipment,
  getRechargedShotgunAmmo,
  getShotgunMaxAmmo,
  hasAnyShotgun,
  isDoubleBarrelShotgun,
  requestSingleAmmo,
} from "./shotgunEquipment";

describe("SHOTGUN_MAX_AMMO / DOUBLE_BARREL_SHOTGUN_MAX_AMMO", () => {
  it("single barrel is exactly 1 (MVP cap)", () => {
    expect(SHOTGUN_MAX_AMMO).toBe(1);
  });

  it("double barrel is exactly 2", () => {
    expect(DOUBLE_BARREL_SHOTGUN_MAX_AMMO).toBe(2);
  });
});

describe("hasAnyShotgun", () => {
  it("false without a shotgun", () => {
    expect(hasAnyShotgun({ hasShotgun: false })).toBe(false);
  });

  it("true with either single or double barrel", () => {
    expect(hasAnyShotgun({ hasShotgun: true })).toBe(true);
  });
});

describe("isDoubleBarrelShotgun", () => {
  it("false with no shotgun at all", () => {
    expect(isDoubleBarrelShotgun({ hasShotgun: false, hasDoubleBarrelShotgun: false })).toBe(false);
  });

  it("false with a single-barrel shotgun", () => {
    expect(isDoubleBarrelShotgun({ hasShotgun: true, hasDoubleBarrelShotgun: false })).toBe(false);
  });

  it("true with a double-barrel shotgun", () => {
    expect(isDoubleBarrelShotgun({ hasShotgun: true, hasDoubleBarrelShotgun: true })).toBe(true);
  });

  it("false if hasDoubleBarrelShotgun is (invalidly) true without hasShotgun — defensive", () => {
    expect(isDoubleBarrelShotgun({ hasShotgun: false, hasDoubleBarrelShotgun: true })).toBe(false);
  });
});

describe("getShotgunMaxAmmo", () => {
  it("0 without a shotgun", () => {
    expect(getShotgunMaxAmmo({ hasShotgun: false, hasDoubleBarrelShotgun: false })).toBe(0);
  });

  it("SHOTGUN_MAX_AMMO (1) with a single-barrel shotgun", () => {
    expect(getShotgunMaxAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: false })).toBe(SHOTGUN_MAX_AMMO);
  });

  it("DOUBLE_BARREL_SHOTGUN_MAX_AMMO (2) with a double-barrel shotgun", () => {
    expect(getShotgunMaxAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: true })).toBe(DOUBLE_BARREL_SHOTGUN_MAX_AMMO);
  });
});

describe("getRechargedShotgunAmmo", () => {
  it("without a shotgun, recharging does nothing — ammo stays 0", () => {
    expect(getRechargedShotgunAmmo({ hasShotgun: false, hasDoubleBarrelShotgun: false })).toBe(0);
  });

  it("with a single-barrel shotgun, always recharges to exactly SHOTGUN_MAX_AMMO", () => {
    expect(getRechargedShotgunAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: false })).toBe(SHOTGUN_MAX_AMMO);
  });

  it("with a double-barrel shotgun, always recharges to exactly DOUBLE_BARREL_SHOTGUN_MAX_AMMO", () => {
    expect(getRechargedShotgunAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: true })).toBe(DOUBLE_BARREL_SHOTGUN_MAX_AMMO);
  });
});

describe("canRequestAmmo", () => {
  it("false without a shotgun, even if shotgunAmmo is (invalidly) > 0", () => {
    expect(canRequestAmmo({ hasShotgun: false, hasDoubleBarrelShotgun: false, shotgunAmmo: 0 })).toBe(false);
  });

  it("true with a single-barrel shotgun at 0/1", () => {
    expect(canRequestAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: false, shotgunAmmo: 0 })).toBe(true);
  });

  it("false with a single-barrel shotgun already at capacity (1/1)", () => {
    expect(canRequestAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: false, shotgunAmmo: 1 })).toBe(false);
  });

  it("true with a double-barrel shotgun at 1/2", () => {
    expect(canRequestAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 1 })).toBe(true);
  });

  it("false with a double-barrel shotgun already at capacity (2/2)", () => {
    expect(canRequestAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 2 })).toBe(false);
  });
});

describe("requestSingleAmmo", () => {
  it("adds exactly one round: 0/1 -> 1/1", () => {
    expect(requestSingleAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: false, shotgunAmmo: 0 })).toBe(1);
  });

  it("double-barrel needs two clicks to fully load: 0/2 -> 1/2", () => {
    expect(requestSingleAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 0 })).toBe(1);
  });

  it("double-barrel second click: 1/2 -> 2/2", () => {
    expect(requestSingleAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 1 })).toBe(2);
  });

  it("never exceeds capacity — clicking again at 1/1 stays at 1/1", () => {
    expect(requestSingleAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: false, shotgunAmmo: 1 })).toBe(1);
  });

  it("never exceeds capacity — clicking again at 2/2 stays at 2/2", () => {
    expect(requestSingleAmmo({ hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 2 })).toBe(2);
  });

  it("without a shotgun, dispensing never accumulates stock ahead of finding a weapon", () => {
    expect(requestSingleAmmo({ hasShotgun: false, hasDoubleBarrelShotgun: false, shotgunAmmo: 0 })).toBe(0);
  });
});

describe("applyShotgunEmergencyReturn", () => {
  it("returning without the shotgun and without acquiring it leaves state unchanged", () => {
    const result = applyShotgunEmergencyReturn(
      { hasShotgun: false, hasDoubleBarrelShotgun: false },
      0,
      0,
      [{ type: "energy_recharged", amount: 35 }],
    );
    expect(result).toEqual({ hasShotgun: false, hasDoubleBarrelShotgun: false, shotgunAmmo: 0 });
  });

  it("returning with shotgun_acquired grants a single-barrel shotgun, but it starts EMPTY (no automatic recharge)", () => {
    const result = applyShotgunEmergencyReturn({ hasShotgun: false, hasDoubleBarrelShotgun: false }, 0, 0, [
      { type: "shotgun_acquired" },
    ]);
    expect(result).toEqual({ hasShotgun: true, hasDoubleBarrelShotgun: false, shotgunAmmo: 0 });
  });

  it("no longer auto-recharges on return: entering with 2/2, firing once, returns with 1/2", () => {
    const result = applyShotgunEmergencyReturn({ hasShotgun: true, hasDoubleBarrelShotgun: true }, 2, 1, []);
    expect(result).toEqual({ hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 1 });
  });

  it("firing both barrels returns with 0/2, not recharged", () => {
    const result = applyShotgunEmergencyReturn({ hasShotgun: true, hasDoubleBarrelShotgun: true }, 2, 2, []);
    expect(result).toEqual({ hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 0 });
  });

  it("shotsUsed is clamped so it can never push ammo below 0", () => {
    const result = applyShotgunEmergencyReturn({ hasShotgun: true, hasDoubleBarrelShotgun: false }, 1, 5, []);
    expect(result.shotgunAmmo).toBe(0);
  });

  it("an ammo_acquired pickup adds rounds on top of what's left, capped at capacity", () => {
    const result = applyShotgunEmergencyReturn({ hasShotgun: true, hasDoubleBarrelShotgun: true }, 0, 0, [
      { type: "ammo_acquired", amount: 5 },
    ]);
    expect(result.shotgunAmmo).toBe(2);
  });

  it("shotgun_acquired while already owning a double-barrel shotgun never downgrades it", () => {
    const result = applyShotgunEmergencyReturn({ hasShotgun: true, hasDoubleBarrelShotgun: true }, 2, 0, [
      { type: "shotgun_acquired" },
    ]);
    expect(result).toEqual({ hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 2 });
  });

  it("is a no-op-safe when effects is undefined", () => {
    expect(applyShotgunEmergencyReturn({ hasShotgun: false, hasDoubleBarrelShotgun: false }, 0, 0, undefined)).toEqual({
      hasShotgun: false,
      hasDoubleBarrelShotgun: false,
      shotgunAmmo: 0,
    });
    expect(applyShotgunEmergencyReturn({ hasShotgun: true, hasDoubleBarrelShotgun: false }, 1, 0, undefined)).toEqual({
      hasShotgun: true,
      hasDoubleBarrelShotgun: false,
      shotgunAmmo: 1,
    });
  });
});

// Zadání: nový run bez doubleBarrelUnlocked má běžná shotgun pravidla (žádná
// zbraň od začátku), nový run S doubleBarrelUnlocked začíná rovnou s nabitou
// dvouhlavňovkou.
describe("createFreshRunShotgunEquipment", () => {
  it("without doubleBarrelUnlocked: no weapon at all, same as before this feature existed", () => {
    expect(createFreshRunShotgunEquipment(false)).toEqual({
      hasShotgun: false,
      hasDoubleBarrelShotgun: false,
      shotgunAmmo: 0,
    });
  });

  it("with doubleBarrelUnlocked: starts with a fully-loaded double-barrel shotgun", () => {
    expect(createFreshRunShotgunEquipment(true)).toEqual({
      hasShotgun: true,
      hasDoubleBarrelShotgun: true,
      shotgunAmmo: DOUBLE_BARREL_SHOTGUN_MAX_AMMO,
    });
  });
});
