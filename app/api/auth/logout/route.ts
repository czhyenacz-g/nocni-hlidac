import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * Odhlášení (adaptováno z osmaliga.cz `app/api/auth/logout/route.ts`) — jen
 * smaže session cookie a přesměruje zpět na hlavní stránku. Žádné volání
 * Discord API (token se nikde neukládá, není co revokovat na dálku).
 * Vyvoláno přes obyčejný `<form method="POST">` v AuthStatus.tsx, ať funguje
 * i bez JS.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
