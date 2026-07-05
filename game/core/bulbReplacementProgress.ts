import { BULB_REPLACE_DURATION_MS } from "../balancing/constants";

// Čistá odvozená hodnota z GameState.bulbReplacement.progressMs — DoorView
// z ní počítá rozsvěcení ikonky (brightness/opacity), sama žádnou animaci
// mimo herní stav nepočítá. Clampnuto na 0..1, ať progressMs >= duration
// (poslední tik před dokončením) nikdy neposune ikonku "přes" plné rozsvícení.
export function computeBulbReplacementProgressRatio(progressMs: number): number {
  return Math.min(1, Math.max(0, progressMs / BULB_REPLACE_DURATION_MS));
}
