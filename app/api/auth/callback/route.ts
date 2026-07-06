import { NextRequest, NextResponse } from "next/server";
import { encodeSession, OAUTH_STATE_COOKIE_NAME, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth/session";
import { DiscordPlayer } from "@/lib/auth/types";
import { ensureHubPlayer } from "@/lib/leaderboard/ensureHubPlayer";

const CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI ?? "";

interface DiscordProfile {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
}

/**
 * Discord OAuth callback (adaptováno z osmaliga.cz
 * `app/api/auth/callback/route.ts`) — ověří `state` proti httpOnly cookie ze
 * login/route.ts, vymění `code` za access token, načte Discord profil a
 * uloží jen minimum (`DiscordPlayer`) do podepsané session cookie. Identita
 * hráče žije primárně v týhle cookie (žádná DB tabulka `players` v tomhle
 * repozitáři neexistuje) — `upsertHubPlayer` níže jen best-effort pošle
 * profil na VPS API, stejně jako osmaliga.cz posílá "discord-upsert" do
 * project-hub-api: selhání/nedostupnost VPS API nesmí přihlášení rozbít.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return NextResponse.redirect(new URL("/?auth=config_error", request.url));
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/?auth=error", request.url));
  }

  let accessToken: string;
  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Discord token error: ${tokenRes.status}`);
    const data = (await tokenRes.json()) as { access_token: string };
    accessToken = data.access_token;
  } catch {
    return NextResponse.redirect(new URL("/?auth=error", request.url));
  }

  let profile: DiscordProfile;
  try {
    const profileRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) throw new Error(`Discord profile error: ${profileRes.status}`);
    profile = (await profileRes.json()) as DiscordProfile;
  } catch {
    return NextResponse.redirect(new URL("/?auth=error", request.url));
  }

  const player: DiscordPlayer = {
    discordUserId: profile.id,
    username: profile.username,
    ...(profile.global_name ? { displayName: profile.global_name } : {}),
    ...(profile.avatar
      ? { avatarUrl: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=64` }
      : {}),
  };

  // Best-effort upsert do VPS API (jméno/avatar/last-login, NIKDY nesnižuje
  // bestRun/currentRun na nulu — to je pravidlo VPS strany, viz
  // TECH_DESIGN.md "VPS API specifikace"). AWAITOVANÉ (ne "fire and forget")
  // — na serverless platformě by nedokončený promise mohl být zabitý hned po
  // odeslání response; ensureHubPlayer (lib/leaderboard/ensureHubPlayer.ts)
  // nikdy nevyhodí, takže tohle jen krátce zpozdí redirect, nikdy ho nerozbije.
  // Stejný princip jako osmaliga.cz "Přihlášení pokračuje i bez úspěšného upsert".
  // Sdílené s /api/auth/me a survive-night/death (viz TECH_DESIGN.md
  // "Diagnostika: přihlášený hráč chybí na /leaderboard") — tohle NENÍ
  // jediné místo, kde se upsert spouští, jen to nejrannější.
  await ensureHubPlayer(player, "auth/callback");

  const token = encodeSession(player);
  if (!token) {
    // AUTH_SECRET chybí — bez něj by šla session snadno padělat (viz
    // lib/auth/session.ts#encodeSession), takže se raději vůbec nevytváří.
    return NextResponse.redirect(new URL("/?auth=config_error", request.url));
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(OAUTH_STATE_COOKIE_NAME);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return response;
}
