// Death sekvence (viz zadání "6. úkol: společný DeathSequenceOverlay a
// /death-test lab") — izolovaný modul, zatím NENAPOJENÝ na skutečné smrti ve
// hře (viz components/screens/DeathScreen.tsx, ten zůstává beze změny).
// `DeathSequenceOverlay`/`DeathTestControls`/`/death-test` čtou/mění jen
// tenhle konfigurační tvar, žádná herní logika smrti tady nežije.

import { DEFAULT_DEATH_SEQUENCE_IMAGE_ID } from "./deathSequenceImages";

/**
 * `"door"` je připravené pro pozdější vizuální odlišení smrti u dveří (viz
 * `GameState.doorDeathRevealUntilMs`, TECH_DESIGN.md "Útok u dveří má krátký
 * reveal") — v tomhle úkolu se `variant` jen přijímá a předává dál, žádné
 * skutečné odlišení vzhledu podle něj zatím neexistuje (napojení na reálné
 * smrti je samostatný následující úkol).
 */
export type DeathSequenceVariant = "default" | "door";

export type DeathSequenceImageFit = "cover" | "contain";

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

  /** Kdy (ms od začátku sekvence) se přehraje finální "zvuk smrti" (deathVolume) — NEZÁVISLE na gameOverAtMs, ať jde zvuk oddělit od vizuálu. */
  deathSoundAtMs: number;
  /** Výška/tón zvuku smrti přes playbackRate (viz audioManager.setPlaybackRate) — 1 = beze změny, mění NEODDĚLITELNĚ i tempo přehrávání. */
  deathSoundPlaybackRate: number;
  deathVolume: number;
  impactVolume: number;
  roarVolume: number;
  glitchVolume: number;

  cutAmbientInstantly: boolean;
  reducedFlashes: boolean;
  showPhaseDebug: boolean;

  /** Viz game/death/deathSequenceImages.ts — id vybraného death image assetu. */
  deathImageEnabled: boolean;
  deathImageId: string;
  deathImageFit: DeathSequenceImageFit;
  deathImageAtMs: number;
  deathImageOpacity: number;

  /** Samostatná, časově omezená černá vrstva NAD death image (viz resolveDeathSequencePhase komentář "blackout vs darknessOpacity"). */
  blackoutDurationMs: number;
  blackoutOpacity: number;

  gameOverOverlayEnabled: boolean;
  signalLostEnabled: boolean;
};

export const DEATH_SEQUENCE_DEFAULT_CONFIG: DeathSequenceConfig = {
  preDeathDelayMs: 1000,
  silenceMs: 1500,

  whiteFlashEnabled: true,
  whiteFlashAtMs: 1500,
  whiteFlashDurationMs: 90,
  whiteFlashOpacity: 0.95,

  redFlashEnabled: false,
  redFlashAtMs: 0,
  redFlashDurationMs: 0,
  redFlashOpacity: 0,

  shakeEnabled: true,
  shakeAtMs: 1600,
  shakeDurationMs: 550,
  shakeIntensity: 28,

  deathFrameAtMs: 1600,
  gameOverAtMs: 1600,

  darknessOpacity: 1,
  noiseOpacity: 0.25,

  deathSoundAtMs: 1600,
  deathSoundPlaybackRate: 1,
  deathVolume: 0.95,
  impactVolume: 0.95,
  roarVolume: 0.9,
  glitchVolume: 0.65,

  cutAmbientInstantly: true,
  reducedFlashes: false,
  showPhaseDebug: false,

  deathImageEnabled: true,
  deathImageId: DEFAULT_DEATH_SEQUENCE_IMAGE_ID,
  deathImageFit: "cover",
  deathImageAtMs: 1600,
  deathImageOpacity: 1,

  blackoutDurationMs: 800,
  blackoutOpacity: 1,

  gameOverOverlayEnabled: true,
  signalLostEnabled: false,
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
  const clampPitch = (value: number): number => Math.min(4, Math.max(0.5, value));

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

    deathSoundAtMs: clampMs(config.deathSoundAtMs),
    deathSoundPlaybackRate: clampPitch(config.deathSoundPlaybackRate),
    deathVolume: clampUnit(config.deathVolume),
    impactVolume: clampUnit(config.impactVolume),
    roarVolume: clampUnit(config.roarVolume),
    glitchVolume: clampUnit(config.glitchVolume),

    deathImageFit: config.deathImageFit === "contain" ? "contain" : "cover",
    deathImageAtMs: clampMs(config.deathImageAtMs),
    deathImageOpacity: clampUnit(config.deathImageOpacity),

    blackoutDurationMs: clampMs(config.blackoutDurationMs),
    blackoutOpacity: clampUnit(config.blackoutOpacity),
  };
}
