import { NIGHT_SCALING_ENERGY_DRAIN_STEP, NIGHT_SCALING_MAX_PRESSURE } from "../balancing/constants";

/**
 * Jak moc se Objekt 13 zhoršuje podle počtu přežitých nocí aktuálního
 * hlídače — nezávislé na `Difficulty` (easy/medium/hard, viz
 * difficultyConfig.ts): difficulty říká, jaký je zvolený režim hry; night
 * scaling říká, jak moc se objekt zhoršuje s každou další přežitou nocí ve
 * stejném režimu. Zatím jediná hodnota (`energyDrainMultiplier`) — další
 * (`monsterActivityMultiplier`, `generatorFaultTimingMultiplier`,
 * `cameraNoiseMultiplier`, ...) se sem přidají, až budou mít skutečné využití.
 */
export interface NightScaling {
  currentNight: number;
  energyDrainMultiplier: number;
}

/**
 * `currentNight` = `survivedNights + 1` (viz game/core/survivedNights.ts) —
 * čistá, testovatelná funkce. Neplatný/nesmyslný vstup (< 1, NaN, ...) se
 * bezpečně bere jako noc 1 (žádné ztěžování). "Pressure" (noc nad rámec
 * první) je capnutá na `NIGHT_SCALING_MAX_PRESSURE`, takže
 * `energyDrainMultiplier` má pevný strop a neroste donekonečna s dalšími
 * nocemi.
 */
export function computeNightScaling(currentNight: number): NightScaling {
  const safeNight = Number.isFinite(currentNight) && currentNight >= 1 ? Math.floor(currentNight) : 1;
  const pressure = Math.max(0, Math.min(NIGHT_SCALING_MAX_PRESSURE, safeNight - 1));
  const energyDrainMultiplier = 1 + pressure * NIGHT_SCALING_ENERGY_DRAIN_STEP;

  return { currentNight: safeNight, energyDrainMultiplier };
}
