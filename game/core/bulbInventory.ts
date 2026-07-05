import { BULBS_CONFIG } from "./bulbsConfig";

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

/** Uloží novou hodnotu a vrátí ji zpátky — voláno na hranicích směny (viz app/play/page.tsx). */
export function setBulbsRemaining(count: number): number {
  if (typeof window === "undefined") return count;
  try {
    window.localStorage.setItem(BULBS_REMAINING_STORAGE_KEY, String(count));
    return count;
  } catch {
    return getBulbsRemaining();
  }
}
