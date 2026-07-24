import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { DiscordPlayer } from "./types";

/**
 * Vlastní, na knihovnách nezávislý session mechanismus — stejný vzor jako
 * osmaliga.cz (`lib/auth/session.ts` tam): `base64url(JSON payload) + "." +
 * hex(HMAC-SHA256 podpis)` v httpOnly cookie. Žádné JWT knihovny, žádná DB
 * session tabulka — pro tenhle krok (jen identita hráče, žádný leaderboard)
 * to stačí a je to triviálně auditovatelné.
 */
const SECRET = process.env.AUTH_SECRET ?? "";
export const SESSION_COOKIE_NAME = "nocni-hlidac-session";
export const OAUTH_STATE_COOKIE_NAME = "nocni-hlidac-oauth-state";
/**
 * Nese validovaný return target ("web"/"itch", viz lib/auth/returnTargets.ts)
 * napříč OAuth roundtripem — samostatná cookie od OAUTH_STATE_COOKIE_NAME,
 * ať se CSRF `state` porovnání nemusí měnit/oslabovat kvůli přidané hodnotě
 * (viz zadání "5. Bezpečný návratový cíl" — "pokud se target ukládá do
 * state, zachovej CSRF ochranu"). Krátká životnost (OAUTH_STATE_MAX_AGE),
 * stejná jako state cookie — mimo aktivní OAuth roundtrip nemá smysl.
 */
export const OAUTH_TARGET_COOKIE_NAME = "nocni-hlidac-oauth-target";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dní
export const OAUTH_STATE_MAX_AGE = 300; // 5 minut, stejné jako dřívější inline hodnota v login/route.ts

function sign(payload: string): Buffer {
  return createHmac("sha256", SECRET).update(payload).digest();
}

/** `null`, pokud AUTH_SECRET chybí — bez něj by šel podpis snadno padělat, takže se v tom případě session vůbec nevytváří (viz app/api/auth/callback/route.ts). */
export function encodeSession(player: DiscordPlayer): string | null {
  if (!SECRET) return null;
  const payload = Buffer.from(JSON.stringify(player)).toString("base64url");
  const sig = sign(payload).toString("hex");
  return `${payload}.${sig}`;
}

export function decodeSession(token: string): DiscordPlayer | null {
  if (!SECRET) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);

  let sigBuf: Buffer;
  try {
    sigBuf = Buffer.from(sig, "hex");
  } catch {
    return null;
  }
  if (sigBuf.length !== expected.length || !timingSafeEqual(sigBuf, expected)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as DiscordPlayer;
  } catch {
    return null;
  }
}

/** Server-side "kdo je přihlášený" — čte/ověřuje httpOnly cookie, nikdy nevolá Discord API znovu. */
export async function getSession(): Promise<DiscordPlayer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}
