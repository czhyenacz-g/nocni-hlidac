import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Vitest tu běží v node prostředí (žádné jsdom) — window je jinak undefined,
// stejný fake localStorage vzor jako playerProfileStats.test.ts.
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe("achievementResultStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createFakeLocalStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getShownResultAchievementIds default (empty localStorage) is []", async () => {
    const { getShownResultAchievementIds } = await import("./achievementResultStorage");
    expect(getShownResultAchievementIds()).toEqual([]);
  });

  it("getShownResultAchievementIds returns [] on corrupted JSON", async () => {
    window.localStorage.setItem("nocni-hlidac:object13:shown-result-achievements", "{not valid json");
    const { getShownResultAchievementIds } = await import("./achievementResultStorage");
    expect(getShownResultAchievementIds()).toEqual([]);
  });

  it("markResultAchievementsAsShown stores ids and getShownResultAchievementIds reads them back", async () => {
    const { markResultAchievementsAsShown, getShownResultAchievementIds } = await import("./achievementResultStorage");
    markResultAchievementsAsShown(["first_shift", "first_death"]);
    expect(getShownResultAchievementIds()).toEqual(["first_shift", "first_death"]);
  });

  it("removes duplicates across repeated calls", async () => {
    const { markResultAchievementsAsShown, getShownResultAchievementIds } = await import("./achievementResultStorage");
    markResultAchievementsAsShown(["first_shift"]);
    markResultAchievementsAsShown(["first_shift", "first_death"]);
    expect(getShownResultAchievementIds()).toEqual(["first_shift", "first_death"]);
  });

  it("ignores unknown ids", async () => {
    const { getShownResultAchievementIds } = await import("./achievementResultStorage");
    window.localStorage.setItem(
      "nocni-hlidac:object13:shown-result-achievements",
      JSON.stringify({ shownAchievementIds: ["first_shift", "not_a_real_achievement_id"] }),
    );
    expect(getShownResultAchievementIds()).toEqual(["first_shift"]);
  });

  it("keeps a stable order matching playerAchievements.ts, regardless of storage insertion order", async () => {
    const { getShownResultAchievementIds } = await import("./achievementResultStorage");
    window.localStorage.setItem(
      "nocni-hlidac:object13:shown-result-achievements",
      JSON.stringify({ shownAchievementIds: ["monster_slayer", "first_shift", "hynek_encounter"] }),
    );
    // first_shift, hynek_encounter, ..., monster_slayer — matches
    // PLAYER_ACHIEVEMENT_DEFINITIONS order, not insertion order.
    expect(getShownResultAchievementIds()).toEqual(["first_shift", "hynek_encounter", "monster_slayer"]);
  });

  it("resetShownResultAchievements clears the storage", async () => {
    const { markResultAchievementsAsShown, resetShownResultAchievements, getShownResultAchievementIds } = await import(
      "./achievementResultStorage"
    );
    markResultAchievementsAsShown(["first_shift"]);
    expect(getShownResultAchievementIds()).toEqual(["first_shift"]);
    resetShownResultAchievements();
    expect(getShownResultAchievementIds()).toEqual([]);
  });
});

describe("achievementResultStorage outside the browser (SSR-safe)", () => {
  it("getShownResultAchievementIds returns [] when window is undefined", async () => {
    vi.stubGlobal("window", undefined);
    const { getShownResultAchievementIds } = await import("./achievementResultStorage");
    expect(getShownResultAchievementIds()).toEqual([]);
    vi.unstubAllGlobals();
  });

  it("markResultAchievementsAsShown does not throw when window is undefined", async () => {
    vi.stubGlobal("window", undefined);
    const { markResultAchievementsAsShown } = await import("./achievementResultStorage");
    expect(() => markResultAchievementsAsShown(["first_shift"])).not.toThrow();
    vi.unstubAllGlobals();
  });

  it("resetShownResultAchievements does not throw when window is undefined", async () => {
    vi.stubGlobal("window", undefined);
    const { resetShownResultAchievements } = await import("./achievementResultStorage");
    expect(() => resetShownResultAchievements()).not.toThrow();
    vi.unstubAllGlobals();
  });
});
