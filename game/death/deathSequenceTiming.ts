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
 *
 * Poznámka k novému blackout→flash→death image flow: v DEFAULT configu
 * (viz deathSequenceConfig.ts) jsou `shakeAtMs`/`deathFrameAtMs`/`gameOverAtMs`
 * shodně 1600 a `redFlashEnabled` je `false` — fáze `"impact"`/`"red_flash"`/
 * `"death_frame"` tak z defaultní konfigurace nejsou dosažitelné (`"game_over"`
 * v pořadí kontrol vždy vyhraje), a to je v pořádku: skutečné vizuální vrstvy
 * (shake, death image, GAME OVER, "SIGNÁL ZTRACEN") se v `DeathSequenceOverlay`
 * neřídí touhle hrubou `phase` fází, ale přímými pomocníky níže
 * (`isBlackoutActive`, `isDeathImageVisible`, `isGameOverOverlayVisible`,
 * `isSignalLostVisible`), které porovnávají `t` přímo proti jednotlivým
 * konfiguračním polím. `phase` string slouží hlavně pro `showPhaseDebug`.
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

/**
 * Samostatná, ČASOVĚ OMEZENÁ černá vrstva NAD death image (`blackoutDurationMs`
 * od začátku sekvence) — na rozdíl od `darknessOpacity` (trvalý tmavý podklad
 * po celou dobu sekvence, vrstvený POD death image) tahle vrstva zaručuje, že
 * death image je skrytý až do konce blackoutu i při neobvyklém configu, kde by
 * `deathImageAtMs` byl nižší než `blackoutDurationMs`.
 */
export function isBlackoutActive(elapsedMs: number, config: DeathSequenceConfig): boolean {
  const t = elapsedMs - config.preDeathDelayMs;
  return t >= 0 && t < config.blackoutDurationMs;
}

/** Death image se zobrazuje od `deathImageAtMs` dál (bez horní meze) — pokud `deathImageEnabled` je `false`, nezobrazí se nikdy. */
export function isDeathImageVisible(elapsedMs: number, config: DeathSequenceConfig): boolean {
  if (!config.deathImageEnabled) return false;
  const t = elapsedMs - config.preDeathDelayMs;
  return t >= config.deathImageAtMs;
}

/**
 * Jednorázový spouštěč finálního "zvuku smrti" (`deathVolume` v
 * DeathTestControls.tsx) — NEZÁVISLE na `gameOverAtMs`/fázi `"game_over"`,
 * ať jde zvuk vyladit odděleně od GAME OVER overlaye (viz zadání "chybí mi
 * tam možnost nastavení, kdy se přehraje zvuk smrti"). Volající
 * (DeathSequenceOverlay.tsx) si sám hlídá jednorázovost přes ref, tahle
 * funkce jen říká "už bychom měli/neměli hrát", ne "právě teď hraj".
 */
export function isDeathSoundDue(elapsedMs: number, config: DeathSequenceConfig): boolean {
  const t = elapsedMs - config.preDeathDelayMs;
  return t >= config.deathSoundAtMs;
}

/**
 * "SIGNÁL ZTRACEN" mezitext — volitelná vrstva (viz zadání "defaultně
 * vypnutý nebo méně dominantní"), zobrazuje se od `deathFrameAtMs` dál,
 * NEZÁVISLE na `resolveDeathSequencePhase`u (ten při defaultním configu, kde
 * `deathFrameAtMs === gameOverAtMs`, fázi `"death_frame"` vůbec neprojde —
 * viz komentář u resolveDeathSequencePhase). Může se tak zobrazit SOUČASNĚ s
 * death image + GAME OVER, ne jako vlastní exkluzivní fáze.
 */
export function isSignalLostVisible(elapsedMs: number, config: DeathSequenceConfig): boolean {
  if (!config.signalLostEnabled) return false;
  const t = elapsedMs - config.preDeathDelayMs;
  return t >= config.deathFrameAtMs;
}

/** GAME OVER overlay (nad death image, ne místo něj) se zobrazuje od `gameOverAtMs` dál, dokud je `gameOverOverlayEnabled`. */
export function isGameOverOverlayVisible(elapsedMs: number, config: DeathSequenceConfig): boolean {
  if (!config.gameOverOverlayEnabled) return false;
  const t = elapsedMs - config.preDeathDelayMs;
  return t >= config.gameOverAtMs;
}
