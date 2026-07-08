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
 * Explicitní křivka spotřeby energie podle noci (ne lineární step/cap) —
 * noci 1–4 jsou učící ("kancelářské mechaniky"), od noci 5 skok na ×1.25 dělá
 * smysluplnou první motivaci pro nouzovou obchůzku/baterii, dál strmě roste
 * až k ×2.00 od noci 10 — tam už battery run není bonus, ale riskantní
 * způsob, jak vůbec přežít (viz zadání). Noci nad 10 dál používají stejný
 * strop ×2.00 (viz computeNightScaling), ať žádný modifikátor neroste
 * donekonečna.
 */
const NIGHT_ENERGY_DRAIN_MULTIPLIERS = {
  1: 1.0,
  2: 1.05,
  3: 1.1,
  4: 1.15,
  5: 1.25,
  6: 1.4,
  7: 1.55,
  8: 1.7,
  9: 1.85,
  10: 2.0,
} as const;

const MAX_NIGHT_WITH_OWN_MULTIPLIER = 10;

/**
 * `currentNight` = `survivedNights + 1` (viz game/core/survivedNights.ts) —
 * čistá, testovatelná funkce. Neplatný/nesmyslný vstup (< 1, NaN, necelé
 * číslo, ...) se bezpečně bere jako noc 1 (žádné ztěžování) — stejná
 * konvence jako `getNightConfig`. Noci nad `MAX_NIGHT_WITH_OWN_MULTIPLIER`
 * (10+) dostanou stejný strop (×2.00, noc 10), ať multiplier neroste
 * donekonečna.
 */
export function computeNightScaling(currentNight: number): NightScaling {
  const safeNight = Number.isFinite(currentNight) && currentNight >= 1 ? Math.floor(currentNight) : 1;
  const cappedNight = Math.min(safeNight, MAX_NIGHT_WITH_OWN_MULTIPLIER) as keyof typeof NIGHT_ENERGY_DRAIN_MULTIPLIERS;
  const energyDrainMultiplier = NIGHT_ENERGY_DRAIN_MULTIPLIERS[cappedNight];

  return { currentNight: safeNight, energyDrainMultiplier };
}
