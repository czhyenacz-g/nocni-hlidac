import { EnemyStage, GameState, NightDefinition, RoomBulbsState } from "./types";
import { createDefaultRoomBulbs } from "./roomBulbs";

// Vylosuje okamžik (elapsedMs) poruchy generátoru v rámci nastaveného okna —
// mimo tento modul se nikdy nevolá Math.random() přímo, ať je losování na jednom místě.
function rollGeneratorFaultAtMs(night: NightDefinition): number {
  const { faultEarliestAtMs, faultLatestAtMs } = night.generator;
  return faultEarliestAtMs + Math.random() * (faultLatestAtMs - faultEarliestAtMs);
}

// Vylosuje jednu z variant trasy nepřítele (např. pravá/levá chodba) — platí
// po zbytek směny (state.enemyRoute), ne přehodnocuje se u každého kroku.
function pickRouteVariant(night: NightDefinition): EnemyStage[] {
  const variants = night.enemy.routeVariants;
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * `roomBulbsOverride` je volitelný — bez něj se použije čerstvě vyrobený
 * výchozí stav (`createDefaultRoomBulbs()`), tak jako dřív. Skutečnou
 * (persistovanou, případně denním servisem opravenou) hodnotu předává
 * `gameReducer.ts` u `START_SHIFT`/`RESTART_SHIFT` — `app/play/page.tsx` ji
 * načte z localStorage (`getRoomBulbs()`) a pošle jako součást akce, viz
 * TECH_DESIGN.md "Žárovky".
 */
export function createInitialGameState(night: NightDefinition, roomBulbsOverride?: RoomBulbsState): GameState {
  return {
    screen: "menu",
    nightId: night.id,

    elapsedMs: 0,
    remainingMs: night.durationMs,

    power: night.startPower,
    gameStatus: "normal",
    blackoutElapsedMs: 0,
    blackoutPhaseSeq: 0,

    playerView: "desk",

    doorClosed: false,
    lightOn: false,

    cameraOpen: false,
    activeCameraId: night.defaultCameraId,
    cameraViewMode: "overview",
    cameraFocusUntilMs: null,

    generatorState: "normal",
    generatorNextBeepAtMs: night.generator.beepIntervalMs,
    generatorBeepSeq: 0,
    generatorSilentSinceMs: null,
    generatorFaultAtMs: rollGeneratorFaultAtMs(night),
    generatorFaultCount: 0,
    generatorRestartUntilMs: null,

    enemyRoute: pickRouteVariant(night),
    enemyStage: "outside",
    lastEnemyDecision: "stay",
    enemyAtDoorSinceMs: null,
    enemyDoorHoldTargetMs: null,
    enemyDoorHoldProgressMs: 0,
    doorLightRepelMs: 0,
    monsterRetreatRoarSeq: 0,
    monsterRetreatedTo: null,
    monsterRetreatVerified: false,

    deathReason: null,
    doorDeathRevealUntilMs: null,

    roomBulbs: roomBulbsOverride ?? createDefaultRoomBulbs(),
    bulbBreakSeq: 0,

    isRunning: false,
    audioMuted: false,
  };
}
