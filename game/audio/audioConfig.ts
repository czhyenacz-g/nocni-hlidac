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
  // Zásah monstra brokovnicí (viz EmergencyMiniGame.tsx#fireShot) — reálný
  // soubor (CC0, Freesound.org, Robinhood76 — krátký bolestivý řev, ne smrt,
  // proto tišší/kratší tón než jumpscare/blackoutMonsterRoar). Fallback pro
  // případ selhání načtení zůstává, stejný vzor jako ostatní monster* eventy.
  [AUDIO_EVENTS.monsterWounded]: {
    src: "/assets/audio/monster_wounded.mp3",
    volume: 0.75,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 180, durationMs: 160, gapMs: 20 },
        { frequency: 110, durationMs: 200 },
      ],
      volume: 0.4,
      waveform: "sawtooth",
    },
  },
  // Sebrání lootu v EmergencyMiniGame (viz zadání "hlasitě UI click") —
  // stejný soubor jako uiClick, jen výrazně hlasitější, ať potvrzení sběru
  // vynikne i přes ambientní heartbeat loop během výpravy.
  [AUDIO_EVENTS.itemPickup]: {
    src: "/assets/audio/ui_click.mp3",
    volume: 0.9,
    loop: false,
    fallbackSynth: {
      notes: [{ frequency: 880, durationMs: 70, gapMs: 20 }, { frequency: 1320, durationMs: 90 }],
      volume: 0.5,
      waveform: "sine",
    },
  },
  // Siréna po dobu držení "Nouzově opustit místnost" (viz zadání) — reálná
  // nahrávka poplachové sirény (viz assets/audio/README.md "Emergency run
  // siréna"), 11s seamless smyčka, `loop: true` ji AudioManager přehrává
  // nepřetržitě, dokud drží tlačítko (startLoop/stopLoop). fallbackSynth
  // (dva střídavé tóny) se použije jen kdyby se skutečný soubor nepodařilo
  // načíst (viz audioManager.ts#startFallbackSynthLoop).
  [AUDIO_EVENTS.emergencyRunSiren]: {
    src: "/assets/audio/emergency_run_siren.mp3",
    volume: 0.5,
    loop: true,
    fallbackSynth: {
      notes: [
        { frequency: 700, durationMs: 300 },
        { frequency: 1000, durationMs: 300 },
      ],
      volume: 0.35,
      waveform: "sawtooth",
    },
  },
  // Výběr HARDCORE na hlavním menu (viz zadání "Řev monstra #8", MainMenuScreen.tsx
  // #handleSelectHardcore) — krátký (2.2s) řev, viz assets/audio/README.md
  // "Hardcore výběr".
  [AUDIO_EVENTS.hardcoreSelectRoar]: {
    src: "/assets/audio/hardcore_select_roar.mp3",
    volume: 0.7,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 160, durationMs: 220, gapMs: 20 },
        { frequency: 110, durationMs: 320 },
      ],
      volume: 0.5,
      waveform: "sawtooth",
    },
  },
  // Finální (10.) potvrzený zásah — hidden true ending (viz zadání "Řev
  // monstra #12", game/core/monsterEnding.ts, assets/audio/README.md
  // "Finální řev monstra"). Znamená smrt, ne ústup — nikdy nezaměňovat s
  // monsterRetreatRoar.
  [AUDIO_EVENTS.monsterFinalDeathRoar]: {
    src: "/assets/audio/monster_final_death_roar.mp3",
    volume: 0.8,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 140, durationMs: 260, gapMs: 20 },
        { frequency: 90, durationMs: 400 },
      ],
      volume: 0.55,
      waveform: "sawtooth",
    },
  },
  // Nová dosažení na výsledkové obrazovce (viz zadání "Napojit achievementy
  // na výsledkové obrazovky", AchievementResultPanel.tsx) — krátké, pozitivní
  // "confirm/terminal" pípnutí, ne hororový zvuk. Žádný reálný soubor zatím
  // neexistuje, fallback je krátká vzestupná dvoutónová sekvence (podobná
  // bulbReplaceSuccess, ale vyšší/kratší — jednoznačně "úspěch", ne "světlo
  // naskočilo").
  [AUDIO_EVENTS.achievementUnlock]: {
    src: "/assets/audio/achievement_unlock.mp3",
    volume: 0.5,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 660, durationMs: 90, gapMs: 15 },
        { frequency: 990, durationMs: 160 },
      ],
      volume: 0.4,
      waveform: "sine",
    },
  },
  // ── Death sekvence (viz game/audio/audioEvents.ts pro vysvětlení, proč
  // vlastní eventy místo sdílení s jumpscare/monsterFinalDeathRoar) —
  // `volume` tady je jen výchozí/klidový stav; DeathSequenceOverlay.tsx
  // před každým přehráním nastaví skutečnou hlasitost přes
  // audioManager.setVolume() podle příslušného posuvníku
  // (roarVolume/impactVolume/glitchVolume/deathVolume). Žádné reálné
  // soubory zatím neexistují, všechny čtyři mají jen synth fallback.
  [AUDIO_EVENTS.deathSequenceRoar]: {
    src: "/assets/audio/death_sequence_roar.mp3",
    volume: 0.8,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 170, durationMs: 220, gapMs: 20 },
        { frequency: 115, durationMs: 320 },
      ],
      volume: 0.55,
      waveform: "sawtooth",
    },
  },
  [AUDIO_EVENTS.deathSequenceImpact]: {
    src: "/assets/audio/death_sequence_impact.mp3",
    volume: 0.8,
    loop: false,
    fallbackSynth: {
      notes: [{ frequency: 80, durationMs: 140 }],
      volume: 0.6,
      waveform: "square",
    },
  },
  [AUDIO_EVENTS.deathSequenceGlitch]: {
    src: "/assets/audio/death_sequence_glitch.mp3",
    volume: 0.6,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 220, durationMs: 40, gapMs: 10 },
        { frequency: 1760, durationMs: 30, gapMs: 10 },
        { frequency: 180, durationMs: 40, gapMs: 10 },
        { frequency: 1400, durationMs: 50 },
      ],
      volume: 0.35,
      waveform: "square",
    },
  },
  [AUDIO_EVENTS.deathSequenceFinal]: {
    // Stejný zvukový soubor jako hardcoreSelectRoar ("řev monstra #3" z
    // /dev-sound), ale VLASTNÍ dedikovaný event — setVolume z /death-test
    // tak nemění hlasitost na obrazovce výběru hardcore obtížnosti.
    src: "/assets/audio/hardcore_select_roar.mp3",
    volume: 0.7,
    loop: false,
    fallbackSynth: {
      notes: [{ frequency: 65, durationMs: 900 }],
      volume: 0.5,
      waveform: "sawtooth",
    },
  },
  // ── Rádiová hláška "vypuštění monstra" (viz zadání, game/radio/) ──
  // Skutečné namluvené soubory (ne CC0 placeholder) — zpracované z
  // public/object_13/sound/release_monster/source/release_monster_raw.wav
  // (ticho detekováno přes ffmpeg silencedetect, viz report), NEPOD
  // `/assets/audio/` jako ostatní eventy výše, ale pod
  // `/object_13/sound/release_monster/` — záměrně, na explicitní žádost
  // zadání (výstupní cesta pro tenhle úkol byla daná předem). Bez
  // fallbackSynth — syntetizovaná náhrada namluvené věty nedává smysl,
  // pokud soubor chybí, hláška se prostě tiše nepřehraje (viz
  // audioManager.ts#play).
  [AUDIO_EVENTS.radioReleaseMonster01]: {
    src: "/object_13/sound/release_monster/release_monster_01.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioReleaseMonster02]: {
    src: "/object_13/sound/release_monster/release_monster_02.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioReleaseMonster03]: {
    src: "/object_13/sound/release_monster/release_monster_03.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioReleaseMonster04]: {
    src: "/object_13/sound/release_monster/release_monster_04.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioReleaseMonster05]: {
    src: "/object_13/sound/release_monster/release_monster_05.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioReleaseMonster06]: {
    src: "/object_13/sound/release_monster/release_monster_06.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioReleaseMonster07]: {
    src: "/object_13/sound/release_monster/release_monster_07.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioReleaseMonster08]: {
    src: "/object_13/sound/release_monster/release_monster_08.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioReleaseMonster09]: {
    src: "/object_13/sound/release_monster/release_monster_09.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioReleaseMonster10]: {
    src: "/object_13/sound/release_monster/release_monster_10.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioReleaseMonster11]: {
    src: "/object_13/sound/release_monster/release_monster_11.mp3",
    volume: 0.85,
    loop: false,
  },
  // ── Rádiová hláška "reakce na sonické dělo" (viz zadání) — zpracované z
  // public/object_13/sound/repel_monster/{repel_success,repel_stay,repel_failed}.wav
  // (ticho detekováno přes ffmpeg silencedetect, viz report). Stejná
  // hlasitost jako radioReleaseMonster* výše, bez fallbackSynth (namluvenou
  // větu nemá smysl nahrazovat syntetizovaným tónem).
  [AUDIO_EVENTS.radioMonsterRepelSuccess0]: {
    src: "/object_13/sound/repel_monster/radio_monster_repel_success_0.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioMonsterRepelSuccess1]: {
    src: "/object_13/sound/repel_monster/radio_monster_repel_success_1.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioMonsterRepelSuccess2]: {
    src: "/object_13/sound/repel_monster/radio_monster_repel_success_2.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioMonsterRepelSuccess3]: {
    src: "/object_13/sound/repel_monster/radio_monster_repel_success_3.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioMonsterRepelStay0]: {
    src: "/object_13/sound/repel_monster/radio_monster_repel_stay_0.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioMonsterRepelStay1]: {
    src: "/object_13/sound/repel_monster/radio_monster_repel_stay_1.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioMonsterRepelStay2]: {
    src: "/object_13/sound/repel_monster/radio_monster_repel_stay_2.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioMonsterRepelFail0]: {
    src: "/object_13/sound/repel_monster/radio_monster_repel_fail_0.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioMonsterRepelFail1]: {
    src: "/object_13/sound/repel_monster/radio_monster_repel_fail_1.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioMonsterRepelFail2]: {
    src: "/object_13/sound/repel_monster/radio_monster_repel_fail_2.mp3",
    volume: 0.85,
    loop: false,
  },
  // Provozní bzučení sonického děla (viz zadání "jemné kontinuální
  // bzučení... výrazně tišší než rádio/jumpscare/ostatní důležité audio") —
  // ŽÁDNÝ finální asset zatím neexistuje (cesta níže je jen očekávané
  // budoucí umístění, stejná konvence jako ostatní `/assets/audio/*.mp3`
  // loopy výše) — vždy spadne na fallbackSynth: jedna dlouhá (1s) nízká
  // sawtooth nota opakovaná donekonečna (viz audioManager.ts#startFallbackSynthLoop),
  // zní jako hluboké elektrické "bzzz", ne pípání/melodie. Hlasitost
  // záměrně nízká (0.14 vs. 0.85 u rádiových hlášek) — má jen potvrzovat,
  // že zařízení běží, ne rušit.
  [AUDIO_EVENTS.sonicCannonHum]: {
    src: "/assets/audio/sonic_cannon_hum.mp3",
    volume: 0.14,
    loop: true,
    fallbackSynth: {
      notes: [{ frequency: 95, durationMs: 1000 }],
      volume: 0.12,
      waveform: "sawtooth",
    },
  },
  // Dávkovač munice (viz zadání) — žádné soubory zatím nedodané, vždy
  // spadne na fallbackSynth. Dvě stoupající noty ("cvak-cvak" nabíjení).
  [AUDIO_EVENTS.ammoDispenseClick]: {
    src: "/assets/audio/ammo_dispense_click.mp3",
    volume: 0.6,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 520, durationMs: 40, gapMs: 15 },
        { frequency: 780, durationMs: 60 },
      ],
      volume: 0.5,
      waveform: "square",
    },
  },
  // Odmítnutí (plná zbraň i žádná zbraň zatím nenalezená) — jedna krátká,
  // nízká tupá nota, ať je jasně odlišná od úspěšného dávkování výše.
  [AUDIO_EVENTS.ammoRequestRejected]: {
    src: "/assets/audio/ammo_request_rejected.mp3",
    volume: 0.5,
    loop: false,
    fallbackSynth: {
      notes: [{ frequency: 180, durationMs: 90 }],
      volume: 0.45,
      waveform: "square",
    },
  },
  // "Cvak" na prázdno v EmergencyMiniGame.tsx#fireShot (viz applyShot#fired
  // === false) — suchý, vyšší cvak bez žádné rezonance, ať je jasně "kov o
  // kov", ne výstřel.
  [AUDIO_EVENTS.weaponEmptyClick]: {
    src: "/assets/audio/weapon_empty_click.mp3",
    volume: 0.55,
    loop: false,
    fallbackSynth: {
      notes: [{ frequency: 1400, durationMs: 25 }],
      volume: 0.4,
      waveform: "square",
    },
  },
  // Začátek poškozování kamery (viz zadání "existující zvuky kamerového
  // šumu/elektrického rušení, pokud existují" — projekt žádný takový
  // obecný event nemá, deathSequenceGlitch je záměrně izolovaný jen pro
  // death sekvenci, viz jeho komentář v tomhle souboru, proto nový event).
  // Krátký nepravidelný "prasknutí" zvuk — dvě rychlé nesouhlasné noty.
  [AUDIO_EVENTS.cameraDamageStart]: {
    src: "/assets/audio/camera_damage_start.mp3",
    volume: 0.6,
    loop: false,
    fallbackSynth: {
      notes: [
        { frequency: 220, durationMs: 60, gapMs: 20 },
        { frequency: 90, durationMs: 100 },
      ],
      volume: 0.5,
      waveform: "sawtooth",
    },
  },
  // Úplné přerušení signálu (attackPhase -> "offline") — nižší, delší tón,
  // ať je jasně odlišný od cameraDamageStart výše ("začátek" vs. "konec").
  [AUDIO_EVENTS.cameraSignalLost]: {
    src: "/assets/audio/camera_signal_lost.mp3",
    volume: 0.6,
    loop: false,
    fallbackSynth: {
      notes: [{ frequency: 60, durationMs: 260 }],
      volume: 0.5,
      waveform: "sawtooth",
    },
  },
  // Kroky Ghoula z mikrofonu offline kamery (viz zadání) — existující
  // candidate soubor (7s, CC0, freesound.org/people/SecureSubset/sounds/813622/,
  // viz app/dev-sound/page.tsx CANDIDATE_LIST "Kroky — člověk, kámen"),
  // znovupoužitý přímo ze své dosavadní cesty — ŽÁDNÁ kopie souboru (viz
  // zadání "Nevytvářej druhou kopii stejného souboru"). Mírně ztišené oproti
  // preview hlasitosti, ať to zní jako vzdálený mikrofonní přenos, ne
  // zvuk "v místnosti".
  [AUDIO_EVENTS.disabledCameraFootsteps]: {
    src: "/dev-sound-candidates/footsteps_human/footsteps_stone_securesubset.mp3",
    volume: 0.5,
    loop: false,
  },
  // Rádiová hláška "kamera zničena" — tři reálné namluvené varianty
  // (camera_destroid_full_1.wav, zpracováno ffmpeg, viz
  // game/radio/cameraDisabledRadioMessage.ts).
  [AUDIO_EVENTS.radioCameraDestroyed0]: {
    src: "/object_13/sound/camera_destroid/radio_camera_destroyed_0.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioCameraDestroyed1]: {
    src: "/object_13/sound/camera_destroid/radio_camera_destroyed_1.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.radioCameraDestroyed2]: {
    src: "/object_13/sound/camera_destroid/radio_camera_destroyed_2.mp3",
    volume: 0.85,
    loop: false,
  },
  // Řev Ghoula PŘESNĚ v okamžiku zahájení útoku na kameru (viz
  // ghoulCameraAttackWarning0/1 v audioEvents.ts, game/radio/ghoulCameraAttackWarningMessage.ts)
  // — dvě varianty (ghoul_appear_0/1.wav, dodané zdrojové soubory), zpracováno
  // `ffmpeg -af "volume=6dB" -codec:a libmp3lame -b:a 128k` (zdroj byl mírně
  // tichý, max_volume ~-7dB, teď ~-1.5dB, stejný postup jako monster_retreat_roar).
  [AUDIO_EVENTS.ghoulCameraAttackWarning0]: {
    src: "/object_13/sound/camera_destroid/ghoul_appear_0.mp3",
    volume: 0.8,
    loop: false,
  },
  [AUDIO_EVENTS.ghoulCameraAttackWarning1]: {
    src: "/object_13/sound/camera_destroid/ghoul_appear_1.mp3",
    volume: 0.8,
    loop: false,
  },
  // Titanův útěk (viz zadání, game/radio/titanEscapeMessages.ts) — pět
  // skutečně namluvených, rozřezaných variant (source master viz
  // public/object_13/sound/titan_escape/source/titan_escape_raw.wav).
  // Stejný "žádný fallbackSynth" princip jako radioReleaseMonster* výše —
  // chybějící/nenačtený soubor se tiše ignoruje (viz audioManager.ts#play),
  // titulek se zobrazí i tak (text je zdroj pravdy, viz
  // titanEscapeMessages.ts hlavička).
  [AUDIO_EVENTS.titanEscape01]: {
    src: "/object_13/sound/titan_escape/titan_escape_01.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.titanEscape02]: {
    src: "/object_13/sound/titan_escape/titan_escape_02.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.titanEscape03]: {
    src: "/object_13/sound/titan_escape/titan_escape_03.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.titanEscape04]: {
    src: "/object_13/sound/titan_escape/titan_escape_04.mp3",
    volume: 0.85,
    loop: false,
  },
  [AUDIO_EVENTS.titanEscape05]: {
    src: "/object_13/sound/titan_escape/titan_escape_05.mp3",
    volume: 0.85,
    loop: false,
  },
};
