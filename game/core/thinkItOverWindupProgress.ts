import { THINK_IT_OVER_WINDUP_DURATION_MS } from "../balancing/constants";

// Čistá odvozená hodnota z GameState.thinkItOverWindup.progressMs —
// LeftWallView z ní počítá progress bar, stejný vzor jako
// computeEmergencyRunWindupProgressRatio.
export function computeThinkItOverWindupProgressRatio(progressMs: number): number {
  return Math.min(1, Math.max(0, progressMs / THINK_IT_OVER_WINDUP_DURATION_MS));
}
