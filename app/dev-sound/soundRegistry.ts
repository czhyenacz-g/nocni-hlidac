import { AUDIO_EVENTS, AudioEventId } from "@/game/audio/audioEvents";

export interface SoundRegistryEntry {
  id: AudioEventId;
  label: string;
  description: string;
  /** Subjektivní odhad, jak zvuk asi zní/co evokuje — ne autoritativní popis. */
  guess: string;
  usedIn: string;
}

// Dev přehled nad game/audio/audioEvents.ts + audioConfig.ts pro /dev-sound
// (viz app/dev-sound/page.tsx). Zdroj pravdy zůstává v game/audio/ — tahle
// tabulka je jen čitelný komentář navíc, Record<AudioEventId, ...> vynutí,
// že žádný event tady nechybí.
export const SOUND_REGISTRY: Record<AudioEventId, SoundRegistryEntry> = {
  [AUDIO_EVENTS.ambienceLoop]: {
    id: AUDIO_EVENTS.ambienceLoop,
    label: "Ambience loop",
    description: "Tiché smyčkové pozadí, hraje po celou dobu směny.",
    guess: "Nízký dron/šum elektroinstalace, atmosférický podklad.",
    usedIn: 'app/play/page.tsx — startLoop na screen "playing", stopLoop na "death"/"win".',
  },
  [AUDIO_EVENTS.heartbeat]: {
    id: AUDIO_EVENTS.heartbeat,
    label: "Heartbeat (překvapení)",
    description: 'Zahraje jen když je nepřítel právě na kameře nejblíž hráči ("door_hallway").',
    guess: "Krátký tlukot srdce (lub-dub), leknutí místo generického šumu.",
    usedIn: "app/play/page.tsx — handleSelectCamera (jednou za návštěvu nepřítele na té kameře).",
  },
  [AUDIO_EVENTS.doorClose]: {
    id: AUDIO_EVENTS.doorClose,
    label: "Door close",
    description: "Zavření dveří.",
    guess: "Cvaknutí/bouchnutí těžkých dveří.",
    usedIn: "app/play/page.tsx — efekt na state.doorClosed (true).",
  },
  [AUDIO_EVENTS.doorOpen]: {
    id: AUDIO_EVENTS.doorOpen,
    label: "Door open",
    description: "Otevření dveří.",
    guess: "Cvaknutí zámku/vrznutí otevíraných dveří.",
    usedIn: "app/play/page.tsx — efekt na state.doorClosed (false).",
  },
  [AUDIO_EVENTS.lightClick]: {
    id: AUDIO_EVENTS.lightClick,
    label: "Light click",
    description: "Přepnutí světla do chodby.",
    guess: "Cvaknutí vypínače.",
    usedIn: "app/play/page.tsx — efekt na state.lightOn.",
  },
  [AUDIO_EVENTS.enemyStep]: {
    id: AUDIO_EVENTS.enemyStep,
    label: "Enemy step",
    description: "Nepřítel se pohnul na trase, ale ještě není u dveří.",
    guess: "Vzdálenější/tišší krok.",
    usedIn:
      "app/play/page.tsx — efekt na state.enemyStage (mimo outside/at_door/attack); " +
      "fáze 1 blackoutu; poslední krok před útokem (efekt na screen=death, deathReason=door_open_at_attack).",
  },
  [AUDIO_EVENTS.enemyNear]: {
    id: AUDIO_EVENTS.enemyNear,
    label: "Enemy near",
    description: 'Nepřítel došel ke dveřím ("at_door").',
    guess: "Blízký/hlasitější krok, varovný.",
    usedIn: "app/play/page.tsx — efekt na state.enemyStage === \"at_door\"; fáze 2 blackoutu.",
  },
  [AUDIO_EVENTS.powerLow]: {
    id: AUDIO_EVENTS.powerLow,
    label: "Power low",
    description: "Energie klesla pod 25 %.",
    guess: "Varovné pípnutí/klesající tón.",
    usedIn: "app/play/page.tsx — efekt na state.power (překročení prahu 25).",
  },
  [AUDIO_EVENTS.jumpscare]: {
    id: AUDIO_EVENTS.jumpscare,
    label: "Jumpscare",
    description: "Hráč zemřel — útok u dveří nebo konec blackoutu.",
    guess: "Hlasitý lekací zvuk/výkřik.",
    usedIn:
      "app/play/page.tsx — efekt na state.screen === \"death\" (u door_open_at_attack s ~220 ms " +
      "odkladem po enemy_step, jinak instantně).",
  },
  [AUDIO_EVENTS.shiftWin]: {
    id: AUDIO_EVENTS.shiftWin,
    label: "Shift win",
    description: "Hráč přežil směnu.",
    guess: "Uklidňující/vítězný tón.",
    usedIn: 'app/play/page.tsx — efekt na state.screen === "win".',
  },
  [AUDIO_EVENTS.uiClick]: {
    id: AUDIO_EVENTS.uiClick,
    label: "UI click",
    description: "Obecný klik na UI tlačítko (start, otočení pohledu, restart generátoru...).",
    guess: "Krátké neutrální cvaknutí.",
    usedIn: "app/play/page.tsx — handleStart/handleRestart/handleLookAt*/handleRestartGenerator.",
  },
  [AUDIO_EVENTS.generatorBeep]: {
    id: AUDIO_EVENTS.generatorBeep,
    label: "Generator beep",
    description: "Normální pípnutí generátoru každých ~5 s (vše v pořádku).",
    guess: "Krátké elektronické pípnutí.",
    usedIn: "app/play/page.tsx — efekt na state.generatorBeepSeq, když generatorState !== criticalBeeping.",
  },
  [AUDIO_EVENTS.generatorWarningBeep]: {
    id: AUDIO_EVENTS.generatorWarningBeep,
    label: "Generator warning beep",
    description: "Rychlé varovné pípání v kritickém stavu generátoru.",
    guess: "Rychlejší/naléhavější varianta pípnutí.",
    usedIn: "app/play/page.tsx — efekt na state.generatorBeepSeq, když generatorState === criticalBeeping.",
  },
  [AUDIO_EVENTS.monsterRetreatRoar]: {
    id: AUDIO_EVENTS.monsterRetreatRoar,
    label: "Monster retreat roar",
    description: "Door-light repel — zavřené dveře + světlo + nepřítel u dveří ~1.5 s.",
    guess: "Nízký, krátký řev/zavrčení.",
    usedIn: "app/play/page.tsx — efekt na state.monsterRetreatRoarSeq.",
  },
  [AUDIO_EVENTS.blackoutHowl]: {
    id: AUDIO_EVENTS.blackoutHowl,
    label: "Blackout howl",
    description: "Start blackoutu (energie na nule).",
    guess: "Vzdálené zavytí.",
    usedIn: 'app/play/page.tsx — efekt na přechod state.gameStatus "normal" -> "blackout".',
  },
  [AUDIO_EVENTS.blackoutDoorHit]: {
    id: AUDIO_EVENTS.blackoutDoorHit,
    label: "Blackout door hit",
    description: "Poslední fáze blackoutu, těsně před koncem.",
    guess: "Dech/bouchání/blízký úder do dveří.",
    usedIn: "app/play/page.tsx — efekt na state.blackoutPhaseSeq, fáze 3.",
  },
};
