"use client";

import { useEffect, useReducer, useRef } from "react";
import MainMenuScreen from "@/components/screens/MainMenuScreen";
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

const night = NIGHT_01;
const gameReducer = createGameReducer(night);

export default function PlayPage() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialGameState(night));

  useGameLoop({ isRunning: state.isRunning, enemyTickMs: night.enemyTickMs, dispatch });

  const prevScreenRef = useRef(state.screen);
  const prevDoorRef = useRef(state.doorClosed);
  const prevLightRef = useRef(state.lightOn);
  const prevPowerRef = useRef(state.power);

  useEffect(() => {
    audioManager.setMuted(state.audioMuted);
  }, [state.audioMuted]);

  useEffect(() => {
    if (prevScreenRef.current !== state.screen) {
      if (state.screen === "playing") {
        audioManager.startLoop(AUDIO_EVENTS.ambienceLoop);
      }
      if (state.screen === "death") {
        audioManager.stopLoop(AUDIO_EVENTS.ambienceLoop);
        audioManager.play(AUDIO_EVENTS.jumpscare);
      }
      if (state.screen === "win") {
        audioManager.stopLoop(AUDIO_EVENTS.ambienceLoop);
        audioManager.play(AUDIO_EVENTS.shiftWin);
      }
      prevScreenRef.current = state.screen;
    }
  }, [state.screen]);

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
    if (state.enemyStage === "camera_03_door" || state.enemyStage === "attack") {
      audioManager.play(AUDIO_EVENTS.enemyNear);
    } else if (state.enemyStage !== "outside") {
      audioManager.play(AUDIO_EVENTS.enemyStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.enemyStage]);

  function handleStart() {
    audioManager.init();
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "START_SHIFT" });
  }

  function handleRestart() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "RESTART_SHIFT" });
  }

  function handleToggleDoor() {
    dispatch({ type: "TOGGLE_DOOR" });
  }

  function handleToggleLight() {
    dispatch({ type: "TOGGLE_LIGHT" });
  }

  function handleSelectCamera(cameraId: CameraId) {
    audioManager.play(AUDIO_EVENTS.cameraNoise);
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
      {state.screen === "playing" && (
        <GameScreen
          state={state}
          night={night}
          tensionLevel={tensionLevel}
          onToggleDoor={handleToggleDoor}
          onToggleLight={handleToggleLight}
          onSelectCamera={handleSelectCamera}
          onCloseCameras={handleCloseCameras}
          onToggleAudio={handleToggleAudio}
        />
      )}
      {state.screen === "death" && <DeathScreen reason={state.deathReason} onRetry={handleRestart} />}
      {state.screen === "win" && <WinScreen onRetry={handleRestart} />}
    </div>
  );
}
