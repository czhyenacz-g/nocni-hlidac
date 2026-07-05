/**
 * Globální config pro budoucí systém náhradních žárovek — zatím jen výchozí
 * počet pro novou kampaň (viz bulbInventory.ts). Žádná per-difficulty
 * odlišnost zatím není potřeba; `startingCount` musí odpovídat výchozí
 * (medium) obtížnosti (viz game/difficulty/difficultyConfig.ts).
 */
export const BULBS_CONFIG = {
  startingCount: 10,
} as const;
