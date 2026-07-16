import { describe, expect, it } from "vitest";
import {
  createDefaultEquipmentState,
  getEquippedWeapon,
  getEquippedWeaponAmmoCapacity,
  hasOwnedWeapon,
  isWeaponId,
  validateEquipmentState,
  WEAPON_IDS,
  WEAPON_REGISTRY,
} from "./object13PlayerProfileEquipment";

describe("WEAPON_REGISTRY", () => {
  it("single_shotgun has capacity 1, double_barrel_shotgun has capacity 2", () => {
    expect(WEAPON_REGISTRY.single_shotgun.ammoCapacity).toBe(1);
    expect(WEAPON_REGISTRY.double_barrel_shotgun.ammoCapacity).toBe(2);
  });

  it("WEAPON_IDS lists exactly the two known weapons", () => {
    expect(WEAPON_IDS.sort()).toEqual(["double_barrel_shotgun", "single_shotgun"]);
  });
});

describe("isWeaponId", () => {
  it("accepts known ids", () => {
    expect(isWeaponId("single_shotgun")).toBe(true);
    expect(isWeaponId("double_barrel_shotgun")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isWeaponId("rocket_launcher")).toBe(false);
    expect(isWeaponId("")).toBe(false);
  });
});

describe("createDefaultEquipmentState", () => {
  it("starts with no owned weapons and nothing equipped", () => {
    expect(createDefaultEquipmentState()).toEqual({ ownedWeapons: [], equippedWeaponId: null });
  });
});

describe("hasOwnedWeapon / getEquippedWeapon", () => {
  it("hasOwnedWeapon reflects ownedWeapons membership", () => {
    const equipment = { ownedWeapons: ["single_shotgun" as const], equippedWeaponId: "single_shotgun" as const };
    expect(hasOwnedWeapon(equipment, "single_shotgun")).toBe(true);
    expect(hasOwnedWeapon(equipment, "double_barrel_shotgun")).toBe(false);
  });

  it("getEquippedWeapon returns equippedWeaponId as-is (including null)", () => {
    expect(getEquippedWeapon({ ownedWeapons: [], equippedWeaponId: null })).toBeNull();
    expect(getEquippedWeapon({ ownedWeapons: ["single_shotgun"], equippedWeaponId: "single_shotgun" })).toBe("single_shotgun");
  });
});

describe("getEquippedWeaponAmmoCapacity", () => {
  it("0 when nothing equipped", () => {
    expect(getEquippedWeaponAmmoCapacity({ ownedWeapons: [], equippedWeaponId: null })).toBe(0);
  });

  it("1 for single_shotgun, 2 for double_barrel_shotgun — derived from WEAPON_REGISTRY, not a hardcoded literal", () => {
    expect(getEquippedWeaponAmmoCapacity({ ownedWeapons: ["single_shotgun"], equippedWeaponId: "single_shotgun" })).toBe(1);
    expect(
      getEquippedWeaponAmmoCapacity({ ownedWeapons: ["double_barrel_shotgun"], equippedWeaponId: "double_barrel_shotgun" }),
    ).toBe(2);
  });
});

describe("validateEquipmentState", () => {
  it("accepts a well-formed empty state", () => {
    const result = validateEquipmentState({ ownedWeapons: [], equippedWeaponId: null });
    expect(result.ok).toBe(true);
  });

  it("accepts owned+equipped single_shotgun", () => {
    const result = validateEquipmentState({ ownedWeapons: ["single_shotgun"], equippedWeaponId: "single_shotgun" });
    expect(result).toEqual({ ok: true, equipment: { ownedWeapons: ["single_shotgun"], equippedWeaponId: "single_shotgun" } });
  });

  it("accepts owning single_shotgun while double_barrel_shotgun is equipped", () => {
    const result = validateEquipmentState({
      ownedWeapons: ["single_shotgun", "double_barrel_shotgun"],
      equippedWeaponId: "double_barrel_shotgun",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a non-object", () => {
    expect(validateEquipmentState(null).ok).toBe(false);
    expect(validateEquipmentState("x").ok).toBe(false);
    expect(validateEquipmentState([]).ok).toBe(false);
  });

  it("rejects an unknown top-level key", () => {
    const result = validateEquipmentState({ ownedWeapons: [], equippedWeaponId: null, extra: 1 });
    expect(result).toEqual({ ok: false, error: { code: "unknown_equipment_key", key: "extra" } });
  });

  it("rejects ownedWeapons that isn't an array", () => {
    const result = validateEquipmentState({ ownedWeapons: "single_shotgun", equippedWeaponId: null });
    expect(result).toEqual({ ok: false, error: { code: "ownedWeapons_not_array" } });
  });

  it("rejects an unknown weapon id inside ownedWeapons", () => {
    const result = validateEquipmentState({ ownedWeapons: ["rocket_launcher"], equippedWeaponId: null });
    expect(result).toEqual({ ok: false, error: { code: "unknown_weapon_id", weaponId: "rocket_launcher" } });
  });

  it("rejects a duplicate weapon id inside ownedWeapons", () => {
    const result = validateEquipmentState({ ownedWeapons: ["single_shotgun", "single_shotgun"], equippedWeaponId: null });
    expect(result).toEqual({ ok: false, error: { code: "duplicate_weapon_id", weaponId: "single_shotgun" } });
  });

  it("rejects an invalid equippedWeaponId (not null, not a known weapon)", () => {
    const result = validateEquipmentState({ ownedWeapons: [], equippedWeaponId: "rocket_launcher" });
    expect(result).toEqual({ ok: false, error: { code: "invalid_equipped_weapon_id" } });
  });

  it("rejects an equippedWeaponId that isn't owned", () => {
    const result = validateEquipmentState({ ownedWeapons: [], equippedWeaponId: "single_shotgun" });
    expect(result).toEqual({ ok: false, error: { code: "equipped_weapon_not_owned" } });
  });
});
