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
  it("matches the default reward/stats model exactly", () => {
    const profile = serverProfile();
    expect(profile).toEqual({
      discordUserId: "123",
      displayName: "Hynek",
      avatarUrl: "https://cdn.example/avatar.png",
      hardcoreHasDefeatedMonster: false,
      hardcoreDoubleBarrelUnlocked: false,
      hardcoreMonsterDefeatsCount: 0,
      hardcoreBestNight: 0,
      hardcoreTotalDeaths: 0,
      hardcoreTotalRunsStarted: 0,
      hardcoreTotalNightsSurvived: 0,
      hardcoreMonsterHitsConfirmed: 0,
      hardcoreMonsterKills: 0,
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
    const merged1 = mergeHardcoreProfileSnapshot(
      serverProfile({ hardcoreHasDefeatedMonster: false, hardcoreDoubleBarrelUnlocked: false }),
      { ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT, hardcoreHasDefeatedMonster: true, hardcoreDoubleBarrelUnlocked: true },
    );
    expect(merged1.hardcoreHasDefeatedMonster).toBe(true);
    expect(merged1.hardcoreDoubleBarrelUnlocked).toBe(true);

    const merged2 = mergeHardcoreProfileSnapshot(
      serverProfile({ hardcoreHasDefeatedMonster: true, hardcoreDoubleBarrelUnlocked: true }),
      { ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT, hardcoreHasDefeatedMonster: false, hardcoreDoubleBarrelUnlocked: false },
    );
    expect(merged2.hardcoreHasDefeatedMonster).toBe(true);
    expect(merged2.hardcoreDoubleBarrelUnlocked).toBe(true);
  });

  it("uses max (not sum) for counters", () => {
    const merged = mergeHardcoreProfileSnapshot(
      serverProfile({ hardcoreMonsterDefeatsCount: 5, hardcoreTotalDeaths: 10 }),
      { ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT, hardcoreMonsterDefeatsCount: 3, hardcoreTotalDeaths: 20 },
    );
    expect(merged.hardcoreMonsterDefeatsCount).toBe(5);
    expect(merged.hardcoreTotalDeaths).toBe(20);
    // Explicitly not a sum (5+3=8, 10+20=30) — verifies max, not addition.
    expect(merged.hardcoreMonsterDefeatsCount).not.toBe(8);
    expect(merged.hardcoreTotalDeaths).not.toBe(30);
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
    const merged = mergeHardcoreProfileSnapshot(serverProfile({ hardcoreBestNight: 5, hardcoreTotalDeaths: 5 }), {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreBestNight: -100,
      hardcoreTotalDeaths: -100,
    });
    expect(merged.hardcoreBestNight).toBe(5);
    expect(merged.hardcoreTotalDeaths).toBe(5);
  });

  it("clamps extreme values on the way out", () => {
    const merged = mergeHardcoreProfileSnapshot(serverProfile({ hardcoreBestNight: 5 }), {
      ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT,
      hardcoreBestNight: 999_999,
      hardcoreMonsterDefeatsCount: 999_999_999,
      hardcoreTotalDeaths: 999_999_999,
    });
    expect(merged.hardcoreBestNight).toBe(10_000);
    expect(merged.hardcoreMonsterDefeatsCount).toBe(100_000);
    expect(merged.hardcoreTotalDeaths).toBe(1_000_000);
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
      hardcoreTotalDeaths: 2,
      hardcoreTotalRunsStarted: 4,
      hardcoreTotalNightsSurvived: 5,
      hardcoreMonsterHitsConfirmed: 12,
      hardcoreMonsterKills: 3,
    };
    expect(sanitizeHardcoreProfileSnapshot(valid)).toEqual(valid);
  });

  it("rejects non-boolean reward fields, falling back to false", () => {
    expect(
      sanitizeHardcoreProfileSnapshot({ hardcoreHasDefeatedMonster: "yes", hardcoreDoubleBarrelUnlocked: 1 }),
    ).toEqual(DEFAULT_HARDCORE_PROFILE_SNAPSHOT);
  });

  it("rejects non-numeric, negative, and NaN counter fields, falling back to 0", () => {
    const result = sanitizeHardcoreProfileSnapshot({
      hardcoreBestNight: "10",
      hardcoreTotalDeaths: -5,
      hardcoreMonsterDefeatsCount: NaN,
      hardcoreMonsterKills: Infinity,
    });
    expect(result.hardcoreBestNight).toBe(0);
    expect(result.hardcoreTotalDeaths).toBe(0);
    expect(result.hardcoreMonsterDefeatsCount).toBe(0);
    expect(result.hardcoreMonsterKills).toBe(0);
  });

  it("floors non-integer numeric fields", () => {
    expect(sanitizeHardcoreProfileSnapshot({ hardcoreBestNight: 7.9 }).hardcoreBestNight).toBe(7);
  });

  it("clamps extreme values to the documented maximums", () => {
    const result = sanitizeHardcoreProfileSnapshot({
      hardcoreBestNight: 999_999,
      hardcoreMonsterDefeatsCount: 999_999_999,
      hardcoreTotalDeaths: 999_999_999,
      hardcoreTotalRunsStarted: 999_999_999,
      hardcoreTotalNightsSurvived: 999_999_999,
      hardcoreMonsterHitsConfirmed: 999_999_999,
      hardcoreMonsterKills: 999_999_999,
    });
    expect(result.hardcoreBestNight).toBe(10_000);
    expect(result.hardcoreMonsterDefeatsCount).toBe(100_000);
    expect(result.hardcoreTotalDeaths).toBe(1_000_000);
    expect(result.hardcoreTotalRunsStarted).toBe(1_000_000);
    expect(result.hardcoreTotalNightsSurvived).toBe(1_000_000);
    expect(result.hardcoreMonsterHitsConfirmed).toBe(1_000_000);
    expect(result.hardcoreMonsterKills).toBe(1_000_000);
  });

  // Zadání: "Pokud request obsahuje neznámá pole, ignoruj je" / "Pokud
  // request obsahuje Normal-like pole, ignoruj je."
  it("ignores unknown and Normal-like fields entirely (never leaks them through)", () => {
    const result = sanitizeHardcoreProfileSnapshot({
      hardcoreBestNight: 3,
      totalDeaths: 999, // Normal-like field, no "hardcore" prefix
      bulbsReplaced: 999,
      admin: true,
      discordUserId: "someone-elses-id",
    });
    expect(result).toEqual({ ...DEFAULT_HARDCORE_PROFILE_SNAPSHOT, hardcoreBestNight: 3 });
    expect(Object.keys(result)).not.toContain("totalDeaths");
    expect(Object.keys(result)).not.toContain("discordUserId");
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
  it("maps the hardcore-equivalent fields, zeroing fields with no server equivalent", () => {
    const profile = serverProfile({
      hardcoreTotalDeaths: 3,
      hardcoreTotalRunsStarted: 5,
      hardcoreTotalNightsSurvived: 4,
      hardcoreBestNight: 6,
      hardcoreMonsterHitsConfirmed: 9,
      hardcoreMonsterKills: 2,
    });
    const stats: PlayerProfileStats = serverHardcoreProfileToPlayerProfileStats(profile);
    expect(stats).toEqual({
      totalDeaths: 3,
      totalRunsStarted: 5,
      totalNightsSurvived: 4,
      hardcoreBestNight: 6,
      bulbsReplaced: 0,
      generatorsRestarted: 0,
      expeditionsStarted: 0,
      expeditionsReturned: 0,
      monsterHitsConfirmed: 9,
      monsterKills: 2,
    });
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
  };

  it("uses stats.hardcoreBestNight directly (already mode-safe)", () => {
    const snapshot = createHardcoreProfileSnapshotFromLocalState(
      { ...ZERO_STATS, hardcoreBestNight: 6 },
      { hasDefeatedMonster: false, doubleBarrelUnlocked: false, monsterDefeatsCount: 0 },
    );
    expect(snapshot.hardcoreBestNight).toBe(6);
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
    expect(snapshot.hardcoreMonsterKills).toBe(2);
  });

  // Zadání: lokální PlayerProfileStats totalDeaths/totalRunsStarted/
  // totalNightsSurvived/monsterHitsConfirmed nerozlišuje Normal vs Hardcore
  // — i s vysokými lokálními hodnotami (např. z Normal hraní) se nesmí
  // poslat jako "hardcore" countery.
  it("never sends the mode-agnostic total* counters as hardcore values, even when they're nonzero", () => {
    const snapshot = createHardcoreProfileSnapshotFromLocalState(
      { ...ZERO_STATS, totalDeaths: 50, totalRunsStarted: 20, totalNightsSurvived: 30, monsterHitsConfirmed: 40 },
      { hasDefeatedMonster: false, doubleBarrelUnlocked: false, monsterDefeatsCount: 0 },
    );
    expect(snapshot.hardcoreTotalDeaths).toBe(0);
    expect(snapshot.hardcoreTotalRunsStarted).toBe(0);
    expect(snapshot.hardcoreTotalNightsSurvived).toBe(0);
    expect(snapshot.hardcoreMonsterHitsConfirmed).toBe(0);
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
