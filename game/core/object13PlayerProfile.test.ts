import { describe, expect, it } from "vitest";
import {
  deriveLoadStateFromFetchResult,
  deriveSaveStateFromInventoryOperationResult,
  deriveSaveStateFromSaveResult,
  deriveSaveStateFromWeaponUnlockResult,
  getEquippedWeaponAmmoCapacity,
  getEquippedWeaponId,
  getOwnedWeapons,
  isPlainObject,
  isValidObject13PlayerProfileDto,
  Object13PlayerProfileDto,
  profileHasWeapon,
  validateIncomingObject13PlayerProfileInventoryOperationBody,
  validateIncomingObject13PlayerProfilePutBody,
  validateIncomingObject13PlayerProfileWeaponOperationBody,
} from "./object13PlayerProfile";

const VALID_DTO: Object13PlayerProfileDto = {
  discordUserId: "123456789012345678",
  profileVersion: 1,
  profileData: { inventory: { items: { bulb: 10 } }, equipment: { ownedWeapons: [], equippedWeaponId: null } },
  revision: 1,
  createdAt: "2026-07-16T12:00:00.000Z",
  updatedAt: "2026-07-16T12:00:00.000Z",
  lastSeenAt: "2026-07-16T12:00:00.000Z",
};

describe("isPlainObject", () => {
  it("accepts a plain object, including empty", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it("rejects null, arrays, and primitives", () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject("x")).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });
});

describe("isValidObject13PlayerProfileDto", () => {
  it("accepts a well-formed DTO with a valid V1 profileData", () => {
    expect(isValidObject13PlayerProfileDto(VALID_DTO)).toBe(true);
  });

  it("rejects null/array/primitive", () => {
    expect(isValidObject13PlayerProfileDto(null)).toBe(false);
    expect(isValidObject13PlayerProfileDto([])).toBe(false);
    expect(isValidObject13PlayerProfileDto("x")).toBe(false);
  });

  it("rejects a missing/empty discordUserId", () => {
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, discordUserId: "" })).toBe(false);
    const { discordUserId: _omit, ...withoutId } = VALID_DTO;
    expect(isValidObject13PlayerProfileDto(withoutId)).toBe(false);
  });

  it("rejects a non-integer profileVersion/revision", () => {
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, profileVersion: 1.5 })).toBe(false);
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, revision: "1" })).toBe(false);
  });

  it("rejects a profileData that fails V1 validation (legacy empty {}, unknown key, out-of-range quantity)", () => {
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, profileData: {} })).toBe(false);
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, profileData: null })).toBe(false);
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, profileData: { inventory: { items: { bulb: -1 } } } })).toBe(false);
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, profileData: { inventory: { items: { shotgun: 1 } } } })).toBe(false);
  });

  it("rejects invalid timestamp strings", () => {
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, createdAt: "not a date" })).toBe(false);
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, updatedAt: 12345 })).toBe(false);
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, lastSeenAt: null })).toBe(false);
  });
});

describe("validateIncomingObject13PlayerProfilePutBody", () => {
  const VALID_BODY = { expectedRevision: 1, profileVersion: 1, profileData: { inventory: { items: { bulb: 10 } }, equipment: { ownedWeapons: [], equippedWeaponId: null } } };

  it("accepts a well-formed body", () => {
    const result = validateIncomingObject13PlayerProfilePutBody(VALID_BODY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(VALID_BODY);
  });

  it("ignores/drops a discordUserId in the body — never reads it", () => {
    const result = validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, discordUserId: "attacker-supplied-id" });
    expect(result.ok).toBe(true);
    if (result.ok) expect("discordUserId" in result.data).toBe(false);
  });

  it("rejects null/array/primitive top level", () => {
    expect(validateIncomingObject13PlayerProfilePutBody(null).ok).toBe(false);
    expect(validateIncomingObject13PlayerProfilePutBody([]).ok).toBe(false);
    expect(validateIncomingObject13PlayerProfilePutBody("x").ok).toBe(false);
  });

  it("rejects expectedRevision <= 0 or non-integer", () => {
    expect(validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, expectedRevision: 0 }).ok).toBe(false);
    expect(validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, expectedRevision: -1 }).ok).toBe(false);
    expect(validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, expectedRevision: 1.5 }).ok).toBe(false);
  });

  it("rejects profileVersion <= 0 or non-integer", () => {
    expect(validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, profileVersion: 0 }).ok).toBe(false);
  });

  it("rejects a legacy empty {} profileData (missing inventory)", () => {
    expect(validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, profileData: {} }).ok).toBe(false);
  });

  it("rejects an unknown top-level profileData key", () => {
    expect(
      validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, profileData: { inventory: { items: {} }, extra: 1 } }).ok,
    ).toBe(false);
  });

  it("rejects an unknown item id inside profileData", () => {
    expect(
      validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, profileData: { inventory: { items: { shotgun: 1 } } } }).ok,
    ).toBe(false);
  });

  it("rejects a negative bulb quantity", () => {
    expect(
      validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, profileData: { inventory: { items: { bulb: -1 } } } }).ok,
    ).toBe(false);
  });
});

