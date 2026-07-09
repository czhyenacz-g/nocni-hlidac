import { DeathSequenceConfig } from "./deathSequenceConfig";

export type DeathSequencePhase =
  | "waiting"
  | "silence"
  | "white_flash"
  | "impact"
  | "red_flash"
  | "death_frame"
  | "game_over"
  | "complete";

/**
 * Jak dlouho (ms) po `gameOverAtMs` se sekvence považuje za "complete" (viz
 * resolveDeathSequencePhase) — DeathSequenceOverlay tohle používá jako
 * spouštěč pro `onComplete`.
 */
export const DEATH_SEQUENCE_COMPLETE_AFTER_MS = 1500;

/**
 * Čistá, deterministická fázová funkce — NENÍ dokonalá stavová mašina (viz
 * zadání "není nutné"), jen čitelné pořadí kontrol od NEJPOZDĚJŠÍ fáze k
 * nejdřívější. Efektová okna (white/red flash, shake) se v configu můžou
 * volně překrývat (např. shake běžící přes konec white flash) — kontrola od
 * konce zajistí, že vždy vyhraje ta časově pozdější/dramatičtější fáze,
 * místo aby záleželo na pořadí `if` větví.
 *
 * Všechny `*AtMs` hodnoty KROMĚ `preDeathDelayMs` jsou relativní k okamžiku,
 * kdy začíná samotná death sekvence (`t = elapsedMs - preDeathDelayMs`), ne
 * k mountu komponenty/první frame.
 */
export function resolveDeathSequencePhase(elapsedMs: number, config: DeathSequenceConfig): DeathSequencePhase {
  if (elapsedMs < config.preDeathDelayMs) return "waiting";
  const t = elapsedMs - config.preDeathDelayMs;

  if (t >= config.gameOverAtMs + DEATH_SEQUENCE_COMPLETE_AFTER_MS) return "complete";
  if (t >= config.gameOverAtMs) return "game_over";
  if (t >= config.deathFrameAtMs) return "death_frame";
  if (config.redFlashEnabled && t >= config.redFlashAtMs && t < config.redFlashAtMs + config.redFlashDurationMs) return "red_flash";
  if (config.shakeEnabled && t >= config.shakeAtMs && t < config.shakeAtMs + config.shakeDurationMs) return "impact";
  // reducedFlashes gate matches isWhiteFlashActive below — a white flash
  // that's visually suppressed shouldn't still be reported as its own phase.
  if (
    config.whiteFlashEnabled &&
    !config.reducedFlashes &&
    t >= config.whiteFlashAtMs &&
    t < config.whiteFlashAtMs + config.whiteFlashDurationMs
  ) {
    return "white_flash";
  }
  // Nic konkrétního zrovna neběží (buď ještě čeká na první efekt, nebo mezi
  // dvěma efektovými okny) — "silence" jako obecný "zatím ticho" fallback,
  // stejné jako doslovná silence fáze na začátku.
  return "silence";
}

/** Bílý záblesk se NIKDY nezobrazí, pokud je zapnuté `reducedFlashes` — i kdyby `whiteFlashEnabled` bylo `true` (viz zadání). */
export function isWhiteFlashActive(elapsedMs: number, config: DeathSequenceConfig): boolean {
  if (!config.whiteFlashEnabled || config.reducedFlashes) return false;
  const t = elapsedMs - config.preDeathDelayMs;
  return t >= config.whiteFlashAtMs && t < config.whiteFlashAtMs + config.whiteFlashDurationMs;
}

export function isRedFlashActive(elapsedMs: number, config: DeathSequenceConfig): boolean {
  if (!config.redFlashEnabled) return false;
  const t = elapsedMs - config.preDeathDelayMs;
  return t >= config.redFlashAtMs && t < config.redFlashAtMs + config.redFlashDurationMs;
}

export function isShakeActive(elapsedMs: number, config: DeathSequenceConfig): boolean {
  if (!config.shakeEnabled) return false;
  const t = elapsedMs - config.preDeathDelayMs;
  return t >= config.shakeAtMs && t < config.shakeAtMs + config.shakeDurationMs;
}

/** S `reducedFlashes` červený záblesk nezmizí úplně, jen se výrazně ztlumí (max opacity 0.35, viz zadání). */
export function resolveRedFlashOpacity(config: DeathSequenceConfig): number {
  if (!config.redFlashEnabled) return 0;
  return config.reducedFlashes ? Math.min(config.redFlashOpacity, 0.35) : config.redFlashOpacity;
}

/** S `reducedFlashes` shake zůstává, jen mnohem jemnější (max intenzita 12, viz zadání). */
export function resolveShakeIntensity(config: DeathSequenceConfig): number {
  if (!config.shakeEnabled) return 0;
  return config.reducedFlashes ? Math.min(config.shakeIntensity, 12) : config.shakeIntensity;
}
