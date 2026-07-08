import { describe, expect, it } from "vitest";
import { SHOTGUN_MAX_AMMO, applyShotgunEmergencyReturn, getRechargedShotgunAmmo } from "./shotgunEquipment";

describe("SHOTGUN_MAX_AMMO", () => {
  it("is exactly 1 (MVP cap)", () => {
    expect(SHOTGUN_MAX_AMMO).toBe(1);
  });
});

describe("getRechargedShotgunAmmo", () => {
  it("without a shotgun, recharging does nothing — ammo stays 0", () => {
    expect(getRechargedShotgunAmmo(false, 0)).toBe(0);
  });

  it("with a shotgun, always recharges to exactly SHOTGUN_MAX_AMMO", () => {
    expect(getRechargedShotgunAmmo(true, 0)).toBe(SHOTGUN_MAX_AMMO);
  });

  it("never exceeds SHOTGUN_MAX_AMMO even if currentAmmo is already at/above it", () => {
    expect(getRechargedShotgunAmmo(true, 1)).toBe(SHOTGUN_MAX_AMMO);
    expect(getRechargedShotgunAmmo(true, 5)).toBe(SHOTGUN_MAX_AMMO);
  });
});

describe("applyShotgunEmergencyReturn", () => {
  it("returning without the shotgun and without acquiring it leaves state unchanged", () => {
    const result = applyShotgunEmergencyReturn(false, 0, [{ type: "energy_recharged", amount: 35 }]);
    expect(result).toEqual({ hasShotgun: false, shotgunAmmo: 0 });
  });

  it("returning with shotgun_acquired grants the shotgun and a full ammo recharge", () => {
    const result = applyShotgunEmergencyReturn(false, 0, [{ type: "shotgun_acquired" }]);
    expect(result).toEqual({ hasShotgun: true, shotgunAmmo: 1 });
  });

  it("returning while already owning the shotgun always recharges ammo to 1, regardless of what was collected", () => {
    const result = applyShotgunEmergencyReturn(true, 0, [{ type: "energy_recharged", amount: 35 }]);
    expect(result).toEqual({ hasShotgun: true, shotgunAmmo: 1 });
  });

  it("is a no-op-safe when effects is undefined", () => {
    expect(applyShotgunEmergencyReturn(false, 0, undefined)).toEqual({ hasShotgun: false, shotgunAmmo: 0 });
    expect(applyShotgunEmergencyReturn(true, 0, undefined)).toEqual({ hasShotgun: true, shotgunAmmo: 1 });
  });
});
