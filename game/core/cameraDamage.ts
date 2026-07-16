import { CameraAttackVisualPhase, CameraDamageState, CameraId, GameState, GhoulCameraAttackAnimationId, NightDefinition } from "./types";
import {
  CAMERA_ATTACK_COOLDOWN_MS,
  CAMERA_FAILURE_TRANSITION_MS,
  GHOUL_CAMERA_ATTACK_CHANCE,
  GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS,
  GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS,
  GHOUL_ENEMY_ID,
  MAX_DISABLED_CAMERAS_BY_NIGHT,
  PROTECTED_CAMERA_IDS,
} from "./cameraDamageConfig";

/** Čerstvý/klidový stav bez útoku — `createInitialGameState` (nová/opakovaná noc) i DEBUG_RESET_CAMERA_DAMAGE ho používají beze změny. */
export const INACTIVE_CAMERA_DAMAGE: CameraDamageState = {
  disabledCameraIds: [],
  activeAttack: null,
  lastAttackAtMs: null,
  lastFootstepsAtMs: null,
};

/** Jediné místo, které rozhoduje "je aktuální noční nepřítel Ghoul" (viz cameraDamageConfig.ts#GHOUL_ENEMY_ID). */
export function isGhoulEnemy(night: NightDefinition): boolean {
  return night.enemy.id === GHOUL_ENEMY_ID;
}

/**
 * Vybere sekvenci podle kamery a (jen pro door_hallway) aktuálního stavu
 * světla V OKAMŽIKU SPUŠTĚNÍ útoku (viz zadání "Vybraný animationId ulož do
 * stavu aktivního útoku... během animace nesmí změna světla přepnout
 * sekvenci") — volá se VÝHRADNĚ z `attemptGhoulCameraAttack`/
 * `debugTriggerGhoulCameraAttack` níže, výsledek se zamrzne do
 * `activeAttack.animationId`. Všechny čtyři kamery mají vlastní sekvenci
 * (`outer_yard` doplněna dodatečně, viz report) — `null` návratová hodnota
 * zůstává v typu jen jako obecná ochrana pro `getGhoulCameraAttackAnimation`
 * (CameraDamageOverlay.tsx pořád umí spadnout na CSS fallback, kdyby
 * některá sekvence chyběla/měla prázdné pole snímků). Skutečné WebP
 * snímky žijí odděleně v `game/cameras/cameraAttackAnimation.object13.ts`
 * (vizuální data, ne herní rozhodnutí) — tahle funkce jen vrací identifikátor.
 */
export function resolveGhoulCameraAttackAnimationId(
  cameraId: CameraId,
  isDoorHallwayLightActive: boolean,
): GhoulCameraAttackAnimationId | null {
  switch (cameraId) {
    case "left_hallway":
      return "left_hallway";
    case "right_hallway":
      return "right_hallway";
    case "door_hallway":
      return isDoorHallwayLightActive ? "door_hallway_light" : "door_hallway";
    case "outer_yard":
      return "outer_yard";
  }
}

/**
 * Limit vyřazených kamer za JEDNU noc podle čísla noci (viz zadání) — NIKDY
 * se neukládá do GameState, vždy se dopočítává odsud.
 * `MAX_DISABLED_CAMERAS_BY_NIGHT` je seřazené sestupně podle `minNight`,
 * první splněný práh vyhrává. `nightNumber < 1` (obranně) spadá na stejný
 * limit jako noc 1.
 */
export function getMaxDisabledCamerasForNight(nightNumber: number): number {
  const tier = MAX_DISABLED_CAMERAS_BY_NIGHT.find((entry) => nightNumber >= entry.minNight);
  return tier?.max ?? 1;
}

/**
 * Všechny podmínky ZE ZADÁNÍ, které musí platit, než se vůbec smí hodit
 * kostkou na útok kamery — VOLÁ SE PŘI KAŽDÉM použití sonického děla na
 * Ghoula (viz gameReducer.ts#ENEMY_ADVANCE), bez ohledu na `sonicResult`
 * (úspěšné odražení hod NEVYNECHÁVÁ).
 */
