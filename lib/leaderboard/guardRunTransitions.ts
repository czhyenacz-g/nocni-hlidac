import { GuardRunState } from "./types";

/**
 * Referenční specifikace přechodů stavu hráče — SKUTEČNĚ se vykonává na VPS
 * API (`POST /nocni-hlidac/player/survive-night`, `POST
 * /nocni-hlidac/player/death`, mimo tenhle repozitář). Tady existují jen
 * jako testovatelná dokumentace přesné logiky, kterou VPS strana musí
 * implementovat — nocni-hlidac sám žádný stav nepočítá ani neukládá, jen
 * volá `lib/leaderboard/remotePlayer.ts` a přebírá výsledek.
 */
export function applySurviveNight(state: GuardRunState): GuardRunState {
  const currentRun = state.currentRun + 1;
  return { currentRun, bestRun: Math.max(state.bestRun, currentRun) };
}

export function applyDeath(state: GuardRunState): GuardRunState {
  return { currentRun: 0, bestRun: state.bestRun };
}
