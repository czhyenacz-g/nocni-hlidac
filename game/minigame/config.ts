import { DEFAULT_EQUIPMENT, angleBetween, createInvestigationTarget, distance } from "./logic";
import { EmergencyMiniGameEquipment, EmergencyMiniGameInput, Enemy, Player, Vec2, Wall } from "./types";
import { SERVICE_FLOOR_ALPHA } from "./layouts/serviceFloorAlpha";
import { resolveMiniGamePlacement, getRoomBoundsForSlot } from "./layoutPlacement";

// Konfigurace izolovaného prototypu minihry — žádná hodnota odsud neovlivňuje
// balancing hlavní hry (game/balancing/constants.ts zůstává nedotčené).

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 520;

// ── Měřítko světa / záběr mapy (viz components/minigame/EmergencyMiniGame.tsx#draw)
// — CANVAS_WIDTH/HEIGHT zůstává fyzická velikost <canvas> na stránce (radarový
// panel se vizuálně nemění). Herní svět je ale větší a vykresluje se do
// canvasu zmenšený o měřítko (jedno `ctx.scale(scale, scale)` na začátku
// draw()). PŮVODNĚ (jediná pevná mapa) bylo tohle měřítko jeden natvrdo
// zadaný konstantní poměr (0.8) a WORLD_WIDTH/HEIGHT z něj odvozené. Teď má
// každý layout (viz game/minigame/layouts/) VLASTNÍ world.width/height a
// EmergencyMiniGame.tsx si měřítko dopočítá dynamicky přes
// computeMiniGameWorldScale() níže, ať se libovolně velká/malá mapa vejde do
// stejného CANVAS_WIDTH×CANVAS_HEIGHT panelu. WORLD_WIDTH/HEIGHT a
// MINIGAME_WORLD_SCALE tady zůstávají jen jako zpětně kompatibilní alias pro
// baseline layout (service_floor_alpha) — beze změny hodnoty (1000×650, 0.8),
// ať existující testy/volání beze změny projdou dál.
export const MINIGAME_WORLD_SCALE = 0.8;
export const WORLD_WIDTH = SERVICE_FLOOR_ALPHA.world.width;
export const WORLD_HEIGHT = SERVICE_FLOOR_ALPHA.world.height;

/** Jednotné (ne roztažené) měřítko, kterým se layout.world vejde do CANVAS_WIDTH×CANVAS_HEIGHT beze zbytku/přetečení — pro service_floor_alpha (1000×650) vychází přesně 0.8, stejně jako dřívější pevná MINIGAME_WORLD_SCALE. */
export function computeMiniGameWorldScale(worldWidth: number, worldHeight: number): number {
  return Math.min(CANVAS_WIDTH / worldWidth, CANVAS_HEIGHT / worldHeight);
}

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
// O 10 % rychlejší na žádost (1.4 -> 1.54, 1.6 -> 1.76) — poměr mezi search/
// chase i ENEMY_AGGRO_SPEED_MULTIPLIER níže zůstává stejný, jen se škáluje
// základ.
export const ENEMY_SEARCH_SPEED = 1.54;
export const ENEMY_CHASE_SPEED = 1.76;
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

// ── Anti-stuck fallback (viz game/minigame/logic.ts#trackStuck/updateEnemyAi)
// — nepřítel se v "investigating"/"chasing" může zaseknout o zeď; tyhle
// konstanty řídí, jak citlivě se to pozná a jak rychle se AI zotaví.
export const STUCK_CHECK_INTERVAL_MS = 500;
export const STUCK_MOVE_THRESHOLD_PX = 4;
export const STUCK_TIMEOUT_MS = 5000;

// ── Hrozba přenesená zpět do hlavní hry po návratu (viz
// game/minigame/officeThreat.ts#evaluateOfficeThreatOnReturn) — dosahy pro
// "blízko hráče"/"blízko kanceláře", stejného řádu jako CONE_RANGE/
// ENEMY_VISION_RANGE výše, ne nová vlastní škála.
export const OFFICE_THREAT_NEAR_PLAYER_RADIUS_PX = 150;
export const OFFICE_THREAT_NEAR_OFFICE_RADIUS_PX = 200;

// Zdi baseline mapy — teď datově v game/minigame/layouts/serviceFloorAlpha.ts,
// tohle je jen zpětně kompatibilní re-export (stejná geometrie/hodnoty jako
// dřív). MiniGameLayoutWall je strukturální nadmnožina Wall (x/y/width/height
// + volitelné id/kind navíc), jde ho proto přiřadit rovnou beze změny tvaru.
export const WALLS: Wall[] = SERVICE_FLOOR_ALPHA.walls;

// ── Kontrakt pro budoucí spuštění z hlavní hry ─────────────────────────────

export const DEFAULT_EMERGENCY_MINIGAME_INPUT: EmergencyMiniGameInput = {
  objective: "return_to_office",
  equipment: { hasShotgun: true, ammo: 1 },
  difficulty: "medium",
};

