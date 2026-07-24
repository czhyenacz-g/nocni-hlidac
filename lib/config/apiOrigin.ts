/**
 * Jedno centrální místo pro veřejný API origin (viz zadání "cross-origin
 * Discord OAuth pro itch.io" — "2. Centrální API origin"). Hra může běžet
 * vnořená na itch.io, kde `window.location.origin` NENÍ origin naší appky —
 * proto se cíl fetchů/OAuth v produkci nikdy nehádá z aktuální stránky,
 * jen z `NEXT_PUBLIC_API_ORIGIN` (Next.js `NEXT_PUBLIC_*` proměnné jsou
 * shodně čitelné na klientovi i na serveru).
 */
const DEV_FALLBACK_ORIGIN = "http://localhost:3000";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * `""` znamená "použij relativní cestu" (fetch na stejném originu, jako
 * dřív) — nastane v produkci bez nastaveného `NEXT_PUBLIC_API_ORIGIN`, i ve
 * `test` prostředí (vitest), ať existující testy nezávisí na konkrétním
 * absolutním originu. Jen skutečné `next dev` (`NODE_ENV === "development"`)
 * dostane bezpečný localhost fallback. Nikdy hádání z
 * `window.location.origin`, které by na itch.io ukázalo na cizí doménu.
 */
export function getApiOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (configured) return stripTrailingSlash(configured);
  if (process.env.NODE_ENV === "development") return DEV_FALLBACK_ORIGIN;
  return "";
}
