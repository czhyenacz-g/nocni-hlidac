import { hubGet } from "../hubClient";
import { GuardLeaderboardEntry } from "./types";

/**
 * GET /nocni-hlidac/leaderboard na VPS API (viz TECH_DESIGN.md "VPS API
 * specifikace") — `null`, pokud API není nakonfigurované nebo volání selže
 * (viz lib/hubClient.ts#hubGet), volající strana pak spadne na mock data.
 */
export async function fetchRemoteLeaderboard(): Promise<GuardLeaderboardEntry[] | null> {
  return hubGet<GuardLeaderboardEntry[]>("/nocni-hlidac/leaderboard");
}
