import { GuardLeaderboardEntry } from "./types";

/** Kolik hráčů se má na /leaderboard vůbec zobrazit — viz VPS API spec (GET /nocni-hlidac/leaderboard). */
export const LEADERBOARD_LIMIT = 10;

/**
 * Řazení `bestRun` sestupně, remízy `currentRun` sestupně, oříznuté na
 * `LEADERBOARD_LIMIT`. VPS API má řadit stejně na svojí straně (viz
 * TECH_DESIGN.md "VPS API specifikace"), tohle je defenzivní přepočet i pro
 * data z API — nespoléhá se naslepo, že vzdálená strana vždycky vrátí
 * správně seřazeno/oříznuto, mock data řadí stejnou funkcí.
 */
export function sortLeaderboardEntries(entries: GuardLeaderboardEntry[]): GuardLeaderboardEntry[] {
  return [...entries].sort((a, b) => b.bestRun - a.bestRun || b.currentRun - a.currentRun).slice(0, LEADERBOARD_LIMIT);
}
