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
/**
 * Detailní varianta pro volající, které potřebují rozlišit KONKRÉTNÍ HTTP
 * status (viz lib/playerProfile/remoteObject13PlayerProfile.ts — PUT profilu
 * musí umět odlišit 200/404/409/413 od sebe, ne jen "ok, nebo null" jako
 * hubGet/hubPost níže). `status: 0` znamená "žádná skutečná HTTP odpověď"
 * (chybějící config, network chyba, timeout) — nikdy se nepřekrývá se
 * skutečným HTTP statusem. `body` je `null`, když odpověď nebyla (platný)
 * JSON — volající si podle `status` i tak může rozhodnout, co to znamená.
 */
export interface HubResponse<T> {
  status: number;
  body: T | null;
}

async function hubFetchDetailed<T>(path: string, init?: RequestInit): Promise<HubResponse<T>> {
  if (!isHubConfigured()) return { status: 0, body: null };

  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${getApiToken()}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    let body: T | null = null;
    try {
      body = (await res.json()) as T;
    } catch {
      body = null;
    }
    if (!res.ok) {
      console.error(`[hubClient] ${init?.method ?? "GET"} ${path} failed: HTTP ${res.status}`);
    }
    return { status: res.status, body };
  } catch (err) {
    console.error(`[hubClient] ${init?.method ?? "GET"} ${path} failed:`, err instanceof Error ? err.message : err);
    return { status: 0, body: null };
  }
}

/** `null` na cokoliv, co se dá pokazit (viz hubFetchDetailed) — tenká "kolabuj na null" obálka pro volající, kterým na přesném statusu nezáleží. */
async function hubFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const { status, body } = await hubFetchDetailed<T>(path, init);
  return status >= 200 && status < 300 ? body : null;
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

/**
 * `putRemoteObject13PlayerProfile` (viz lib/playerProfile/remoteObject13PlayerProfile.ts)
 * musí odlišit 200 (uloženo) od 409 (revision conflict, VPS vrací i
 * `currentRevision`/`profile` v těle) od 413/404/jiné. Stejná auth/timeout/
 * base-URL logika jako hubGet/hubPost výše (sdílené přes hubFetchDetailed),
 * ne druhý nezávislý HTTP klient.
 */
export async function hubPutDetailed<T>(path: string, body: unknown): Promise<HubResponse<T>> {
  return hubFetchDetailed<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Stejný důvod jako `hubPutDetailed` výše, ale pro POST — inventářové
 * operace (`/nocni-hlidac/player-profile/inventory/bulb/add|consume`, viz
 * lib/playerProfile/remoteObject13PlayerProfile.ts) musí odlišit 200 od 409
 * (revision conflict NEBO `exceeds_maximum`/`insufficient_inventory`) od 404.
 */
export async function hubPostDetailed<T>(path: string, body: unknown): Promise<HubResponse<T>> {
  return hubFetchDetailed<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
