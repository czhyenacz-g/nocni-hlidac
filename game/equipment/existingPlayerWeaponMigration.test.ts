import { describe, expect, it } from "vitest";
import { resolveExistingPlayerWeaponMigrationAction } from "./existingPlayerWeaponMigration";
import { Object13PlayerProfileDto, Object13PlayerProfileLoadState } from "../core/object13PlayerProfile";

const PROFILE_NO_WEAPON: Object13PlayerProfileDto = {
  discordUserId: "123456789012345678",
  profileVersion: 2,
  profileData: { inventory: { items: { bulb: 10 } }, equipment: { ownedWeapons: [], equippedWeaponId: null } },
  revision: 1,
  createdAt: "2026-07-16T12:00:00.000Z",
  updatedAt: "2026-07-16T12:00:00.000Z",
  lastSeenAt: "2026-07-16T12:00:00.000Z",
};

const PROFILE_WITH_WEAPON: Object13PlayerProfileDto = {
  ...PROFILE_NO_WEAPON,
  profileData: { inventory: { items: { bulb: 10 } }, equipment: { ownedWeapons: ["single_shotgun"], equippedWeaponId: "single_shotgun" } },
};

const LOAD_READY_NO_WEAPON: Object13PlayerProfileLoadState = { status: "ready", profile: PROFILE_NO_WEAPON };
const LOAD_READY_WITH_WEAPON: Object13PlayerProfileLoadState = { status: "ready", profile: PROFILE_WITH_WEAPON };

describe("resolveExistingPlayerWeaponMigrationAction", () => {
  it("migrates when the profile is ready, owns nothing yet, and the old local reward reliably says double barrel unlocked", () => {
    const action = resolveExistingPlayerWeaponMigrationAction(LOAD_READY_NO_WEAPON, { doubleBarrelUnlocked: true });
    expect(action).toEqual({ type: "unlock_double_barrel" });
  });

  it("does nothing when the profile isn't ready yet (loading/unauthorized/unavailable) — never guesses without a real profile", () => {
    expect(resolveExistingPlayerWeaponMigrationAction({ status: "idle" }, { doubleBarrelUnlocked: true })).toEqual({ type: "none" });
    expect(resolveExistingPlayerWeaponMigrationAction({ status: "loading" }, { doubleBarrelUnlocked: true })).toEqual({ type: "none" });
    expect(resolveExistingPlayerWeaponMigrationAction({ status: "unauthorized" }, { doubleBarrelUnlocked: true })).toEqual({
      type: "none",
    });
    expect(resolveExistingPlayerWeaponMigrationAction({ status: "unavailable" }, { doubleBarrelUnlocked: true })).toEqual({
      type: "none",
    });
  });

  it("does nothing when the profile already owns a weapon — never overwrites existing ownership, idempotent after the first successful run", () => {
    const action = resolveExistingPlayerWeaponMigrationAction(LOAD_READY_WITH_WEAPON, { doubleBarrelUnlocked: true });
    expect(action).toEqual({ type: "none" });
  });

  it("does nothing when the old local reward never unlocked the double barrel — never invents ownership", () => {
    const action = resolveExistingPlayerWeaponMigrationAction(LOAD_READY_NO_WEAPON, { doubleBarrelUnlocked: false });
    expect(action).toEqual({ type: "none" });
  });

  it("is idempotent — calling it again with the same (post-migration) ready state yields none, since ownedWeapons is no longer empty", () => {
    const before = resolveExistingPlayerWeaponMigrationAction(LOAD_READY_NO_WEAPON, { doubleBarrelUnlocked: true });
    expect(before).toEqual({ type: "unlock_double_barrel" });
    // Simulates the state right after a successful unlock: ownedWeapons is no longer empty.
    const after = resolveExistingPlayerWeaponMigrationAction(LOAD_READY_WITH_WEAPON, { doubleBarrelUnlocked: true });
    expect(after).toEqual({ type: "none" });
  });
});
