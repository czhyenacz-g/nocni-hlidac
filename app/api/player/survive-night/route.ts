import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleSurviveNightRequest } from "@/lib/leaderboard/guardRunRequestHandlers";

/**
 * Voláno best-effort z app/play/page.tsx při přechodu na screen "win"
 * (přežitá směna). Identitu bere VÝHRADNĚ ze server-side session
 * (getSession()) — klient nikdy neposílá discordUserId. Nepřihlášený hráč
 * dostane 401 (klient to ignoruje, viz app/play/page.tsx). Selhání/chybějící
 * config VPS API vrátí 202 (accepted, ale nezapsáno) — nikdy nerozbije hru.
 */
export async function POST(): Promise<NextResponse> {
  const session = await getSession();
  const { status, body } = await handleSurviveNightRequest(session);
  return NextResponse.json(body, { status });
}