export function canRollGhoulCameraAttack(state: GameState, night: NightDefinition, nightNumber: number): boolean {
  if (!isGhoulEnemy(night)) return false;
  if (state.activeCameraId === null) return false;
  if (state.cameraDamage.activeAttack !== null) return false;
  if (state.cameraDamage.disabledCameraIds.includes(state.activeCameraId)) return false;
  if (PROTECTED_CAMERA_IDS.includes(state.activeCameraId)) return false;
  if (state.cameraDamage.disabledCameraIds.length >= getMaxDisabledCamerasForNight(nightNumber)) return false;
  if (
    state.cameraDamage.lastAttackAtMs !== null &&
    state.elapsedMs - state.cameraDamage.lastAttackAtMs < CAMERA_ATTACK_COOLDOWN_MS
  ) {
    return false;
  }
  const activeCamera = night.cameras.find((c) => c.id === state.activeCameraId);
  if (!activeCamera || activeCamera.enemyVisibleAtStage !== state.enemyStage) return false;
  return true;
}

/**
 * Jediné místo, které volá `Math.random()` pro tenhle hod (viz CLAUDE.md
 * konvence "losování na jednom místě", stejný vzor jako
 * gameState.ts#rollGeneratorFaultAtMs/pickRouteVariant) — testy mockují
 * `Math.random` přes `vi.spyOn`, ne injektovaný RNG parametr (projekt žádný
 * injektovatelný RNG nemá, viz audit u zadání).
 */
export function rollGhoulCameraAttack(chance: number = GHOUL_CAMERA_ATTACK_CHANCE): boolean {
  return Math.random() < chance;
}

/**
 * Kompletní rozhodnutí pro jedno použití sonického děla — vrací NOVÝ
 * `CameraDamageState`, pokud útok skutečně nastal, jinak `state.cameraDamage`
 * beze změny (stejná reference, ať volající pozná no-op). Volá se PŘI
 * KAŽDÉM použití sonického děla na Ghoula (`sonicEffective === true` v
 * ENEMY_ADVANCE), bez ohledu na `sonicResult`. `chanceOverride` je
 * `state.debugGhoulCameraAttackChanceOverride` (viz DebugPanel.tsx
 * "nastavit šanci na 100 %") — `undefined`/`null` znamená produkční
 * `GHOUL_CAMERA_ATTACK_CHANCE`, samotná konstanta se tímhle nikdy nemění.
 * `isDoorHallwayLightActive` se použije JEN pro `door_hallway` (viz
 * game/cameras/cameraAttackAnimation.object13.ts#resolveGhoulCameraAttackAnimationId)
 * a zamrzne se do `activeAttack.animationId` — pozdější změna světla už
 * vybranou sekvenci nemění (viz zadání).
 */
export function attemptGhoulCameraAttack(
  state: GameState,
  night: NightDefinition,
  nightNumber: number,
  isDoorHallwayLightActive: boolean,
  chanceOverride?: number | null,
): CameraDamageState {
  if (!canRollGhoulCameraAttack(state, night, nightNumber)) return state.cameraDamage;
  if (!rollGhoulCameraAttack(chanceOverride ?? undefined)) return state.cameraDamage;
  const cameraId = state.activeCameraId as CameraId;
  return {
    ...state.cameraDamage,
    activeAttack: {
      cameraId,
      startedAtMs: state.elapsedMs,
      animationId: resolveGhoulCameraAttackAnimationId(cameraId, isDoorHallwayLightActive),
    },
    lastAttackAtMs: state.elapsedMs,
  };
}

