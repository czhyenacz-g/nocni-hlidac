import { describe, expect, it } from "vitest";
import {
  deriveLoadStateFromFetchResult,
  deriveSaveStateFromSaveResult,
  isPlainObject,
  isValidObject13PlayerProfileDto,
  normalizeObject13PlayerProfileData,
  Object13PlayerProfileDto,
  validateIncomingObject13PlayerProfilePutBody,
} from "./object13PlayerProfile";

const VALID_DTO: Object13PlayerProfileDto = {
  discordUserId: "123456789012345678",
  profileVersion: 1,
  profileData: {},
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
  it("accepts a well-formed DTO", () => {
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

  it("rejects profileData that is not a plain object", () => {
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, profileData: null })).toBe(false);
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, profileData: [] })).toBe(false);
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, profileData: "not an object" })).toBe(false);
  });

  it("rejects invalid timestamp strings", () => {
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, createdAt: "not a date" })).toBe(false);
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, updatedAt: 12345 })).toBe(false);
    expect(isValidObject13PlayerProfileDto({ ...VALID_DTO, lastSeenAt: null })).toBe(false);
  });
});

describe("normalizeObject13PlayerProfileData", () => {
  it("passes a plain object through unchanged", () => {
    expect(normalizeObject13PlayerProfileData({ a: 1 })).toEqual({ a: 1 });
  });

  it("normalizes null/array/string/number to {}", () => {
    expect(normalizeObject13PlayerProfileData(null)).toEqual({});
    expect(normalizeObject13PlayerProfileData([1, 2, 3])).toEqual({});
    expect(normalizeObject13PlayerProfileData("corrupted")).toEqual({});
    expect(normalizeObject13PlayerProfileData(42)).toEqual({});
  });
});

describe("validateIncomingObject13PlayerProfilePutBody", () => {
  const VALID_BODY = { expectedRevision: 1, profileVersion: 1, profileData: {} };

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

  it("rejects profileData: null", () => {
    expect(validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, profileData: null }).ok).toBe(false);
  });

  it("rejects profileData as an array", () => {
    expect(validateIncomingObject13PlayerProfilePutBody({ ...VALID_BODY, profileData: [1, 2] }).ok).toBe(false);
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
