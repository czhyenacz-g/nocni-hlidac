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
    description: "Přepnutí světla do chodby. Znovupoužitý i pro sonické dělo — viz níže.",
    guess: "Cvaknutí vypínače/relé.",
    usedIn:
      "app/play/page.tsx — efekt na state.lightOn A efekt na state.sonicCannonToggleSeq " +
      "(ruční zapnutí/vypnutí sonického děla i automatické vypnutí po decision ticku).",
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
    description: "Hráč úspěšně dokončil ruční výměnu prasklé žárovky (DoorView, hold 7 s).",
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
  [AUDIO_EVENTS.achievementUnlock]: {
    id: AUDIO_EVENTS.achievementUnlock,
    label: "Achievement unlock",
    description: "Výsledková obrazovka (přežitá noc/smrt/true ending) zobrazuje aspoň jedno nově odemčené dosažení.",
    guess: "Krátké pozitivní vzestupné pípnutí, terminálový confirm zvuk, ne UI click a ne hororový zvuk.",
    usedIn: "components/achievements/AchievementResultPanel.tsx — mount efekt, jen když achievements.length > 0.",
  },
  [AUDIO_EVENTS.deathSequenceRoar]: {
    id: AUDIO_EVENTS.deathSequenceRoar,
    label: "Death sequence — roar",
    description: 'Death sekvence dosáhne fáze "impact" (shake začíná) — viz roarVolume v DeathTestControls.tsx.',
    guess: "Krátký sestupný řev monstra, podobný hardcoreSelectRoar, jen výrazně nižší tón.",
    usedIn: "components/death/DeathSequenceOverlay.tsx — tick() na přechod do fáze impact.",
  },
  [AUDIO_EVENTS.deathSequenceImpact]: {
    id: AUDIO_EVENTS.deathSequenceImpact,
    label: "Death sequence — impact",
    description: 'Stejná chvíle jako deathSequenceRoar (fáze "impact") — viz impactVolume v DeathTestControls.tsx.',
    guess: "Krátký nízký úder/thud, hraje souběžně s roarem, ne samostatně slyšitelný.",
    usedIn: "components/death/DeathSequenceOverlay.tsx — tick() na přechod do fáze impact.",
  },
  [AUDIO_EVENTS.deathSequenceGlitch]: {
    id: AUDIO_EVENTS.deathSequenceGlitch,
    label: "Death sequence — glitch",
    description: 'Death sekvence dosáhne fáze "death_frame" (zobrazí se "SIGNÁL ZTRACEN") — viz glitchVolume.',
    guess: "Krátké rušení signálu, rychle střídané vysoké/nízké tóny, ne hudební.",
    usedIn: "components/death/DeathSequenceOverlay.tsx — tick() na přechod do fáze death_frame.",
  },
  [AUDIO_EVENTS.deathSequenceFinal]: {
    id: AUDIO_EVENTS.deathSequenceFinal,
    label: "Death sequence — final",
    description: 'Death sekvence dosáhne fáze "game_over" (zobrazí se "GAME OVER") — viz deathVolume.',
    guess: "Dlouhý nízký ponurý tón, definitivní stinger \"je konec\".",
    usedIn: "components/death/DeathSequenceOverlay.tsx — tick() na přechod do fáze game_over.",
  },
  [AUDIO_EVENTS.radioReleaseMonster01]: {
    id: AUDIO_EVENTS.radioReleaseMonster01,
    label: "Rádio / vypuštění monstra / varianta 01",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioReleaseMonster02]: {
    id: AUDIO_EVENTS.radioReleaseMonster02,
    label: "Rádio / vypuštění monstra / varianta 02",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioReleaseMonster03]: {
    id: AUDIO_EVENTS.radioReleaseMonster03,
    label: "Rádio / vypuštění monstra / varianta 03",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioReleaseMonster04]: {
    id: AUDIO_EVENTS.radioReleaseMonster04,
    label: "Rádio / vypuštění monstra / varianta 04",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioReleaseMonster05]: {
    id: AUDIO_EVENTS.radioReleaseMonster05,
    label: "Rádio / vypuštění monstra / varianta 05",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioReleaseMonster06]: {
    id: AUDIO_EVENTS.radioReleaseMonster06,
    label: "Rádio / vypuštění monstra / varianta 06",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioReleaseMonster07]: {
    id: AUDIO_EVENTS.radioReleaseMonster07,
    label: "Rádio / vypuštění monstra / varianta 07",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioReleaseMonster08]: {
    id: AUDIO_EVENTS.radioReleaseMonster08,
    label: "Rádio / vypuštění monstra / varianta 08",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioReleaseMonster09]: {
    id: AUDIO_EVENTS.radioReleaseMonster09,
    label: "Rádio / vypuštění monstra / varianta 09",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioReleaseMonster10]: {
    id: AUDIO_EVENTS.radioReleaseMonster10,
    label: "Rádio / vypuštění monstra / varianta 10",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioReleaseMonster11]: {
    id: AUDIO_EVENTS.radioReleaseMonster11,
    label: "Rádio / vypuštění monstra / varianta 11",
    description: "Jedna z 11 namluvených variant hlášky o vypuštění testovacího subjektu, přehraje se náhodně.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~2-3s.",
    usedIn: "game/radio/useRadioMessage.ts — pickRandomReleaseMonsterMessage() při prvním vstupu monstra do outer_yard.",
  },
  [AUDIO_EVENTS.radioMonsterRepelSuccess0]: {
    id: AUDIO_EVENTS.radioMonsterRepelSuccess0,
    label: "Rádio / Sonické dělo / Úspěch 01",
    description: "Jedna ze 4 variant reakce, když sonické dělo přinutí monstrum ustoupit.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~1s.",
    usedIn: "game/radio/useMonsterRepelRadioMessage.ts — pickRandomMonsterRepelMessage('success') po sonic retreat výsledku.",
  },
  [AUDIO_EVENTS.radioMonsterRepelSuccess1]: {
    id: AUDIO_EVENTS.radioMonsterRepelSuccess1,
    label: "Rádio / Sonické dělo / Úspěch 02",
    description: "Jedna ze 4 variant reakce, když sonické dělo přinutí monstrum ustoupit.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~1s.",
    usedIn: "game/radio/useMonsterRepelRadioMessage.ts — pickRandomMonsterRepelMessage('success') po sonic retreat výsledku.",
  },
  [AUDIO_EVENTS.radioMonsterRepelSuccess2]: {
    id: AUDIO_EVENTS.radioMonsterRepelSuccess2,
    label: "Rádio / Sonické dělo / Úspěch 03",
    description: "Jedna ze 4 variant reakce, když sonické dělo přinutí monstrum ustoupit.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~1s.",
    usedIn: "game/radio/useMonsterRepelRadioMessage.ts — pickRandomMonsterRepelMessage('success') po sonic retreat výsledku.",
  },
  [AUDIO_EVENTS.radioMonsterRepelSuccess3]: {
    id: AUDIO_EVENTS.radioMonsterRepelSuccess3,
    label: "Rádio / Sonické dělo / Úspěch 04",
    description: "Jedna ze 4 variant reakce, když sonické dělo přinutí monstrum ustoupit.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~1s.",
    usedIn: "game/radio/useMonsterRepelRadioMessage.ts — pickRandomMonsterRepelMessage('success') po sonic retreat výsledku.",
  },
  [AUDIO_EVENTS.radioMonsterRepelStay0]: {
    id: AUDIO_EVENTS.radioMonsterRepelStay0,
    label: "Rádio / Sonické dělo / Zůstává 01",
    description: "Jedna ze 3 variant reakce, když sonické dělo monstrum nepohne ani jedním směrem.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~1-1.5s.",
    usedIn: "game/radio/useMonsterRepelRadioMessage.ts — pickRandomMonsterRepelMessage('stay') po sonic stay výsledku.",
  },
  [AUDIO_EVENTS.radioMonsterRepelStay1]: {
    id: AUDIO_EVENTS.radioMonsterRepelStay1,
    label: "Rádio / Sonické dělo / Zůstává 02",
    description: "Jedna ze 3 variant reakce, když sonické dělo monstrum nepohne ani jedním směrem.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~1-1.5s.",
    usedIn: "game/radio/useMonsterRepelRadioMessage.ts — pickRandomMonsterRepelMessage('stay') po sonic stay výsledku.",
  },
  [AUDIO_EVENTS.radioMonsterRepelStay2]: {
    id: AUDIO_EVENTS.radioMonsterRepelStay2,
    label: "Rádio / Sonické dělo / Zůstává 03",
    description: "Jedna ze 3 variant reakce, když sonické dělo monstrum nepohne ani jedním směrem.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~1-1.5s.",
    usedIn: "game/radio/useMonsterRepelRadioMessage.ts — pickRandomMonsterRepelMessage('stay') po sonic stay výsledku.",
  },
  [AUDIO_EVENTS.radioMonsterRepelFail0]: {
    id: AUDIO_EVENTS.radioMonsterRepelFail0,
    label: "Rádio / Sonické dělo / Selhání 01",
    description: "Jedna ze 3 variant reakce, když sonické dělo monstrum nezastaví a ono pokračuje vpřed.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~1-1.5s.",
    usedIn: "game/radio/useMonsterRepelRadioMessage.ts — pickRandomMonsterRepelMessage('fail') po sonic advance výsledku.",
  },
  [AUDIO_EVENTS.radioMonsterRepelFail1]: {
    id: AUDIO_EVENTS.radioMonsterRepelFail1,
    label: "Rádio / Sonické dělo / Selhání 02",
    description: "Jedna ze 3 variant reakce, když sonické dělo monstrum nezastaví a ono pokračuje vpřed.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~1-1.5s.",
    usedIn: "game/radio/useMonsterRepelRadioMessage.ts — pickRandomMonsterRepelMessage('fail') po sonic advance výsledku.",
  },
  [AUDIO_EVENTS.radioMonsterRepelFail2]: {
    id: AUDIO_EVENTS.radioMonsterRepelFail2,
    label: "Rádio / Sonické dělo / Selhání 03",
    description: "Jedna ze 3 variant reakce, když sonické dělo monstrum nezastaví a ono pokračuje vpřed.",
    guess: "Krátká rádiová hláška (namluvený hlas, lehký radio processing), ~1-1.5s.",
    usedIn: "game/radio/useMonsterRepelRadioMessage.ts — pickRandomMonsterRepelMessage('fail') po sonic advance výsledku.",
  },
  [AUDIO_EVENTS.sonicCannonHum]: {
    id: AUDIO_EVENTS.sonicCannonHum,
    label: "Sonické dělo / Provozní bzučení",
    description: "Smyčka, hraje jen dokud je state.sonicCannonActive === true. Žádný finální asset zatím neexistuje — vždy fallback synth (viz audioConfig.ts).",
    guess: "Hluboké elektrické 'bzzz' (95Hz sawtooth), velmi tiché, bez melodie.",
    usedIn: "app/play/page.tsx — efekt na state.sonicCannonActive (startLoop/stopLoop).",
  },
};
