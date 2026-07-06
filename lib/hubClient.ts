/**
 * Tenký, na knihovnách nezávislý klient pro soukromé VPS API (adaptováno z
 * osmaliga.cz — tam každý call site duplikuje vlastní `fetch` s
 * `x-project-hub-key` hlavičkou; tady je to jedno sdílené místo, protože
 * nocni-hlidac zatím potřebuje jen pár endpointů). Vercel appka NEMÁ přímé
 * DB připojení — vždycky volá tenhle VPS API, ten teprve mluví s DB (viz
 * TECH_DESIGN.md "VPS API specifikace").
 *
 * Server-only modul — token se nikdy neposílá do klienta. Import jen z
 * Route Handlers / server-side kódu (`app/api/**`, `lib/leaderboard/*`,
 * `app/api/auth/callback/route.ts`).
 */
const REQUEST_TIMEOUT_MS = 3000;

// Čtou se při KAŽDÉM volání, ne jednou při načtení modulu — jednak ať jde
// config v testech přepínat (vi.stubEnv), jednak ať se nikde náhodou
// nezacachuje "chybí" hodnota z okamžiku před tím, než platforma proměnné
// doplní.
function getApiUrl(): string {
  return process.env.NOCNI_HLIDAC_API_URL ?? "";
}

function getApiToken(): string {
  return process.env.NOCNI_HLIDAC_API_TOKEN ?? "";
}

/** Chybějící config = žádné volání se ani nepokusí — volající strana (viz mockLeaderboard.ts) rovnou spadne na fallback. */
export function isHubConfigured(): boolean {
  return Boolean(getApiUrl() && getApiToken());
}

/**
 * `null` na cokoliv, co se dá pokazit — chybějící config, network chyba,
 * timeout, ne-2xx odpověď, i chybný JSON. Stejná "tichá null" konvence jako
 * osmaliga.cz (`lib/clubs.ts#fetchFromApi`), navíc s `AbortSignal.timeout` —
 * osmaliga.cz žádný timeout nemá (zavěšené VPS API by viselo do platform
 * timeoutu), tady je to záměrné vylepšení, ne slepá kopie. "Tichá null" pro
 * VOLAJÍCÍHO (ten se má chovat stejně, ať API selhalo nebo není
 * nakonfigurované) ale NE tichá v serverovém logu — `console.error` níže
 * loguje jen cestu a status/chybu, nikdy hlavičky/token, ať jde v Vercel
 * logu vidět, že se konkrétní volání (např. upsert po loginu) nepovedlo.
 */
async function hubFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!isHubConfigured()) return null;

  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${getApiToken()}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[hubClient] ${init?.method ?? "GET"} ${path} failed: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[hubClient] ${init?.method ?? "GET"} ${path} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function hubGet<T>(path: string): Promise<T | null> {
  return hubFetch<T>(path, { method: "GET", cache: "no-store" });
}

export async function hubPost<T>(path: string, body: unknown): Promise<T | null> {
  return hubFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
