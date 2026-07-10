// Automatický identifikátor buildu (viz next.config.ts, zadání "chci vidět,
// že proběhl deploy") — na rozdíl od ručně psané GAME_VERSION
// (game/balancing/constants.ts) se tohle mění při KAŽDÉM Vercel deployi
// samo, bez rizika, že se zapomene bumpnout. `NEXT_PUBLIC_BUILD_COMMIT`
// chybí mimo Vercel (lokální `npm run dev`/`build`) — `"dev"` fallback.

/** Prvních 7 znaků git commit SHA aktuálního buildu, nebo `"dev"` mimo Vercel. */
export const BUILD_COMMIT: string = (process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "dev").slice(0, 7);

/** ISO čas, kdy tenhle build vznikl (vyhodnoceno jednou v next.config.ts při `next build`/`next dev` startu). */
export const BUILD_TIME: string = process.env.NEXT_PUBLIC_BUILD_TIME ?? new Date(0).toISOString();

/**
 * `BUILD_TIME` přeformátované na "YYMMDDHHmm" (UTC) — čistě kosmetické číslo
 * za GAME_VERSION (viz Footer.tsx, zadání "ať to vypadá trochu jako verze"),
 * ne skutečné sémantické verzování. Roste monotónně s každým novým buildem,
 * takže i bez čtení commit hashe jde na první pohled poznat "tenhle build je
 * novější než tamten".
 */
export function formatBuildNumber(isoTime: string): string {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return "0000000000";
  const pad = (value: number): string => String(value).padStart(2, "0");
  const yy = pad(date.getUTCFullYear() % 100);
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  return `${yy}${mm}${dd}${hh}${min}`;
}

/** Připravené k přímému zobrazení (viz Footer.tsx) — YYMMDDHHmm z BUILD_TIME. */
export const BUILD_NUMBER: string = formatBuildNumber(BUILD_TIME);
