import { describe, expect, it } from "vitest";
import {
  DOUBLE_BARREL_SHOTGUN_MAX_AMMO,
  SHOTGUN_MAX_AMMO,
  applyShotgunEmergencyReturn,
  createFreshRunShotgunEquipment,
  getRechargedShotgunAmmo,
  getShotgunMaxAmmo,
  hasAnyShotgun,
  isDoubleBarrelShotgun,
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

describe("applyShotgunEmergencyReturn", () => {
  it("returning without the shotgun and without acquiring it leaves state unchanged", () => {
    const result = applyShotgunEmergencyReturn(
      { hasShotgun: false, hasDoubleBarrelShotgun: false },
      0,
      [{ type: "energy_recharged", amount: 35 }],
    );
    expect(result).toEqual({ hasShotgun: false, hasDoubleBarrelShotgun: false, shotgunAmmo: 0 });
  });

  it("returning with shotgun_acquired grants a single-barrel shotgun and a full ammo recharge", () => {
    const result = applyShotgunEmergencyReturn({ hasShotgun: false, hasDoubleBarrelShotgun: false }, 0, [
      { type: "shotgun_acquired" },
    ]);
    expect(result).toEqual({ hasShotgun: true, hasDoubleBarrelShotgun: false, shotgunAmmo: 1 });
  });

  it("returning while already owning a single-barrel shotgun always recharges ammo to 1, regardless of what was collected", () => {
    const result = applyShotgunEmergencyReturn(
      { hasShotgun: true, hasDoubleBarrelShotgun: false },
      0,
      [{ type: "energy_recharged", amount: 35 }],
    );
    expect(result).toEqual({ hasShotgun: true, hasDoubleBarrelShotgun: false, shotgunAmmo: 1 });
  });

  it("returning while already owning a double-barrel shotgun recharges ammo to 2, and never downgrades to single-barrel", () => {
    const result = applyShotgunEmergencyReturn(
      { hasShotgun: true, hasDoubleBarrelShotgun: true },
      1,
      [{ type: "energy_recharged", amount: 35 }],
    );
    expect(result).toEqual({ hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 2 });
  });

  it("shotgun_acquired while already owning a double-barrel shotgun never downgrades it", () => {
    const result = applyShotgunEmergencyReturn({ hasShotgun: true, hasDoubleBarrelShotgun: true }, 0, [
      { type: "shotgun_acquired" },
    ]);
    expect(result).toEqual({ hasShotgun: true, hasDoubleBarrelShotgun: true, shotgunAmmo: 2 });
  });

  it("is a no-op-safe when effects is undefined", () => {
    expect(applyShotgunEmergencyReturn({ hasShotgun: false, hasDoubleBarrelShotgun: false }, 0, undefined)).toEqual({
      hasShotgun: false,
      hasDoubleBarrelShotgun: false,
      shotgunAmmo: 0,
    });
    expect(applyShotgunEmergencyReturn({ hasShotgun: true, hasDoubleBarrelShotgun: false }, 0, undefined)).toEqual({
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
