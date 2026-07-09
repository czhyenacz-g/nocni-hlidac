import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Vitest tu běží v node prostředí (žádné jsdom) — window je jinak undefined,
// stejný fake localStorage vzor jako bulbInventory.test.ts/monsterDefeatReward.test.ts.
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

const DEFAULTS = {
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

describe("playerProfileStats", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getPlayerProfileStats returns defaults when nothing is stored yet", async () => {
    const { getPlayerProfileStats } = await import("./playerProfileStats");
    expect(getPlayerProfileStats()).toEqual(DEFAULTS);
  });

  it("getPlayerProfileStats returns defaults on corrupted JSON", async () => {
    window.localStorage.setItem("nocni-hlidac:object13:player-profile-stats", "{not valid json");
    const { getPlayerProfileStats } = await import("./playerProfileStats");
    expect(getPlayerProfileStats()).toEqual(DEFAULTS);
  });

  it("getPlayerProfileStats fills in missing keys instead of discarding the whole record (future model expansion)", async () => {
    window.localStorage.setItem(
      "nocni-hlidac:object13:player-profile-stats",
      JSON.stringify({ totalDeaths: 4, bulbsReplaced: 2 }),
    );
    const { getPlayerProfileStats } = await import("./playerProfileStats");
    expect(getPlayerProfileStats()).toEqual({ ...DEFAULTS, totalDeaths: 4, bulbsReplaced: 2 });
  });

  it("save/get roundtrip", async () => {
    const { getPlayerProfileStats, savePlayerProfileStats } = await import("./playerProfileStats");
    const stats = { ...DEFAULTS, totalDeaths: 7, monsterKills: 2 };
    savePlayerProfileStats(stats);
    expect(getPlayerProfileStats()).toEqual(stats);
  });

  it("incrementPlayerProfileStat adds the given amount (default 1) to the named key only", async () => {
    const { incrementPlayerProfileStat, getPlayerProfileStats } = await import("./playerProfileStats");
    incrementPlayerProfileStat("bulbsReplaced");
    const result = incrementPlayerProfileStat("bulbsReplaced", 3);
    expect(result.bulbsReplaced).toBe(4);
    expect(getPlayerProfileStats()).toEqual({ ...DEFAULTS, bulbsReplaced: 4 });
  });

  it("recordRunStarted increments totalRunsStarted", async () => {
    const { recordRunStarted } = await import("./playerProfileStats");
    expect(recordRunStarted().totalRunsStarted).toBe(1);
    expect(recordRunStarted().totalRunsStarted).toBe(2);
  });

  it("recordDeath increments totalDeaths", async () => {
    const { recordDeath } = await import("./playerProfileStats");
    expect(recordDeath().totalDeaths).toBe(1);
    expect(recordDeath().totalDeaths).toBe(2);
  });

  it("recordNightSurvived for normal increases totalNightsSurvived but never touches hardcoreBestNight", async () => {
    const { recordNightSurvived } = await import("./playerProfileStats");
    const result = recordNightSurvived("normal", 6);
    expect(result.totalNightsSurvived).toBe(1);
    expect(result.hardcoreBestNight).toBe(0);
  });

  it("recordNightSurvived for hardcore updates hardcoreBestNight only upward", async () => {
    const { recordNightSurvived, getPlayerProfileStats } = await import("./playerProfileStats");
    recordNightSurvived("hardcore", 3);
    expect(getPlayerProfileStats().hardcoreBestNight).toBe(3);

    recordNightSurvived("hardcore", 7);
    expect(getPlayerProfileStats().hardcoreBestNight).toBe(7);

    // Lower night than the existing best — must NOT regress.
    recordNightSurvived("hardcore", 2);
    expect(getPlayerProfileStats().hardcoreBestNight).toBe(7);
  });

  it("recordNightSurvived always increments totalNightsSurvived regardless of gameMode", async () => {
    const { recordNightSurvived, getPlayerProfileStats } = await import("./playerProfileStats");
    recordNightSurvived("normal", 1);
    recordNightSurvived("hardcore", 4);
    expect(getPlayerProfileStats().totalNightsSurvived).toBe(2);
  });

  it("recordBulbReplaced increments bulbsReplaced", async () => {
    const { recordBulbReplaced } = await import("./playerProfileStats");
    expect(recordBulbReplaced().bulbsReplaced).toBe(1);
  });

  it("recordGeneratorRestarted increments generatorsRestarted", async () => {
    const { recordGeneratorRestarted } = await import("./playerProfileStats");
    expect(recordGeneratorRestarted().generatorsRestarted).toBe(1);
  });

  it("recordExpeditionStarted increments expeditionsStarted", async () => {
    const { recordExpeditionStarted } = await import("./playerProfileStats");
    expect(recordExpeditionStarted().expeditionsStarted).toBe(1);
  });

  it("recordExpeditionReturned increments expeditionsReturned", async () => {
    const { recordExpeditionReturned } = await import("./playerProfileStats");
    expect(recordExpeditionReturned().expeditionsReturned).toBe(1);
  });

  it("recordMonsterHitsConfirmed adds hitCount, not a fixed 1", async () => {
    const { recordMonsterHitsConfirmed, getPlayerProfileStats } = await import("./playerProfileStats");
    recordMonsterHitsConfirmed(2);
    expect(getPlayerProfileStats().monsterHitsConfirmed).toBe(2);
    recordMonsterHitsConfirmed(1);
    expect(getPlayerProfileStats().monsterHitsConfirmed).toBe(3);
  });

  it("recordMonsterHitsConfirmed with 0 (or negative) is a harmless no-op", async () => {
    const { recordMonsterHitsConfirmed, getPlayerProfileStats } = await import("./playerProfileStats");
    recordMonsterHitsConfirmed(0);
    expect(getPlayerProfileStats().monsterHitsConfirmed).toBe(0);
  });

  it("recordMonsterKill increments monsterKills", async () => {
    const { recordMonsterKill } = await import("./playerProfileStats");
    expect(recordMonsterKill().monsterKills).toBe(1);
    expect(recordMonsterKill().monsterKills).toBe(2);
  });

  it("resetPlayerProfileStats restores defaults", async () => {
    const { recordDeath, recordMonsterKill, resetPlayerProfileStats, getPlayerProfileStats } = await import(
      "./playerProfileStats"
    );
    recordDeath();
    recordMonsterKill();
    expect(resetPlayerProfileStats()).toEqual(DEFAULTS);
    expect(getPlayerProfileStats()).toEqual(DEFAULTS);
  });
});

describe("playerProfileStats outside the browser (SSR-safe)", () => {
  it("getPlayerProfileStats returns defaults when window is undefined", async () => {
    vi.stubGlobal("window", undefined);
    const { getPlayerProfileStats } = await import("./playerProfileStats");
    expect(getPlayerProfileStats()).toEqual(DEFAULTS);
    vi.unstubAllGlobals();
  });

  it("savePlayerProfileStats does not throw when window is undefined", async () => {
    vi.stubGlobal("window", undefined);
    const { savePlayerProfileStats } = await import("./playerProfileStats");
    expect(() => savePlayerProfileStats({ ...DEFAULTS, totalDeaths: 5 })).not.toThrow();
    vi.unstubAllGlobals();
  });
});
