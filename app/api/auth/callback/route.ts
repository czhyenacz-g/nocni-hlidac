import { NextRequest, NextResponse } from "next/server";
import {
  encodeSession,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_TARGET_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/auth/session";
import { clearAuthCookie, getAuthCookieOptions } from "@/lib/auth/cookieConfig";
import {
  AuthReturnTargetName,
  getAuthReturnOrigin,
  getAuthReturnUrl,
  resolveAuthReturnTarget,
  withAuthErrorQuery,
} from "@/lib/auth/returnTargets";
import { buildPopupCloseResponse } from "@/lib/auth/popupCloseHtml";
import { DiscordPlayer } from "@/lib/auth/types";
import { ensureHubPlayer } from "@/lib/leaderboard/ensureHubPlayer";
import { recordPlayerLogin } from "@/lib/activity/remotePlayerActivity";

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
 * Buď obyčejný redirect na whitelistovaný web cíl ("web" target, beze
 * změny oproti dřívějšímu chování — viz zadání "pro běžný web flow může
 * zůstat normální redirect"), nebo malá popup close HTML stránka pro "itch"
 * target (viz zadání "6. Popup OAuth flow"). Cíl je VŽDY ze server-side
 * whitelistu (lib/auth/returnTargets.ts), nikdy z libovolné request URL —
 * žádný open redirect.
 */
function buildReturnResponse(target: AuthReturnTargetName, success: boolean): NextResponse {
  if (target === "itch") {
    // `fallbackUrl` smí nést cestu (itch.io hry typicky žijí pod
    // `/uzivatel/nazev-hry`), ale `postMessage` targetOrigin MUSÍ být čistý
    // origin — proto dvě samostatné hodnoty, ne jedna URL použitá na obojí
    // (viz zadání "3. Oprav práci s OAuth return URL a postMessage originem").
    const fallbackUrl = getAuthReturnUrl("itch");
    const targetOrigin = getAuthReturnOrigin("itch");
    return buildPopupCloseResponse({ success, targetOrigin, fallbackUrl });
  }
  const webUrl = getAuthReturnUrl("web");
  return NextResponse.redirect(success ? webUrl : withAuthErrorQuery(webUrl));
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
  const storedTargetRaw = request.cookies.get(OAUTH_TARGET_COOKIE_NAME)?.value;
  const target = resolveAuthReturnTarget(storedTargetRaw);

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return buildReturnResponse(target, false);
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return buildReturnResponse(target, false);
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
    return buildReturnResponse(target, false);
  }

  let profile: DiscordProfile;
  try {
    const profileRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) throw new Error(`Discord profile error: ${profileRes.status}`);
    profile = (await profileRes.json()) as DiscordProfile;
  } catch {
    return buildReturnResponse(target, false);
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
    return buildReturnResponse(target, false);
  }

  // Skutečně DOKONČENÝ login (viz zadání "3. Poslední přihlášení" — "ne při
  // každém GET /api/auth/me") — proto tady, PO úspěšném `encodeSession`, ne
  // uvnitř `ensureHubPlayer`/ensureHubPlayer.ts (ten běží i z `/api/auth/me`
  // při každé kontrole session). Best-effort, stejný "nikdy nevyhodí, jen
  // zaloguje" vzor jako `ensureHubPlayer` výše.
  await recordPlayerLogin(player.discordUserId);

  const response = buildReturnResponse(target, true);
  clearAuthCookie(response, OAUTH_STATE_COOKIE_NAME);
  clearAuthCookie(response, OAUTH_TARGET_COOKIE_NAME);
  response.cookies.set(SESSION_COOKIE_NAME, token, getAuthCookieOptions(SESSION_MAX_AGE));

  return response;
}
