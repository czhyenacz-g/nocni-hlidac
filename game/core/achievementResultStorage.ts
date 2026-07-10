import { ALL_PLAYER_ACHIEVEMENT_IDS, PlayerAchievementId } from "./playerAchievements";

// "Už jsem ho ukázal hráči jako nově odemčený" seznam (viz zadání "Napojit
// achievementy na výsledkové obrazovky") — NEŘÍKÁ, jestli je achievement
// skutečně odemčený (to pořád rozhoduje výhradně resolvePlayerAchievements,
// viz playerAchievements.ts/achievementResultUnlocks.ts). Čistě lokální
// localStorage, stejný "poškozený JSON/chybějící window nikdy nesmí shodit
// hru" vzor jako ostatní storage moduly (playerProfileStats.ts,
// achievementStorage.ts).
const SHOWN_RESULT_ACHIEVEMENTS_STORAGE_KEY = "nocni-hlidac:object13:shown-result-achievements";

export type ShownResultAchievementsState = {
  shownAchievementIds: PlayerAchievementId[];
};

const KNOWN_IDS = new Set<string>(ALL_PLAYER_ACHIEVEMENT_IDS);

/**
 * Whitelist + dedup + stabilní pořadí (podle ALL_PLAYER_ACHIEVEMENT_IDS, NE
 * podle pořadí v uloženém poli) — neznámé/poškozené hodnoty se tiše zahodí,
 * jeden zlý prvek nezahodí celý seznam.
 */
function sanitizeShownAchievementIds(value: unknown): PlayerAchievementId[] {
  if (!Array.isArray(value)) return [];
  const present = new Set(value.filter((id): id is string => typeof id === "string" && KNOWN_IDS.has(id)));
  return ALL_PLAYER_ACHIEVEMENT_IDS.filter((id) => present.has(id));
}

/** Bezpečné i mimo prohlížeč (SSR) nebo bez dostupného/poškozeného localStorage — vrátí prázdné pole, hra nespadne. */
export function getShownResultAchievementIds(): PlayerAchievementId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SHOWN_RESULT_ACHIEVEMENTS_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return [];
    return sanitizeShownAchievementIds((parsed as Record<string, unknown>).shownAchievementIds);
  } catch {
    return [];
  }
}

/**
 * Sloučí `ids` s tím, co už bylo uložené dřív, a uloží — volající (viz
 * app/play/page.tsx) tohle zavolá HNED PO zobrazení achievementů na
 * výsledkové obrazovce, ne dřív. Vrací výsledný sloučený seznam, ať volající
 * nemusí hned nato číst storage znovu.
 */
export function markResultAchievementsAsShown(ids: PlayerAchievementId[]): PlayerAchievementId[] {
  const merged = sanitizeShownAchievementIds([...getShownResultAchievementIds(), ...ids]);
  if (typeof window === "undefined") return merged;
  try {
    const state: ShownResultAchievementsState = { shownAchievementIds: merged };
    window.localStorage.setItem(SHOWN_RESULT_ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignoruj — i kdyby se nepovedlo zapsat, hra nesmí spadnout.
  }
  return merged;
}

/** Volat z /profile "Resetovat lokální profil" (viz ProfileScreen.tsx) — vyčistí jen tenhle klíč, nic jiného. */
export function resetShownResultAchievements(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SHOWN_RESULT_ACHIEVEMENTS_STORAGE_KEY);
  } catch {
    // Ignoruj — i kdyby se nepovedlo smazat, hra nesmí spadnout.
  }
}
