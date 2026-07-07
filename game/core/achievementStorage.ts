import { AchievementId } from "@/content/achievements";

// Lokální localStorage seznam odemčených achievementů (viz
// content/achievements.ts, components/game/AchievementToast.tsx) — čistě
// vizuální vrstva, žádný backend/login/databáze, neovlivňuje death/near-miss/
// cinematic/gameplay ani server currentRun. Jeden JSON pole ID, ne
// per-achievement klíč, ať je snadné později přidat další achievementy beze
// změny tvaru úložiště.
const ACHIEVEMENTS_STORAGE_KEY = "nocni-hlidac:achievements";

/** Bezpečné i mimo prohlížeč (SSR) nebo bez dostupného/poškozeného localStorage — vrátí prázdné pole, hra nespadne. */
function readUnlockedIds(): AchievementId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AchievementId[]) : [];
  } catch {
    return [];
  }
}

export function hasUnlockedAchievement(id: AchievementId): boolean {
  return readUnlockedIds().includes(id);
}

/**
 * Odemkne achievement, pokud ještě nebyl — vrací `true` jen když ho odemkl
 * PRÁVĚ TEĎ (poprvé), `false` pokud už byl odemčený dřív nebo localStorage
 * není dostupné/zapisovatelné. Volající (viz app/play/page.tsx) podle
 * návratové hodnoty rozhodne, jestli zobrazit toast — nikdy neduplikuje
 * stejný achievement v uloženém seznamu.
 */
export function unlockAchievement(id: AchievementId): boolean {
  if (typeof window === "undefined") return false;
  try {
    const unlocked = readUnlockedIds();
    if (unlocked.includes(id)) return false;
    unlocked.push(id);
    window.localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(unlocked));
    return true;
  } catch {
    return false;
  }
}
