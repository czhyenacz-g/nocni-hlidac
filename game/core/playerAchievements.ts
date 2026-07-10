import { MonsterDefeatReward } from "./monsterDefeatReward";
import { PlayerProfileStats } from "./playerProfileStats";

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
  title: string;
  description: string;
  isUnlocked: (stats: PlayerProfileStats, reward: MonsterDefeatReward) => boolean;
}

// Pořadí tady URČUJE zobrazené pořadí (viz zadání "všechny achievementy se
// vrací ve stabilním pořadí") — resolvePlayerAchievements jen mapuje tohle
// pole 1:1, žádné třídění podle unlocked/id/cokoliv jiného.
const PLAYER_ACHIEVEMENT_DEFINITIONS: PlayerAchievementDefinition[] = [
  {
    id: "first_shift",
    title: "První směna",
    description: "Nastoupil jsi na první noční službu.",
    isUnlocked: (stats) => stats.totalRunsStarted >= 1,
  },
  {
    id: "first_death",
    title: "První konec služby",
    description: "Objekt 13 ti ukázal, že tohle nebude obyčejná práce.",
    isUnlocked: (stats) => stats.totalDeaths >= 1,
  },
  {
    id: "hynek_encounter",
    title: "Setkání s Hynkem",
    description: "Zemřel jsi hned první noc.",
    // Hardcore-based (viz zadání) — čte se z hardcoreDeathsByNight, které
    // zapisuje VÝHRADNĚ playerProfileStats.ts#recordHardcoreDeathOnNight
    // (jen pro gameMode "hardcore", viz app/play/page.tsx). Normal smrt v
    // první noci ho proto nikdy neodemkne — to řeší jednorázový toast
    // "meet_hynek" (content/achievements.ts), jiný, nezávislý systém.
    isUnlocked: (stats) => Number(stats.hardcoreDeathsByNight["1"] ?? 0) >= 1,
  },
  {
    id: "first_expedition",
    title: "Ven z kanceláře",
    description: "Poprvé jsi opustil bezpečí kanceláře.",
    isUnlocked: (stats) => stats.expeditionsStarted >= 1,
  },
  {
    id: "first_bulb_replaced",
    title: "Náhradní žárovka",
    description: "Poprvé jsi vyměnil prasklou žárovku.",
    isUnlocked: (stats) => stats.bulbsReplaced >= 1,
  },
  {
    id: "first_generator_restart",
    title: "Nahodit a modlit se",
    description: "Poprvé jsi restartoval generátor.",
    isUnlocked: (stats) => stats.generatorsRestarted >= 1,
  },
  {
    id: "first_monster_hit",
    title: "První krev",
    description: "Poprvé jsi potvrdil zásah bestie.",
    isUnlocked: (stats) => stats.monsterHitsConfirmed >= 1,
  },
  {
    id: "not_a_rookie_anymore",
    title: "Už nejsi ucho",
    description: "Porazil jsi bestii poprvé.",
    isUnlocked: (_stats, reward) => reward.hasDefeatedMonster === true,
  },
  {
    id: "golden_guard",
    // Přejmenováno (viz zadání "Nemigruj ID, mění se jen text") — ID
    // zůstává golden_guard beze změny, jen title.
    title: "Hlídač s dvouhlavňovkou",
    description: "Odemkl jsi dvouhlavňovou brokovnici.",
    isUnlocked: (_stats, reward) => reward.doubleBarrelUnlocked === true,
  },
  {
    id: "hardcore_night_5",
    title: "Tvrdá služba",
    description: "Dostal ses v Hardcore režimu alespoň k 5. noci.",
    isUnlocked: (stats) => stats.hardcoreBestNight >= 5,
  },
  {
    id: "hardcore_night_10",
    // Přejmenováno (viz zadání) — ID zůstává hardcore_night_10 beze změny.
    title: "Začni si zvykat",
    description: "Dostal ses v Hardcore režimu alespoň k 10. noci.",
    isUnlocked: (stats) => stats.hardcoreBestNight >= 10,
  },
  {
    id: "hardcore_night_20",
    title: "Běžná rutina",
    description: "Dostal ses v Hardcore režimu alespoň k 20. noci.",
    isUnlocked: (stats) => stats.hardcoreBestNight >= 20,
  },
  {
    id: "hardcore_night_30",
    title: "Tvoje první výplata",
    description: "Dostal ses v Hardcore režimu alespoň k 30. noci.",
    isUnlocked: (stats) => stats.hardcoreBestNight >= 30,
  },
  {
    id: "monster_slayer",
    title: "Lovec bestií",
    // Práh zvýšen na 2 (viz zadání "Důvod: první zabití už pokrývá
    // not_a_rookie_anymore") — první zabití odemyká "Už nejsi ucho", tenhle
    // achievement teď odměňuje až DRUHÉ.
    description: "Zabil jsi bestii podruhé.",
    isUnlocked: (stats) => stats.monsterKills >= 2,
  },
];

/**
 * Čistá funkce — žádný localStorage přístup tady, volající (app/profile/page.tsx)
 * si stats/reward přečte sám (getPlayerProfileStats/getMonsterDefeatReward) a
 * pošle sem jako hotová data. Vrací VŽDY všech 14 achievementů ve stejném
 * pevném pořadí (viz PLAYER_ACHIEVEMENT_DEFINITIONS výše), jen s `unlocked`
 * podle aktuálních stats/reward.
 */
export function resolvePlayerAchievements(stats: PlayerProfileStats, reward: MonsterDefeatReward): PlayerAchievement[] {
  return PLAYER_ACHIEVEMENT_DEFINITIONS.map((definition) => ({
    id: definition.id,
    title: definition.title,
    description: definition.description,
    unlocked: definition.isUnlocked(stats, reward),
  }));
}
