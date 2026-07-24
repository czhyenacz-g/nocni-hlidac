import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleAddBulbInventoryRequest } from "@/lib/playerProfile/playerProfileRequestHandlers";
import { corsPreflightResponse, isTrustedWriteOrigin, withCors } from "@/lib/http/cors";

/**
 * Doménová operace, NIKDY obecný PUT /api/player/profile pro herní logiku
 * (viz zadání "krok: profilový kontrakt V1 + inventář žárovek", "5. Serverové
 * doménové operace pro žárovky"). Tělo requestu je `{ amount, expectedRevision }`
 * — bez `discordUserId`, stejný princip jako obecný PUT (jde výhradně ze
 * session).
 *
 * Zapisuje stav (revision bump) — CORS + origin check na zápis (viz
 * lib/http/cors.ts#isTrustedWriteOrigin).
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
    const { status, body } = await handleAddBulbInventoryRequest(session, rawBody);
    return NextResponse.json(body, { status });
  });
}

export function OPTIONS(request: NextRequest): NextResponse {
  return corsPreflightResponse(request);
}
