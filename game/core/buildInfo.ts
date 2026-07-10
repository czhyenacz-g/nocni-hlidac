// Automatický identifikátor buildu (viz next.config.ts, zadání "chci vidět,
// že proběhl deploy") — na rozdíl od ručně psané GAME_VERSION
// (game/balancing/constants.ts) se tohle mění při KAŽDÉM Vercel deployi
// samo, bez rizika, že se zapomene bumpnout. `NEXT_PUBLIC_BUILD_COMMIT`
// chybí mimo Vercel (lokální `npm run dev`/`build`) — `"dev"` fallback.

/** Prvních 7 znaků git commit SHA aktuálního buildu, nebo `"dev"` mimo Vercel. */
export const BUILD_COMMIT: string = (process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "dev").slice(0, 7);

/** ISO čas, kdy tenhle build vznikl (vyhodnoceno jednou v next.config.ts při `next build`/`next dev` startu). */
export const BUILD_TIME: string = process.env.NEXT_PUBLIC_BUILD_TIME ?? new Date(0).toISOString();
