import { MonsterDefeatReward } from "./monsterDefeatReward";
import { PlayerAchievement, PlayerAchievementId, resolvePlayerAchievements } from "./playerAchievements";
import { PlayerProfileStats } from "./playerProfileStats";
import type { Language } from "../i18n/language";

// Unlock engine pro výsledkové obrazovky (viz zadání "Napojit achievementy
// na výsledkové obrazovky") — NENÍ druhý resolver. `resolvePlayerAchievements`
// (playerAchievements.ts) zůstává jediný zdroj pravdy pro "je tenhle
// achievement odemčený", tenhle soubor jen porovná dva jeho výstupy (před/po
// herní události) a řekne, které achievementy PRÁVĚ TEĎ přešly z locked na
// unlocked A ještě nebyly zobrazené. Čistá funkce — žádný localStorage,
// žádné UI, žádné audio (viz volající, app/play/page.tsx a
// game/core/achievementResultStorage.ts).

export type AchievementResultUnlockInput = {
  previousStats: PlayerProfileStats;
  previousReward: MonsterDefeatReward;
  nextStats: PlayerProfileStats;
  nextReward: MonsterDefeatReward;
  alreadyShownAchievementIds: PlayerAchievementId[];
  language?: Language;
};

export type AchievementResultUnlockResult = {
  newlyUnlocked: PlayerAchievement[];
  nextShownAchievementIds: PlayerAchievementId[];
};

/**
 * `newlyUnlocked` = achievementy, které byly `unlocked: false` v
 * `resolvePlayerAchievements(previousStats, previousReward)` A jsou
 * `unlocked: true` v `resolvePlayerAchievements(nextStats, nextReward)` A
 * jejich `id` ještě není v `alreadyShownAchievementIds` — vyřazuje tedy jak
 * achievementy odemčené už dřív (typicky achievementy získané v minulé
 * relaci, které `previousStats`/`nextStats` obě vidí jako unlocked), tak
 * achievementy, které sice právě přešly, ale volající je z nějakého důvodu
 * už jednou zobrazil (obranné zdvojení, viz game/core/achievementResultStorage.ts).
 * Pořadí `newlyUnlocked` je stejné jako pořadí v `resolvePlayerAchievements`
 * (stabilní, viz playerAchievements.ts) — filtruje se, netřídí.
 *
 * `nextShownAchievementIds` = `alreadyShownAchievementIds` + id nově
 * odemčených, bez duplicit — volající (viz app/play/page.tsx) tohle pošle
 * do `markResultAchievementsAsShown`, jakmile achievementy skutečně zobrazí.
 */
export function resolveAchievementResultUnlocks(input: AchievementResultUnlockInput): AchievementResultUnlockResult {
  const previous = resolvePlayerAchievements(input.previousStats, input.previousReward, input.language);
  const next = resolvePlayerAchievements(input.nextStats, input.nextReward, input.language);

  const previousUnlockedIds = new Set(previous.filter((achievement) => achievement.unlocked).map((achievement) => achievement.id));
  const alreadyShownIds = new Set(input.alreadyShownAchievementIds);

  const newlyUnlocked = next.filter(
    (achievement) => achievement.unlocked && !previousUnlockedIds.has(achievement.id) && !alreadyShownIds.has(achievement.id),
  );

  const nextShownAchievementIds = [...input.alreadyShownAchievementIds, ...newlyUnlocked.map((achievement) => achievement.id)];

  return { newlyUnlocked, nextShownAchievementIds };
}
