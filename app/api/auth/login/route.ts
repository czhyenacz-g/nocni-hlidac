import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE_NAME } from "@/lib/auth/session";

const CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? "";
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI ?? "";

/**
 * Zahájení Discord OAuth loginu (adaptováno z osmaliga.cz
 * `app/api/auth/login/route.ts`) — přesměruje na Discord authorize URL s
 * náhodným `state` (CSRF ochrana, ověřeno v callback/route.ts), scope jen
 * `identify` (jen username/avatar, žádný e-mail ani guild přístup).
 * Chybějící config = tichý no-op zpět na menu, ne pád aplikace.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!CLIENT_ID || !REDIRECT_URI) {
    return NextResponse.redirect(new URL("/?auth=config_error", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify",
    state,
  });

  const response = NextResponse.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });

  return response;
}
