// Temporary fork from game/minigame/config.ts for multiplayer-survival
// experimentation. Do not synchronize automatically without explicit review.
//
// Hodnoty jsou vědomě zkopírované (ne importované) z game/minigame/config.ts
// v čase založení modulu — je to jediný způsob, jak dostat "stejný pocit" z
// hratelnosti (dosahy, rychlosti, timing), aniž by se dovnitř multiplayer
// prototypu vtáhly i jednohráčové mission/equipment defaulty, které
// game/minigame/config.ts mísí dohromady s obecnou fyzikou.

import { EnemyAiConfig } from "../../minigame/logic";
import { PlayerVisionConfig } from "../../minigame/playerVision";

export const PLAYER_RADIUS = 14;
export const PLAYER_SPEED = 3.2;
export const ENEMY_RADIUS = 14;

// Vykreslovací canvas (desktop) — mapa (libovolně velká) se vždy zmenší, ať
// se celá vejde, stejný princip jako computeMiniGameWorldScale v
// game/minigame/config.ts.
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 520;

export function computeWorldScale(worldWidth: number, worldHeight: number): number {
  return Math.min(CANVAS_WIDTH / worldWidth, CANVAS_HEIGHT / worldHeight);
}

// Hráčova útočná/brokovnicová výseč.
export const CONE_RANGE = 150;
export const CONE_ANGLE_RAD = (70 * Math.PI) / 180;
export const SHOT_FLASH_DURATION_MS = 150;
export const AMMO_START = 6;

export const ENEMY_STUN_DURATION_MS = 10_000;
export const MONSTER_WOUNDED_RECOVER_MS = 1_100;

// Hráčovo vidění / mlha války — DVĚ vrstvy (periferní kruh + užší směrová
// výseč), stejné násobky CONE_RANGE jako produkční minihra.
export const PLAYER_VISION_CONFIG: PlayerVisionConfig = {
  peripheralRangePx: CONE_RANGE * 1,
  directionalRangePx: CONE_RANGE * 3,
  directionalAngleRad: (170 * Math.PI) / 180,
};
export const PLAYER_VISION_RAY_COUNT = 48;
export const PLAYER_VISION_RAY_STEP_PX = 8;

export const ITEM_RADIUS = 10;
export const LOOT_PICKUP_DURATION_MS = 2_000;

/** Délka jednoho survival kola — jediné místo, které tuhle hodnotu určuje (viz zadání "nedávej natvrdo na mnoha místech"). Server (server/room.ts) může tuhle výchozí hodnotu přebít přes `MULTIPLAYER_SURVIVAL_ROUND_MS` env proměnnou pro lokální testování, viz README.md. */
export const ROUND_DURATION_MS = 5 * 60 * 1000;

/** Kolik hráčů se najednou vejde do jedné dev místnosti (viz server/room.ts) — dost na "pošlu odkaz partě kamarádů", bez lobby/matchmakingu. */
export const MAX_PLAYERS = 6;

/**
 * `mapWidth`/`mapHeight` sedí na `PROTOTYPE_MAP` (viz maps/prototypeMap.ts,
 * SERVICE_FLOOR_STORAGE.world) — modul zatím počítá jen s touhle jednou
 * mapou, viz README.md.
 */
export const MULTIPLAYER_SURVIVAL_AI_CONFIG: EnemyAiConfig = {
  searchSpeed: 1.54,
  chaseSpeed: 1.76,
  aggroSpeedMultiplier: 1.5,
  aggroRange: CONE_RANGE,
  visionRange: 220,
  visionAngleRad: (60 * Math.PI) / 180,
  waitMinMs: 2000,
  waitMaxMs: 3000,
  investigationArrivalRadius: 24,
  investigationNoiseCloseRangePx: 40,
  investigationNoiseFarPx: 140,
  investigationCloseDistanceThresholdPx: 160,
  investigationMaxAttempts: 8,
  mapWidth: 1400,
  mapHeight: 900,
  stuckCheckIntervalMs: 800,
  stuckMoveThresholdPx: 6,
  stuckTimeoutMs: 2400,
};
