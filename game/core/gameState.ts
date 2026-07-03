import { GameState, NightDefinition } from "./types";

// Vylosuje okamžik (elapsedMs) poruchy generátoru v rámci nastaveného okna —
// mimo tento modul se nikdy nevolá Math.random() přímo, ať je losování na jednom místě.
function rollGeneratorFaultAtMs(night: NightDefinition): number {
  const { faultEarliestAtMs, faultLatestAtMs } = night.generator;
  return faultEarliestAtMs + Math.random() * (faultLatestAtMs - faultEarliestAtMs);
}

export function createInitialGameState(night: NightDefinition): GameState {
  return {
    screen: "menu",
    nightId: night.id,

    elapsedMs: 0,
    remainingMs: night.durationMs,

    power: night.startPower,

    playerView: "desk",

    doorClosed: false,
    lightOn: false,

    cameraOpen: false,
    activeCameraId: night.defaultCameraId,

    generatorState: "normal",
    generatorNextBeepAtMs: night.generator.beepIntervalMs,
    generatorBeepSeq: 0,
    generatorSilentSinceMs: null,
    generatorFaultAtMs: rollGeneratorFaultAtMs(night),
    generatorFaultCount: 0,

    enemyStage: "outside",
    lastEnemyDecision: "stay",
    enemyAtDoorSinceMs: null,
    enemyDoorHoldTargetMs: null,
    enemyDoorHoldProgressMs: 0,

    deathReason: null,

    isRunning: false,
    audioMuted: false,
  };
}
