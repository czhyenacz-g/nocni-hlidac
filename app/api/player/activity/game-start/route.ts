import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleGameStartRequest } from "@/lib/activity/activityRequestHandlers";
import { corsPreflightResponse, isTrustedWriteOrigin, withCors } from "@/lib/http/cors";

/**
 * Voláno jednou při skutečném zahájení hry (viz zadání "5. Volání při
 * spuštění hry", `app/play/page.tsx`) — ne při každém renderu. Identita jen
 * ze session (stejný princip jako ostatní `/api/player/*` endpointy),
 * `client`/`buildVersion` v těle requestu jsou čistě diagnostické (viz
 * lib/activity/activityClient.ts), nedávají žádná oprávnění.
 *
 * Zapisuje stav (last_played_at/last_activity_at/last_client/
 * last_build_version + `game_started` event) — CORS + origin check na zápis
 * (viz lib/http/cors.ts#isTrustedWriteOrigin), stejný vzor jako
 * death/survive-night/profile endpointy.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withCors(request, async () => {
    if (!isTrustedWriteOrigin(request)) {
      return NextResponse.json({ ok: false, error: "untrusted_origin" }, { status: 403 });
    }
    const session = await getSession();
    let rawBody: unknown = null;
    try {
      rawBody = await request.json();
    } catch {
      rawBody = null;
    }
    const { status, body } = await handleGameStartRequest(session, rawBody);
    return NextResponse.json(body, { status });
  });
}

export function OPTIONS(request: NextRequest): NextResponse {
  return corsPreflightResponse(request);
}
