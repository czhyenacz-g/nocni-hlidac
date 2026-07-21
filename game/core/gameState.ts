import { EnemyStage, GameState, NightDefinition, RoomBulbsState } from "./types";
import { createDefaultRoomBulbs } from "./roomBulbs";
import { INACTIVE_CAMERA_DAMAGE } from "./cameraDamage";
import { BULBS_CONFIG } from "./bulbsConfig";
import { DEFAULT_NIGHT_FEATURES, NightFeatureFlags } from "../difficulty/nightConfig";
import { DEFAULT_GAME_MODE, GAME_MODE_CONFIG, GameMode } from "./gameMode";
import { EMERGENCY_OFFICE_DOOR_LOCK_MS } from "../minigame/config";

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
 * Objektový parametr (viz zadání "krok 1B" — 11 pozičních parametrů bylo
 * identifikované jako reálné riziko záměny pořadí) — všechna pole volitelná,
 * bez nich se použijí čerstvé výchozí hodnoty (`createDefaultRoomBulbs()`,
 * `BULBS_CONFIG.startingCount`, `DEFAULT_NIGHT_FEATURES`), tak jako dřív.
 * Skutečné (persistované, případně denním servisem/ruční výměnou upravené,
 * nebo pro danou noc rozřešené přes `getNightConfig`) hodnoty předává
 * `gameReducer.ts` u `START_SHIFT`/`RESTART_SHIFT` — `app/play/page.tsx` je
 * načte (přihlášený hráč s ready profilem: VPS `profile.inventory.items.bulb`;
 * anonymní: localStorage, viz `roomBulbs.ts`/`bulbInventory.ts`) a pošle jako
 * součást akce, viz TECH_DESIGN.md "Žárovky".
 */
export interface CreateInitialGameStateOptions {
  roomBulbs?: RoomBulbsState;
  bulbsRemaining?: number;
  nightFeatures?: NightFeatureFlags;
  gameMode?: GameMode;
  livesRemaining?: number;
  hasShotgun?: boolean;
  shotgunAmmo?: number;
  hasDoubleBarrelShotgun?: boolean;
  officeDoorLockMs?: number;
  monsterKilledThisRun?: boolean;
}

export function createInitialGameState(night: NightDefinition, options: CreateInitialGameStateOptions = {}): GameState {
  const {
    roomBulbs: roomBulbsOverride,
    bulbsRemaining: bulbsRemainingOverride,
    nightFeatures: nightFeaturesOverride,
    gameMode: gameModeOverride,
    livesRemaining: livesRemainingOverride,
    hasShotgun: hasShotgunOverride,
    shotgunAmmo: shotgunAmmoOverride,
    hasDoubleBarrelShotgun: hasDoubleBarrelShotgunOverride,
    officeDoorLockMs: officeDoorLockMsOverride,
    monsterKilledThisRun: monsterKilledThisRunOverride,
  } = options;
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
    doorDestroyed: false,
    doorGeneratorOverloadUntilMs: null,
    titanOverloadDeathRevealUntilMs: null,
    lightOn: false,
    lightToggleBlockedSeq: 0,

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
    enemyStageVisitSeq: 0,
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
    enemyForcedRetreatUntilMs: null,
    enemyForcedRetreatChance: null,
    enemyForcedRetreatNextStepAtMs: null,
    // Monstrum "vstupuje" do "outside" přesně v okamžiku 0 (viz enemyStage
    // výše) — 0 je tedy správný počáteční timestamp, ne placeholder.
    enemyLocationEnteredAtMs: 0,

    // Nikdy persistentní, vždy začíná vypnuté (viz zadání "nemá se ukládat
    // do profilu ani serveru") — stejná konvence jako bulbReplacement výše.
    sonicCannonActive: false,
    sonicCannonResultSeq: 0,
    lastSonicCannonResult: null,
    sonicCannonToggleSeq: 0,
    lastSonicCannonToggleReason: null,
    sonicCannonPendingRetreat: null,

    // Nikdy persistentní mezi nocemi (viz zadání "reset ráno") — vždy
    // čerstvý klidový stav, žádný override parametr (stejná konvence jako
    // monsterHitsToday). Starší uložený běh bez těchhle polí se tak vždy
    // bezpečně "načte" jako čerstvý stav (viz report).
    cameraDamage: INACTIVE_CAMERA_DAMAGE,
    cameraAttackStartedSeq: 0,
    cameraOfflineSeq: 0,
    disabledCameraFootstepsSeq: 0,
    lastDisabledCameraFootstepsCameraId: null,

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

    generatorOverloadWindup: { active: false, startedAtMs: null, progressMs: 0 },
    generatorOverloadReadySeq: 0,

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
    // Přenáší se přes restart/další noc stejně jako hasShotgun výše (viz
    // app/play/page.tsx#handleBeginShift) — nový run vždy začíná `false`.
    monsterKilledThisRun: monsterKilledThisRunOverride ?? false,

    // Admin-only debug knob (viz zadání "testovací nástroj pro late-run
    // scény", DebugPanel.tsx) — vždy začíná `null`, žádný override parametr
    // (nastavuje se výhradně SET_DEBUG_NIGHT akcí, ne při startu/restartu
    // směny).
    debugNightOverride: null,
    debugGhoulCameraAttackChanceOverride: null,

    isRunning: false,
    audioMuted: false,
    officeDoorLockMs: officeDoorLockMsOverride ?? EMERGENCY_OFFICE_DOOR_LOCK_MS,
  };
}
