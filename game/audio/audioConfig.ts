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
  // O 15 % tišší po dvou koleček playtestu (0.35 -> 0.2975 -> 0.252875).
  [AUDIO_EVENTS.ambienceLoop]: { src: "/assets/audio/ambience_loop.mp3", volume: 0.252875, loop: true },
  // Zvuk překvapení, když je nepřítel právě na kameře nejblíž hráči (viz
  // app/play/page.tsx handleSelectCamera) — tlukot srdce místo generického
  // šumu, ať je to čitelnější jako "leknutí", ne jako rušení signálu.
  // Žádný reálný soubor zatím neexistuje, spadne vždy na syntetizovaný
  // fallback (dvě nízké "lub-dub" noty).
  [AUDIO_EVENTS.heartbeat]: {
    src: "/assets/audio/heartbeat.mp3",
    volume: 0.6,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 90, durationMs: 90, gapMs: 90 },
        { frequency: 70, durationMs: 110 },
      ],
      volume: 0.5,
      waveform: "sine",
    },
  },
  // Stresová heartbeat vrstva (viz game/audio/heartbeatStress.ts,
  // game/audio/useHeartbeatStress.ts) — dva nekonečné loopy, hlasitost se
  // NEnastavuje tady (base 0), řídí ji za běhu useHeartbeatStress přes
  // audioManager.setVolume() podle stressLevel. Nikdy se nespouští přes
  // opakované play(), vždy jen startLoop() jednou + průběžné setVolume().
  [AUDIO_EVENTS.heartbeatStressSlow]: {
    src: "/assets/audio/heartbeat_slow_reverb.mp3",
    volume: 0,
    loop: true,
  },
  [AUDIO_EVENTS.heartbeatStressFast]: {
    src: "/assets/audio/heartbeat_fast_reverb.mp3",
    volume: 0,
    loop: true,
  },
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
  // ne jen tiché tiknutí v pozadí. Hlasitost o 30 % snížená oproti dřívější
  // 0.6/0.8 (na žádost — původní hlasitost byla po předchozím doladění moc rušivá).
  [AUDIO_EVENTS.generatorBeep]: {
    src: "/assets/audio/generator_beep.mp3",
    // O dalších 30 % tišší na žádost po playtestu (0.6 -> 0.42 dřív, teď 0.42 -> 0.294).
    volume: 0.294,
    loop: false,
    fallbackSynth: {
      notes: [{ frequency: 1000, durationMs: 160 }],
      volume: 0.392,
      waveform: "square",
    },
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
  // Bušení do dveří — zablokovaný útok monstra na zavřené dveře (viz
  // game/core/doorEncounter.ts, GameState.doorBangSeq). Zní jako těžká,
  // krátká, fyzická rána do dveří — potvrzení nárazu, ne lekací výkřik (ten
  // zůstává jumpscare, jen pro skutečnou smrt, proto nižší volume než 1.0).
  // Reálný soubor (CC0, Freesound.org — viz assets/audio/README.md),
  // fallback (jeden krátký nízký "úder" tón) zůstává pro případ selhání
  // načtení. Přehrávání (1–2 údery + cooldown proti spamu) řeší
  // game/audio/doorBangPlayback.ts + app/play/page.tsx, ne tenhle config.
  [AUDIO_EVENTS.monsterDoorBang]: {
    src: "/assets/audio/monster_door_bang.mp3",
    volume: 0.8,
    loop: false,
    fallbackSynth: {
      notes: [{ frequency: 70, durationMs: 130 }],
      volume: 0.55,
      waveform: "square",
    },
  },
  // Kroky ústupu po door-light repelu (viz monsterRetreatRoarSeq,
  // app/play/page.tsx — hraje krátce po monsterRetreatRoar). Žádný reálný
  // soubor zatím neexistuje, fallback je tichý krátký "krok" tón — záměrně
  // nenápadný, ať bez skutečného assetu nepůsobí rušivě.
  [AUDIO_EVENTS.monsterRetreatSteps]: {
    src: "/assets/audio/monster_retreat_steps.mp3",
    volume: 0.5,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 120, durationMs: 60, gapMs: 80 },
        { frequency: 110, durationMs: 60 },
      ],
      volume: 0.3,
      waveform: "sine",
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
  // Vzdálené/blížící se kroky v blackoutu (viz GameState.blackoutPhaseSeq,
  // app/play/page.tsx) — mají znít jako těžká přítomnost/monstrum, ne jako
  // normální enemyStep/enemyNear, proto nižší, těžší tón než tam. Žádný
  // reálný soubor zatím není vybraný (viz assets/audio/downloads/freesound/
  // footsteps/ — obě "těžké monstrum" varianty jsou schované pro budoucí
  // "gigant" typ nepřítele, ne pro tohle), fallback zatím stačí.
  [AUDIO_EVENTS.blackoutStepsFar]: {
    src: "/assets/audio/blackout_steps_far.mp3",
    volume: 0.5,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 90, durationMs: 90, gapMs: 260 },
        { frequency: 85, durationMs: 90 },
      ],
      volume: 0.3,
      waveform: "sine",
    },
  },
  [AUDIO_EVENTS.blackoutStepsNear]: {
    src: "/assets/audio/blackout_steps_near.mp3",
    volume: 0.6,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 100, durationMs: 100, gapMs: 140 },
        { frequency: 95, durationMs: 100, gapMs: 140 },
        { frequency: 90, durationMs: 100 },
      ],
      volume: 0.38,
      waveform: "sine",
    },
  },
  // Krátký, výrazný řev těsně PŘED smrtí v blackoutu (viz
  // BlackoutDefinition.roarLeadMs, GameState.blackoutRoarSeq) — odlišený od
  // monsterRetreatRoar (ústup po repelu) i od jumpscare (samotná smrt, hraje
  // až o kus později, viz efekt na screen === "death"). Reálný soubor
  // (CC0, Freesound.org, Breviceps — viz assets/audio/downloads/freesound/README.md,
  // vybraný krátký segment roar_08 z rozřezané 60s nahrávky) — fallback pro
  // případ selhání načtení zůstává.
  [AUDIO_EVENTS.blackoutMonsterRoar]: {
    src: "/assets/audio/blackout_monster_roar.mp3",
    volume: 0.9,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 140, durationMs: 260, gapMs: 30 },
        { frequency: 80, durationMs: 320 },
      ],
      volume: 0.45,
      waveform: "sawtooth",
    },
  },
  // Praskne žárovka v místnosti (viz game/core/roomBulbs.ts) — krátký, ostrý
  // "cvak/sklo" zvuk, žádný reálný soubor zatím neexistuje, fallback synth
  // je jen krátký vysoký "prasknutí" tón + tišší dozvuk.
  [AUDIO_EVENTS.bulbBreak]: {
    src: "/assets/audio/bulb_break.mp3",
    volume: 0.7,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 1800, durationMs: 40, gapMs: 10 },
        { frequency: 300, durationMs: 120 },
      ],
      volume: 0.5,
      waveform: "square",
    },
  },
  // Krátké optimistické potvrzení po úspěšné ruční výměně žárovky (viz
  // gameReducer.ts#updateBulbReplacement, bulbReplaceSuccessSeq) — jemné
  // elektrické "vzum"/naskočení světla, ne hlasitý UI beep a ne hororový
  // zvuk. Žádný reálný soubor zatím neexistuje, fallback je krátký
  // sine sweep nahoru (dvě rychle navazující stoupající noty, ~0.35 s celkem).
  [AUDIO_EVENTS.bulbReplaceSuccess]: {
    src: "/assets/audio/bulb_replace_success.mp3",
    volume: 0.5,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 260, durationMs: 90, gapMs: 10 },
        { frequency: 520, durationMs: 220 },
      ],
      volume: 0.35,
      waveform: "sine",
    },
  },
};