// Vyřešené sloty baseline mapy pro DEFAULT_EMERGENCY_MINIGAME_INPUT — pevný
// interní seed (jen tahle jedna konkrétní kombinace layout+seed má být
// zpětně kompatibilní se starými natvrdo zadanými pozicemi, nezávisí na
// žádném runtime náhodném vstupu). service_floor_alpha má přesně jeden slot
// na tag (player_start/player_exit/monster_spawn), takže seed samotný na
// VÝSLEDEK nemá vliv — je tu jen proto, že resolveMiniGamePlacement seed vyžaduje.
const ALPHA_DEFAULT_PLACEMENT = resolveMiniGamePlacement(SERVICE_FLOOR_ALPHA, DEFAULT_EMERGENCY_MINIGAME_INPUT, "config-default-alpha");

// Hráč startuje dole (u "kontrolní místnosti") — pozice teď pochází z layoutu
// (viz ALPHA_DEFAULT_PLACEMENT.playerStart), ne z natvrdo počítaného vzorce.
// `equipment` = skutečná výbava na start (viz EmergencyMiniGameInput.equipment,
// resolveEquipmentFromInput v logic.ts) — volající (EmergencyMiniGame.tsx) sem
// pošle už rozřešenou hodnotu i pozici (resolvedPlacement.playerStart pro
// zvolený layout/seed); oba parametry mají defaulty, ať staré volání
// `createInitialPlayer(equipment)` (např. testy) beze změny projde dál.
export function createInitialPlayer(
  equipment: EmergencyMiniGameEquipment = DEFAULT_EQUIPMENT,
  position: Vec2 = ALPHA_DEFAULT_PLACEMENT.playerStart,
): Player {
  return {
    x: position.x,
    y: position.y,
    radius: PLAYER_RADIUS,
    direction: "up",
    speed: PLAYER_SPEED,
    hasShotgun: equipment.hasShotgun,
    ammo: equipment.ammo,
  };
}

// "Návrat do kanceláře" — teď obdélník MÍSTNOSTI "office" v layoutu (viz
// getRoomBoundsForSlot), ne samostatná natvrdo zadaná zóna. Aktivuje se až
// po opuštění startu (viz START_ZONE_LEAVE_RADIUS_PX), ať se "returned"
// nesplní hned na startu — dokončuje se stiskem E, ne jen vstupem do zóny.
export const EXIT_ZONE: Wall = getRoomBoundsForSlot(SERVICE_FLOOR_ALPHA, ALPHA_DEFAULT_PLACEMENT.playerExitSlotId);
/** Jak daleko od startovní pozice musí hráč dojít, než se exit zóna "aktivuje" (viz EmergencyMiniGame.tsx hasLeftStartZone) — beze změny hodnoty oproti dřívějšku (70 × dřívější WORLD_LAYOUT_SCALE 1.25). */
export const START_ZONE_LEAVE_RADIUS_PX = 87.5;

// "Sebrání věci" — service_floor_alpha má jeden univerzální item slot
// (item_generic_01, nese VŠECHNY item tagy), stejně jako dřív jeden pevný
// ITEM_SPAWN_POSITION sloužil pro libovolný itemToCollect. Hledá se přímo
// podle id (ne přes resolveMiniGamePlacement/objective), protože tenhle
// zpětně kompatibilní export nemá žádnou konkrétní misi/seed k dispozici.
const ALPHA_ITEM_SLOT = SERVICE_FLOOR_ALPHA.slots.find((slot) => slot.id === "item_generic_01")!;
export const ITEM_SPAWN_POSITION: Vec2 = { x: ALPHA_ITEM_SLOT.x, y: ALPHA_ITEM_SLOT.y };
export const ITEM_RADIUS = 10;

// Nepřítel startuje nahoře a hned v "investigating" (NE "chasing") — s
// prvním podezřelým bodem poblíž hráčovy startovní pozice, s náhodnou
// odchylkou (viz createInvestigationTarget). Bere `player` jako parametr,
// protože bez pozice hráče by nešlo první investigationTarget vůbec vybrat.
// `position`/`walls`/`mapWidth`/`mapHeight` mají defaulty na baseline layout,
// ať staré volání `createInitialEnemy(player)` (např. testy) beze změny
// projde dál — EmergencyMiniGame.tsx pošle skutečné hodnoty zvoleného layoutu.
export function createInitialEnemy(
  player: Player,
  position: Vec2 = ALPHA_DEFAULT_PLACEMENT.monsterSpawn,
  walls: Wall[] = WALLS,
  mapWidth: number = WORLD_WIDTH,
  mapHeight: number = WORLD_HEIGHT,
): Enemy {
  const { x, y } = position;
  const distanceToPlayer = distance(x, y, player.x, player.y);
  const investigationTarget = createInvestigationTarget({
    playerX: player.x,
    playerY: player.y,
    distanceToPlayer,
    noiseCloseRangePx: INVESTIGATION_NOISE_CLOSE_PX,
    noiseFarPx: INVESTIGATION_NOISE_FAR_PX,
    closeDistanceThresholdPx: INVESTIGATION_CLOSE_DISTANCE_THRESHOLD_PX,
    enemyRadius: ENEMY_RADIUS,
    walls,
    mapWidth,
    mapHeight,
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
    stuckCheckPosition: { x, y },
    stuckCheckElapsedMs: 0,
    stuckTotalMs: 0,
    enraged: false,
  };
}
