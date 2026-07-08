import { EMERGENCY_RUN_WINDUP_DURATION_MS } from "../balancing/constants";

// Čistá odvozená hodnota z GameState.emergencyRunWindup.progressMs —
// LeftWallView z ní počítá progress bar, sama žádnou animaci mimo herní
// stav nepočítá. Clampnuto na 0..1, ať progressMs >= duration (poslední tik
// před dokončením) nikdy neposune bar "přes" 100 %. Stejný vzor jako
// computeBulbReplacementProgressRatio.
export function computeEmergencyRunWindupProgressRatio(progressMs: number): number {
  return Math.min(1, Math.max(0, progressMs / EMERGENCY_RUN_WINDUP_DURATION_MS));
}
