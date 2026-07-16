import { describe, expect, it } from "vitest";
import {
  deriveWeaponAcquisitionConfirmOutcome,
  resolveFreshRunShotgunEquipment,
  resolveWeaponAcquisitionPersistenceMode,
} from "./weaponAcquisitionController";
import { Object13PlayerProfileDto, Object13PlayerProfileLoadState } from "../core/object13PlayerProfile";

const READY_PROFILE_NO_WEAPON: Object13PlayerProfileDto = {
  discordUserId: "123456789012345678",
  profileVersion: 2,
  profileData: { inventory: { items: { bulb: 10 } }, equipment: { ownedWeapons: [], equippedWeaponId: null } },
  revision: 1,
  createdAt: "2026-07-16T12:00:00.000Z",
  updatedAt: "2026-07-16T12:00:00.000Z",
  lastSeenAt: "2026-07-16T12:00:00.000Z",
};

const READY_PROFILE_SINGLE: Object13PlayerProfileDto = {
  ...READY_PROFILE_NO_WEAPON,
  profileData: { inventory: { items: { bulb: 10 } }, equipment: { ownedWeapons: ["single_shotgun"], equippedWeaponId: "single_shotgun" } },
};

const READY_PROFILE_DOUBLE: Object13PlayerProfileDto = {
  ...READY_PROFILE_NO_WEAPON,
  profileData: {
    inventory: { items: { bulb: 10 } },
    equipment: { ownedWeapons: ["single_shotgun", "double_barrel_shotgun"], equippedWeaponId: "double_barrel_shotgun" },
  },
};

const LOAD_READY_NO_WEAPON: Object13PlayerProfileLoadState = { status: "ready", profile: READY_PROFILE_NO_WEAPON };
const LOAD_READY_SINGLE: Object13PlayerProfileLoadState = { status: "ready", profile: READY_PROFILE_SINGLE };
const LOAD_READY_DOUBLE: Object13PlayerProfileLoadState = { status: "ready", profile: READY_PROFILE_DOUBLE };
const LOAD_UNAUTHORIZED: Object13PlayerProfileLoadState = { status: "unauthorized" };
const LOAD_IDLE: Object13PlayerProfileLoadState = { status: "idle" };

describe("resolveWeaponAcquisitionPersistenceMode", () => {
  it("hardcore + ready profile -> server (persisted, server-authoritative)", () => {
    expect(resolveWeaponAcquisitionPersistenceMode("hardcore", LOAD_READY_NO_WEAPON)).toBe("server");
  });

  it("hardcore without a ready profile -> local (never blocks on a missing profile)", () => {
    expect(resolveWeaponAcquisitionPersistenceMode("hardcore", LOAD_UNAUTHORIZED)).toBe("local");
    expect(resolveWeaponAcquisitionPersistenceMode("hardcore", LOAD_IDLE)).toBe("local");
  });

  it("normal (Training) is always local, even with a ready profile — new unlocks are never persisted", () => {
    expect(resolveWeaponAcquisitionPersistenceMode("normal", LOAD_READY_NO_WEAPON)).toBe("local");
  });
});

describe("resolveFreshRunShotgunEquipment — mission init reads from the profile", () => {
  it("hardcore + ready profile with no weapon -> no shotgun, matches profile exactly", () => {
    expect(resolveFreshRunShotgunEquipment("hardcore", LOAD_READY_NO_WEAPON, true)).toEqual({
      hasShotgun: false,
      hasDoubleBarrelShotgun: false,
      shotgunAmmo: 0,
    });
  });

  it("hardcore + ready profile with single_shotgun equipped -> starts with capacity-1 shotgun, fully loaded", () => {
    expect(resolveFreshRunShotgunEquipment("hardcore", LOAD_READY_SINGLE, false)).toEqual({
      hasShotgun: true,
      hasDoubleBarrelShotgun: false,
      shotgunAmmo: 1,
    });
  });

  it("hardcore + ready profile with double_barrel_shotgun equipped -> starts with capacity-2 shotgun, fully loaded", () => {
    expect(resolveFreshRunShotgunEquipment("hardcore", LOAD_READY_DOUBLE, false)).toEqual({
      hasShotgun: true,
      hasDoubleBarrelShotgun: true,
      shotgunAmmo: 2,
    });
  });

  it("hardcore + ready profile is the SOLE authority — ignores the local reward flag entirely", () => {
    // profile says "no weapon", local legacy reward says "double barrel unlocked" — profile wins.
    expect(resolveFreshRunShotgunEquipment("hardcore", LOAD_READY_NO_WEAPON, true).hasShotgun).toBe(false);
  });

  it("calling it twice with the same ready profile returns identical equipment — persistence between missions", () => {
    const first = resolveFreshRunShotgunEquipment("hardcore", LOAD_READY_DOUBLE, false);
    const second = resolveFreshRunShotgunEquipment("hardcore", LOAD_READY_DOUBLE, false);
    expect(first).toEqual(second);
  });

  it("Training (normal) never reads the profile — falls back to the local legacy reward flag", () => {
    // Profile says "owns double barrel", but Training must not read it as authority — only the
    // local flag decides here (Training may read starting loadout separately, but this fresh-run
    // resolver's job is specifically the Hardcore/server path vs. local fallback).
    expect(resolveFreshRunShotgunEquipment("normal", LOAD_READY_DOUBLE, false)).toEqual({
      hasShotgun: false,
      hasDoubleBarrelShotgun: false,
      shotgunAmmo: 0,
    });
    expect(resolveFreshRunShotgunEquipment("normal", LOAD_READY_DOUBLE, true)).toEqual({
      hasShotgun: true,
      hasDoubleBarrelShotgun: true,
      shotgunAmmo: 2,
    });
  });

  it("anonymous player (no session, loadState never ready) always falls back to the local legacy reward flag", () => {
    expect(resolveFreshRunShotgunEquipment("hardcore", LOAD_UNAUTHORIZED, true)).toEqual({
      hasShotgun: true,
      hasDoubleBarrelShotgun: true,
      shotgunAmmo: 2,
    });
    expect(resolveFreshRunShotgunEquipment("hardcore", LOAD_UNAUTHORIZED, false)).toEqual({
      hasShotgun: false,
      hasDoubleBarrelShotgun: false,
      shotgunAmmo: 0,
    });
  });
});

describe("deriveWeaponAcquisitionConfirmOutcome", () => {
  it("updated -> confirmed", () => {
    expect(deriveWeaponAcquisitionConfirmOutcome({ status: "updated", profile: READY_PROFILE_SINGLE })).toEqual({
      outcome: "confirmed",
    });
  });

  it("unchanged (idempotent no-op) -> confirmed, same as updated", () => {
    expect(deriveWeaponAcquisitionConfirmOutcome({ status: "unchanged", profile: READY_PROFILE_SINGLE })).toEqual({
      outcome: "confirmed",
    });
  });

  it("conflict -> conflict", () => {
    expect(deriveWeaponAcquisitionConfirmOutcome({ status: "conflict", currentRevision: 2 })).toEqual({ outcome: "conflict" });
  });

  it("unauthorized/error -> unavailable", () => {
    expect(deriveWeaponAcquisitionConfirmOutcome({ status: "unauthorized" })).toEqual({ outcome: "unavailable" });
    expect(deriveWeaponAcquisitionConfirmOutcome({ status: "error", error: "network_error" })).toEqual({ outcome: "unavailable" });
  });
});