describe("validateIncomingObject13PlayerProfileInventoryOperationBody", () => {
  const VALID_BODY = { amount: 1, expectedRevision: 1 };

  it("accepts a well-formed body", () => {
    const result = validateIncomingObject13PlayerProfileInventoryOperationBody(VALID_BODY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(VALID_BODY);
  });

  it("rejects amount <= 0 or non-integer", () => {
    expect(validateIncomingObject13PlayerProfileInventoryOperationBody({ ...VALID_BODY, amount: 0 }).ok).toBe(false);
    expect(validateIncomingObject13PlayerProfileInventoryOperationBody({ ...VALID_BODY, amount: -1 }).ok).toBe(false);
    expect(validateIncomingObject13PlayerProfileInventoryOperationBody({ ...VALID_BODY, amount: 1.5 }).ok).toBe(false);
  });

  it("rejects expectedRevision <= 0 or non-integer", () => {
    expect(validateIncomingObject13PlayerProfileInventoryOperationBody({ ...VALID_BODY, expectedRevision: 0 }).ok).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(validateIncomingObject13PlayerProfileInventoryOperationBody(null).ok).toBe(false);
    expect(validateIncomingObject13PlayerProfileInventoryOperationBody("x").ok).toBe(false);
  });
});

describe("deriveLoadStateFromFetchResult", () => {
  it("maps ready -> ready", () => {
    expect(deriveLoadStateFromFetchResult({ status: "ready", profile: VALID_DTO })).toEqual({ status: "ready", profile: VALID_DTO });
  });

  it("maps unauthorized -> unauthorized", () => {
    expect(deriveLoadStateFromFetchResult({ status: "unauthorized" })).toEqual({ status: "unauthorized" });
  });

  it("maps unavailable -> unavailable, preserving the optional error", () => {
    expect(deriveLoadStateFromFetchResult({ status: "unavailable", error: "boom" })).toEqual({
      status: "unavailable",
      error: "boom",
    });
    expect(deriveLoadStateFromFetchResult({ status: "unavailable" })).toEqual({ status: "unavailable", error: undefined });
  });
});

describe("deriveSaveStateFromSaveResult", () => {
  it("maps saved -> saved + nextLoadState ready with the new profile", () => {
    const result = deriveSaveStateFromSaveResult({ status: "saved", profile: VALID_DTO });
    expect(result.saveState).toEqual({ status: "saved" });
    expect(result.nextLoadState).toEqual({ status: "ready", profile: VALID_DTO });
  });

  it("maps conflict WITH a currentProfile -> conflict state, no loadState change", () => {
    const result = deriveSaveStateFromSaveResult({ status: "conflict", currentRevision: 4, currentProfile: VALID_DTO });
    expect(result.saveState).toEqual({ status: "conflict", currentProfile: VALID_DTO });
    expect(result.nextLoadState).toBeUndefined();
  });

  it("maps conflict WITHOUT a currentProfile -> error, never a fabricated conflict state", () => {
    const result = deriveSaveStateFromSaveResult({ status: "conflict", currentRevision: 4 });
    expect(result.saveState).toEqual({ status: "error", error: "conflict_without_profile" });
    expect(result.nextLoadState).toBeUndefined();
  });

  it("maps unauthorized -> error", () => {
    const result = deriveSaveStateFromSaveResult({ status: "unauthorized" });
    expect(result.saveState).toEqual({ status: "error", error: "unauthorized" });
  });

  it("maps too_large -> error", () => {
    const result = deriveSaveStateFromSaveResult({ status: "too_large" });
    expect(result.saveState).toEqual({ status: "error", error: "too_large" });
  });

  it("maps a generic error through with its message", () => {
    const result = deriveSaveStateFromSaveResult({ status: "error", error: "network_error" });
    expect(result.saveState).toEqual({ status: "error", error: "network_error" });
  });
});

describe("equipment selectors (getOwnedWeapons/getEquippedWeaponId/profileHasWeapon/getEquippedWeaponAmmoCapacity)", () => {
  const WITH_SINGLE: Object13PlayerProfileDto = {
    ...VALID_DTO,
    profileData: { inventory: { items: { bulb: 10 } }, equipment: { ownedWeapons: ["single_shotgun"], equippedWeaponId: "single_shotgun" } },
  };
  const WITH_DOUBLE: Object13PlayerProfileDto = {
    ...VALID_DTO,
    profileData: {
      inventory: { items: { bulb: 10 } },
      equipment: { ownedWeapons: ["single_shotgun", "double_barrel_shotgun"], equippedWeaponId: "double_barrel_shotgun" },
    },
  };

  it("getOwnedWeapons returns the profile's ownedWeapons list", () => {
    expect(getOwnedWeapons(VALID_DTO)).toEqual([]);
    expect(getOwnedWeapons(WITH_DOUBLE)).toEqual(["single_shotgun", "double_barrel_shotgun"]);
  });

  it("getEquippedWeaponId returns null when nothing is equipped, else the equipped WeaponId", () => {
    expect(getEquippedWeaponId(VALID_DTO)).toBeNull();
    expect(getEquippedWeaponId(WITH_SINGLE)).toBe("single_shotgun");
    expect(getEquippedWeaponId(WITH_DOUBLE)).toBe("double_barrel_shotgun");
  });

  it("profileHasWeapon reflects ownership regardless of what's equipped", () => {
    expect(profileHasWeapon(VALID_DTO, "single_shotgun")).toBe(false);
    expect(profileHasWeapon(WITH_DOUBLE, "single_shotgun")).toBe(true);
    expect(profileHasWeapon(WITH_DOUBLE, "double_barrel_shotgun")).toBe(true);
  });

  it("getEquippedWeaponAmmoCapacity derives 0/1/2 from the equipped weapon, not a duplicated literal", () => {
    expect(getEquippedWeaponAmmoCapacity(VALID_DTO)).toBe(0);
    expect(getEquippedWeaponAmmoCapacity(WITH_SINGLE)).toBe(1);
    expect(getEquippedWeaponAmmoCapacity(WITH_DOUBLE)).toBe(2);
  });
});

describe("validateIncomingObject13PlayerProfileWeaponOperationBody", () => {
  const VALID_BODY = { weaponId: "single_shotgun", expectedRevision: 1 };

  it("accepts a well-formed body for each known weapon", () => {
    const single = validateIncomingObject13PlayerProfileWeaponOperationBody(VALID_BODY);
    expect(single.ok).toBe(true);
    if (single.ok) expect(single.data).toEqual(VALID_BODY);

    const double = validateIncomingObject13PlayerProfileWeaponOperationBody({ ...VALID_BODY, weaponId: "double_barrel_shotgun" });
    expect(double.ok).toBe(true);
  });

  it("rejects an unknown weaponId", () => {
    expect(validateIncomingObject13PlayerProfileWeaponOperationBody({ ...VALID_BODY, weaponId: "rocket_launcher" }).ok).toBe(false);
  });

  it("rejects a non-string weaponId", () => {
    expect(validateIncomingObject13PlayerProfileWeaponOperationBody({ ...VALID_BODY, weaponId: 1 }).ok).toBe(false);
  });

  it("rejects expectedRevision <= 0 or non-integer", () => {
    expect(validateIncomingObject13PlayerProfileWeaponOperationBody({ ...VALID_BODY, expectedRevision: 0 }).ok).toBe(false);
    expect(validateIncomingObject13PlayerProfileWeaponOperationBody({ ...VALID_BODY, expectedRevision: 1.5 }).ok).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(validateIncomingObject13PlayerProfileWeaponOperationBody(null).ok).toBe(false);
    expect(validateIncomingObject13PlayerProfileWeaponOperationBody("x").ok).toBe(false);
  });
});

describe("deriveSaveStateFromWeaponUnlockResult", () => {
  it("maps updated -> saved + nextLoadState ready with the new profile", () => {
    const result = deriveSaveStateFromWeaponUnlockResult({ status: "updated", profile: VALID_DTO });
    expect(result.saveState).toEqual({ status: "saved" });
    expect(result.nextLoadState).toEqual({ status: "ready", profile: VALID_DTO });
  });

  it("maps unchanged (idempotent no-op) -> saved + nextLoadState ready, same as updated", () => {
    const result = deriveSaveStateFromWeaponUnlockResult({ status: "unchanged", profile: VALID_DTO });
    expect(result.saveState).toEqual({ status: "saved" });
    expect(result.nextLoadState).toEqual({ status: "ready", profile: VALID_DTO });
  });

  it("maps conflict WITH a currentProfile -> conflict state", () => {
    const result = deriveSaveStateFromWeaponUnlockResult({ status: "conflict", currentRevision: 4, currentProfile: VALID_DTO });
    expect(result.saveState).toEqual({ status: "conflict", currentProfile: VALID_DTO });
  });

  it("maps conflict WITHOUT a currentProfile -> error, never a fabricated conflict state", () => {
    const result = deriveSaveStateFromWeaponUnlockResult({ status: "conflict", currentRevision: 4 });
    expect(result.saveState).toEqual({ status: "error", error: "conflict_without_profile" });
  });

  it("maps unauthorized -> error", () => {
    const result = deriveSaveStateFromWeaponUnlockResult({ status: "unauthorized" });
    expect(result.saveState).toEqual({ status: "error", error: "unauthorized" });
  });

  it("maps a generic error through with its message", () => {
    const result = deriveSaveStateFromWeaponUnlockResult({ status: "error", error: "network_error" });
    expect(result.saveState).toEqual({ status: "error", error: "network_error" });
  });
});

describe("deriveSaveStateFromInventoryOperationResult", () => {
  it("maps updated -> saved + nextLoadState ready with the new profile", () => {
    const result = deriveSaveStateFromInventoryOperationResult({ status: "updated", profile: VALID_DTO });
    expect(result.saveState).toEqual({ status: "saved" });
    expect(result.nextLoadState).toEqual({ status: "ready", profile: VALID_DTO });
  });

  it("maps conflict WITH a currentProfile -> conflict state", () => {
    const result = deriveSaveStateFromInventoryOperationResult({ status: "conflict", currentRevision: 4, currentProfile: VALID_DTO });
    expect(result.saveState).toEqual({ status: "conflict", currentProfile: VALID_DTO });
  });

  it("maps conflict WITHOUT a currentProfile -> error, never a fabricated conflict state", () => {
    const result = deriveSaveStateFromInventoryOperationResult({ status: "conflict", currentRevision: 4 });
    expect(result.saveState).toEqual({ status: "error", error: "conflict_without_profile" });
  });

  it("maps exceeds_maximum -> its own distinct saveState, not a generic error", () => {
    const result = deriveSaveStateFromInventoryOperationResult({ status: "exceeds_maximum" });
    expect(result.saveState).toEqual({ status: "exceeds_maximum" });
  });

  it("maps insufficient_inventory -> its own distinct saveState, not a generic error", () => {
    const result = deriveSaveStateFromInventoryOperationResult({ status: "insufficient_inventory" });
    expect(result.saveState).toEqual({ status: "insufficient_inventory" });
  });

  it("maps unauthorized -> error", () => {
    const result = deriveSaveStateFromInventoryOperationResult({ status: "unauthorized" });
    expect(result.saveState).toEqual({ status: "error", error: "unauthorized" });
  });

  it("maps a generic error through with its message", () => {
    const result = deriveSaveStateFromInventoryOperationResult({ status: "error", error: "network_error" });
    expect(result.saveState).toEqual({ status: "error", error: "network_error" });
  });
});