/**
 * Čistě odvozená vizuální fáze PRO JEDNU KONKRÉTNÍ kameru (viz
 * game/core/types.ts#CameraAttackVisualPhase) — nikde se přímo neukládá.
 * `"approaching-camera"` trvá GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS (celá
 * sekvence) + GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS (hold posledního
 * snímku) — CameraDamageOverlay.tsx uvnitř tyhle fáze samo pozná, jestli
 * ještě přehrává, nebo už drží poslední snímek (viz
 * game/cameras/cameraAttackAnimation.ts#resolveGhoulCameraAttackFrameState).
 * Zbytek do CAMERA_FAILURE_TRANSITION_MS (~500ms) je `"signal-failing"` —
 * krátký CSS ztmavovací/zrnící ohon těsně před `"offline"` (viz zadání "5.
 * potom obraz krátce ztmavne nebo přejde do silného zrnění").
 */
export function resolveCameraAttackVisualPhase(
  cameraDamage: CameraDamageState,
  cameraId: CameraId,
  elapsedMs: number,
): CameraAttackVisualPhase {
  if (cameraDamage.disabledCameraIds.includes(cameraId)) return "offline";
  if (cameraDamage.activeAttack === null || cameraDamage.activeAttack.cameraId !== cameraId) return "idle";
  const elapsedSinceAttack = elapsedMs - cameraDamage.activeAttack.startedAtMs;
  const animatingDurationMs = GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS + GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS;
  return elapsedSinceAttack >= animatingDurationMs ? "signal-failing" : "approaching-camera";
}

export interface CameraDamageTickUpdate {
  cameraDamage: CameraDamageState;
  cameraOfflineSeq: number;
}

/**
 * TICK helper (stejný vzor jako `updateDoorLightRepel`/`updateRoomBulbs`
 * v gameReducer.ts) — jakmile uplyne `CAMERA_FAILURE_TRANSITION_MS` od
 * `activeAttack.startedAtMs`, přesune kameru z `activeAttack` do
 * `disabledCameraIds` a zvýší `cameraOfflineSeq` (spouští zvuk ztráty
 * signálu i rádiovou hlášku, ne dřív). Mimo aktivní útok je no-op.
 */
export function updateCameraDamagePhase(state: GameState, elapsedMs: number): CameraDamageTickUpdate {
  const { activeAttack } = state.cameraDamage;
  if (activeAttack === null || elapsedMs - activeAttack.startedAtMs < CAMERA_FAILURE_TRANSITION_MS) {
    return { cameraDamage: state.cameraDamage, cameraOfflineSeq: state.cameraOfflineSeq };
  }
  return {
    cameraDamage: {
      ...state.cameraDamage,
      disabledCameraIds: [...state.cameraDamage.disabledCameraIds, activeAttack.cameraId],
      activeAttack: null,
    },
    cameraOfflineSeq: state.cameraOfflineSeq + 1,
  };
}

/** UI/reducer helper — je TAHLE konkrétní kamera aktuálně plně mimo provoz (obraz), viz zadání "sonické dělo na ní nesmí fungovat", "obraz monstra není vidět"? Mikrofon (zvuk) tímhle NENÍ ovlivněn — viz isEnemyOnDisabledCameraStage. */
export function isCameraFullyOffline(cameraDamage: CameraDamageState, cameraId: string | null): boolean {
  return cameraId !== null && cameraDamage.disabledCameraIds.includes(cameraId as CameraId);
}

/**
 * Je Ghoul PRÁVĚ TEĎ v lokaci, kterou snímá NĚKTERÁ offline kamera (viz
 * zadání "mikrofon zůstává funkční") — nezávisí na tom, na kterou kameru se
 * hráč zrovna dívá, jen na tom, kde Ghoul fyzicky je.
 */
export function isEnemyOnDisabledCameraStage(state: GameState, night: NightDefinition): boolean {
  const camera = night.cameras.find((c) => c.enemyVisibleAtStage === state.enemyStage);
  return camera !== undefined && state.cameraDamage.disabledCameraIds.includes(camera.id);
}

