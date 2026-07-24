import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleSurviveNightRequest } from "@/lib/leaderboard/guardRunRequestHandlers";
import { readGuardRunRequestBody } from "@/lib/leaderboard/requestGameMode";
import { corsPreflightResponse, isTrustedWriteOrigin, withCors } from "@/lib/http/cors";

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
 *
 * Tělo requestu je VOLITELNÉ `{ gameMode?: "normal" | "hardcore" }` (viz
 * lib/leaderboard/requestGameMode.ts) — klient ho posílá jen pro Hardcore
 * (Normal server API vůbec nevolá). Server zápis pro gameMode "normal"
 * odmítne (handleSurviveNightRequest) — server-side guard, ne jen frontend.
 *
 * Zapisuje stav (currentRun/bestRun) — CORS + origin check na zápis (viz
 * lib/http/cors.ts#isTrustedWriteOrigin).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withCors(request, async () => {
    if (!isTrustedWriteOrigin(request)) {
      return NextResponse.json({ ok: false, error: "untrusted_origin" }, { status: 403 });
    }
    const session = await getSession();
    const { gameMode, nightNumber } = await readGuardRunRequestBody(request);
    const { status, body } = await handleSurviveNightRequest(session, gameMode, nightNumber);
    return NextResponse.json(body, { status });
  });
}

export function OPTIONS(request: NextRequest): NextResponse {
  return corsPreflightResponse(request);
}
