import { MonsterDefeatReward } from "./monsterDefeatReward";
import { PlayerProfileStats } from "./playerProfileStats";
import type { Language } from "../i18n/language";
import { TRANSLATIONS } from "../i18n/translations";

// Statický seznam "checklist" achievementů pro profil hlídače (viz zadání,
// app/profile/page.tsx) — odvozený čistě z PlayerProfileStats/MonsterDefeatReward,
// žádný vlastní perzistovaný stav. NEZAMĚŇOVAT s existujícím momentálním
// toast systémem (content/achievements.ts, game/core/achievementStorage.ts,
// components/game/AchievementToast.tsx) — ten řeší jednorázová "právě jsi
// tohle odemkl" upozornění během hraní (např. "meet_hynek" first-night
// near-miss) a má vlastní localStorage seznam odemčených id. Tenhle modul je
// nezávislý, čistě pro zobrazení na profilové stránce.

export type PlayerAchievementId =
  | "first_shift"
  | "first_death"
  | "hynek_encounter"
  | "first_expedition"
  | "first_bulb_replaced"
  | "first_generator_restart"
  | "first_monster_hit"
  | "not_a_rookie_anymore"
  | "golden_guard"
  | "hardcore_night_5"
  | "hardcore_night_10"
  | "hardcore_night_20"
  | "hardcore_night_30"
  | "monster_slayer";

export type PlayerAchievement = {
  id: PlayerAchievementId;
  title: string;
  description: string;
  unlocked: boolean;
};

interface PlayerAchievementDefinition {
  id: PlayerAchievementId;
  /** title/description žijí v content/copy.ts#playerAchievements (klíč = id, viz i18n) — tady jen unlock logika. */
  isUnlocked: (stats: PlayerProfileStats, reward: MonsterDefeatReward) => boolean;
}

// Pořadí tady URČUJE zobrazené pořadí (viz zadání "všechny achievementy se
// vrací ve stabilním pořadí") — resolvePlayerAchievements jen mapuje tohle
// pole 1:1, žádné třídění podle unlocked/id/cokoliv jiného.
const PLAYER_ACHIEVEMENT_DEFINITIONS: PlayerAchievementDefinition[] = [
  { id: "first_shift", isUnlocked: (stats) => stats.totalRunsStarted >= 1 },
  { id: "first_death", isUnlocked: (stats) => stats.totalDeaths >= 1 },
  {
    id: "hynek_encounter",
    // Hardcore-based (viz zadání) — čte se z hardcoreDeathsByNight, které
    // zapisuje VÝHRADNĚ playerProfileStats.ts#recordHardcoreDeathOnNight
    // (jen pro gameMode "hardcore", viz app/play/page.tsx). Normal smrt v
    // první noci ho proto nikdy neodemkne — to řeší jednorázový toast
    // "meet_hynek" (content/achievements.ts), jiný, nezávislý systém.
    isUnlocked: (stats) => Number(stats.hardcoreDeathsByNight["1"] ?? 0) >= 1,
  },
  { id: "first_expedition", isUnlocked: (stats) => stats.expeditionsStarted >= 1 },
  { id: "first_bulb_replaced", isUnlocked: (stats) => stats.bulbsReplaced >= 1 },
  { id: "first_generator_restart", isUnlocked: (stats) => stats.generatorsRestarted >= 1 },
  { id: "first_monster_hit", isUnlocked: (stats) => stats.monsterHitsConfirmed >= 1 },
  { id: "not_a_rookie_anymore", isUnlocked: (_stats, reward) => reward.hasDefeatedMonster === true },
  { id: "golden_guard", isUnlocked: (_stats, reward) => reward.doubleBarrelUnlocked === true },
  { id: "hardcore_night_5", isUnlocked: (stats) => stats.hardcoreBestNight >= 5 },
  { id: "hardcore_night_10", isUnlocked: (stats) => stats.hardcoreBestNight >= 10 },
  { id: "hardcore_night_20", isUnlocked: (stats) => stats.hardcoreBestNight >= 20 },
  { id: "hardcore_night_30", isUnlocked: (stats) => stats.hardcoreBestNight >= 30 },
  {
    id: "monster_slayer",
    // Práh zvýšen na 2 (viz zadání "Důvod: první zabití už pokrývá
    // not_a_rookie_anymore") — první zabití odemyká "Už nejsi ucho", tenhle
    // achievement teď odměňuje až DRUHÉ.
    isUnlocked: (stats) => stats.monsterKills >= 2,
  },
];

/**
 * Nezbytný export navíc (viz zadání "Napojit achievementy na výsledkové
 * obrazovky" — "Neměň profilový resolver kromě nezbytných exportů/
 * helperů") — jen seznam ID ve stabilním pořadí, žádná nová logika.
 * `game/core/achievementResultStorage.ts` ho potřebuje k validaci/řazení
 * uložených "už zobrazeno" ID, ať tenhle soubor zůstává jediné místo, které
 * definuje množinu i pořadí achievementů.
 */
export const ALL_PLAYER_ACHIEVEMENT_IDS: PlayerAchievementId[] = PLAYER_ACHIEVEMENT_DEFINITIONS.map(
  (definition) => definition.id,
);

/**
 * Čistá funkce — žádný localStorage přístup tady, volající (app/profile/page.tsx)
 * si stats/reward přečte sám (getPlayerProfileStats/getMonsterDefeatReward) a
 * pošle sem jako hotová data. Vrací VŽDY všech 14 achievementů ve stejném
 * pevném pořadí (viz PLAYER_ACHIEVEMENT_DEFINITIONS výše), jen s `unlocked`
 * podle aktuálních stats/reward.
 */
export function resolvePlayerAchievements(
  stats: PlayerProfileStats,
  reward: MonsterDefeatReward,
  language: Language = "cs",
): PlayerAchievement[] {
  const texts = TRANSLATIONS[language].playerAchievements;
  return PLAYER_ACHIEVEMENT_DEFINITIONS.map((definition) => ({
    id: definition.id,
    title: texts[definition.id].title,
    description: texts[definition.id].description,
    unlocked: definition.isUnlocked(stats, reward),
  }));
}
