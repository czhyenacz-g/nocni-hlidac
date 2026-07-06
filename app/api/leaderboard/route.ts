import { NextResponse } from "next/server";
import { getLeaderboardEntries } from "@/lib/leaderboard/getLeaderboardEntries";

/**
 * Veřejný "kdo vede" endpoint — stejná data, která používá `/leaderboard`
 * stránka přímo (Server Component tam volá `getLeaderboardEntries()` bez
 * zajížďky přes HTTP). Tahle route existuje pro budoucí klientské
 * dotazování (např. periodické obnovení bez reloadu stránky), zatím ji
 * nikdo nevolá.
 */
export async function GET(): Promise<NextResponse> {
  const entries = await getLeaderboardEntries();
  return NextResponse.json(entries);
}
