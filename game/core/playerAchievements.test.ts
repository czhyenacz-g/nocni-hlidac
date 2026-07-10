import { describe, expect, it } from "vitest";
import { PlayerAchievementId, resolvePlayerAchievements } from "./playerAchievements";
import { PlayerProfileStats } from "./playerProfileStats";
import { MonsterDefeatReward } from "./monsterDefeatReward";

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

const NO_REWARD: MonsterDefeatReward = {
  hasDefeatedMonster: false,
  doubleBarrelUnlocked: false,
  monsterDefeatsCount: 0,
};

function findAchievement(id: PlayerAchievementId, stats: Partial<PlayerProfileStats> = {}, reward: Partial<MonsterDefeatReward> = {}) {
  const achievements = resolvePlayerAchievements({ ...ZERO_STATS, ...stats }, { ...NO_REWARD, ...reward });
  const found = achievements.find((a) => a.id === id);
  if (!found) throw new Error(`achievement ${id} not found`);
  return found;
}

describe("resolvePlayerAchievements — everything locked with zero stats/no reward", () => {
  it("all 14 achievements are locked", () => {
    const achievements = resolvePlayerAchievements(ZERO_STATS, NO_REWARD);
    expect(achievements).toHaveLength(14);
    expect(achievements.every((a) => a.unlocked === false)).toBe(true);
  });
});

describe("first_shift", () => {
  it("locked below the threshold", () => {
    expect(findAchievement("first_shift", { totalRunsStarted: 0 }).unlocked).toBe(false);
  });
  it("unlocks at totalRunsStarted >= 1", () => {
    expect(findAchievement("first_shift", { totalRunsStarted: 1 }).unlocked).toBe(true);
  });
});

describe("first_death", () => {
  it("unlocks at totalDeaths >= 1", () => {
    expect(findAchievement("first_death", { totalDeaths: 1 }).unlocked).toBe(true);
    expect(findAchievement("first_death", { totalDeaths: 0 }).unlocked).toBe(false);
  });
});

describe("hynek_encounter", () => {
  it("locked when there is no Hardcore death recorded on night 1", () => {
    expect(findAchievement("hynek_encounter", { hardcoreDeathsByNight: {} }).unlocked).toBe(false);
    expect(findAchievement("hynek_encounter", { hardcoreDeathsByNight: { "2": 3 } }).unlocked).toBe(false);
  });

  it("unlocks when hardcoreDeathsByNight[\"1\"] >= 1", () => {
    expect(findAchievement("hynek_encounter", { hardcoreDeathsByNight: { "1": 1 } }).unlocked).toBe(true);
    expect(findAchievement("hynek_encounter", { hardcoreDeathsByNight: { "1": 3 } }).unlocked).toBe(true);
  });

  it("has the exact title/description from the spec", () => {
    const achievement = findAchievement("hynek_encounter");
    expect(achievement.title).toBe("Setkání s Hynkem");
    expect(achievement.description).toBe("Zemřel jsi hned první noc.");
  });
});

describe("first_expedition", () => {
  it("unlocks at expeditionsStarted >= 1", () => {
    expect(findAchievement("first_expedition", { expeditionsStarted: 1 }).unlocked).toBe(true);
    expect(findAchievement("first_expedition", { expeditionsStarted: 0 }).unlocked).toBe(false);
  });
});

describe("first_bulb_replaced", () => {
  it("unlocks at bulbsReplaced >= 1", () => {
    expect(findAchievement("first_bulb_replaced", { bulbsReplaced: 1 }).unlocked).toBe(true);
    expect(findAchievement("first_bulb_replaced", { bulbsReplaced: 0 }).unlocked).toBe(false);
  });
});

describe("first_generator_restart", () => {
  it("unlocks at generatorsRestarted >= 1", () => {
    expect(findAchievement("first_generator_restart", { generatorsRestarted: 1 }).unlocked).toBe(true);
    expect(findAchievement("first_generator_restart", { generatorsRestarted: 0 }).unlocked).toBe(false);
  });
});

describe("first_monster_hit", () => {
  it("unlocks at monsterHitsConfirmed >= 1", () => {
    expect(findAchievement("first_monster_hit", { monsterHitsConfirmed: 1 }).unlocked).toBe(true);
    expect(findAchievement("first_monster_hit", { monsterHitsConfirmed: 0 }).unlocked).toBe(false);
  });
});

describe("not_a_rookie_anymore", () => {
  it("unlocks when reward.hasDefeatedMonster is true", () => {
    expect(findAchievement("not_a_rookie_anymore", {}, { hasDefeatedMonster: true }).unlocked).toBe(true);
    expect(findAchievement("not_a_rookie_anymore", {}, { hasDefeatedMonster: false }).unlocked).toBe(false);
  });

  it("ignores stats entirely — reward is the sole source of truth", () => {
    expect(findAchievement("not_a_rookie_anymore", { monsterKills: 99 }, { hasDefeatedMonster: false }).unlocked).toBe(
      false,
    );
  });
});

describe("golden_guard", () => {
  it("unlocks when reward.doubleBarrelUnlocked is true", () => {
    expect(findAchievement("golden_guard", {}, { doubleBarrelUnlocked: true }).unlocked).toBe(true);
    expect(findAchievement("golden_guard", {}, { doubleBarrelUnlocked: false }).unlocked).toBe(false);
  });

  it("has the renamed title \"Hlídač s dvouhlavňovkou\" (ID unchanged)", () => {
    const achievement = findAchievement("golden_guard");
    expect(achievement.title).toBe("Hlídač s dvouhlavňovkou");
    expect(achievement.description).toBe("Odemkl jsi dvouhlavňovou brokovnici.");
  });
});

