import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
  ServerHardcorePlayerProfile,
  createDefaultServerHardcoreProfile,
  createHardcoreProfileSnapshotFromLocalState,
  mergeHardcoreProfileSnapshot,
  sanitizeHardcoreProfileSnapshot,
  serverHardcoreProfileToPlayerProfileStats,
  serverHardcoreProfileToReward,
} from "./hardcorePlayerProfileSnapshot";
import { PlayerProfileStats } from "./playerProfileStats";

const IDENTITY = { discordUserId: "123", displayName: "Hynek", avatarUrl: "https://cdn.example/avatar.png" };

function serverProfile(overrides: Partial<ServerHardcorePlayerProfile> = {}): ServerHardcorePlayerProfile {
  return {
    ...createDefaultServerHardcoreProfile({ ...IDENTITY, nowIso: "2026-01-01T00:00:00.000Z" }),
    ...overrides,
  };
}

describe("createDefaultServerHardcoreProfile", () => {
  it("matches the real project-hub-api contract exactly (10 fields, no more)", () => {
    const profile = serverProfile();
    expect(profile).toEqual({
      discordUserId: "123",
      displayName: "Hynek",
      avatarUrl: "https://cdn.example/avatar.png",
      hardcoreHasDefeatedMonster: false,
      hardcoreDoubleBarrelUnlocked: false,
      hardcoreMonsterDefeatsCount: 0,
      hardcoreBestNight: 0,
      hardcoreDeathsByNight: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("allows null displayName/avatarUrl (Discord profile without one)", () => {
    const profile = createDefaultServerHardcoreProfile({ discordUserId: "1", displayName: null, avatarUrl: null });
    expect(profile.displayName).toBeNull();
    expect(profile.avatarUrl).toBeNull();
  });
});

describe("mergeHardcoreProfileSnapshot", () => {
  it("uses OR for boolean reward values", () => {
    const merged1 = mergeHardcoreProfileSnapshot(serverProfile({ hardcoreHasDefeatedMonster: false, hardcoreDoubleBarrelUnlocked: false }), {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreHasDefeatedMonster: true,
      hardcoreDoubleBarrelUnlocked: true,
    });
    expect(merged1.hardcoreHasDefeatedMonster).toBe(true);
    expect(merged1.hardcoreDoubleBarrelUnlocked).toBe(true);

    const merged2 = mergeHardcoreProfileSnapshot(serverProfile({ hardcoreHasDefeatedMonster: true, hardcoreDoubleBarrelUnlocked: true }), {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreHasDefeatedMonster: false,
      hardcoreDoubleBarrelUnlocked: false,
    });
    expect(merged2.hardcoreHasDefeatedMonster).toBe(true);
    expect(merged2.hardcoreDoubleBarrelUnlocked).toBe(true);
  });

  it("uses max (not sum) for hardcoreMonsterDefeatsCount", () => {
    const merged = mergeHardcoreProfileSnapshot(serverProfile({ hardcoreMonsterDefeatsCount: 5 }), {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreMonsterDefeatsCount: 3,
    });
    expect(merged.hardcoreMonsterDefeatsCount).toBe(5);
    // Explicitly not a sum (5+3=8) — verifies max, not addition.
    expect(merged.hardcoreMonsterDefeatsCount).not.toBe(8);
  });

  it("never lowers hardcoreBestNight", () => {
    const merged = mergeHardcoreProfileSnapshot(serverProfile({ hardcoreBestNight: 8 }), {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreBestNight: 3,
    });
    expect(merged.hardcoreBestNight).toBe(8);

    const merged2 = mergeHardcoreProfileSnapshot(serverProfile({ hardcoreBestNight: 3 }), {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreBestNight: 8,
    });
    expect(merged2.hardcoreBestNight).toBe(8);
  });

  it("ignores negative local values (never lets them pull the server value down)", () => {
    const merged = mergeHardcoreProfileSnapshot(serverProfile({ hardcoreBestNight: 5, hardcoreMonsterDefeatsCount: 5 }), {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreBestNight: -100,
      hardcoreMonsterDefeatsCount: -100,
    });
    expect(merged.hardcoreBestNight).toBe(5);
    expect(merged.hardcoreMonsterDefeatsCount).toBe(5);
  });

  it("clamps extreme values on the way out", () => {
    const merged = mergeHardcoreProfileSnapshot(serverProfile({ hardcoreBestNight: 5 }), {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreBestNight: 999_999,
      hardcoreMonsterDefeatsCount: 999_999_999,
    });
    expect(merged.hardcoreBestNight).toBe(10_000);
    expect(merged.hardcoreMonsterDefeatsCount).toBe(100_000);
  });

  it("updates updatedAt/lastSeenAt to the given (or current) time", () => {
    const merged = mergeHardcoreProfileSnapshot(
      serverProfile({ updatedAt: "old", lastSeenAt: "old" }),
      DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      "2026-06-01T00:00:00.000Z",
    );
    expect(merged.updatedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(merged.lastSeenAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("preserves identity fields untouched (discordUserId/displayName/avatarUrl/createdAt)", () => {
    const merged = mergeHardcoreProfileSnapshot(serverProfile(), DEFAULT_HARDCORE_PROFILE_SNAPSHOT);
    expect(merged.discordUserId).toBe("123");
    expect(merged.displayName).toBe("Hynek");
    expect(merged.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("sanitizeHardcoreProfileSnapshot", () => {
  it("returns defaults for non-object input", () => {
    expect(sanitizeHardcoreProfileSnapshot(null)).toEqual(DEFAULT_HARDCORE_PROFILE_SNAPSHOT);
    expect(sanitizeHardcoreProfileSnapshot(undefined)).toEqual(DEFAULT_HARDCORE_PROFILE_SNAPSHOT);
    expect(sanitizeHardcoreProfileSnapshot("nope")).toEqual(DEFAULT_HARDCORE_PROFILE_SNAPSHOT);
    expect(sanitizeHardcoreProfileSnapshot(42)).toEqual(DEFAULT_HARDCORE_PROFILE_SNAPSHOT);
  });

  it("accepts a fully valid snapshot unchanged", () => {
    const valid = {
      hardcoreHasDefeatedMonster: true,
      hardcoreDoubleBarrelUnlocked: true,
      hardcoreMonsterDefeatsCount: 3,
      hardcoreBestNight: 7,
      hardcoreDeathsByNight: { "1": 2, "5": 1 },
    };
    expect(sanitizeHardcoreProfileSnapshot(valid)).toEqual(valid);
  });

  it("rejects non-boolean reward fields, falling back to false", () => {
    expect(sanitizeHardcoreProfileSnapshot({ hardcoreHasDefeatedMonster: "yes", hardcoreDoubleBarrelUnlocked: 1 })).toEqual(
      DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
    );
  });

  it("rejects non-numeric, negative, and NaN counter fields, falling back to 0", () => {
    const result = sanitizeHardcoreProfileSnapshot({
      hardcoreBestNight: "10",
      hardcoreMonsterDefeatsCount: NaN,
    });
    expect(result.hardcoreBestNight).toBe(0);
    expect(result.hardcoreMonsterDefeatsCount).toBe(0);
  });

  it("floors non-integer numeric fields", () => {
    expect(sanitizeHardcoreProfileSnapshot({ hardcoreBestNight: 7.9 }).hardcoreBestNight).toBe(7);
  });

  it("clamps extreme values to the documented maximums", () => {
    const result = sanitizeHardcoreProfileSnapshot({
      hardcoreBestNight: 999_999,
      hardcoreMonsterDefeatsCount: 999_999_999,
    });
    expect(result.hardcoreBestNight).toBe(10_000);
    expect(result.hardcoreMonsterDefeatsCount).toBe(100_000);
  });

  // Zadání: "Pokud request obsahuje neznámá pole, ignoruj je" / "Pokud
  // request obsahuje Normal-like pole, ignoruj je." — platí i pro pole, která
  // dřív existovala na tomhle typu (hardcoreTotalDeaths apod.), ale server
  // (project-hub-api) je dnes vůbec neukládá, viz zadání "Srovnat
  // ServerHardcorePlayerProfile s reálným project-hub-api contractem".
  it("ignores unknown, Normal-like, and no-longer-supported hardcore-prefixed fields (never leaks them through)", () => {
    const result = sanitizeHardcoreProfileSnapshot({
      hardcoreBestNight: 3,
      totalDeaths: 999, // Normal-like field, no "hardcore" prefix
      bulbsReplaced: 999,
      admin: true,
      discordUserId: "someone-elses-id",
      hardcoreTotalDeaths: 999, // no longer part of the server contract
      hardcoreMonsterHitsConfirmed: 999,
      hardcoreMonsterKills: 999,
    });
    expect(result).toEqual({ ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT, hardcoreBestNight: 3 });
    expect(Object.keys(result)).not.toContain("totalDeaths");
    expect(Object.keys(result)).not.toContain("discordUserId");
    expect(Object.keys(result)).not.toContain("hardcoreTotalDeaths");
    expect(Object.keys(result)).not.toContain("hardcoreMonsterKills");
  });
});

describe("serverHardcoreProfileToReward", () => {
  it("maps hardcore reward fields to the local MonsterDefeatReward shape", () => {
    const profile = serverProfile({
      hardcoreHasDefeatedMonster: true,
      hardcoreDoubleBarrelUnlocked: true,
      hardcoreMonsterDefeatsCount: 4,
    });
    expect(serverHardcoreProfileToReward(profile)).toEqual({
      hasDefeatedMonster: true,
      doubleBarrelUnlocked: true,
      monsterDefeatsCount: 4,
    });
  });
});

describe("serverHardcoreProfileToPlayerProfileStats", () => {
  const LOCAL_STATS: PlayerProfileStats = {
    totalDeaths: 11,
    totalRunsStarted: 22,
    totalNightsSurvived: 33,
    hardcoreBestNight: 1, // stale local value — must be overridden by the server value below
    bulbsReplaced: 44,
    generatorsRestarted: 55,
    expeditionsStarted: 66,
    expeditionsReturned: 77,
    monsterHitsConfirmed: 88,
    monsterKills: 99, // stale local value — must be overridden by the server value below
    hardcoreDeathsByNight: { "1": 5 }, // stale local value — must be overridden by the server value below
  };

  it("overrides hardcoreBestNight, monsterKills (from hardcoreMonsterDefeatsCount), and hardcoreDeathsByNight, never undefined", () => {
    const profile = serverProfile({ hardcoreBestNight: 6, hardcoreMonsterDefeatsCount: 2, hardcoreDeathsByNight: { "1": 2, "2": 1 } });
    const stats = serverHardcoreProfileToPlayerProfileStats(profile, LOCAL_STATS);

    expect(stats.hardcoreBestNight).toBe(6);
    expect(stats.monsterKills).toBe(2);
    expect(stats.hardcoreDeathsByNight).toEqual({ "1": 2, "2": 1 });
    for (const [key, value] of Object.entries(stats)) {
      expect(value).not.toBeUndefined();
      if (key !== "hardcoreDeathsByNight") expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("falls back to the given localStats for every field the server no longer tracks", () => {
    const profile = serverProfile();
    const stats = serverHardcoreProfileToPlayerProfileStats(profile, LOCAL_STATS);

    expect(stats.totalDeaths).toBe(LOCAL_STATS.totalDeaths);
    expect(stats.totalRunsStarted).toBe(LOCAL_STATS.totalRunsStarted);
    expect(stats.totalNightsSurvived).toBe(LOCAL_STATS.totalNightsSurvived);
    expect(stats.bulbsReplaced).toBe(LOCAL_STATS.bulbsReplaced);
    expect(stats.generatorsRestarted).toBe(LOCAL_STATS.generatorsRestarted);
    expect(stats.expeditionsStarted).toBe(LOCAL_STATS.expeditionsStarted);
    expect(stats.expeditionsReturned).toBe(LOCAL_STATS.expeditionsReturned);
    expect(stats.monsterHitsConfirmed).toBe(LOCAL_STATS.monsterHitsConfirmed);
  });

  it("never leaves hardcoreDeathsByNight undefined even when the server's is missing/invalid", () => {
    const profile = { ...serverProfile(), hardcoreDeathsByNight: null as unknown as Record<string, number> };
    const stats = serverHardcoreProfileToPlayerProfileStats(profile, LOCAL_STATS);
    expect(stats.hardcoreDeathsByNight).toEqual({});
  });
});

describe("createHardcoreProfileSnapshotFromLocalState", () => {
  const ZERO_STATS: PlayerProfileStats = {
    totalDeaths: 0,
    totalRunsStarted: 0,
    totalNightsSurvived: 0,
    hardcoreBestNight: 0,
    bulbsReplaced: 0,
    generatorsRestarted: 0,
    expeditionsStarted: 0,
    expeditionsReturned: 0,
    monsterHitsConfirmed: 0,
    monsterKills: 0,
    hardcoreDeathsByNight: {},
  };

  it("uses stats.hardcoreBestNight directly (already mode-safe)", () => {
    const snapshot = createHardcoreProfileSnapshotFromLocalState(
      { ...ZERO_STATS, hardcoreBestNight: 6 },
      { hasDefeatedMonster: false, doubleBarrelUnlocked: false, monsterDefeatsCount: 0 },
    );
    expect(snapshot.hardcoreBestNight).toBe(6);
  });

  it("uses stats.hardcoreDeathsByNight directly (already mode-safe)", () => {
    const snapshot = createHardcoreProfileSnapshotFromLocalState(
      { ...ZERO_STATS, hardcoreDeathsByNight: { "1": 2, "5": 1 } },
      { hasDefeatedMonster: false, doubleBarrelUnlocked: false, monsterDefeatsCount: 0 },
    );
    expect(snapshot.hardcoreDeathsByNight).toEqual({ "1": 2, "5": 1 });
  });

  it("uses the isolated hardcore monster progress for reward fields, not the mode-agnostic local reward", () => {
    const snapshot = createHardcoreProfileSnapshotFromLocalState(ZERO_STATS, {
      hasDefeatedMonster: true,
      doubleBarrelUnlocked: true,
      monsterDefeatsCount: 2,
    });
    expect(snapshot.hardcoreHasDefeatedMonster).toBe(true);
    expect(snapshot.hardcoreDoubleBarrelUnlocked).toBe(true);
    expect(snapshot.hardcoreMonsterDefeatsCount).toBe(2);
  });

  it("only ever produces the five fields the server contract accepts", () => {
    const snapshot = createHardcoreProfileSnapshotFromLocalState(
      { ...ZERO_STATS, totalDeaths: 50, totalRunsStarted: 20, totalNightsSurvived: 30, monsterHitsConfirmed: 40 },
      { hasDefeatedMonster: false, doubleBarrelUnlocked: false, monsterDefeatsCount: 0 },
    );
    expect(Object.keys(snapshot).sort()).toEqual(
      [
        "hardcoreBestNight",
        "hardcoreDeathsByNight",
        "hardcoreDoubleBarrelUnlocked",
        "hardcoreHasDefeatedMonster",
        "hardcoreMonsterDefeatsCount",
      ].sort(),
    );
  });
});

describe("hardcoreDeathsByNight: sanitize + merge", () => {
  it("sanitizes an invalid raw value (non-object) to {} inside sanitizeHardcoreProfileSnapshot", () => {
    const result = sanitizeHardcoreProfileSnapshot({ hardcoreDeathsByNight: "nope" });
    expect(result.hardcoreDeathsByNight).toEqual({});
  });

  it("sanitizes null/array to {}", () => {
    expect(sanitizeHardcoreProfileSnapshot({ hardcoreDeathsByNight: null }).hardcoreDeathsByNight).toEqual({});
    expect(sanitizeHardcoreProfileSnapshot({ hardcoreDeathsByNight: [1, 2, 3] }).hardcoreDeathsByNight).toEqual({});
  });

  it("keeps only valid night keys and non-negative integer counts", () => {
    const result = sanitizeHardcoreProfileSnapshot({
      hardcoreDeathsByNight: { "1": 3, "0": 5, "-1": 2, abc: 1, "2": -4, "3": 1.5 },
    });
    expect(result.hardcoreDeathsByNight).toEqual({ "1": 3 });
  });

  it("merge combines per-night keys via max, keeping keys unique to either side (example from the spec)", () => {
    const server = serverProfile({ hardcoreDeathsByNight: { "1": 2, "3": 1 } });
    const merged = mergeHardcoreProfileSnapshot(server, {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreDeathsByNight: { "1": 1, "2": 4 },
    });
    expect(merged.hardcoreDeathsByNight).toEqual({ "1": 2, "2": 4, "3": 1 });
  });

  it("merge never lowers an existing per-night count", () => {
    const server = serverProfile({ hardcoreDeathsByNight: { "1": 10 } });
    const merged = mergeHardcoreProfileSnapshot(server, {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreDeathsByNight: { "1": 2 },
    });
    expect(merged.hardcoreDeathsByNight).toEqual({ "1": 10 });
  });

  it("merge ignores invalid incoming night keys", () => {
    const server = serverProfile({ hardcoreDeathsByNight: { "1": 1 } });
    const merged = mergeHardcoreProfileSnapshot(server, {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreDeathsByNight: { "0": 99, "-5": 99, abc: 99 },
    });
    expect(merged.hardcoreDeathsByNight).toEqual({ "1": 1 });
  });

  it("merge clamps an extreme count to the documented maximum", () => {
    const server = serverProfile({ hardcoreDeathsByNight: {} });
    const merged = mergeHardcoreProfileSnapshot(server, {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreDeathsByNight: { "1": 999_999_999 },
    });
    expect(merged.hardcoreDeathsByNight).toEqual({ "1": 1_000_000 });
  });
});

// Vitest tu běží v node prostředí (žádné jsdom) — window je jinak undefined,
// stejný fake localStorage vzor jako monsterDefeatReward.test.ts.
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("local hardcore monster progress (isolated from monsterDefeatReward.ts)", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with nothing unlocked", async () => {
    const { getLocalHardcoreMonsterProgress } = await import("./hardcorePlayerProfileSnapshot");
    expect(getLocalHardcoreMonsterProgress()).toEqual({
      hasDefeatedMonster: false,
      doubleBarrelUnlocked: false,
      monsterDefeatsCount: 0,
    });
  });

  it("recordLocalHardcoreMonsterDefeat sets both reward flags and increments the count", async () => {
    const { recordLocalHardcoreMonsterDefeat } = await import("./hardcorePlayerProfileSnapshot");
    const first = recordLocalHardcoreMonsterDefeat();
    expect(first).toEqual({ hasDefeatedMonster: true, doubleBarrelUnlocked: true, monsterDefeatsCount: 1 });

    const second = recordLocalHardcoreMonsterDefeat();
    expect(second.monsterDefeatsCount).toBe(2);
  });

  it("survives corrupted JSON in storage by falling back to defaults", async () => {
    window.localStorage.setItem("nocni-hlidac:object13:hardcore-monster-progress", "{not valid json");
    const { getLocalHardcoreMonsterProgress } = await import("./hardcorePlayerProfileSnapshot");
    expect(getLocalHardcoreMonsterProgress()).toEqual({
      hasDefeatedMonster: false,
      doubleBarrelUnlocked: false,
      monsterDefeatsCount: 0,
    });
  });

  it("is independent from game/core/monsterDefeatReward.ts's storage key", async () => {
    const { recordLocalHardcoreMonsterDefeat } = await import("./hardcorePlayerProfileSnapshot");
    recordLocalHardcoreMonsterDefeat();
    expect(window.localStorage.getItem("nocni-hlidac:object13:monster-defeat-reward")).toBeNull();
  });
});

describe("local hardcore monster progress outside the browser (SSR-safe)", () => {
  it("getLocalHardcoreMonsterProgress returns defaults when window is undefined", async () => {
    vi.stubGlobal("window", undefined);
    const { getLocalHardcoreMonsterProgress } = await import("./hardcorePlayerProfileSnapshot");
    expect(getLocalHardcoreMonsterProgress()).toEqual({
      hasDefeatedMonster: false,
      doubleBarrelUnlocked: false,
      monsterDefeatsCount: 0,
    });
    vi.unstubAllGlobals();
  });
});
