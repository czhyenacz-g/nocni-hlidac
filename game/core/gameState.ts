import { EnemyStage, GameState, NightDefinition, RoomBulbsState } from "./types";
import { createDefaultRoomBulbs } from "./roomBulbs";
import { BULBS_CONFIG } from "./bulbsConfig";
import { DEFAULT_NIGHT_FEATURES, NightFeatureFlags } from "../difficulty/nightConfig";
import { DEFAULT_GAME_MODE, GAME_MODE_CONFIG, GameMode } from "./gameMode";

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
 * `roomBulbsOverride`/`bulbsRemainingOverride`/`nightFeaturesOverride` jsou
 * volitelné — bez nich se použijí čerstvé výchozí hodnoty
 * (`createDefaultRoomBulbs()`, `BULBS_CONFIG.startingCount`,
 * `DEFAULT_NIGHT_FEATURES`), tak jako dřív. Skutečné (persistované, případně
 * denním servisem/ruční výměnou upravené, nebo pro danou noc rozřešené přes
 * `getNightConfig`) hodnoty předává `gameReducer.ts` u
 * `START_SHIFT`/`RESTART_SHIFT` — `app/play/page.tsx` je načte z
 * localStorage (`getRoomBulbs()`/`getBulbsRemaining()`) / spočítá
 * (`getNightConfig(currentNight).features`) a pošle jako součást akce, viz
 * TECH_DESIGN.md "Žárovky".
 */
export function createInitialGameState(
  night: NightDefinition,
  roomBulbsOverride?: RoomBulbsState,
  bulbsRemainingOverride?: number,
  nightFeaturesOverride?: NightFeatureFlags,
  gameModeOverride?: GameMode,
  livesRemainingOverride?: number,
  hasShotgunOverride?: boolean,
  shotgunAmmoOverride?: number,
  hasDoubleBarrelShotgunOverride?: boolean,
): GameState {
  const gameMode = gameModeOverride ?? DEFAULT_GAME_MODE;

  return {
    screen: "menu",
    nightId: night.id,

    elapsedMs: 0,
    remainingMs: night.durationMs,

    power: night.startPower,
    powerRechargeSeq: 0,
    gameStatus: "normal",
    blackoutElapsedMs: 0,
    blackoutPhaseSeq: 0,
    blackoutRoarSeq: 0,

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
    doorHallwayUvRepelMs: 0,
    monsterRetreatRoarSeq: 0,
    doorBangSeq: 0,
    enemyDoorAttackGraceUntilMs: null,
    officeBreachAftermathActive: false,
    monsterRetreatedTo: null,
    monsterRetreatVerified: false,

    deathReason: null,
    doorDeathRevealUntilMs: null,

    roomBulbs: roomBulbsOverride ?? createDefaultRoomBulbs(),
    bulbBreakSeq: 0,
    // Nikdy nepřežívá restart/další noc — vždy začíná neaktivní, i kdyby
    // hráč zemřel uprostřed výměny (viz gameReducer.ts).
    bulbReplacement: { active: false, startedAtMs: null, progressMs: 0 },
    bulbsRemaining: bulbsRemainingOverride ?? BULBS_CONFIG.startingCount,
    bulbReplaceSuccessSeq: 0,
    generatorAccidentalRestartSeq: 0,

    // Nikdy nepřežívá restart/další noc — stejná konvence jako bulbReplacement výše.
    emergencyRunWindup: { active: false, startedAtMs: null, progressMs: 0 },
    emergencyRunReadySeq: 0,

    thinkItOverWindup: { active: false, startedAtMs: null, progressMs: 0 },
    thinkItOverReadySeq: 0,

    nightFeatures: nightFeaturesOverride ?? DEFAULT_NIGHT_FEATURES,

    gameMode,
    livesRemaining: livesRemainingOverride ?? GAME_MODE_CONFIG[gameMode].startingLives,

    // Bez brokovnice defaultně (nový run) — app/play/page.tsx#handleBeginShift
    // pošle skutečnou hodnotu, jen když ji hráč v aktuálním runu už má (viz
    // game/core/shotgunEquipment.ts).
    hasShotgun: hasShotgunOverride ?? false,
    hasDoubleBarrelShotgun: hasDoubleBarrelShotgunOverride ?? false,
    shotgunAmmo: shotgunAmmoOverride ?? 0,

    // Vždy čerstvé, bez override — "za jednu noc" počítadlo (viz zadání,
    // game/core/monsterEnding.ts), resetuje se i při RESTART_SHIFT (opakování
    // stejné noci po smrti v Normal), na rozdíl od hasShotgun/shotgunAmmo výše.
    monsterHitsToday: 0,
    pendingMonsterHits: 0,
    monsterDefeated: false,

    isRunning: false,
    audioMuted: false,
  };
}
