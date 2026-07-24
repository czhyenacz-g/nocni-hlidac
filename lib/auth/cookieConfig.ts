import { NextResponse } from "next/server";

/**
 * Jeden centrální zdroj cookie atributů pro login/callback/logout (viz
 * zadání "3. Session cookie pro cross-site fetch" — "Nedělej nekonzistentní
 * cookie atributy mezi login route, callback route, session refresh,
 * logout"). V produkci `SameSite=None; Secure=true` — nutné, aby cookie
 * vůbec dojela u cross-site fetchu z itch.io (bez `Secure` prohlížeče
 * `SameSite=None` odmítají). Lokálně `next dev` typicky běží na obyčejném
 * http://localhost, kde by `Secure` cookii zahodil úplně — proto bezpečný
 * `SameSite=Lax; Secure=false` fallback mimo produkci.
 *
 * Podpis cookie, HMAC tajemství, session payload ani expirace (viz
 * lib/auth/session.ts) se tímhle nemění — jen fyzické Set-Cookie atributy.
 */
export interface AuthCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "none" | "lax";
  path: "/";
  maxAge?: number;
}

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getAuthCookieOptions(maxAge?: number): AuthCookieOptions {
  const production = isProductionEnv();
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    path: "/",
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

/**
 * Smaže cookie se STEJNÝMI atributy, se kterými byla nastavená (viz zadání
 * "cookie odstraněna se stejnými atributy jako při nastavení") —
 * `response.cookies.delete(name)` by nastavilo výchozí atributy, což u
 * `SameSite=None` cookie v produkci nemusí spolehlivě projít cross-site.
 */
export function clearAuthCookie(response: NextResponse, name: string): void {
  response.cookies.set(name, "", { ...getAuthCookieOptions(0) });
}
