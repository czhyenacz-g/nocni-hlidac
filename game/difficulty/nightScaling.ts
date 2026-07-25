/**
 * Jak moc se Objekt 13 zhoršuje podle počtu přežitých nocí aktuálního
 * hlídače — nezávislé na `Difficulty` (easy/medium/hard, viz
 * difficultyConfig.ts): difficulty říká, jaký je zvolený režim hry; night
 * scaling říká, jak moc se objekt zhoršuje s každou další přežitou nocí ve
 * stejném režimu. Dvě hodnoty zatím (`energyDrainMultiplier`,
 * `stressTimeSlowdownMultiplier`) — další (`monsterActivityMultiplier`,
 * `generatorFaultTimingMultiplier`, `cameraNoiseMultiplier`, ...) se sem
 * přidají, až budou mít skutečné využití.
 */
export interface NightScaling {
  currentNight: number;
  energyDrainMultiplier: number;
  /**
   * Násobí `MAX_STRESS_TIME_SLOWDOWN` (viz game/core/stressTimeScale.ts) —
   * v pozdějších nocích má stejná úroveň stresu ZPOMALIT čas do úsvitu VÍC
   * než v Noci 1 (viz zadání "lze tam zohlednit počet nocí"). `1.0` v Noci 1
   * (beze změny dřívějšího chování, max. zpomalení zůstává 50 %), roste až
   * na `1.5` od Noci 10 (max. zpomalení 75 % při 100% stresu) — stejná
   * "učící" prodleva u nocí 1–4 jako u energyDrainMultiplier výše.
   */
  stressTimeSlowdownMultiplier: number;
}

/**
 * Explicitní křivka spotřeby energie podle noci (ne lineární step/cap) —
 * noci 1–4 jsou učící ("kancelářské mechaniky"), teď rostou po +7 % místo
 * dřívějších +5 % (na žádost, viz zadání "navýšení 7% místo 5"), od noci 5
 * skok na ×1.36 dělá smysluplnou první motivaci pro nouzovou obchůzku/
 * baterii, dál strmě roste až ke stropu ×2.50 od noci 10 (dřív ×2.00, na
 * žádost) — tam už battery run není bonus, ale riskantní způsob, jak vůbec
 * přežít (viz zadání). Noci nad 10 dál používají stejný strop ×2.50 (viz
 * computeNightScaling), ať žádný modifikátor neroste donekonečna.
 */
const NIGHT_ENERGY_DRAIN_MULTIPLIERS = {
  1: 1.0,
  2: 1.07,
  3: 1.14,
  4: 1.21,
  5: 1.36,
  6: 1.57,
  7: 1.78,
  8: 1.99,
  9: 2.2,
  10: 2.5,
} as const;

/**
 * Křivka pro stressTimeSlowdownMultiplier (viz NightScaling výše) — stejný
 * tvar jako NIGHT_ENERGY_DRAIN_MULTIPLIERS (učící noci 1–4 skoro beze
 * změny, znatelnější růst od Noci 5, strop od Noci 10), jen jiný rozsah
 * (`1.0` -> `1.5`, ne `1.0` -> `2.5` — tohle je jen atmosférický efekt, ne
 * přímé ohrožení jako spotřeba energie).
 */
const NIGHT_STRESS_TIME_SLOWDOWN_MULTIPLIERS = {
  1: 1.0,
  2: 1.02,
  3: 1.04,
  4: 1.06,
  5: 1.15,
  6: 1.24,
  7: 1.33,
  8: 1.4,
  9: 1.46,
  10: 1.5,
} as const;

const MAX_NIGHT_WITH_OWN_MULTIPLIER = 10;

/**
 * `currentNight` = `survivedNights + 1` (viz game/core/survivedNights.ts) —
 * čistá, testovatelná funkce. Neplatný/nesmyslný vstup (< 1, NaN, necelé
 * číslo, ...) se bezpečně bere jako noc 1 (žádné ztěžování) — stejná
 * konvence jako `getNightConfig`. Noci nad `MAX_NIGHT_WITH_OWN_MULTIPLIER`
 * (10+) dostanou stejný strop (×2.50 energie / ×1.5 stress slowdown, noc
 * 10) pro OBĚ křivky, ať žádný modifikátor neroste donekonečna.
 */
export function computeNightScaling(currentNight: number): NightScaling {
  const safeNight = Number.isFinite(currentNight) && currentNight >= 1 ? Math.floor(currentNight) : 1;
  const cappedNight = Math.min(safeNight, MAX_NIGHT_WITH_OWN_MULTIPLIER) as keyof typeof NIGHT_ENERGY_DRAIN_MULTIPLIERS;
  const energyDrainMultiplier = NIGHT_ENERGY_DRAIN_MULTIPLIERS[cappedNight];
  const stressTimeSlowdownMultiplier = NIGHT_STRESS_TIME_SLOWDOWN_MULTIPLIERS[cappedNight];

  return { currentNight: safeNight, energyDrainMultiplier, stressTimeSlowdownMultiplier };
}
