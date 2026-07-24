import { getApiOrigin } from "../config/apiOrigin";

/**
 * Sdílený browser fetch pro vlastní Next.js API routes (auth/hardcore/
 * profile) — vždy absolutní URL přes `getApiOrigin()` + `credentials:
 * "include"`, ať session cookie dojede i z cizího originu (itch.io). Jedno
 * místo, žádné skládání URL po komponentách (viz zadání "2. Centrální API
 * origin"). Nenahrazuje `lib/hubClient.ts` (ten je server-only, mluví s
 * privátním VPS API) — tohle je pro volání VLASTNÍCH `/api/**` routes z
 * prohlížeče.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const origin = getApiOrigin();
  const url = origin ? `${origin}${path}` : path;
  return fetch(url, { ...init, credentials: "include" });
}
