import { GameState, NightDefinition } from "./types";

export function createInitialGameState(night: NightDefinition): GameState {
  return {
    screen: "menu",
    nightId: night.id,

    elapsedMs: 0,
    remainingMs: night.durationMs,

    power: night.startPower,

    doorClosed: false,
    lightOn: false,

    cameraOpen: false,
    activeCameraId: null,

    enemyStage: "outside",
    enemyAtDoorSinceMs: null,

    deathReason: null,

    isRunning: false,
    audioMuted: false,
  };
}
