import { angleBetween, createInvestigationTarget, distance } from "./logic";
import { EmergencyMiniGameInput, Enemy, Player, Vec2, Wall } from "./types";

// Konfigurace izolovaného prototypu minihry — žádná hodnota odsud neovlivňuje
// balancing hlavní hry (game/balancing/constants.ts zůstává nedotčené).

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 520;

export const PLAYER_RADIUS = 14;
export const ENEMY_RADIUS = 14;
export const PLAYER_SPEED = 3.2;

/** Dosah výseče (px) — kam zasáhne brokovnice i kam hráč "vidí". */
export const CONE_RANGE = 150;
/** Alias pro CONE_RANGE — stejná hodnota, jen jméno odpovídající AI rozsahům níže ("shotgunRange" ze zadání). */
export const SHOTGUN_RANGE = CONE_RANGE;
/** Celkový úhel výseče (stupně) — polovina na každou stranu od směru pohledu. */
export const CONE_ANGLE_DEG = 70;
export const CONE_ANGLE_RAD = (CONE_ANGLE_DEG * Math.PI) / 180;

// ── AI nepřítele (viz game/minigame/logic.ts#updateEnemyAi) ────────────────
// Nepřítel nemá přesnou pozici hráče — "investigating" jde na přibližný
// podezřelý bod, "chasing" nastává jen po skutečném splnění vision cone +
// line-of-sight (canEnemySeePlayer), ne podle vzdálenosti.
export const ENEMY_SEARCH_SPEED = 1.4;
export const ENEMY_CHASE_SPEED = 1.6;
/** V tomhle dosahu (stejný jako dosah brokovnice) "chasing" zrychlí o 50 %. */
export const ENEMY_AGGRO_RANGE = SHOTGUN_RANGE;
export const ENEMY_AGGRO_SPEED_MULTIPLIER = 1.5;

/** Výseč vidění nepřítele — dosah/úhel, samostatné od hráčovy výseče (CONE_RANGE/CONE_ANGLE_RAD). */
export const ENEMY_VISION_RANGE = 220;
export const ENEMY_VISION_ANGLE_DEG = 60;
export const ENEMY_VISION_ANGLE_RAD = (ENEMY_VISION_ANGLE_DEG * Math.PI) / 180;
/** Počet paprsků / krok (px) pro raycasting vykreslované výseče omezené zdmi (viz castVisionCone). */
export const ENEMY_VISION_RAY_COUNT = 31;
export const ENEMY_VISION_RAY_STEP_PX = 6;

/** Jak dlouho (ms) nepřítel čeká na podezřelém bodě, než zvolí další ("waiting"). */
export const ENEMY_WAIT_MIN_MS = 2000;
export const ENEMY_WAIT_MAX_MS = 3000;
/** Vzdálenost od investigationTarget, od které se považuje za "dosaženo". */
export const INVESTIGATION_ARRIVAL_RADIUS_PX = 12;
/** Odchylka podezřelého bodu od (přibližné) polohy hráče — menší nablízko, větší na dálku. */
export const INVESTIGATION_NOISE_CLOSE_PX = 60;
export const INVESTIGATION_NOISE_FAR_PX = 140;
export const INVESTIGATION_CLOSE_DISTANCE_THRESHOLD_PX = 200;
/** Kolik náhodných pokusů, než se vzdá a spadne na clampnutou pozici hráče (viz createInvestigationTarget). */
export const INVESTIGATION_MAX_ATTEMPTS = 8;

/** Jak dlouho (ms) zůstane nepřítel po zásahu brokovnicí "wounded" (omráčený, ne mrtvý) — viz updateEnemyAi. */
export const ENEMY_STUN_DURATION_MS = 10_000;

/** Jak dlouho (ms) bliká výseč po výstřelu (zásah i minutí) — čistě vizuální, neovlivňuje hit detection. */
export const SHOT_FLASH_DURATION_MS = 150;

