import { MAX_STRESS_TIME_SLOWDOWN, STRESS_TIME_SLOWDOWN_ENABLED } from "../balancing/constants";

/**
 * Kolikrát pomaleji (0..1) má ubývat "Čas do úsvitu" podle aktuálního stresu
 * (0..1, viz game/audio/useHeartbeatStress.ts) — horor efekt, ne herní
 * pravidlo: čas nikdy neskáče nahoru, jen se zpomalí odpočet, viz
 * GAME_DESIGN.md "Stres a heartbeat". `stressLevel` se ořízne na 0..1, ať
 * mimo rozsahová vstup (chyba volajícího) nevytvoří zápornou/přestřelenou
 * hodnotu. `nightMultiplier` (viz game/difficulty/nightScaling.ts
 * NightScaling.stressTimeSlowdownMultiplier, výchozí `1` pro volání beze
 * změny) násobí `MAX_STRESS_TIME_SLOWDOWN` — v pozdějších nocích tak stejný
 * stres zpomalí čas výrazněji (viz zadání "lze tam zohlednit počet nocí").
 * Výsledek je vždy clampnutý na `[0, 1]`, i kdyby `nightMultiplier * stress`
 * teoreticky přestřelilo přes celé zpomalení. `STRESS_TIME_SLOWDOWN_ENABLED
 * = false` efekt úplně vypne (vždy vrátí 1).
 */
export function computeStressTimeScale(stressLevel: number, nightMultiplier: number = 1): number {
  if (!STRESS_TIME_SLOWDOWN_ENABLED) return 1;
  const stress = Math.max(0, Math.min(1, stressLevel));
  return Math.max(0, 1 - stress * MAX_STRESS_TIME_SLOWDOWN * nightMultiplier);
}
