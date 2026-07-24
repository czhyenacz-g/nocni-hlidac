import { NextRequest, NextResponse } from "next/server";

/**
 * Credentialed CORS pro cross-origin auth/hardcore/profile requesty z
 * itch.io (viz zadání "4. CORS whitelist") — VŽDY přesný povolený origin,
 * nikdy `Access-Control-Allow-Origin: "*"` (ten s `credentials: true`
 * prohlížeč stejně odmítne, ale nechceme se o to ani pokoušet). Origins jsou
 * přesné `protocol + host` porovnání (viz normalizeOrigin), žádné substring
 * testy typu `includes("itch.io")`.
 */
const DEV_DEFAULT_ORIGINS = ["http://localhost:3000"];
const CORS_ALLOWED_METHODS = "GET,POST,PUT,OPTIONS";
const CORS_ALLOWED_HEADERS = "Content-Type";

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function parseConfiguredOrigins(): string[] {
  return (process.env.AUTH_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Přesná whitelist normalizovaných originů (protocol+host) — čte se při každém volání, ne jednou při loadu modulu (stejný důvod jako lib/hubClient.ts — jde přepínat v testech přes vi.stubEnv). */
export function getAllowedOrigins(): string[] {
  const configured = parseConfiguredOrigins()
    .map(normalizeOrigin)
    .filter((value): value is string => value !== null);
  const withDevFallback = isProductionEnv() ? configured : [...configured, ...DEV_DEFAULT_ORIGINS];
  return Array.from(new Set(withDevFallback));
}

export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return getAllowedOrigins().includes(normalized);
}

/**
 * Nastaví CORS hlavičky JEN pro povolený origin (jinak response projde beze
 * změny — žádný CORS header pro nepovolený/chybějící origin, prohlížeč pak
 * sám odmítne cross-origin čtení odpovědi). `Vary: Origin` se přidává vždy
 * (i pro nepovolený origin) — odpověď se podle Origin hlavičky liší, cache
 * (CDN/prohlížeč) to musí vědět v obou případech.
 */
export function applyCorsHeaders(response: NextResponse, requestOrigin: string | null): NextResponse {
  if (isOriginAllowed(requestOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", requestOrigin as string);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.append("Vary", "Origin");
  return response;
}

/** Obalí handler odpovědi CORS hlavičkami podle Origin requestu — jedno místo, žádné kopírování hlaviček do každého route handleru. */
export async function withCors(
  request: NextRequest,
  build: () => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  const response = await build();
  return applyCorsHeaders(response, request.headers.get("origin"));
}

/** Sdílená odpověď na `OPTIONS` preflight — export jako `export const OPTIONS = corsPreflightResponse;` v každém CORS-zapojeném route souboru. */
export function corsPreflightResponse(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  applyCorsHeaders(response, request.headers.get("origin"));
  response.headers.set("Access-Control-Allow-Methods", CORS_ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", CORS_ALLOWED_HEADERS);
  return response;
}

/** Metody, které mění stav — jediné, na které se `isTrustedWriteOrigin` vůbec vztahuje (viz zadání "1. Zpřísni isTrustedWriteOrigin"). */
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF pojistka pro zápisové endpointy (viz zadání "10. CSRF a bezpečnost
 * zápisových endpointů", zpřísněno v "1. Zpřísni isTrustedWriteOrigin") —
 * `SameSite=None` cookie (produkce) jinak dovolí cross-site zápisy
 * odkudkoliv, kde hráč má platnou session. Pravidla:
 *
 * - metoda MIMO POST/PUT/PATCH/DELETE (GET/HEAD/OPTIONS/...) → vždy `true`,
 *   tahle kontrola se na ni nevztahuje (read-only, žádné CSRF riziko).
 * - zápisová metoda BEZ `Origin` hlavičky → `false` (CHYBĚJÍCÍ Origin se
 *   dřív propouštěl kvůli "starým klientům bez Origin" — po zavedení
 *   `SameSite=None` už to nestačí; moderní prohlížeče Origin na fetch/XHR
 *   zápisy posílají vždy, i same-origin, takže žádný legitimní volající
 *   týhle appky o něj nepřijde — viz `lib/http/apiFetch.ts`).
 * - zápisová metoda s Origin, který NENÍ na whitelistu → `false`.
 * - zápisová metoda s Origin na whitelistu (přesné porovnání, viz
 *   `isOriginAllowed`/`normalizeOrigin` — žádné substringy, žádné
 *   wildcardy) → `true`.
 *
 * Localhost je součástí whitelistu jen mimo produkci (viz
 * `getAllowedOrigins` — `DEV_DEFAULT_ORIGINS`), nikdy zvláštní výjimkou
 * uvnitř týhle funkce — vývojářský provoz musí projít STEJNOU cestou jako
 * produkční, jen s jinou whitelistí.
 *
 * Žádný z dnešních endpointů nepotřebuje server-to-server volání bez
 * Origin (všechny zápisy jdou z prohlížeče přes `apiFetch`, viz audit v
 * reportu) — pokud by něco takového vzniklo, potřebuje VLASTNÍ
 * autentizační mechanismus (např. Bearer token jako `lib/hubClient.ts`),
 * ne obecnou výjimku tady.
 */
export function isTrustedWriteOrigin(request: NextRequest): boolean {
  if (!STATE_CHANGING_METHODS.has(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return isOriginAllowed(origin);
}