/**
 * Debug-only eligibilita pro DEBUG_TRIGGER_GHOUL_CAMERA_ATTACK (viz
 * DebugPanel.tsx, zadání "ručně spustit útok Ghoula na aktuální kameru") —
 * STEJNÉ guardy jako `canRollGhoulCameraAttack` KROMĚ "Ghoul musí být na tý
 * kameře vidět" (dev chce otestovat vizuální sekvenci nezávisle na přesné
 * pozici monstra). Nikdy nevolá `rollGhoulCameraAttack`/nečte
 * `GHOUL_CAMERA_ATTACK_CHANCE` — produkční pravděpodobnost zůstává tímhle
 * tlačítkem zcela nedotčená (viz zadání "produkční hodnota musí zůstat 5 %").
 */
export function canDebugTriggerGhoulCameraAttack(state: GameState, night: NightDefinition, nightNumber: number): boolean {
  if (!isGhoulEnemy(night)) return false;
  if (state.activeCameraId === null) return false;
  if (state.cameraDamage.activeAttack !== null) return false;
  if (state.cameraDamage.disabledCameraIds.includes(state.activeCameraId)) return false;
  if (PROTECTED_CAMERA_IDS.includes(state.activeCameraId)) return false;
  if (state.cameraDamage.disabledCameraIds.length >= getMaxDisabledCamerasForNight(nightNumber)) return false;
  return true;
}

/**
 * Stejný výsledný tvar jako `attemptGhoulCameraAttack`, ale bez náhodného
 * hodu ani cooldownu — volající (gameReducer.ts DEBUG_TRIGGER_GHOUL_CAMERA_ATTACK)
 * už ověřil `canDebugTriggerGhoulCameraAttack`. `animationIdOverride` (viz
 * zadání "vybrat konkrétní sekvenci" v debug režimu) přeskočí normální
 * kamera+světlo výběr a použije přesně tenhle animationId — `undefined`
 * znamená normální výběr (`resolveGhoulCameraAttackAnimationId`).
 */
export function debugTriggerGhoulCameraAttack(
  state: GameState,
  isDoorHallwayLightActive: boolean,
  animationIdOverride?: GhoulCameraAttackAnimationId,
): CameraDamageState {
  const cameraId = state.activeCameraId as CameraId;
  return {
    ...state.cameraDamage,
    activeAttack: {
      cameraId,
      startedAtMs: state.elapsedMs,
      animationId: animationIdOverride ?? resolveGhoulCameraAttackAnimationId(cameraId, isDoorHallwayLightActive),
    },
    lastAttackAtMs: state.elapsedMs,
  };
}

/**
 * Debug-only: přeskočí přímo do fáze "hold posledního snímku" (viz zadání
 * "přeskočit na poslední frame") — posune `startedAtMs` do minulosti tak,
 * aby `elapsedMs - startedAtMs === GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS`
 * (přesně na hranici mezi přehráváním a holdem), no-op bez aktivního útoku.
 */
export function debugSkipToLastFrame(state: GameState): CameraDamageState {
  if (state.cameraDamage.activeAttack === null) return state.cameraDamage;
  return {
    ...state.cameraDamage,
    activeAttack: { ...state.cameraDamage.activeAttack, startedAtMs: state.elapsedMs - GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS },
  };
}

/**
 * Debug-only: okamžitě dokončí aktivní útok (viz zadání "přeskočit rovnou do
 * offline stavu") — stejný výsledný tvar jako `updateCameraDamagePhase` po
 * uplynutí `CAMERA_FAILURE_TRANSITION_MS`, jen bez čekání. No-op bez
 * aktivního útoku. Nevrací `cameraOfflineSeq` update — volající
 * (gameReducer.ts) ho zvýší stejně jako produkční přechod.
 */
export function debugSkipActiveAttackToOffline(state: GameState): CameraDamageState {
  const { activeAttack } = state.cameraDamage;
  if (activeAttack === null) return state.cameraDamage;
  return {
    ...state.cameraDamage,
    disabledCameraIds: [...state.cameraDamage.disabledCameraIds, activeAttack.cameraId],
    activeAttack: null,
  };
}
