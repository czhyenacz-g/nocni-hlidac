"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import MainMenuScreen from "@/components/screens/MainMenuScreen";
import LoadingScreen from "@/components/screens/LoadingScreen";
import GameScreen from "@/components/screens/GameScreen";
import DeathScreen from "@/components/screens/DeathScreen";
import WinScreen from "@/components/screens/WinScreen";
import { NIGHT_01 } from "@/game/nights/night01";
import { createInitialGameState } from "@/game/core/gameState";
import { createGameReducer } from "@/game/core/gameReducer";
import { useGameLoop } from "@/game/core/gameLoop";
import { CameraId } from "@/game/core/types";
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_EVENTS } from "@/game/audio/audioEvents";
import { computeTensionLevel } from "@/game/visuals/atmosphereState";
import { atmosphereStyleToCssVars, tensionToAtmosphereStyle } from "@/game/visuals/visualEffects";
import { getBlackoutPhaseIndex } from "@/game/visuals/blackoutPhase";
import {
  AMBIENCE_DEATH_FADE_MS,
  BLACKOUT_FINAL_AMBIENCE_FADE_MS,
  JUMPSCARE_SILENT_GAP_MS,
  LOADING_SCREEN_DURATION_MS,
} from "@/game/balancing/constants";
import { getDeathCount, incrementDeathCount } from "@/game/core/deathCount";
import { getSurvivedNights, incrementSurvivedNights, resetSurvivedNights } from "@/game/core/survivedNights";
import { getBulbsRemaining, setBulbsRemaining } from "@/game/core/bulbInventory";
import { applyDailyBulbService, getRoomBulbs, setRoomBulbs } from "@/game/core/roomBulbs";
import { useHeartbeatStress } from "@/game/audio/useHeartbeatStress";

const night = NIGHT_01;
const gameReducer = createGameReducer(night);

// Kamera nejblíž hráči (nejvyšší order) — používá se pro podmíněný heartbeat
// při výběru kamery, viz handleSelectCamera níže.
const nearestCamera = [...night.cameras].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];

