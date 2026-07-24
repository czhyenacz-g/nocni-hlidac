import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleDeathRequest } from "@/lib/leaderboard/guardRunRequestHandlers";
import { readGuardRunRequestBody } from "@/lib/leaderboard/requestGameMode";
import { corsPreflightResponse, isTrustedWriteOrigin, withCors } from "@/lib/http/cors";

/**
 * Voláno best-effort z app/play/page.tsx při přechodu na screen "death".
 * Stejná pravidla jako survive-night/route.ts — identita jen ze session,
 * self-healing `ensureHubPlayer` před samotným death voláním, 401 pro
 * nepřihlášeného, 202 `{ ok: false, stored: false }` při nedostupném/
 * nenakonfigurovaném VPS API, 200 `{ ok: true, stored: true, player: ... }`
 * na úspěch.
 *
 * Tělo requestu je VOLITELNÉ `{ gameMode?: "normal" | "hardcore" }` (viz
 * lib/leaderboard/requestGameMode.ts) — klient (app/play/page.tsx) ho
 * posílá jen pro Hardcore (Normal server API vůbec nevolá, viz zadání).
 * Server zápis pro gameMode "normal" odmítne (handleDeathRequest), server-side
 * guard tedy NENÍ jen schovaný ve frontendu.
 *
 * Zapisuje stav (currentRun reset) — CORS + origin check na zápis (viz
 * lib/http/cors.ts#isTrustedWriteOrigin, zadání "10. CSRF a bezpečnost
 * zápisových endpointů").
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withCors(request, async () => {
    if (!isTrustedWriteOrigin(request)) {
      return NextResponse.json({ ok: false, error: "untrusted_origin" }, { status: 403 });
    }
    const session = await getSession();
    const { gameMode, nightNumber } = await readGuardRunRequestBody(request);
    const { status, body } = await handleDeathRequest(session, gameMode, nightNumber);
    return NextResponse.json(body, { status });
  });
}

export function OPTIONS(request: NextRequest): NextResponse {
  return corsPreflightResponse(request);
}
