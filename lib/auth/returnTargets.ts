/**
 * Bezpečný whitelist návratových cílů po OAuth roundtripu (viz zadání "5.
 * Bezpečný návratový cíl") — server NIKDY nepřijímá libovolné `return_to`
 * URL od klienta, jen pojmenovaný `target` ("web"/"itch"), který se přes
 * `resolveAuthReturnTarget` vždy zúží na jednu z těchto dvou hodnot.
 * Neznámý/chybějící/cizí target padá na "web" — žádný open redirect.
 *
 * `AUTH_RETURN_WEB_URL`/`AUTH_RETURN_ITCH_URL` smí obsahovat celou URL
 * včetně cesty (itch.io hry typicky žijí pod `/uzivatel/nazev-hry`, ne na
 * holém originu) — `getAuthReturnUrl` vrací TOHLE, použij ho pro redirect/
 * odkaz. Pro `window.opener.postMessage(msg, targetOrigin)` je ale potřeba
 * VÝHRADNĚ `protocol + host`, bez cesty/query/hashe — na to slouží
 * samostatná `getAuthReturnOrigin` (viz zadání "3. Oprav práci s OAuth
 * return URL a postMessage originem").
 */
export type AuthReturnTargetName = "web" | "itch";

const DEFAULT_WEB_URL = "https://nocni-hlidac.cz";

/** `null` pro cokoliv, co není platná absolutní http(s) URL — chrání proti špatně vyplněné env proměnné, ne proti útočníkovi (obě proměnné jsou operátorský config, ne uživatelský vstup). */
function normalizeConfiguredUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function getConfiguredWebUrl(): string {
  const configured = process.env.AUTH_RETURN_WEB_URL;
  const normalized = configured ? normalizeConfiguredUrl(configured) : null;
  return normalized ?? DEFAULT_WEB_URL;
}

function getConfiguredItchUrl(): string | null {
  const configured = process.env.AUTH_RETURN_ITCH_URL;
  return configured ? normalizeConfiguredUrl(configured) : null;
}

/** Vstup je vždy `request.nextUrl.searchParams.get("target")` nebo cookie hodnota — nikdy se nepoužije přímo jako URL. */
export function resolveAuthReturnTarget(raw: string | null | undefined): AuthReturnTargetName {
  return raw === "itch" ? "itch" : "web";
}

/**
 * Celá whitelistovaná URL (může obsahovat cestu) — použij pro redirect nebo
 * pro viditelný "pokračovat" odkaz. `AUTH_RETURN_ITCH_URL` chybí/neplatná
 * => bezpečný pád na web URL (ne prázdný/neplatný redirect).
 */
export function getAuthReturnUrl(target: AuthReturnTargetName): string {
  if (target === "itch") {
    return getConfiguredItchUrl() ?? getConfiguredWebUrl();
  }
  return getConfiguredWebUrl();
}

/**
 * VÝHRADNĚ `protocol + host` z `getAuthReturnUrl(target)` — nikdy cesta/
 * query/hash. Jediné bezpečné použití je jako `targetOrigin` argument
 * `postMessage` (viz zadání "nikdy neposílej jako targetOrigin URL s
 * path/query/hashem").
 */
export function getAuthReturnOrigin(target: AuthReturnTargetName): string {
  try {
    return new URL(getAuthReturnUrl(target)).origin;
  } catch {
    return new URL(DEFAULT_WEB_URL).origin;
  }
}

/** Přidá `?auth=error` bezpečně přes URL API (zachová existující cestu/query whitelistované URL), ne naivní string konkatenaci. */
export function withAuthErrorQuery(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("auth", "error");
    return parsed.toString();
  } catch {
    return url;
  }
}
