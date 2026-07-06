import { GuardLeaderboardEntry } from "./types";

/**
 * Statická mock data pro první verzi /leaderboard — žádná DB, žádné API
 * volání zatím neexistuje (viz TECH_DESIGN.md "Žebříček hlídačů"). Seřazeno
 * sestupně podle `bestRun`, stejně jak by to vracelo skutečné API.
 */
const MOCK_LEADERBOARD: GuardLeaderboardEntry[] = [
  { guardName: "czhyenacz", bestRun: 9, currentRun: 6 },
  { guardName: "Hlídač #13", bestRun: 7, currentRun: 3 },
  { guardName: "Strážný Novák", bestRun: 5, currentRun: 2 },
  { guardName: "NočníPepa", bestRun: 4, currentRun: 4 },
  { guardName: "Zaměstnanec 042", bestRun: 3, currentRun: 1 },
  { guardName: "Kandidát směny", bestRun: 2, currentRun: 2 },
  { guardName: "Hlídač #07", bestRun: 2, currentRun: 1 },
  { guardName: "Bezpečnostní technik B.", bestRun: 1, currentRun: 1 },
  { guardName: "Vrátný Dvořák", bestRun: 1, currentRun: 1 },
  { guardName: "Nový zaměstnanec (zkušební doba)", bestRun: 0, currentRun: 0 },
];

/**
 * Jediné místo, které `app/leaderboard/page.tsx` volá — signatura je záměrně
 * `Promise`, i když teď žádné I/O neprobíhá, ať pozdější náhrada za skutečné
 * API (fetch/DB dotaz) nevyžaduje změnu volajícího kódu, jen implementace
 * tady uvnitř.
 */
export async function getLeaderboardEntries(): Promise<GuardLeaderboardEntry[]> {
  return MOCK_LEADERBOARD;
}
