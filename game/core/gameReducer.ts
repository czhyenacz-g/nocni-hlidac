import { GameAction } from "./gameActions";
import { createInitialGameState } from "./gameState";
import { EnemyDefinition, GameState, NightDefinition } from "./types";
import { MAX_POWER } from "../balancing/constants";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isEnemyBeingWatched(state: GameState, night: NightDefinition): boolean {
  // playerView !== "desk" (dveře/generátor) nikdy nepočítá jako sledování kamer,
  // i kdyby cameraOpen zůstalo true — stejná podmínka jako watchingCameras
  // v applyPowerDelta. LOOK_AT_DOOR/LOOK_AT_GENERATOR navíc kamery rovnou zavírá.
  if (state.playerView !== "desk" || !state.cameraOpen || !state.activeCameraId) return false;
  const camera = night.cameras.find((c) => c.id === state.activeCameraId);
  return camera?.enemyVisibleAtStage === state.enemyStage;
}

// "breach" je zatím jen připravená pro budoucí trasy (žádná ji dnes nepoužívá),
// ale reaguje na ni stejná logika (standoff u dveří i door-light repel) jako
// na "at_door" — ať funguje beze změny reduceru, až se jednou objeví v trase.
function isAtDoorStage(state: GameState): boolean {
  return state.enemyStage === "at_door" || state.enemyStage === "breach";
}

// Vylosuje (jednou na standoff u zavřených dveří) cíl efektivního čekání, než
// se nepřítel vzdá — viz doorHoldRangeMs / doorHoldLightAccelMultiplier v
// basicIntruder.ts a použití v ENEMY_ADVANCE níže.
function rollDoorHoldTargetMs(enemy: EnemyDefinition): number {
  const { min, max } = enemy.doorHoldRangeMs;
  return min + Math.random() * (max - min);
}

// Když hráč aktivně sleduje kamery (otevřená kamera v pohledu na stůl), energie
// jen ubývá. Jinak (dveře/pohled zavřené kamery) se pomalu dobíjí, ale spotřeba
// zavřených dveří / rozsvíceného světla dobíjení dál přebíjí — viz GAME_DESIGN.md.
// Kritický stav generátoru navrch přidá pevnou extra spotřebu (jako 2x zavřené
// dveře + rozsvícené světlo), bez ohledu na to, jestli jsou skutečně zapnuté.
function applyPowerDelta(state: GameState, night: NightDefinition, deltaMs: number): number {
  const seconds = deltaMs / 1000;
  const rates = night.powerDrainPerSecond;
  const watchingCameras = state.cameraOpen && state.playerView === "desk";
  const generatorExtraDrain =
    state.generatorState === "criticalBeeping" || state.generatorState === "restarting"
      ? 2 * rates.doorClosed + rates.lightOn
      : 0;

  if (watchingCameras) {
    const drain = rates.idle + rates.cameraOpen + generatorExtraDrain;
    return clamp(state.power - drain * seconds, 0, MAX_POWER);
  }

  let drain = generatorExtraDrain;
  if (state.doorClosed) drain += rates.doorClosed;
  if (state.lightOn) drain += rates.lightOn;
  const delta = (night.rechargePerSecondWhenIdle - drain) * seconds;
  return clamp(state.power + delta, 0, MAX_POWER);
}

type GeneratorTickResult = Pick<
  GameState,
  | "generatorState"
  | "generatorNextBeepAtMs"
  | "generatorBeepSeq"
  | "generatorSilentSinceMs"
  | "generatorFaultCount"
  | "generatorRestartUntilMs"
>;

// Vyhodnotí generátor pro daný elapsedMs: spuštění (jediné) poruchy, přechod
// ze ticha do kritického pípání po vypršení reakčního času, konec "restarting"
// penalizace, a plánování dalšího pípnutí (normální/kritické tempo). Čistá
// funkce, žádné audio zde — to spouští UI podle změny generatorBeepSeq/
// generatorState (viz app/play/page.tsx).
function updateGenerator(state: GameState, night: NightDefinition, elapsedMs: number): GeneratorTickResult {
  const cfg = night.generator;
  let generatorState = state.generatorState;
  let generatorNextBeepAtMs = state.generatorNextBeepAtMs;
  let generatorBeepSeq = state.generatorBeepSeq;
  let generatorSilentSinceMs = state.generatorSilentSinceMs;
  let generatorFaultCount = state.generatorFaultCount;
  let generatorRestartUntilMs = state.generatorRestartUntilMs;

  if (
    generatorState === "normal" &&
    generatorFaultCount < cfg.faultMaxPerShift &&
    elapsedMs >= state.generatorFaultAtMs
  ) {
    generatorState = "silentFault";
    generatorSilentSinceMs = elapsedMs;
    generatorFaultCount += 1;
  } else if (generatorState === "silentFault") {
    const since = generatorSilentSinceMs ?? elapsedMs;
    if (elapsedMs - since >= cfg.silentGraceMs) {
      generatorState = "criticalBeeping";
      generatorNextBeepAtMs = elapsedMs; // první varovné pípnutí hned při přechodu
    }
  } else if (generatorState === "restarting") {
    if (generatorRestartUntilMs !== null && elapsedMs >= generatorRestartUntilMs) {
      generatorState = "normal";
      generatorRestartUntilMs = null;
      generatorNextBeepAtMs = elapsedMs + cfg.beepIntervalMs;
    }
  }

  if (generatorState === "normal" || generatorState === "criticalBeeping") {
    if (elapsedMs >= generatorNextBeepAtMs) {
      generatorBeepSeq += 1;
      const interval = generatorState === "normal" ? cfg.beepIntervalMs : cfg.criticalBeepIntervalMs;
      generatorNextBeepAtMs =
        generatorNextBeepAtMs + interval < elapsedMs ? elapsedMs + interval : generatorNextBeepAtMs + interval;
    }
  }

  return {
    generatorState,
    generatorNextBeepAtMs,
    generatorBeepSeq,
    generatorSilentSinceMs,
    generatorFaultCount,
    generatorRestartUntilMs,
  };
}

