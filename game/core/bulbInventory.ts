import { BULBS_CONFIG } from "./bulbsConfig";
import { Object13PlayerProfileLoadState } from "./object13PlayerProfile";
import { getInventoryItemQuantity } from "./object13PlayerProfileInventory";

// Počet náhradních žárovek — čistě lokální localStorage counter (stejný vzor
// jako deathCount.ts/survivedNights.ts), žádný backend/login/databáze.
// Na rozdíl od survivedNights (ten se smrtí vynuluje) je tohle "campaign"
// hodnota: přenáší se mezi dny/nocemi/smrtí beze změny, dokud ji buď denní
// servis (viz roomBulbs.ts#applyDailyBulbService), nebo dokončená ruční
// výměna (viz gameReducer.ts#updateBulbReplacement) nesníží. Za běhu směny
// žije jako GameState.bulbsRemaining — tyhle dvě funkce jen čtou/zapisují
// persistovanou hodnotu na hranicích směny (app/play/page.tsx). Nová
// kampaň = žádný uložený záznam ještě neexistuje -> BULBS_CONFIG.startingCount.
const BULBS_REMAINING_STORAGE_KEY = "nocni-hlidac:object13:bulbs-remaining";

/** Bezpečné i mimo prohlížeč (SSR) nebo bez dostupného localStorage — vrátí výchozí počet, hra nespadne. */
export function getBulbsRemaining(): number {
  if (typeof window === "undefined") return BULBS_CONFIG.startingCount;
  try {
    const raw = window.localStorage.getItem(BULBS_REMAINING_STORAGE_KEY);
    if (raw === null) return BULBS_CONFIG.startingCount;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : BULBS_CONFIG.startingCount;
  } catch {
    return BULBS_CONFIG.startingCount;
  }
}

/** Uloží novou hodnotu a vrátí ji zpátky — voláno na hranicích směny (viz app/play/page.tsx). Jen pro anonymního hráče (viz resolveStartingBulbsRemaining níže) — přihlášený hráč s ready profilem má localStorage irelevantní. */
export function setBulbsRemaining(count: number): number {
  if (typeof window === "undefined") return count;
  try {
    window.localStorage.setItem(BULBS_REMAINING_STORAGE_KEY, String(count));
    return count;
  } catch {
    return getBulbsRemaining();
  }
}

/**
 * Zdroj počtu náhradních žárovek při startu směny (viz zadání "profilový
 * kontrakt V1 + inventář žárovek", "11. Přesun žárovek z localStorage", "12.
 * GameState a inicializace"). Přihlášený hráč s `ready` profilem: VPS je
 * AUTORITATIVNÍ, localStorage se NEPOUŽIJE jako fallback (viz zadání
 * "localStorage počet žárovek se nepoužije jako fallback, pokud VPS profil
 * je ready"). Cokoliv jiné — anonymní hráč (`unauthorized`), profil se ještě
 * načítá (`idle`/`loading`), nebo VPS nedostupné (`unavailable`) — čte
 * lokální `getBulbsRemaining()`: hra zůstává hratelná v lokálním fallback
 * režimu, ale změny se odsud nikdy automaticky nepropíšou zpátky na server
 * (žádný merge, viz zadání).
 */
export function resolveStartingBulbsRemaining(loadState: Object13PlayerProfileLoadState): number {
  if (loadState.status === "ready") {
    return getInventoryItemQuantity(loadState.profile.profileData, "bulb");
  }
  return getBulbsRemaining();
}
