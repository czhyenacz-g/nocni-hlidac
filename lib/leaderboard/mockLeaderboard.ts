import { GuardLeaderboardEntry } from "./types";

/**
 * Statická mock data pro první verzi /leaderboard — žádná DB, žádné API
 * volání zatím neexistuje (viz TECH_DESIGN.md "Žebříček hlídačů"). Seřazeno
 * sestupně podle `survivedNights`, stejně jak by to vracelo skutečné API.
 */
const MOCK_LEADERBOARD: GuardLeaderboardEntry[] = [
  { guardName: "czhyenacz", survivedNights: 52, endReason: "incident neuzavřen", recordedAt: "2026-06-30" },
  { guardName: "Hlídač #13", survivedNights: 34, endReason: "blackout", recordedAt: "2026-05-18" },
  { guardName: "Strážný Novák", survivedNights: 27, endReason: "otevřené dveře", recordedAt: "2026-04-02" },
  {
    guardName: "NočníPepa",
    survivedNights: 21,
    endReason: "poslední poloha: door_hallway",
    recordedAt: "2026-06-11",
  },
  {
    guardName: "Zaměstnanec 042",
    survivedNights: 16,
    endReason: "pozdní kontrola generátoru",
    recordedAt: "2026-03-27",
  },
  { guardName: "Kandidát směny", survivedNights: 11, endReason: "výměna žárovky", recordedAt: "2026-06-25" },
  { guardName: "Hlídač #07", survivedNights: 8, endReason: "otevřené dveře", recordedAt: "2026-02-14" },
  { guardName: "Bezpečnostní technik B.", survivedNights: 5, endReason: "blackout", recordedAt: "2026-05-03" },
  {
    guardName: "Vrátný Dvořák",
    survivedNights: 3,
    endReason: "poslední poloha: door_hallway",
    recordedAt: "2026-01-09",
  },
  {
    guardName: "Nový zaměstnanec (zkušební doba)",
    survivedNights: 1,
    endReason: "incident neuzavřen",
    recordedAt: "2026-06-02",
  },
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
