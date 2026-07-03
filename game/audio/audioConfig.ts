import { AUDIO_EVENTS, AudioEventId } from "./audioEvents";

/** Jedna nota syntetizovaného fallbacku — viz FallbackSynthConfig. */
export interface SynthNote {
  frequency: number;
  durationMs: number;
  /** ms prodlevy před další notou (0 = hned navazuje). */
  gapMs?: number;
}

/**
 * Když soubor v `src` chybí/nejde přehrát, AudioManager místo něj syntetizuje
 * tento krátký tón/sekvenci přes Web Audio API (žádná externí knihovna) — ať
 * má hra zvuk i bez hotových audio souborů a jde ho snadno doladit tady v configu.
 * Jakmile skutečný soubor přibude do public/assets/audio/, fallback se přestane
 * používat sám od sebe (přehraje se prostě soubor).
 */
export interface FallbackSynthConfig {
  notes: SynthNote[];
  volume: number;
  /** "sine" pro čistý pípavý tón, "sawtooth"/"square" pro drsnější/varovný zvuk. */
  waveform?: OscillatorType;
}

export interface AudioClipConfig {
  /** Cesta k souboru v /public/assets/audio. Nemusí existovat — AudioManager to ošetřuje. */
  src: string;
  volume: number;
  loop: boolean;
  fallbackSynth?: FallbackSynthConfig;
}

// Placeholder zvuky (CC0, Kenney.nl — viz assets/audio/README.md) pro první směnu.
// I kdyby soubor chyběl, AudioManager selhání přehrání tiše ignoruje (viz audioManager.ts),
// případně použije fallbackSynth, pokud je definovaný.
export const AUDIO_CONFIG: Record<AudioEventId, AudioClipConfig> = {
  [AUDIO_EVENTS.ambienceLoop]: { src: "/assets/audio/ambience_loop.mp3", volume: 0.35, loop: true },
  [AUDIO_EVENTS.cameraNoise]: { src: "/assets/audio/camera_noise.mp3", volume: 0.5, loop: false },
  [AUDIO_EVENTS.doorClose]: { src: "/assets/audio/door_close.mp3", volume: 0.7, loop: false },
  [AUDIO_EVENTS.doorOpen]: { src: "/assets/audio/door_open.mp3", volume: 0.7, loop: false },
  [AUDIO_EVENTS.lightClick]: { src: "/assets/audio/light_click.mp3", volume: 0.6, loop: false },
  [AUDIO_EVENTS.enemyStep]: { src: "/assets/audio/enemy_step.mp3", volume: 0.5, loop: false },
  [AUDIO_EVENTS.enemyNear]: { src: "/assets/audio/enemy_near.mp3", volume: 0.6, loop: false },
  [AUDIO_EVENTS.powerLow]: { src: "/assets/audio/power_low.mp3", volume: 0.6, loop: false },
  [AUDIO_EVENTS.jumpscare]: { src: "/assets/audio/jumpscare.mp3", volume: 1.0, loop: false },
  [AUDIO_EVENTS.shiftWin]: { src: "/assets/audio/shift_win.mp3", volume: 0.7, loop: false },
  [AUDIO_EVENTS.uiClick]: { src: "/assets/audio/ui_click.mp3", volume: 0.4, loop: false },
  // Výrazné "generátor běží" pípnutí každých pár sekund — má být jasně slyšet,
  // ne jen tiché tiknutí v pozadí.
  [AUDIO_EVENTS.generatorBeep]: {
    src: "/assets/audio/generator_beep.mp3",
    volume: 0.6,
    loop: false,
    fallbackSynth: {
      notes: [{ frequency: 1000, durationMs: 160 }],
      volume: 0.8,
      waveform: "square",
    },
  },
  // Hlasitější a časté (viz night.generator.criticalBeepIntervalMs) — má znít stresově.
  [AUDIO_EVENTS.generatorWarningBeep]: {
    src: "/assets/audio/generator_warning_beep.mp3",
    volume: 0.6,
    loop: false,
    fallbackSynth: { notes: [{ frequency: 1400, durationMs: 70 }], volume: 0.3, waveform: "square" },
  },
  // Krátký, výrazný řev při door-light repelu (viz GAME_DESIGN.md "Světlo a dveře").
  [AUDIO_EVENTS.monsterRetreatRoar]: {
    src: "/assets/audio/monster_retreat_roar.mp3",
    volume: 0.8,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 160, durationMs: 220, gapMs: 20 },
        { frequency: 90, durationMs: 260 },
      ],
      volume: 0.4,
      waveform: "sawtooth",
    },
  },
  // Vzdálené zavytí na začátku blackoutu (viz GAME_DESIGN.md "Blackout").
  [AUDIO_EVENTS.blackoutHowl]: {
    src: "/assets/audio/blackout_howl.mp3",
    volume: 0.7,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 220, durationMs: 500, gapMs: 40 },
        { frequency: 140, durationMs: 700, gapMs: 40 },
        { frequency: 80, durationMs: 900 },
      ],
      volume: 0.35,
      waveform: "sawtooth",
    },
  },
};
