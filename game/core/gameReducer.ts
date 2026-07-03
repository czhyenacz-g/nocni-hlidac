import { GameAction } from "./gameActions";
import { createInitialGameState } from "./gameState";
import { GameState, NightDefinition } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isEnemyBeingWatched(state: GameState, night: NightDefinition): boolean {
  if (!state.cameraOpen || !state.activeCameraId) return false;
  const camera = night.cameras.find((c) => c.id === state.activeCameraId);
  return camera?.enemyVisibleAtStage === state.enemyStage;
}

function applyPowerDrain(state: GameState, night: NightDefinition, deltaMs: number): number {
  const seconds = deltaMs / 1000;
  const rates = night.powerDrainPerSecond;
  let drain = rates.idle;
  if (state.doorClosed) drain += rates.doorClosed;
  if (state.lightOn) drain += rates.lightOn;
  if (state.cameraOpen) drain += rates.cameraOpen;
  return clamp(state.power - drain * seconds, 0, 100);
}

/** Reducer je čistá funkce (state, action) -> state; herní pravidla dané směny přijímá jako parametr. */
export function createGameReducer(night: NightDefinition) {
  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case "START_SHIFT":
        return {
          ...createInitialGameState(night),
          audioMuted: state.audioMuted,
          screen: "playing",
          isRunning: true,
        };

      case "RESTART_SHIFT":
        return {
          ...createInitialGameState(night),
          audioMuted: state.audioMuted,
          screen: "playing",
          isRunning: true,
        };

      case "GO_TO_MENU":
        return { ...createInitialGameState(night), audioMuted: state.audioMuted, screen: "menu" };

      case "TOGGLE_AUDIO_MUTED":
        return { ...state, audioMuted: !state.audioMuted };

      case "TOGGLE_DOOR":
        if (!state.isRunning) return state;
        return { ...state, doorClosed: !state.doorClosed };

      case "TOGGLE_LIGHT":
        if (!state.isRunning) return state;
        return { ...state, lightOn: !state.lightOn };

      case "OPEN_CAMERA":
        if (!state.isRunning) return state;
        return { ...state, cameraOpen: true, activeCameraId: action.cameraId };

      case "CLOSE_CAMERAS":
        return { ...state, cameraOpen: false, activeCameraId: null };

      case "TICK": {
        if (!state.isRunning) return state;

        const elapsedMs = state.elapsedMs + action.deltaMs;
        const remainingMs = clamp(night.durationMs - elapsedMs, 0, night.durationMs);
        const power = applyPowerDrain(state, night, action.deltaMs);

        if (power <= 0) {
          return {
            ...state,
            elapsedMs,
            remainingMs,
            power: 0,
            isRunning: false,
            screen: "death",
            deathReason: "power_depleted",
          };
        }

        if (remainingMs <= 0) {
          return {
            ...state,
            elapsedMs,
            remainingMs: 0,
            power,
            isRunning: false,
            screen: "win",
          };
        }

        return { ...state, elapsedMs, remainingMs, power };
      }

      case "ENEMY_ADVANCE": {
        if (!state.isRunning) return state;

        const route = night.enemy.route;
        const currentIndex = route.indexOf(state.enemyStage);
        const atDoorStage = state.enemyStage === "camera_03_door";

        if (atDoorStage) {
          if (state.doorClosed) {
            const since = state.enemyAtDoorSinceMs ?? state.elapsedMs;
            const waited = state.elapsedMs - since;
            if (waited >= night.enemy.doorHoldBeforeResetMs) {
              return { ...state, enemyStage: "outside", enemyAtDoorSinceMs: null };
            }
            return { ...state, enemyAtDoorSinceMs: since };
          }

          // Dveře otevřené a nepřítel je u nich -> útok.
          return {
            ...state,
            enemyStage: "attack",
            isRunning: false,
            screen: "death",
            deathReason: "door_open_at_attack",
          };
        }

        const watched = isEnemyBeingWatched(state, night);
        const chance = night.enemy.advanceChance * (watched ? night.enemy.watchedAdvanceMultiplier : 1);

        if (Math.random() >= chance) return state;

        const nextIndex = Math.min(currentIndex + 1, route.length - 1);
        const nextStage = route[nextIndex];

        return {
          ...state,
          enemyStage: nextStage,
          enemyAtDoorSinceMs: nextStage === "camera_03_door" ? state.elapsedMs : null,
        };
      }

      default:
        return state;
    }
  };
}
