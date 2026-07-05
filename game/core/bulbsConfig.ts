/**
 * Globální config pro systém náhradních žárovek — výchozí počet pro novou
 * kampaň (viz bulbInventory.ts) a výchozí životnost žárovky v místnosti (viz
 * roomBulbs.ts). Žádná per-difficulty odlišnost zatím není potřeba;
 * `startingCount`/`defaultLifetimeMs` musí odpovídat výchozí (medium)
 * obtížnosti (viz game/difficulty/difficultyConfig.ts).
 */
export const BULBS_CONFIG = {
  startingCount: 10,
  /** Jak dlouho (ms) reálného svícení žárovka vydrží, než praskne — viz roomBulbs.ts. */
  defaultLifetimeMs: 30_000,
} as const;
