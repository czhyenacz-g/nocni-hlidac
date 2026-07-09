// Death sekvence (viz zadání "6. úkol: společný DeathSequenceOverlay a
// /death-test lab") — izolovaný modul, zatím NENAPOJENÝ na skutečné smrti ve
// hře (viz components/screens/DeathScreen.tsx, ten zůstává beze změny).
// `DeathSequenceOverlay`/`DeathTestControls`/`/death-test` čtou/mění jen
// tenhle konfigurační tvar, žádná herní logika smrti tady nežije.

/**
 * `"door"` je připravené pro pozdější vizuální odlišení smrti u dveří (viz
 * `GameState.doorDeathRevealUntilMs`, TECH_DESIGN.md "Útok u dveří má krátký
 * reveal") — v tomhle úkolu se `variant` jen přijímá a předává dál, žádné
 * skutečné odlišení vzhledu podle něj zatím neexistuje (napojení na reálné
 * smrti je samostatný následující úkol).
 */
export type DeathSequenceVariant = "default" | "door";

export type DeathSequenceConfig = {
  preDeathDelayMs: number;
  silenceMs: number;

  whiteFlashEnabled: boolean;
  whiteFlashAtMs: number;
  whiteFlashDurationMs: number;
  whiteFlashOpacity: number;

  redFlashEnabled: boolean;
  redFlashAtMs: number;
  redFlashDurationMs: number;
  redFlashOpacity: number;

  shakeEnabled: boolean;
  shakeAtMs: number;
  shakeDurationMs: number;
  shakeIntensity: number;

  deathFrameAtMs: number;
  gameOverAtMs: number;

  darknessOpacity: number;
  noiseOpacity: number;

  deathVolume: number;
  impactVolume: number;
  roarVolume: number;
  glitchVolume: number;

  cutAmbientInstantly: boolean;
  reducedFlashes: boolean;
  showPhaseDebug: boolean;
};

export const DEATH_SEQUENCE_DEFAULT_CONFIG: DeathSequenceConfig = {
  preDeathDelayMs: 3000,
  silenceMs: 180,

  whiteFlashEnabled: true,
  whiteFlashAtMs: 180,
  whiteFlashDurationMs: 90,
  whiteFlashOpacity: 0.95,

  redFlashEnabled: true,
  redFlashAtMs: 300,
  redFlashDurationMs: 420,
  redFlashOpacity: 0.75,

  shakeEnabled: true,
  shakeAtMs: 260,
  shakeDurationMs: 650,
  shakeIntensity: 34,

  deathFrameAtMs: 650,
  gameOverAtMs: 1900,

  darknessOpacity: 0.65,
  noiseOpacity: 0.45,

  deathVolume: 0.95,
  impactVolume: 0.95,
  roarVolume: 0.9,
  glitchVolume: 0.65,

  cutAmbientInstantly: true,
  reducedFlashes: false,
  showPhaseDebug: false,
};

/**
 * Bezpečná normalizace pro hodnoty přicházející z posuvníků/vstupu uživatele
 * (viz DeathTestControls.tsx) — časy nikdy záporné, opacity/volume vždy
 * 0 až 1. Nevynucuje žádné vztahy MEZI poli (např. "whiteFlashAtMs <
 * silenceMs") — /death-test má sloužit i k ladění záměrně "rozbitých"
 * kombinací, jen ne k hodnotám mimo platný rozsah jednotlivého pole.
 */
export function clampDeathSequenceConfig(config: DeathSequenceConfig): DeathSequenceConfig {
  const clampMs = (value: number): number => Math.max(0, Math.round(value));
  const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

  return {
    ...config,
    preDeathDelayMs: clampMs(config.preDeathDelayMs),
    silenceMs: clampMs(config.silenceMs),

    whiteFlashAtMs: clampMs(config.whiteFlashAtMs),
    whiteFlashDurationMs: clampMs(config.whiteFlashDurationMs),
    whiteFlashOpacity: clampUnit(config.whiteFlashOpacity),

    redFlashAtMs: clampMs(config.redFlashAtMs),
    redFlashDurationMs: clampMs(config.redFlashDurationMs),
    redFlashOpacity: clampUnit(config.redFlashOpacity),

    shakeAtMs: clampMs(config.shakeAtMs),
    shakeDurationMs: clampMs(config.shakeDurationMs),
    shakeIntensity: Math.max(0, config.shakeIntensity),

    deathFrameAtMs: clampMs(config.deathFrameAtMs),
    gameOverAtMs: clampMs(config.gameOverAtMs),

    darknessOpacity: clampUnit(config.darknessOpacity),
    noiseOpacity: clampUnit(config.noiseOpacity),

    deathVolume: clampUnit(config.deathVolume),
    impactVolume: clampUnit(config.impactVolume),
    roarVolume: clampUnit(config.roarVolume),
    glitchVolume: clampUnit(config.glitchVolume),
  };
}
