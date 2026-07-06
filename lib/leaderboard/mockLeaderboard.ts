import { GuardLeaderboardEntry } from "./types";

/**
 * Statická mock data — fallback, když soukromé VPS API není nakonfigurované
 * nebo selže (viz lib/leaderboard/getLeaderboardEntries.ts). Pořadí v poli
 * nemusí být přesné, `sortLeaderboardEntries` ho stejně přepočítá.
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

export async function getMockLeaderboardEntries(): Promise<GuardLeaderboardEntry[]> {
  return MOCK_LEADERBOARD;
}
