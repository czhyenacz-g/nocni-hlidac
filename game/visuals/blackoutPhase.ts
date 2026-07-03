import { BlackoutDefinition } from "../core/types";

/**
 * Čtyři atmosférické fáze blackoutu (0–3), odvozené z blackoutElapsedMs a tří
 * hranic v NightDefinition.blackout.phaseThresholdsMs. Čistá funkce — text
 * pro jednotlivé fáze je v content/copy.ts, BlackoutView ho jen zobrazuje.
 */
export function getBlackoutPhaseIndex(blackoutElapsedMs: number, blackout: BlackoutDefinition): 0 | 1 | 2 | 3 {
  const [t1, t2, t3] = blackout.phaseThresholdsMs;
  if (blackoutElapsedMs < t1) return 0;
  if (blackoutElapsedMs < t2) return 1;
  if (blackoutElapsedMs < t3) return 2;
  return 3;
}