describe("hardcore_night_5", () => {
  it("unlocks at hardcoreBestNight >= 5", () => {
    expect(findAchievement("hardcore_night_5", { hardcoreBestNight: 5 }).unlocked).toBe(true);
    expect(findAchievement("hardcore_night_5", { hardcoreBestNight: 4 }).unlocked).toBe(false);
  });
});

describe("hardcore_night_10", () => {
  it("unlocks at hardcoreBestNight >= 10", () => {
    expect(findAchievement("hardcore_night_10", { hardcoreBestNight: 10 }).unlocked).toBe(true);
    expect(findAchievement("hardcore_night_10", { hardcoreBestNight: 9 }).unlocked).toBe(false);
  });

  it("night 7 unlocks hardcore_night_5 but not hardcore_night_10", () => {
    const achievements = resolvePlayerAchievements({ ...ZERO_STATS, hardcoreBestNight: 7 }, NO_REWARD);
    expect(achievements.find((a) => a.id === "hardcore_night_5")?.unlocked).toBe(true);
    expect(achievements.find((a) => a.id === "hardcore_night_10")?.unlocked).toBe(false);
  });

  it("has the renamed title \"Začni si zvykat\" (ID unchanged)", () => {
    const achievement = findAchievement("hardcore_night_10");
    expect(achievement.title).toBe("Začni si zvykat");
    expect(achievement.description).toBe("Dostal ses v Hardcore režimu alespoň k 10. noci.");
  });
});

describe("hardcore_night_20", () => {
  it("unlocks at hardcoreBestNight >= 20", () => {
    expect(findAchievement("hardcore_night_20", { hardcoreBestNight: 20 }).unlocked).toBe(true);
    expect(findAchievement("hardcore_night_20", { hardcoreBestNight: 19 }).unlocked).toBe(false);
  });

  it("has the exact title/description from the spec", () => {
    const achievement = findAchievement("hardcore_night_20");
    expect(achievement.title).toBe("Běžná rutina");
    expect(achievement.description).toBe("Dostal ses v Hardcore režimu alespoň k 20. noci.");
  });
});

describe("hardcore_night_30", () => {
  it("unlocks at hardcoreBestNight >= 30", () => {
    expect(findAchievement("hardcore_night_30", { hardcoreBestNight: 30 }).unlocked).toBe(true);
    expect(findAchievement("hardcore_night_30", { hardcoreBestNight: 29 }).unlocked).toBe(false);
  });

  it("has the exact title/description from the spec", () => {
    const achievement = findAchievement("hardcore_night_30");
    expect(achievement.title).toBe("Tvoje první výplata");
    expect(achievement.description).toBe("Dostal ses v Hardcore režimu alespoň k 30. noci.");
  });
});

describe("monster_slayer", () => {
  it("does NOT unlock at monsterKills === 1 (first kill is covered by not_a_rookie_anymore)", () => {
    expect(findAchievement("monster_slayer", { monsterKills: 1 }).unlocked).toBe(false);
  });

  it("unlocks at monsterKills === 2", () => {
    expect(findAchievement("monster_slayer", { monsterKills: 2 }).unlocked).toBe(true);
  });

  it("still locked at monsterKills === 0", () => {
    expect(findAchievement("monster_slayer", { monsterKills: 0 }).unlocked).toBe(false);
  });
});

describe("resolvePlayerAchievements — stable order", () => {
  it("always returns achievements in the same fixed order, regardless of stats/reward", () => {
    const expectedOrder: PlayerAchievementId[] = [
      "first_shift",
      "first_death",
      "hynek_encounter",
      "first_expedition",
      "first_bulb_replaced",
      "first_generator_restart",
      "first_monster_hit",
      "not_a_rookie_anymore",
      "golden_guard",
      "hardcore_night_5",
      "hardcore_night_10",
      "hardcore_night_20",
      "hardcore_night_30",
      "monster_slayer",
    ];

    const allLocked = resolvePlayerAchievements(ZERO_STATS, NO_REWARD).map((a) => a.id);
    const allUnlocked = resolvePlayerAchievements(
      {
        totalDeaths: 5,
        totalRunsStarted: 5,
        totalNightsSurvived: 5,
        hardcoreBestNight: 30,
        bulbsReplaced: 5,
        generatorsRestarted: 5,
        expeditionsStarted: 5,
        expeditionsReturned: 5,
        monsterHitsConfirmed: 10,
        monsterKills: 2,
        hardcoreDeathsByNight: { "1": 1 },
      },
      { hasDefeatedMonster: true, doubleBarrelUnlocked: true, monsterDefeatsCount: 1 },
    ).map((a) => a.id);

    expect(allLocked).toEqual(expectedOrder);
    expect(allUnlocked).toEqual(expectedOrder);
  });

  it("every achievement has non-empty title/description", () => {
    for (const achievement of resolvePlayerAchievements(ZERO_STATS, NO_REWARD)) {
      expect(achievement.title.length).toBeGreaterThan(0);
      expect(achievement.description.length).toBeGreaterThan(0);
    }
  });
});
