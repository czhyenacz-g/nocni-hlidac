import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleSurviveNightRequest } from "@/lib/leaderboard/guardRunRequestHandlers";

/**
 * Voláno best-effort z app/play/page.tsx při přechodu na screen "win"
 * (přežitá směna). Identitu bere VÝHRADNĚ ze server-side session
 * (getSession()) — klient nikdy neposílá discordUserId. Nepřihlášený hráč
 * dostane 401 (klient to ignoruje, viz app/play/page.tsx). Před samotným
 * survive-night voláním se hráč nejdřív self-healing upsertne
 * (`ensureHubPlayer`, viz guardRunRequestHandlers.ts) — řeší i staré session
 * cookie z doby před VPS wiringem. Selhání/chybějící config VPS API vrátí
 * 202 `{ ok: false, stored: false }` — nikdy nerozbije hru. Úspěch: 200
 * `{ ok: true, stored: true, player: GuardRunState }`.
 */
export async function POST(): Promise<NextResponse> {
  const session = await getSession();
  const { status, body } = await handleSurviveNightRequest(session);
  return NextResponse.json(body, { status });
}
