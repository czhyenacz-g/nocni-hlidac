import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { clearAuthCookie } from "@/lib/auth/cookieConfig";
import { corsPreflightResponse, isTrustedWriteOrigin, withCors } from "@/lib/http/cors";

/**
 * Odhlášení (adaptováno z osmaliga.cz `app/api/auth/logout/route.ts`) — jen
 * smaže session cookie. Žádné volání Discord API (token se nikde neukládá,
 * není co revokovat na dálku).
 *
 * Dřív šlo o `<form method="POST">` + redirect (fungovalo i bez JS) — na
 * itch.io by cross-origin form POST navigoval CELÝ embed pryč z itch
 * kontextu, takže se logout teď volá jako fetch (`credentials: "include"`,
 * viz components/auth/AuthStatus.tsx) a vrací JSON, ne redirect. Celá hra
 * stejně vyžaduje JS (React), takže "funguje i bez JS" požadavek tu dál
 * nedává smysl.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withCors(request, () => {
    if (!isTrustedWriteOrigin(request)) {
      return NextResponse.json({ ok: false, error: "untrusted_origin" }, { status: 403 });
    }
    const response = NextResponse.json({ ok: true });
    clearAuthCookie(response, SESSION_COOKIE_NAME);
    return response;
  });
}

export function OPTIONS(request: NextRequest): NextResponse {
  return corsPreflightResponse(request);
}