export default function PlayPage() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialGameState(night));
  // Kolik hlídačů už na týhle pozici selhalo — čistě lokální localStorage
  // counter (viz game/core/deathCount.ts), nezávislý na herním stavu/reduceru.
  // Lazy initializer čte aktuální hodnotu jen jednou při prvním mountu.
  const [deathCount, setDeathCount] = useState(() => getDeathCount());
  // Kolik nocí v řadě aktuální hlídač přežil bez smrti (viz
  // game/core/survivedNights.ts) — na rozdíl od deathCount se smrtí vynuluje.
  const [survivedNights, setSurvivedNights] = useState(() => getSurvivedNights());
  // Jediný zdroj "kolikátá noc" — používá ho HUD (ShiftTimer přes nightNumber
  // prop níže) i night scaling (game/difficulty/nightScaling.ts), ne dva
  // paralelní výpočty.
  const currentNight = survivedNights + 1;

  // "Nejnovější hodnota" ref pro stress (viz stressTimeScale.ts přes TICK) —
  // gameLoop.ts jím jen čte .current uvnitř setInterval, ať se interval
  // nemusí kvůli rychle se měnícímu stresu (~10×/s) pořád rušit a zakládat
  // znovu. Aktualizuje se níže po useHeartbeatStress, obyčejné přiřazení při
  // renderu (ne efekt) — stejný "latest ref" vzor jako jinde v Reactu.
  const stressLevelRef = useRef(0);
  useGameLoop({
    isRunning: state.isRunning,
    enemyTickMs: night.enemyTickMs,
    dispatch,
    stressLevelRef,
    currentNight,
  });
  const heartbeatStress = useHeartbeatStress(state, night);
  stressLevelRef.current = heartbeatStress;

  const prevScreenRef = useRef(state.screen);
  const prevDoorRef = useRef(state.doorClosed);
  const prevLightRef = useRef(state.lightOn);
  const prevPowerRef = useRef(state.power);
  const prevGeneratorBeepSeqRef = useRef(state.generatorBeepSeq);
  const prevMonsterRetreatRoarSeqRef = useRef(state.monsterRetreatRoarSeq);
  const prevGameStatusRef = useRef(state.gameStatus);
  const prevBlackoutPhaseSeqRef = useRef(state.blackoutPhaseSeq);
  const prevBulbBreakSeqRef = useRef(state.bulbBreakSeq);
  // Zvuk překvapení na nejbližší kameře smí zaznít jen jednou za "návštěvu" —
  // dokud tam nepřítel je, další kliknutí na kameru (ani na jinou a zpátky) ho
  // znovu nespustí. Resetuje se, až nepřítel z téhle stage odejde (uteče/postoupí).
  const hasPlayedNearCameraSurpriseRef = useRef(false);

  useEffect(() => {
    audioManager.setMuted(state.audioMuted);
  }, [state.audioMuted]);

  useEffect(() => {
    if (prevScreenRef.current === state.screen) return;

    let jumpscareTimeout: ReturnType<typeof setTimeout> | undefined;

    if (state.screen === "playing") {
      audioManager.startLoop(AUDIO_EVENTS.ambienceLoop);
    }
    if (state.screen === "death") {
      // Útok/smrt má vlastní tříbeatovou sekvenci, ne okamžité zastavení
      // ambience + hned jumpscare: (1) ambience plynule ztiší přes
      // AMBIENCE_DEATH_FADE_MS, (2) JUMPSCARE_SILENT_GAP_MS naprostého ticha,
      // (3) teprve pak jumpscare — ticho těsně před lekačkou je součást
      // efektu (viz AUDIO_DESIGN.md "Ticho před lekačkou").
      audioManager.fadeOutLoop(AUDIO_EVENTS.ambienceLoop, AMBIENCE_DEATH_FADE_MS);
      // Counter se zvyšuje přesně tady — při přechodu hry do "death" stavu,
      // ne při kliknutí na tlačítko restartu (handleRestart) a ne při výhře.
      // Tenhle efekt už díky prevScreenRef diffingu (viz podmínka nahoře)
      // firuje jen jednou za skutečný přechod, ne při každém rerenderu.
      setDeathCount(incrementDeathCount());
      // Aktuální hlídač skončil — survival streak jde na 0 (viz
      // game/core/survivedNights.ts), death counter nahoře tím není dotčený.
      setSurvivedNights(resetSurvivedNights());
      // Žárovka je vlastnost OBJEKTU, ne hlídače — smrt ji jen uloží tak, jak
      // byla (žádný denní servis, ten běží jen po přežité směně, viz "win"
      // níže), ať další hlídač pokračuje přesně odtud, kde předchozí skončil.
      setRoomBulbs(state.roomBulbs);
      // Náhradní žárovky patří do campaignu stejně jako roomBulbs — pokud
      // hráč spotřeboval kus dřív v týhle směně (dokončená ruční výměna),
      // musí to přežít i smrt z jiného důvodu, ne se ztratit.
      setBulbsRemaining(state.bulbsRemaining);
      if (state.deathReason === "door_open_at_attack") {
        // Poslední krok těsně u dveří hraje hned (stihne doznít dávno před
        // jumpscare, viz gap níže) — zřetelně odděleně, ne zamíchaně přes sebe.
        audioManager.play(AUDIO_EVENTS.enemyStep);
      }
      jumpscareTimeout = setTimeout(
        () => audioManager.play(AUDIO_EVENTS.jumpscare),
        AMBIENCE_DEATH_FADE_MS + JUMPSCARE_SILENT_GAP_MS,
      );
    }
    if (state.screen === "win") {
      audioManager.stopLoop(AUDIO_EVENTS.ambienceLoop);
      audioManager.play(AUDIO_EVENTS.shiftWin);
      // Stejný "zvyš přesně jednou při přechodu" vzor jako deathCount výše —
      // ne při kliknutí na tlačítko, ne opakovaně při rerenderu.
      setSurvivedNights(incrementSurvivedNights());
      // Denní servis: jen SKUTEČNĚ prasklé žárovky se vymění za náhradní kus
      // ze skladu (viz game/core/roomBulbs.ts#applyDailyBulbService) — slabá,
      // ale neprasklá žárovka se nedotkne. Běží jen tady (přežitá směna),
      // nikdy na smrt (viz "death" výše).
      // state.bulbsRemaining (živá hodnota z GameState), ne stará
      // getBulbsRemaining() z localStorage — jinak by denní servis přebil
      // spotřebu z ruční výměny dokončené dřív v týhle směně.
      const serviced = applyDailyBulbService(state.roomBulbs, state.bulbsRemaining);
      setRoomBulbs(serviced.roomBulbs);
      setBulbsRemaining(serviced.bulbsRemaining);
    }
    prevScreenRef.current = state.screen;

    return () => {
      if (jumpscareTimeout) clearTimeout(jumpscareTimeout);
    };
  }, [state.screen, state.deathReason]);

  useEffect(() => {
    if (prevDoorRef.current !== state.doorClosed) {
      audioManager.play(state.doorClosed ? AUDIO_EVENTS.doorClose : AUDIO_EVENTS.doorOpen);
      prevDoorRef.current = state.doorClosed;
    }
  }, [state.doorClosed]);

  useEffect(() => {
    if (prevLightRef.current !== state.lightOn) {
      audioManager.play(AUDIO_EVENTS.lightClick);
      prevLightRef.current = state.lightOn;
    }
  }, [state.lightOn]);

  useEffect(() => {
    const crossedLowThreshold = prevPowerRef.current > 25 && state.power <= 25;
    if (crossedLowThreshold) {
      audioManager.play(AUDIO_EVENTS.powerLow);
    }
    prevPowerRef.current = state.power;
  }, [state.power]);

  useEffect(() => {
    // Stejné pípnutí jako normální provoz, i v criticalBeeping — jen rychlejší
    // tempo (viz night.generator.criticalBeepIntervalMs). Jediná signalizace
    // rychlého úbytku energie kromě samotného poklesu na PowerMeter, viz
    // game/core/generatorUrgency.ts pro zpožděné blikání šipky na generátor.
    if (prevGeneratorBeepSeqRef.current !== state.generatorBeepSeq) {
      audioManager.play(AUDIO_EVENTS.generatorBeep);
      prevGeneratorBeepSeqRef.current = state.generatorBeepSeq;
    }
  }, [state.generatorBeepSeq]);

  useEffect(() => {
    // "attack" má vlastní zvukovou sekvenci (krok -> jumpscare, viz efekt na
    // state.screen výše) — tady by přehrání enemyNear souběžně s jumpscare
    // jen zamíchalo oba zvuky přes sebe.
    if (state.enemyStage === "at_door") {
      audioManager.play(AUDIO_EVENTS.enemyNear);
    } else if (state.enemyStage !== "outside" && state.enemyStage !== "attack") {
      audioManager.play(AUDIO_EVENTS.enemyStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.enemyStage]);

  useEffect(() => {
    // Nepřítel odešel z kamery nejblíž hráči — příští příchod tam bude zase překvapení.
    if (state.enemyStage !== nearestCamera.enemyVisibleAtStage) {
      hasPlayedNearCameraSurpriseRef.current = false;
    }
  }, [state.enemyStage]);

  useEffect(() => {
    if (prevMonsterRetreatRoarSeqRef.current !== state.monsterRetreatRoarSeq) {
      audioManager.play(AUDIO_EVENTS.monsterRetreatRoar);
      prevMonsterRetreatRoarSeqRef.current = state.monsterRetreatRoarSeq;
    }
  }, [state.monsterRetreatRoarSeq]);

  useEffect(() => {
    if (prevBulbBreakSeqRef.current !== state.bulbBreakSeq) {
      audioManager.play(AUDIO_EVENTS.bulbBreak);
      prevBulbBreakSeqRef.current = state.bulbBreakSeq;
    }
  }, [state.bulbBreakSeq]);

  useEffect(() => {
    if (prevGameStatusRef.current !== "blackout" && state.gameStatus === "blackout") {
      audioManager.play(AUDIO_EVENTS.blackoutHowl);
    }
    prevGameStatusRef.current = state.gameStatus;
  }, [state.gameStatus]);

  // Fáze 1/2 blackoutu (viz getBlackoutPhaseIndex) mají svůj zvuk — vzdálený
  // krok, blížící se krok. Fázi 0 (start) pokrývá blackoutHowl výše. Poslední
  // fáze (3, těsně před koncem) záměrně NEhraje žádný další zvuk — místo
  // toho ambient plynule doztichne úplně (viz BLACKOUT_FINAL_AMBIENCE_FADE_MS),
  // ať hráč čeká na smrt potichu, ne s dalším efektem navrch. Konec
  // (jumpscare) pokrývá efekt na screen === "death" beze změny.
  useEffect(() => {
    if (prevBlackoutPhaseSeqRef.current !== state.blackoutPhaseSeq) {
      const phase = getBlackoutPhaseIndex(state.blackoutElapsedMs, night.blackout);
      if (phase === 1) audioManager.play(AUDIO_EVENTS.enemyStep);
      else if (phase === 2) audioManager.play(AUDIO_EVENTS.enemyNear);
      else if (phase === 3) audioManager.fadeOutLoop(AUDIO_EVENTS.ambienceLoop, BLACKOUT_FINAL_AMBIENCE_FADE_MS);
      prevBlackoutPhaseSeqRef.current = state.blackoutPhaseSeq;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.blackoutPhaseSeq]);

  // Falešný loading screen — po LOADING_SCREEN_DURATION_MS automaticky spustí
  // směnu. Zatím nejde přeskočit, viz TODO.md.
  useEffect(() => {
    if (state.screen !== "loading") return;
    const timeout = setTimeout(
      () => dispatch({ type: "START_SHIFT", roomBulbs: getRoomBulbs(), bulbsRemaining: getBulbsRemaining() }),
      LOADING_SCREEN_DURATION_MS,
    );
    return () => clearTimeout(timeout);
  }, [state.screen]);

  function handleStart() {
    audioManager.init();
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "START_LOADING" });
  }

  function handleRestart() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "RESTART_SHIFT", roomBulbs: getRoomBulbs(), bulbsRemaining: getBulbsRemaining() });
  }

  function handleToggleDoor() {
    dispatch({ type: "TOGGLE_DOOR" });
  }

  function handleLookAtDoor() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "LOOK_AT_DOOR" });
  }

  function handleLookAtDesk() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "LOOK_AT_DESK" });
  }

  // DEV-ONLY: DebugPanel's direct door toggle simulates both steps of the
  // normal flow (look at door, then toggle) instead of bypassing it.
  function handleDebugToggleDoor() {
    dispatch({ type: "LOOK_AT_DOOR" });
    dispatch({ type: "TOGGLE_DOOR" });
  }

  function handleLookAtGenerator() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "LOOK_AT_GENERATOR" });
  }

  function handleRestartGenerator() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "RESTART_GENERATOR" });
  }

  // DEV-ONLY: same simulate-both-steps pattern as handleDebugToggleDoor.
  function handleDebugRestartGenerator() {
    dispatch({ type: "LOOK_AT_GENERATOR" });
    dispatch({ type: "RESTART_GENERATOR" });
  }

  function handleToggleLight() {
    dispatch({ type: "TOGGLE_LIGHT" });
  }

  function handleStartBulbReplacement() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "START_BULB_REPLACEMENT" });
  }

  function handleCancelBulbReplacement() {
    dispatch({ type: "CANCEL_BULB_REPLACEMENT" });
  }

  function handleSelectCamera(cameraId: CameraId) {
    // heartbeat je zvuk překvapení: hraje jen když je nepřítel právě na
    // kameře nejblíž hráči, a jen poprvé za tuto "návštěvu" — další kliknutí
    // (třeba na jinou kameru a zpátky), dokud tam pořád je, ho neopakuje.
    if (state.enemyStage === nearestCamera.enemyVisibleAtStage && !hasPlayedNearCameraSurpriseRef.current) {
      audioManager.play(AUDIO_EVENTS.heartbeat);
      hasPlayedNearCameraSurpriseRef.current = true;
    }
    dispatch({ type: "OPEN_CAMERA", cameraId });
  }

  function handleCloseCameras() {
    dispatch({ type: "CLOSE_CAMERAS" });
  }

  function handleToggleAudio() {
    dispatch({ type: "TOGGLE_AUDIO_MUTED" });
  }

  const tensionLevel = computeTensionLevel({
    power: state.power,
    startPower: night.startPower,
    remainingMs: state.remainingMs,
    durationMs: night.durationMs,
    enemyStage: state.enemyStage,
    doorClosed: state.doorClosed,
    gameStatus: state.gameStatus,
  });
  const atmosphereStyle = tensionToAtmosphereStyle(tensionLevel);
  const atmosphereVars = atmosphereStyleToCssVars(atmosphereStyle);

  return (
    <div
      className="atmosphere-root"
      data-flicker={atmosphereStyle.flicker}
      style={atmosphereVars as React.CSSProperties}
    >
      {state.screen === "menu" && <MainMenuScreen onStart={handleStart} />}
      {state.screen === "loading" && <LoadingScreen />}
      {state.screen === "playing" && (
        <GameScreen
          state={state}
          night={night}
          tensionLevel={tensionLevel}
          heartbeatStress={heartbeatStress}
          nightNumber={currentNight}
          bulbsRemaining={state.bulbsRemaining}
          onToggleDoor={handleToggleDoor}
          onToggleLight={handleToggleLight}
          onSelectCamera={handleSelectCamera}
          onCloseCameras={handleCloseCameras}
          onToggleAudio={handleToggleAudio}
          onLookAtDoor={handleLookAtDoor}
          onLookAtDesk={handleLookAtDesk}
          onLookAtGenerator={handleLookAtGenerator}
          onRestartGenerator={handleRestartGenerator}
          onDebugToggleDoor={handleDebugToggleDoor}
          onDebugRestartGenerator={handleDebugRestartGenerator}
          onStartBulbReplacement={handleStartBulbReplacement}
          onCancelBulbReplacement={handleCancelBulbReplacement}
        />
      )}
      {state.screen === "death" && (
        <DeathScreen reason={state.deathReason} deathCount={deathCount} onRetry={handleRestart} />
      )}
      {state.screen === "win" && <WinScreen survivedNights={survivedNights} onRetry={handleRestart} />}
    </div>
  );
}
