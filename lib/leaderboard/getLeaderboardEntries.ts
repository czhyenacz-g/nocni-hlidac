import { fetchRemoteLeaderboard } from "./remoteLeaderboard";
import { getMockLeaderboardEntries } from "./mockLeaderboard";
import { sortLeaderboardEntries } from "./sortLeaderboardEntries";
import { GuardLeaderboardEntry } from "./types";

/**
 * Jediné místo, které `app/leaderboard/page.tsx` (a `app/api/leaderboard/route.ts`)
 * volá — signatura zůstává beze změny od mock-only verze. Zkusí VPS API,
 * a když není nakonfigurované nebo selže, spadne na statická mock data —
 * hra/stránka funguje v obou případech beze změny chování pro volajícího.
 */
export async function getLeaderboardEntries(): Promise<GuardLeaderboardEntry[]> {
  const remote = await fetchRemoteLeaderboard();
  const entries = remote ?? (await getMockLeaderboardEntries());
  return sortLeaderboardEntries(entries);
}
