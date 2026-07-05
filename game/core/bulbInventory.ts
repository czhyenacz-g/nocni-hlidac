import { BULBS_CONFIG } from "./bulbsConfig";

// Počet náhradních žárovek — čistě lokální localStorage counter (stejný vzor
// jako deathCount.ts/survivedNights.ts), žádný backend/login/databáze.
// Na rozdíl od survivedNights (ten se smrtí vynuluje) je tohle "campaign"
// hodnota: přenáší se mezi dny/nocemi beze změny, dokud ji nějaké budoucí
// pravidlo výslovně nesníží (v tomhle kroku se nikde nesnižuje). Nová
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

/**
 * Uloží novou hodnotu a vrátí ji zpátky. Zatím nikde ve hře nevolané (žádné
 * pravidlo počet zatím nesnižuje) — připraveno pro budoucí spotřebu žárovek.
 */
export function setBulbsRemaining(count: number): number {
  if (typeof window === "undefined") return count;
  try {
    window.localStorage.setItem(BULBS_REMAINING_STORAGE_KEY, String(count));
    return count;
  } catch {
    return getBulbsRemaining();
  }
}
