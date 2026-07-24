import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE_NAME, OAUTH_STATE_MAX_AGE, OAUTH_TARGET_COOKIE_NAME } from "@/lib/auth/session";
import { getAuthCookieOptions } from "@/lib/auth/cookieConfig";
import { resolveAuthReturnTarget } from "@/lib/auth/returnTargets";

const CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? "";
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI ?? "";

/**
 * Zahájení Discord OAuth loginu (adaptováno z osmaliga.cz
 * `app/api/auth/login/route.ts`) — přesměruje na Discord authorize URL s
 * náhodným `state` (CSRF ochrana, ověřeno v callback/route.ts), scope jen
 * `identify` (jen username/avatar, žádný e-mail ani guild přístup).
 * Chybějící config = tichý no-op zpět na menu, ne pád aplikace.
 *
 * `?target=web|itch` (viz lib/auth/returnTargets.ts, zadání "6. Popup OAuth
 * flow") — volitelný query param z přihlašovacího odkazu/popupu, whitelisted
 * na přesně dvě hodnoty (cokoliv jiného padá na "web"). Uloží se do vlastní
 * krátkodobé httpOnly cookie (ne do `state`), ať callback/route.ts ví, jestli
 * má po dokončení OAuth udělat obyčejný redirect, nebo vykreslit popup
 * close stránku — beze změny/oslabení CSRF `state` porovnání.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!CLIENT_ID || !REDIRECT_URI) {
    return NextResponse.redirect(new URL("/?auth=config_error", request.url));
  }

  const target = resolveAuthReturnTarget(request.nextUrl.searchParams.get("target"));

  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify",
    state,
  });

  const response = NextResponse.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  const cookieOptions = getAuthCookieOptions(OAUTH_STATE_MAX_AGE);
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, cookieOptions);
  response.cookies.set(OAUTH_TARGET_COOKIE_NAME, target, cookieOptions);

  return response;
}