type DoorLightRepelResult = Pick<
  GameState,
  | "doorLightRepelMs"
  | "monsterRetreatRoarSeq"
  | "enemyStage"
  | "lastEnemyDecision"
  | "enemyAtDoorSinceMs"
  | "enemyDoorHoldTargetMs"
  | "enemyDoorHoldProgressMs"
>;

// Jemný časovač pro kombinaci dveře zavřené + světlo zapnuté + nepřítel u dveří
// — počítá se v TICKu (deltaMs v řádu ~100 ms), ne v ENEMY_ADVANCE
// (~enemyTickMs), aby repel přišel rychle a předvídatelně (~1.5 s), ne v
// hrubých skocích. Kdykoliv některá ze tří podmínek přestane platit, časovač
// se okamžitě vynuluje — světlo samo (dveře otevřené) ani zavřené dveře bez
// světla repel nikdy nespustí, viz GAME_DESIGN.md "Světlo a dveře".
function updateDoorLightRepel(state: GameState, night: NightDefinition, deltaMs: number): DoorLightRepelResult {
  const unchanged: DoorLightRepelResult = {
    doorLightRepelMs: state.doorLightRepelMs,
    monsterRetreatRoarSeq: state.monsterRetreatRoarSeq,
    enemyStage: state.enemyStage,
    lastEnemyDecision: state.lastEnemyDecision,
    enemyAtDoorSinceMs: state.enemyAtDoorSinceMs,
    enemyDoorHoldTargetMs: state.enemyDoorHoldTargetMs,
    enemyDoorHoldProgressMs: state.enemyDoorHoldProgressMs,
  };

  const conditionsMet = isAtDoorStage(state) && state.doorClosed && state.lightOn;
  if (!conditionsMet) {
    return state.doorLightRepelMs === 0 ? unchanged : { ...unchanged, doorLightRepelMs: 0 };
  }

  const doorLightRepelMs = state.doorLightRepelMs + deltaMs;
  if (doorLightRepelMs < night.enemy.doorLightRepelRequiredMs) {
    return { ...unchanged, doorLightRepelMs };
  }

  // Repel: silný, rychlý ústup — žádné audio tady, jen sekvenční čítač (viz
  // app/play/page.tsx, stejný vzor jako generatorBeepSeq).
  return {
    doorLightRepelMs: 0,
    monsterRetreatRoarSeq: state.monsterRetreatRoarSeq + 1,
    enemyStage: night.enemy.monsterRetreatStage,
    lastEnemyDecision: "light_repelled",
    enemyAtDoorSinceMs: null,
    enemyDoorHoldTargetMs: null,
    enemyDoorHoldProgressMs: 0,
  };
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
        // Dveře jde přepnout jen v pohledu na dveře — hráč se tam musí nejdřív
        // otočit (LOOK_AT_DOOR). Debug panel simuluje oba kroky najednou.
        if (!state.isRunning || state.playerView !== "door") return state;
        return { ...state, doorClosed: !state.doorClosed };

      case "TOGGLE_LIGHT":
        if (!state.isRunning) return state;
        return { ...state, lightOn: !state.lightOn };

      case "LOOK_AT_DOOR":
        // Kamery se při odchodu od stolu vždy zavřou — hráč se nedívá na dveře
        // a zároveň na kameru, žádná nezůstane "otevřená" na pozadí.
        if (!state.isRunning) return state;
        return { ...state, playerView: "door", cameraOpen: false, activeCameraId: null };

      case "LOOK_AT_DESK":
        if (!state.isRunning) return state;
        return { ...state, playerView: "desk" };

      case "LOOK_AT_GENERATOR":
        if (!state.isRunning) return state;
        return { ...state, playerView: "generator", cameraOpen: false, activeCameraId: null };

      case "RESTART_GENERATOR": {
        if (!state.isRunning) return state;

        // Omylem restartovaný funkční generátor — zbytečný klik ho na chvíli
        // vyřadí (stejná extra spotřeba jako criticalBeeping), místo aby byl no-op.
        if (state.generatorState === "normal") {
          return {
            ...state,
            generatorState: "restarting",
            generatorRestartUntilMs: state.elapsedMs + night.generator.restartPenaltyMs,
            generatorSilentSinceMs: null,
          };
        }

        // Restart už probíhá — druhý klik na tom nic nemění.
        if (state.generatorState === "restarting") return state;

        return {
          ...state,
          generatorState: "normal",
          generatorSilentSinceMs: null,
          generatorNextBeepAtMs: state.elapsedMs + night.generator.beepIntervalMs,
        };
      }

      case "OPEN_CAMERA":
        if (!state.isRunning) return state;
        return { ...state, cameraOpen: true, activeCameraId: action.cameraId };

      case "CLOSE_CAMERAS":
        return { ...state, cameraOpen: false, activeCameraId: null };

      case "TICK": {
        if (!state.isRunning) return state;

        const elapsedMs = state.elapsedMs + action.deltaMs;
        const remainingMs = clamp(night.durationMs - elapsedMs, 0, night.durationMs);
        const generatorUpdate = updateGenerator(state, night, elapsedMs);
        const doorLightRepelUpdate = updateDoorLightRepel(state, night, action.deltaMs);
        const power = applyPowerDelta({ ...state, ...generatorUpdate }, night, action.deltaMs);

        if (power <= 0) {
          return {
            ...state,
            ...generatorUpdate,
            ...doorLightRepelUpdate,
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
            ...generatorUpdate,
            ...doorLightRepelUpdate,
            elapsedMs,
            remainingMs: 0,
            power,
            isRunning: false,
            screen: "win",
          };
        }

        return { ...state, ...generatorUpdate, ...doorLightRepelUpdate, elapsedMs, remainingMs, power };
      }

      case "ENEMY_ADVANCE": {
        if (!state.isRunning) return state;

        const route = state.enemyRoute;
        const currentIndex = route.indexOf(state.enemyStage);
        const atDoorStage = isAtDoorStage(state);

        if (atDoorStage) {
          if (state.doorClosed) {
            const since = state.enemyAtDoorSinceMs ?? state.elapsedMs;
            const target = state.enemyDoorHoldTargetMs ?? rollDoorHoldTargetMs(night.enemy);
            // Nezávislé na světle — kombinovaný efekt dveří+světla řeší
            // doorLightRepelMs v TICKu (updateDoorLightRepel výše), ne tohle.
            const progress = state.enemyDoorHoldProgressMs + night.enemyTickMs;

            if (progress >= target) {
              return {
                ...state,
                enemyStage: "outside",
                lastEnemyDecision: "gave_up",
                enemyAtDoorSinceMs: null,
                enemyDoorHoldTargetMs: null,
                enemyDoorHoldProgressMs: 0,
              };
            }
            return {
              ...state,
              lastEnemyDecision: "waiting_at_door",
              enemyAtDoorSinceMs: since,
              enemyDoorHoldTargetMs: target,
              enemyDoorHoldProgressMs: progress,
            };
          }

          // Dveře otevřené a nepřítel je u nich -> útok.
          return {
            ...state,
            enemyStage: "attack",
            lastEnemyDecision: "attack",
            isRunning: false,
            screen: "death",
            deathReason: "door_open_at_attack",
          };
        }

        // Postup/setrvání/ústup — nezávislé pravděpodobnosti, zbytek (1 - advance - retreat)
        // znamená setrvání. Sledování na kameře jen zpomaluje postup, ústup neovlivňuje.
        const watched = isEnemyBeingWatched(state, night);
        const advanceChance = night.enemy.advanceChance * (watched ? night.enemy.watchedAdvanceMultiplier : 1);
        const retreatChance = night.enemy.retreatChance;
        const roll = Math.random();

        let nextIndex = currentIndex;
        let decision: GameState["lastEnemyDecision"] = "stay";

        if (roll < advanceChance) {
          nextIndex = Math.min(currentIndex + 1, route.length - 1);
          decision = "advance";
        } else if (roll < advanceChance + retreatChance) {
          nextIndex = Math.max(currentIndex - 1, 0);
          // Na první pozici (nebo pokud by index nezměnil) nemá ústup kam jít — bere se jako setrvání.
          decision = nextIndex === currentIndex ? "stay" : "retreat";
        }

        if (nextIndex === currentIndex) {
          return { ...state, lastEnemyDecision: decision };
        }

        const nextStage = route[nextIndex];
        const nextIsAtDoor = nextStage === "at_door" || nextStage === "breach";

        return {
          ...state,
          enemyStage: nextStage,
          lastEnemyDecision: decision,
          enemyAtDoorSinceMs: nextIsAtDoor ? state.elapsedMs : null,
          enemyDoorHoldTargetMs: null,
          enemyDoorHoldProgressMs: 0,
        };
      }

      default:
        return state;
    }
  };
}
