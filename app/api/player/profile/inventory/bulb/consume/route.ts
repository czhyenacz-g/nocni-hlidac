import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { handleConsumeBulbInventoryRequest } from "@/lib/playerProfile/playerProfileRequestHandlers";
import { corsPreflightResponse, isTrustedWriteOrigin, withCors } from "@/lib/http/cors";

/**
 * Viz app/api/player/profile/inventory/bulb/add/route.ts — stejný princip,
 * opačný směr. Zapisuje stav (revision bump) — CORS + origin check na
 * zápis (viz lib/http/cors.ts#isTrustedWriteOrigin).
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
    const { status, body } = await handleConsumeBulbInventoryRequest(session, rawBody);
    return NextResponse.json(body, { status });
  });
}

export function OPTIONS(request: NextRequest): NextResponse {
  return corsPreflightResponse(request);
}
