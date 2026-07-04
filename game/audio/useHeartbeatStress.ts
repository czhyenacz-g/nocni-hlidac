import { useEffect, useRef, useState } from "react";
import { audioManager } from "./audioManager";
import { AUDIO_EVENTS } from "./audioEvents";
import { AUDIO_CONFIG } from "./audioConfig";
import {
  computeAmbientStressMultiplier,
  computeGeneratorStressBonus,
  computeHeartbeatTargetStress,
  computeHeartbeatVolumes,
} from "./heartbeatStress";
import { GameState, NightDefinition } from "../core/types";
import { HEARTBEAT_STRESS_FALL_MS, HEARTBEAT_STRESS_RISE_MS } from "../balancing/constants";

const BASE_AMBIENT_VOLUME = AUDIO_CONFIG[AUDIO_EVENTS.ambienceLoop].volume;

/**
 * Spravuje plynulou hladinu stresu (0..1) a řídí podle ní dva heartbeat
 * loopy (heartbeatStressSlow/Fast, viz audioConfig.ts) přes
 * audioManager.setVolume — nikdy přes opakované play(). Komponenty samy
 * žádné audio nepouštějí, jen dodají aktuální GameState/NightDefinition (viz
 * app/play/page.tsx). Cílová hodnota (computeHeartbeatTargetStress) se mění
 * skokem podle toho, co je zrovna vidět na kameře, ale skutečná stress
 * hodnota se k ní jen plynule přibližuje — rychleji nahoru
 * (HEARTBEAT_STRESS_RISE_MS), pomaleji dolů (HEARTBEAT_STRESS_FALL_MS), viz
 * GAME_DESIGN.md "Stres a heartbeat". Vrací aktuální plynulou hodnotu (0..1)
 * pro dev HUD (Math.round(stress * 100), viz PowerMeter.tsx).
 */
export function useHeartbeatStress(state: GameState, night: NightDefinition): number {
  const [stress, setStress] = useState(0);
  const stressRef = useRef(0);
  const lastElapsedRef = useRef(state.elapsedMs);
  const loopsStartedRef = useRef(false);

  useEffect(() => {
    if (!state.isRunning) {
      loopsStartedRef.current = false;
      lastElapsedRef.current = state.elapsedMs;
      if (stressRef.current !== 0) {
        stressRef.current = 0;
        setStress(0);
      }
      audioManager.setVolume(AUDIO_EVENTS.heartbeatStressSlow, 0);
      audioManager.setVolume(AUDIO_EVENTS.heartbeatStressFast, 0);
      audioManager.setVolume(AUDIO_EVENTS.ambienceLoop, BASE_AMBIENT_VOLUME);
      return;
    }

    const locationStress = computeHeartbeatTargetStress({
      playerView: state.playerView,
      isCameraDetailOpen: state.cameraOpen && state.cameraViewMode === "detail",
      activeCameraId: state.activeCameraId,
      enemyStage: state.enemyStage,
      doorClosed: state.doorClosed,
      cameras: night.cameras,
    });
    // Vypadlý generátor v "criticalBeeping" (rychlé pípání + rychlý pokles
    // nouzové energie, viz applyPowerDelta v gameReducer.ts) přidává plochý
    // +20 bonus, dokud fáze trvá — čerstvě odvozený z generatorState každý
    // tik (viz computeGeneratorStressBonus), ne akumulující se čítač.
    const generatorBonus = computeGeneratorStressBonus(state.generatorState);
    const targetStress = Math.min(100, locationStress + generatorBonus);

    const deltaMs = Math.max(0, state.elapsedMs - lastElapsedRef.current);
    lastElapsedRef.current = state.elapsedMs;

    const current = stressRef.current;
    const target01 = targetStress / 100;
    const diff = target01 - current;
    const rateMs = diff > 0 ? HEARTBEAT_STRESS_RISE_MS : HEARTBEAT_STRESS_FALL_MS;
    const maxStep = deltaMs / rateMs;
    const next = Math.abs(diff) <= maxStep ? target01 : current + Math.sign(diff) * maxStep;

    stressRef.current = next;
    setStress(next);

    if (!loopsStartedRef.current) {
      audioManager.startLoop(AUDIO_EVENTS.heartbeatStressSlow);
      audioManager.startLoop(AUDIO_EVENTS.heartbeatStressFast);
      loopsStartedRef.current = true;
    }

    const { slowVolume, fastVolume } = computeHeartbeatVolumes(next * 100);
    audioManager.setVolume(AUDIO_EVENTS.heartbeatStressSlow, slowVolume);
    audioManager.setVolume(AUDIO_EVENTS.heartbeatStressFast, fastVolume);

    // Ambient plynule ztiší při vyšším stresu, ať heartbeat víc vynikne (viz
    // GAME_DESIGN.md "Stres a heartbeat") — násobí se stejnou plynulou
    // hodnotou "next", ne cílovou, takže duck/návrat je stejně pozvolný jako
    // samotný stres.
    const ambientMultiplier = computeAmbientStressMultiplier(next);
    audioManager.setVolume(AUDIO_EVENTS.ambienceLoop, BASE_AMBIENT_VOLUME * ambientMultiplier);
  }, [
    state.isRunning,
    state.elapsedMs,
    state.playerView,
    state.cameraOpen,
    state.cameraViewMode,
    state.activeCameraId,
    state.enemyStage,
    state.doorClosed,
    state.generatorState,
    night.cameras,
  ]);

  return stress;
}
