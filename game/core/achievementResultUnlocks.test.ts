import { describe, expect, it } from "vitest";
import { resolveAchievementResultUnlocks } from "./achievementResultUnlocks";
import { PlayerAchievementId } from "./playerAchievements";
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

function ids(achievements: { id: PlayerAchievementId }[]): PlayerAchievementId[] {
  return achievements.map((a) => a.id);
}

describe("resolveAchievementResultUnlocks", () => {
  it("returns nothing when nothing newly unlocked (stats/reward unchanged)", () => {
    const result = resolveAchievementResultUnlocks({
      previousStats: ZERO_STATS,
      previousReward: NO_REWARD,
      nextStats: ZERO_STATS,
      nextReward: NO_REWARD,
      alreadyShownAchievementIds: [],
    });
    expect(result.newlyUnlocked).toEqual([]);
    expect(result.nextShownAchievementIds).toEqual([]);
  });

  it("returns an achievement that was locked before and is unlocked after", () => {
    const result = resolveAchievementResultUnlocks({
      previousStats: ZERO_STATS,
      previousReward: NO_REWARD,
      nextStats: { ...ZERO_STATS, totalRunsStarted: 1 },
      nextReward: NO_REWARD,
      alreadyShownAchievementIds: [],
    });
    expect(ids(result.newlyUnlocked)).toEqual(["first_shift"]);
    expect(result.nextShownAchievementIds).toContain("first_shift");
  });

  it("does not return an achievement that was already unlocked before", () => {
    const alreadyUnlockedStats: PlayerProfileStats = { ...ZERO_STATS, totalRunsStarted: 1 };
    const result = resolveAchievementResultUnlocks({
      previousStats: alreadyUnlockedStats,
      previousReward: NO_REWARD,
      nextStats: { ...alreadyUnlockedStats, totalRunsStarted: 2 },
      nextReward: NO_REWARD,
      alreadyShownAchievementIds: [],
    });
    expect(ids(result.newlyUnlocked)).not.toContain("first_shift");
  });

  it("does not return an achievement that is already in alreadyShownAchievementIds", () => {
    const result = resolveAchievementResultUnlocks({
      previousStats: ZERO_STATS,
      previousReward: NO_REWARD,
      nextStats: { ...ZERO_STATS, totalRunsStarted: 1 },
      nextReward: NO_REWARD,
      alreadyShownAchievementIds: ["first_shift"],
    });
    expect(result.newlyUnlocked).toEqual([]);
    expect(result.nextShownAchievementIds).toEqual(["first_shift"]);
  });

  it("returns multiple achievements in stable order (matching resolvePlayerAchievements)", () => {
    const result = resolveAchievementResultUnlocks({
      previousStats: ZERO_STATS,
      previousReward: NO_REWARD,
      nextStats: { ...ZERO_STATS, totalRunsStarted: 1, totalDeaths: 1, expeditionsStarted: 1 },
      nextReward: NO_REWARD,
      alreadyShownAchievementIds: [],
    });
    expect(ids(result.newlyUnlocked)).toEqual(["first_shift", "first_death", "first_expedition"]);
  });

  it("nextShownAchievementIds is the union of previously shown + newly unlocked, without duplicates", () => {
    const result = resolveAchievementResultUnlocks({
      previousStats: ZERO_STATS,
      previousReward: NO_REWARD,
      nextStats: { ...ZERO_STATS, totalRunsStarted: 1 },
      nextReward: NO_REWARD,
      alreadyShownAchievementIds: ["first_death", "not_a_rookie_anymore"],
    });
    expect(result.nextShownAchievementIds).toEqual(["first_death", "not_a_rookie_anymore", "first_shift"]);
    // No duplicate of an id already present.
    const result2 = resolveAchievementResultUnlocks({
      previousStats: ZERO_STATS,
      previousReward: NO_REWARD,
      nextStats: { ...ZERO_STATS, totalDeaths: 1 },
      nextReward: NO_REWARD,
      alreadyShownAchievementIds: ["first_death"],
    });
    expect(result2.nextShownAchievementIds).toEqual(["first_death"]);
  });

  it('"Setkání s Hynkem" (hynek_encounter) unlocks when hardcoreDeathsByNight["1"] goes from 0 to 1', () => {
    const result = resolveAchievementResultUnlocks({
      previousStats: { ...ZERO_STATS, hardcoreDeathsByNight: {} },
      previousReward: NO_REWARD,
      nextStats: { ...ZERO_STATS, hardcoreDeathsByNight: { "1": 1 } },
      nextReward: NO_REWARD,
      alreadyShownAchievementIds: [],
    });
    expect(ids(result.newlyUnlocked)).toContain("hynek_encounter");
  });

  it('"Lovec bestií" (monster_slayer) unlocks when monsterKills goes from 1 to 2', () => {
    const result = resolveAchievementResultUnlocks({
      previousStats: { ...ZERO_STATS, monsterKills: 1 },
      previousReward: NO_REWARD,
      nextStats: { ...ZERO_STATS, monsterKills: 2 },
      nextReward: NO_REWARD,
      alreadyShownAchievementIds: [],
    });
    expect(ids(result.newlyUnlocked)).toContain("monster_slayer");
  });

  it('"Tvoje první výplata" (hardcore_night_30) unlocks when hardcoreBestNight goes from 29 to 30', () => {
    const result = resolveAchievementResultUnlocks({
      previousStats: { ...ZERO_STATS, hardcoreBestNight: 29 },
      previousReward: NO_REWARD,
      nextStats: { ...ZERO_STATS, hardcoreBestNight: 30 },
      nextReward: NO_REWARD,
      alreadyShownAchievementIds: [],
    });
    expect(ids(result.newlyUnlocked)).toContain("hardcore_night_30");
  });
});