// Pár vnitřních překážek/chodeb + krátké výběžky od obvodových zdí — obvod
// mapy řeší clamp na hranice canvasu (viz moveWithWallSliding), ne samostatné
// zdi, ať nevznikají zbytečně duplicitní kolizní obdélníky podél celého okraje.
export const WALLS: Wall[] = [
  { x: 260, y: 0, width: 24, height: 230 },
  { x: 260, y: 300, width: 24, height: 220 },
  { x: 520, y: 140, width: 200, height: 24 },
  { x: 120, y: 380, width: 160, height: 24 },
  { x: 600, y: 320, width: 24, height: 160 },
];

// Hráč startuje dole (u "kontrolní místnosti") — stejná prostorová logika
// jako v hlavní hře (viz game/map/objectMap.ts), ale úplně nezávislá data.
// `shots` = počet výstřelů na start (viz EmergencyMiniGameInput.shots,
// resolveShotsFromInput v logic.ts) — volající (EmergencyMiniGame.tsx) sem
// pošle už rozřešenou hodnotu, tenhle default (1) je jen pro přímé volání
// beze vstupu (např. testy).
export function createInitialPlayer(shots: number = 1): Player {
  return {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 60,
    radius: PLAYER_RADIUS,
    direction: "up",
    speed: PLAYER_SPEED,
    shotsLeft: shots,
  };
}

// ── Kontrakt pro budoucí spuštění z hlavní hry ─────────────────────────────

export const DEFAULT_EMERGENCY_MINIGAME_INPUT: EmergencyMiniGameInput = {
  objective: "return_to_office",
  shots: 1,
  difficulty: "medium",
};

// "Návrat do kanceláře" — obdélník poblíž startovní pozice hráče (dole,
// stejné místo jako "kontrolní místnost" v hlavní hře). Aktivuje se až po
// opuštění startu (viz START_ZONE_LEAVE_RADIUS_PX), ať se "returned" nesplní
// hned na startu — dokončuje se stiskem E, ne jen vstupem do zóny.
export const EXIT_ZONE: Wall = { x: CANVAS_WIDTH / 2 - 60, y: CANVAS_HEIGHT - 110, width: 120, height: 90 };
/** Jak daleko od startovní pozice musí hráč dojít, než se exit zóna "aktivuje" (viz EmergencyMiniGame.tsx hasLeftStartZone). */
export const START_ZONE_LEAVE_RADIUS_PX = 70;

// "Sebrání věci" — pro MVP jeden pevný spawn bod, mimo zdi a mimo start/enemy pozici.
export const ITEM_SPAWN_POSITION: Vec2 = { x: 150, y: 460 };
export const ITEM_RADIUS = 10;

// Nepřítel startuje nahoře a hned v "investigating" (NE "chasing") — s
// prvním podezřelým bodem poblíž hráčovy startovní pozice, s náhodnou
// odchylkou (viz createInvestigationTarget). Bere `player` jako parametr,
// protože bez pozice hráče by nešlo první investigationTarget vůbec vybrat.
export function createInitialEnemy(player: Player): Enemy {
  const x = CANVAS_WIDTH / 2;
  const y = 60;
  const distanceToPlayer = distance(x, y, player.x, player.y);
  const investigationTarget = createInvestigationTarget({
    playerX: player.x,
    playerY: player.y,
    distanceToPlayer,
    noiseCloseRangePx: INVESTIGATION_NOISE_CLOSE_PX,
    noiseFarPx: INVESTIGATION_NOISE_FAR_PX,
    closeDistanceThresholdPx: INVESTIGATION_CLOSE_DISTANCE_THRESHOLD_PX,
    enemyRadius: ENEMY_RADIUS,
    walls: WALLS,
    mapWidth: CANVAS_WIDTH,
    mapHeight: CANVAS_HEIGHT,
    maxAttempts: INVESTIGATION_MAX_ATTEMPTS,
  });

  return {
    x,
    y,
    radius: ENEMY_RADIUS,
    alive: true,
    mode: "investigating",
    investigationTarget,
    waitRemainingMs: 0,
    stunRemainingMs: 0,
    visionAngle: angleBetween(x, y, investigationTarget.x, investigationTarget.y),
  };
}
