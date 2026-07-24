import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleGetHardcoreProfileRequest } from "@/lib/hardcoreProfile/hardcoreProfileRequestHandlers";
import { corsPreflightResponse, withCors } from "@/lib/http/cors";

/**
 * Voláno z /profile (ProfileScreen.tsx) pro přihlášeného hráče — vrací
 * serverový Hardcore profil (viz zadání "serverové ukládání profilu
 * hlídače jen pro Hardcore"). Identitu bere VÝHRADNĚ ze server-side session
 * (getSession()), nikdy z query/body. Nepřihlášený hráč dostane 401 —
 * ProfileScreen.tsx v tom případě rovnou zůstane u lokálního profilu, ani
 * se o tenhle endpoint nepokusí (viz zadání "nepřihlášený hráč viděl
 * lokální profil jako dnes").
 *
 * Read-only — jen CORS, žádný origin-check pro zápis.
 *
 * Žádný Normal ekvivalent tohohle endpointu neexistuje (viz zadání
 * "Nevytvářej endpoint pro Normal profil") — Hardcore profil je jediný
 * serverově ukládaný profil v celé appce.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return withCors(request, async () => {
    const session = await getSession();
    const { status, body } = await handleGetHardcoreProfileRequest(session);
    return NextResponse.json(body, { status });
  });
}

export function OPTIONS(request: NextRequest): NextResponse {
  return corsPreflightResponse(request);
}
