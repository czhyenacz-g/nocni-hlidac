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
  [AUDIO_EVENTS.heartbeatStressSlow]: {
    id: AUDIO_EVENTS.heartbeatStressSlow,
    label: "Heartbeat stress (slow loop)",
    description: "Plynulý heartbeat loop pro nízký/střední stres — hlasitost řídí useHeartbeatStress.",
    guess: "Pomalejší tlukot srdce s reverbem, jemné napětí.",
    usedIn: "game/audio/useHeartbeatStress.ts — startLoop jednou, hlasitost přes setVolume podle stressLevel.",
  },
  [AUDIO_EVENTS.heartbeatStressFast]: {
    id: AUDIO_EVENTS.heartbeatStressFast,
    label: "Heartbeat stress (fast loop)",
    description: "Plynulý heartbeat loop pro nejvyšší stres (monstrum v door_hallway, otevřené dveře).",
    guess: "Rychlý, panický tlukot srdce s reverbem.",
    usedIn: "game/audio/useHeartbeatStress.ts — startLoop jednou, hlasitost přes setVolume podle stressLevel.",
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
    description:
      "Normální pípnutí generátoru každých ~5 s (vše v pořádku). V criticalBeeping stavu " +
      "stejný zvuk, jen rychlejší tempo (~2×/s) — jediná signalizace kromě rychlého poklesu energie.",
    guess: "Krátké elektronické pípnutí.",
    usedIn: "app/play/page.tsx — efekt na state.generatorBeepSeq.",
  },
  [AUDIO_EVENTS.monsterRetreatRoar]: {
    id: AUDIO_EVENTS.monsterRetreatRoar,
    label: "Monster retreat roar",
    description: "Door-light repel — zavřené dveře + světlo + nepřítel u dveří ~1.5 s.",
    guess: "Nízký, krátký řev/zavrčení.",
    usedIn: "app/play/page.tsx — efekt na state.monsterRetreatRoarSeq.",
  },
  [AUDIO_EVENTS.monsterDoorBang]: {
    id: AUDIO_EVENTS.monsterDoorBang,
    label: "Monster door bang",
    description:
      "Monstrum u zavřených dveří útočí, ale útok je zablokovaný (viz " +
      "game/core/doorEncounter.ts#isDoorAttackBlockedByClosedDoor) — jen jako přímý důsledek téhle podmínky, nikdy náhodně. " +
      "Přehraje se jako 1–2 údery (chooseDoorBangPlaybackPlan) s cooldownem proti spamu (MONSTER_DOOR_BANG_COOLDOWN_MS).",
    guess: "Těžká, krátká, fyzická rána do dveří — potvrzení nárazu, ne lekací výkřik.",
    usedIn: "app/play/page.tsx — efekt na state.doorBangSeq.",
  },
  [AUDIO_EVENTS.monsterRetreatSteps]: {
    id: AUDIO_EVENTS.monsterRetreatSteps,
    label: "Monster retreat steps",
    description: "Kroky monstra při ústupu po door-light repelu — hraje krátce po monsterRetreatRoar.",
    guess: "Tiché, vzdalující se kroky.",
    usedIn: "app/play/page.tsx — efekt na state.monsterRetreatRoarSeq (stejný trigger jako monsterRetreatRoar).",
  },
  [AUDIO_EVENTS.blackoutHowl]: {
    id: AUDIO_EVENTS.blackoutHowl,
    label: "Blackout howl",
    description: "Start blackoutu (energie na nule).",
    guess: "Vzdálené zavytí.",
    usedIn: 'app/play/page.tsx — efekt na přechod state.gameStatus "normal" -> "blackout".',
  },
  [AUDIO_EVENTS.blackoutStepsFar]: {
    id: AUDIO_EVENTS.blackoutStepsFar,
    label: "Blackout — kroky (vzdálené)",
    description: "Blackout fáze 1 (viz game/visuals/blackoutPhase.ts).",
    guess: "Tichý, vzdálený, těžký krok — něco je v budově.",
    usedIn: "app/play/page.tsx — efekt na state.blackoutPhaseSeq (fáze 1).",
  },
  [AUDIO_EVENTS.blackoutStepsNear]: {
    id: AUDIO_EVENTS.blackoutStepsNear,
    label: "Blackout — kroky (blízké)",
    description: "Blackout fáze 2 (viz game/visuals/blackoutPhase.ts).",
    guess: "Hlasitější, bližší, těžký krok.",
    usedIn: "app/play/page.tsx — efekt na state.blackoutPhaseSeq (fáze 2).",
  },
  [AUDIO_EVENTS.blackoutMonsterRoar]: {
    id: AUDIO_EVENTS.blackoutMonsterRoar,
    label: "Blackout — řev (těsně před smrtí)",
    description: "Blackout, roarLeadMs před koncem (viz GameState.blackoutRoarSeq).",
    guess: "Krátký, výrazný řev, ne ještě jumpscare.",
    usedIn: "app/play/page.tsx — efekt na state.blackoutRoarSeq.",
  },
  [AUDIO_EVENTS.bulbBreak]: {
    id: AUDIO_EVENTS.bulbBreak,
    label: "Bulb break",
    description: "Žárovka v místnosti (nearRoom) došla na konec životnosti a praskla.",
    guess: "Krátké prasknutí/cvaknutí skla.",
    usedIn: "app/play/page.tsx — efekt na state.bulbBreakSeq (viz game/core/roomBulbs.ts).",
  },
  [AUDIO_EVENTS.bulbReplaceSuccess]: {
    id: AUDIO_EVENTS.bulbReplaceSuccess,
    label: "Bulb replace success",
    description: "Hráč úspěšně dokončil ruční výměnu prasklé žárovky (DoorView, hold 10 s).",
    guess: "Krátké, pozitivní elektrické „vzum“/naskočení světla, ne UI beep, ne hororový zvuk.",
    usedIn: "app/play/page.tsx — efekt na state.bulbReplaceSuccessSeq (viz gameReducer.ts#updateBulbReplacement).",
  },
  [AUDIO_EVENTS.monsterWounded]: {
    id: AUDIO_EVENTS.monsterWounded,
    label: "Monster wounded",
    description: "Hráč trefil monstrum brokovnicí v EmergencyMiniGame (isEnemyHit) — monstrum je jen omráčené, ne mrtvé.",
    guess: "Krátký bolestivý řev, tišší/kratší než jumpscare nebo blackoutMonsterRoar.",
    usedIn: "components/minigame/EmergencyMiniGame.tsx — fireShot() na result.hit.",
  },
  [AUDIO_EVENTS.itemPickup]: {
    id: AUDIO_EVENTS.itemPickup,
    label: "Item pickup",
    description: "Hráč sebral loot v EmergencyMiniGame (baterie/žárovka/brokovnice, hlavní objective i doplňkový loot).",
    guess: "Stejný soubor jako UI click, jen výrazně hlasitější.",
    usedIn: "components/minigame/EmergencyMiniGame.tsx — tick() auto-collect (hlavní item i extraLoot smyčka).",
  },
  [AUDIO_EVENTS.emergencyRunSiren]: {
    id: AUDIO_EVENTS.emergencyRunSiren,
    label: "Emergency run siren",
    description: 'Hráč drží tlačítko "Nouzově opustit místnost" — hraje po celou dobu držení, ne jednorázově.',
    guess: "Reálná poplachová siréna (Whelen WPS-3016 WAIL), 11s bezešvá smyčka.",
    usedIn: "app/play/page.tsx — efekt na state.emergencyRunWindup.active (startLoop/stopLoop).",
  },
  [AUDIO_EVENTS.hardcoreSelectRoar]: {
    id: AUDIO_EVENTS.hardcoreSelectRoar,
    label: "Hardcore select roar",
    description: "Hráč klikne na HARDCORE v hlavním menu.",
    guess: "Krátký (2.2s) řev monstra místo obyčejného UI kliknutí.",
    usedIn: "components/screens/MainMenuScreen.tsx — handleSelectHardcore().",
  },
  [AUDIO_EVENTS.monsterFinalDeathRoar]: {
    id: AUDIO_EVENTS.monsterFinalDeathRoar,
    label: "Monster final death roar",
    description: "Hráč dá monstru 10. (finální) potvrzený zásah — hidden true ending, znamená smrt, ne ústup.",
    guess: "Krátký (3.8s) hlubší/ostřejší řev než hardcoreSelectRoar — poslední, definitivní.",
    usedIn: "components/minigame/EmergencyMiniGame.tsx — fireShot() při isMonsterHitFinal.",
  },
};
