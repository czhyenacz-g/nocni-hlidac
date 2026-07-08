import {
  Direction,
  Enemy,
  EmergencyCompletedObjective,
  EmergencyMiniGameEquipment,
  EmergencyMiniGameInput,
  EmergencyMiniGameResult,
  EmergencyMissionPhase,
  EmergencyMissionState,
  EmergencyWorldEffect,
  EnemyMode,
  MiniGameObjective,
  MiniGameStatus,
  Vec2,
  Wall,
} from "./types";

// Čistá herní logika prototypu minihry — žádné canvas/DOM/React tady,
// snadno testovatelné (viz logic.test.ts). components/minigame/EmergencyMiniGame.tsx
// tyhle funkce jen volá a kreslí/rozhoduje podle výsledku.

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/** Úhel (rad) od bodu A k bodu B — 0 = doprava, roste po směru hodinových ručiček (canvas Y roste dolů). */
export function angleBetween(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(by - ay, bx - ax);
}

/** Kolize kruhu (střed + poloměr) s obdélníkovou zdí — nejbližší bod obdélníku ke středu kruhu, porovnaný se vzdáleností. */
export function circleIntersectsWall(cx: number, cy: number, radius: number, wall: Wall): boolean {
  const closestX = clamp(cx, wall.x, wall.x + wall.width);
  const closestY = clamp(cy, wall.y, wall.y + wall.height);
  return distance(cx, cy, closestX, closestY) < radius;
}

export function circleIntersectsAnyWall(cx: number, cy: number, radius: number, walls: Wall[]): boolean {
  return walls.some((wall) => circleIntersectsWall(cx, cy, radius, wall));
}

export const DIRECTION_ANGLES: Record<Direction, number> = {
  right: 0,
  "down-right": Math.PI / 4,
  down: Math.PI / 2,
  "down-left": (3 * Math.PI) / 4,
  left: Math.PI,
  "up-left": (-3 * Math.PI) / 4,
  up: -Math.PI / 2,
  "up-right": -Math.PI / 4,
};

/** Normalizuje úhel do rozsahu (-π, π] — ať rozdíl dvou úhlů nevychází uměle velký kvůli "přetečení" přes ±π. */
export function normalizeAngle(angle: number): number {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized <= -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

// Pořadí odpovídá indexům 0..7 při zaokrouhlení úhlu na násobky 45° (viz
// directionFromVector) — index 0 = 0°/right, roste po směru hodinových
// ručiček (canvas Y roste dolů, takže +90° = down, ne up).
const EIGHT_DIRECTIONS: Direction[] = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
];

/**
 * Odvodí jeden z 8 směrů (45° kroky) z vektoru pohybu — diagonální pohyb
 * (např. současně W+D) tak míří přesně mezi dvě osy, ne jen po dominantní z
 * nich. Beze změny, pokud hráč zrovna stojí (dx=dy=0).
 */
export function directionFromVector(dx: number, dy: number, previous: Direction): Direction {
  if (dx === 0 && dy === 0) return previous;
  const angle = Math.atan2(dy, dx);
  const normalized = angle < 0 ? angle + Math.PI * 2 : angle;
  const index = Math.round(normalized / (Math.PI / 4)) % EIGHT_DIRECTIONS.length;
  return EIGHT_DIRECTIONS[index];
}

export interface ConeCheckInput {
  originX: number;
  originY: number;
  direction: Direction;
  coneAngleRad: number;
  range: number;
  targetX: number;
  targetY: number;
  targetRadius: number;
}

/**
 * Jestli je cílový kruh (typicky nepřítel) v dosahu a úhlu hráčovy výseče
 * (brokovnice). Jednoduchá geometrie (vzdálenost + úhlový rozdíl), ne
 * přesný raycast/occlusion zdmi — pro prototyp stačí. `targetRadius` přidává
 * malou úhlovou toleranci, ať cíl na okraji výseče "z půlky uvnitř"
 * nepůsobí jako zjevný miss. Beze změny — hráčova výseč/hit detection se
 * touhle úpravou AI nepřítele nemění.
 */
export function isTargetInCone(input: ConeCheckInput): boolean {
  const { originX, originY, direction, coneAngleRad, range, targetX, targetY, targetRadius } = input;
  const dist = distance(originX, originY, targetX, targetY);
  if (dist > range + targetRadius) return false;
  if (dist === 0) return true;

  const angleToTarget = angleBetween(originX, originY, targetX, targetY);
  const facingAngle = DIRECTION_ANGLES[direction];
  const angleDiff = Math.abs(normalizeAngle(angleToTarget - facingAngle));
  const angularTolerance = Math.atan2(targetRadius, dist);

  return angleDiff <= coneAngleRad / 2 + angularTolerance;
}

/**
 * Jako isTargetInCone, ale pro libovolný úhel (rad), ne jen hráčových 8
 * Direction hodnot — nepřítel se dívá směrem k investigationTarget/hráči,
 * ne jen v 8 pevných směrech. Bez `targetRadius` tolerance (point-check),
 * viz canEnemySeePlayer pro plnou viditelnost hráče (kruh, ne bod).
 */
export function isPointInCone(
  pointX: number,
  pointY: number,
  originX: number,
  originY: number,
  facingAngle: number,
  coneAngleRad: number,
  range: number,
): boolean {
  const dist = distance(originX, originY, pointX, pointY);
  if (dist > range) return false;
  if (dist === 0) return true;

  const angleToPoint = angleBetween(originX, originY, pointX, pointY);
  const angleDiff = Math.abs(normalizeAngle(angleToPoint - facingAngle));
  return angleDiff <= coneAngleRad / 2;
}

export interface FireShotInput {
  player: { x: number; y: number; direction: Direction };
  enemy: { x: number; y: number; radius: number; alive: boolean };
  coneAngleRad: number;
  range: number;
  walls: Wall[];
}

/**
 * Jestli by výstřel TEĎ zasáhl nepřítele — mrtvý nepřítel se nikdy netrefí
 * (žádný "double kill"). Kromě výseče/dosahu musí platit i line-of-sight
 * (sdílený `hasLineOfSight` helper, stejný jako `canEnemySeePlayer` níže) —
 * zeď mezi hráčem a nepřítelem výstřel blokuje stejně, jako blokuje
 * nepřítelovo vidění hráče. Náboj/shot flash se spotřebuje vždy (o tom
 * rozhoduje volající, viz EmergencyMiniGame.tsx#fireShot) — tahle funkce jen
 * říká, jestli se zásah PROJEVÍ (enemy se zraní), ne jestli se vystřelilo.
 */
export function isEnemyHit(input: FireShotInput): boolean {
  if (!input.enemy.alive) return false;
  const inCone = isTargetInCone({
    originX: input.player.x,
    originY: input.player.y,
    direction: input.player.direction,
    coneAngleRad: input.coneAngleRad,
    range: input.range,
    targetX: input.enemy.x,
    targetY: input.enemy.y,
    targetRadius: input.enemy.radius,
  });
  if (!inCone) return false;
  return hasLineOfSight(input.player.x, input.player.y, input.enemy.x, input.enemy.y, input.walls);
}

export interface MoveResult {
  x: number;
  y: number;
}

/**
 * Pohyb po osách zvlášť (nejdřív X, pak Y) — jednoduché "sliding" řešení
 * kolizí se zdmi bez pathfindingu: pokud by pohyb po dané ose skončil v
 * kolizi, ta osa se vrátí na původní hodnotu (druhá osa může projít dál,
 * takže pohyb podél zdi zůstává plynulý). Výsledek je vždy uvnitř mapy
 * (clamp na poloměr od okraje).
 */
export function moveWithWallSliding(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
  walls: Wall[],
  mapWidth: number,
  mapHeight: number,
): MoveResult {
  let nextX = clamp(x + dx, radius, mapWidth - radius);
  if (circleIntersectsAnyWall(nextX, y, radius, walls)) nextX = x;

  let nextY = clamp(y + dy, radius, mapHeight - radius);
  if (circleIntersectsAnyWall(nextX, nextY, radius, walls)) nextY = y;

  return { x: nextX, y: nextY };
}

/** Dotyk dvou kruhů (hráč/nepřítel) — součet poloměrů vs. vzdálenost středů. */
export function circlesTouch(ax: number, ay: number, aRadius: number, bx: number, by: number, bRadius: number): boolean {
  return distance(ax, ay, bx, by) <= aRadius + bRadius;
}

/** Jednotkový vektor (dx, dy) z bodu A směrem k bodu B, škálovaný na `speed` — (0,0), pokud jsou body totožné. */
export function stepTowards(ax: number, ay: number, bx: number, by: number, speed: number): { dx: number; dy: number } {
  const dist = distance(ax, ay, bx, by);
  if (dist === 0) return { dx: 0, dy: 0 };
  return { dx: ((bx - ax) / dist) * speed, dy: ((by - ay) / dist) * speed };
}

/** Odpočítá omráčení o `deltaMs`, nikdy pod 0 — čistá funkce, ať jde snadno otestovat "po 10 s omráčení skončí". */
export function tickEnemyStun(stunRemainingMs: number, deltaMs: number): number {
  return Math.max(0, stunRemainingMs - deltaMs);
}

export interface StuckTrackingResult {
  stuckCheckPosition: Vec2;
  stuckCheckElapsedMs: number;
  stuckTotalMs: number;
  isStuck: boolean;
}

/**
 * Anti-stuck detekce (viz updateEnemyAi) — jen pro módy, kde se enemy má fakticky
 * hýbat ("investigating"/"chasing"). Každých `checkIntervalMs` porovná aktuální
 * pozici s pozicí při poslední kontrole: posun menší než `moveThresholdPx` = enemy
 * se "nehýbe" (zaseklý o zeď), posun přičte do `stuckTotalMs`; dost velký posun
 * `stuckTotalMs` vynuluje. `isStuck` je `true`, jakmile `stuckTotalMs` dosáhne
 * `timeoutMs`. Čistá funkce — volající (updateEnemyAi) se podle `isStuck` rozhodne,
 * jestli vybrat nový investigationTarget.
 */
export function trackStuck(
  currentX: number,
  currentY: number,
  stuckCheckPosition: Vec2,
  stuckCheckElapsedMs: number,
  stuckTotalMs: number,
  deltaMs: number,
  checkIntervalMs: number,
  moveThresholdPx: number,
  timeoutMs: number,
): StuckTrackingResult {
  const elapsedMs = stuckCheckElapsedMs + deltaMs;
  if (elapsedMs < checkIntervalMs) {
    return { stuckCheckPosition, stuckCheckElapsedMs: elapsedMs, stuckTotalMs, isStuck: stuckTotalMs >= timeoutMs };
  }

  const moved = distance(currentX, currentY, stuckCheckPosition.x, stuckCheckPosition.y);
  const nextStuckTotalMs = moved < moveThresholdPx ? stuckTotalMs + elapsedMs : 0;
  return {
    stuckCheckPosition: { x: currentX, y: currentY },
    stuckCheckElapsedMs: 0,
    stuckTotalMs: nextStuckTotalMs,
    isStuck: nextStuckTotalMs >= timeoutMs,
  };
}

// ── Line-of-sight (zdi blokují viditelnost i výseč nepřítele) ─────────────

function pointInRect(px: number, py: number, rect: Wall): boolean {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): -1 | 0 | 1 {
  const val = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : -1;
}

function onSegment(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  return bx <= Math.max(ax, cx) && bx >= Math.min(ax, cx) && by <= Math.max(ay, cy) && by >= Math.min(ay, cy);
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const o1 = orientation(ax, ay, bx, by, cx, cy);
  const o2 = orientation(ax, ay, bx, by, dx, dy);
  const o3 = orientation(cx, cy, dx, dy, ax, ay);
  const o4 = orientation(cx, cy, dx, dy, bx, by);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(ax, ay, cx, cy, bx, by)) return true;
  if (o2 === 0 && onSegment(ax, ay, dx, dy, bx, by)) return true;
  if (o3 === 0 && onSegment(cx, cy, ax, ay, dx, dy)) return true;
  if (o4 === 0 && onSegment(cx, cy, bx, by, dx, dy)) return true;
  return false;
}

/** Jestli úsečka (x1,y1)-(x2,y2) protíná obdélníkovou zeď — buď má koncový bod uvnitř, nebo protíná některou ze 4 stran. */
export function lineIntersectsRect(x1: number, y1: number, x2: number, y2: number, rect: Wall): boolean {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;

  const { x, y, width, height } = rect;
  const corners: [number, number][] = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];

  for (let i = 0; i < 4; i++) {
    const [cx1, cy1] = corners[i];
    const [cx2, cy2] = corners[(i + 1) % 4];
    if (segmentsIntersect(x1, y1, x2, y2, cx1, cy1, cx2, cy2)) return true;
  }
  return false;
}

/** Jestli je mezi (x1,y1) a (x2,y2) volný výhled — `false`, pokud jakákoliv zeď úsečku protíná. */
export function hasLineOfSight(x1: number, y1: number, x2: number, y2: number, walls: Wall[]): boolean {
  return !walls.some((wall) => lineIntersectsRect(x1, y1, x2, y2, wall));
}

export interface CanEnemySeePlayerInput {
  enemyX: number;
  enemyY: number;
  visionAngle: number;
  visionAngleRad: number;
  visionRange: number;
  playerX: number;
  playerY: number;
  walls: Wall[];
}

/** Nepřítel vidí hráče, jen když je zároveň (1) ve výseči vidění, (2) v dosahu, (3) není za zdí. */
export function canEnemySeePlayer(input: CanEnemySeePlayerInput): boolean {
  const { enemyX, enemyY, visionAngle, visionAngleRad, visionRange, playerX, playerY, walls } = input;
  if (!isPointInCone(playerX, playerY, enemyX, enemyY, visionAngle, visionAngleRad, visionRange)) return false;
  return hasLineOfSight(enemyX, enemyY, playerX, playerY, walls);
}

// ── Podezřelý bod (investigation target) ──────────────────────────────────

export interface CreateInvestigationTargetOptions {
  playerX: number;
  playerY: number;
  distanceToPlayer: number;
  noiseCloseRangePx: number;
  noiseFarPx: number;
  closeDistanceThresholdPx: number;
  enemyRadius: number;
  walls: Wall[];
  mapWidth: number;
  mapHeight: number;
  maxAttempts: number;
  /** Injektovatelný RNG (0..1) — testy dají deterministickou sekvenci, default Math.random. */
  rng?: () => number;
}

/**
 * Vytvoří přibližný "podezřelý" bod poblíž hráče — NIKDY přesnou pozici
 * hráče. Odchylka (`noise`) je menší, když je nepřítel blízko hráče
 * (přesnější odhad), větší, když je daleko. Zkusí až `maxAttempts`
 * náhodných bodů, ať nevybere místo uvnitř zdi; když se to nepovede ani
 * jednou (nepravděpodobné), spadne zpátky na clampnutou pozici hráče, nikdy
 * nevrátí `undefined`.
 */
export function createInvestigationTarget(options: CreateInvestigationTargetOptions): Vec2 {
  const {
    playerX,
    playerY,
    distanceToPlayer,
    noiseCloseRangePx,
    noiseFarPx,
    closeDistanceThresholdPx,
    enemyRadius,
    walls,
    mapWidth,
    mapHeight,
    maxAttempts,
    rng = Math.random,
  } = options;

  const noise = distanceToPlayer < closeDistanceThresholdPx ? noiseCloseRangePx : noiseFarPx;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = clamp(playerX + (rng() * 2 - 1) * noise, enemyRadius, mapWidth - enemyRadius);
    const y = clamp(playerY + (rng() * 2 - 1) * noise, enemyRadius, mapHeight - enemyRadius);
    if (!circleIntersectsAnyWall(x, y, enemyRadius, walls)) {
      return { x, y };
    }
  }

  return {
    x: clamp(playerX, enemyRadius, mapWidth - enemyRadius),
    y: clamp(playerY, enemyRadius, mapHeight - enemyRadius),
  };
}

// ── Výseč nepřítele omezená zdmi (jen pro vykreslení) ─────────────────────

export interface CastVisionConeOptions {
  originX: number;
  originY: number;
  facingAngle: number;
  coneAngleRad: number;
  range: number;
  walls: Wall[];
  rayCount: number;
  stepPx: number;
}

/**
 * Jednoduchý raycasting pro vykreslení výseče nepřítele omezené zdmi — NENÍ
 * přesná simulace, jen "vypadá to, že výseč nesvítí přes zdi". Pro každý z
 * `rayCount` paprsků rovnoměrně rozprostřených přes `coneAngleRad` kolem
 * `facingAngle` postupuje po `stepPx` krocích, dokud nenarazí do zdi nebo
 * nedosáhne `range`. Vrací pole bodů (konec každého paprsku) — volající
 * (MiniGameCanvas.tsx) z nich sestaví vykreslovaný polygon (origin + tyhle
 * body). Gameplay viditelnost (canEnemySeePlayer) na tomhle nezávisí — ta
 * používá přesný hasLineOfSight, ne tenhle přibližný raycast.
 */
export function castVisionCone(options: CastVisionConeOptions): Vec2[] {
  const { originX, originY, facingAngle, coneAngleRad, range, walls, rayCount, stepPx } = options;
  const points: Vec2[] = [];
  const startAngle = facingAngle - coneAngleRad / 2;

  for (let i = 0; i < rayCount; i++) {
    const rayAngle = rayCount === 1 ? facingAngle : startAngle + (coneAngleRad * i) / (rayCount - 1);
    const dirX = Math.cos(rayAngle);
    const dirY = Math.sin(rayAngle);

    let hitDistance = range;
    for (let travelled = stepPx; travelled <= range; travelled += stepPx) {
      const pointX = originX + dirX * travelled;
      const pointY = originY + dirY * travelled;
      if (circleIntersectsAnyWall(pointX, pointY, 1, walls)) {
        hitDistance = travelled;
        break;
      }
    }

    points.push({ x: originX + dirX * hitDistance, y: originY + dirY * hitDistance });
  }

  return points;
}

// ── Enemy AI (stavový stroj) ───────────────────────────────────────────────

export interface EnemyAiConfig {
  searchSpeed: number;
  chaseSpeed: number;
  aggroSpeedMultiplier: number;
  /** Blízký dosah (typicky shotgunRange), ve kterém chasing zrychlí o aggroSpeedMultiplier. */
  aggroRange: number;
  visionRange: number;
  visionAngleRad: number;
  waitMinMs: number;
  waitMaxMs: number;
  investigationArrivalRadius: number;
  investigationNoiseCloseRangePx: number;
  investigationNoiseFarPx: number;
  investigationCloseDistanceThresholdPx: number;
  investigationMaxAttempts: number;
  mapWidth: number;
  mapHeight: number;
  /** Anti-stuck (viz trackStuck): jak často (ms) se kontroluje reálný posun. */
  stuckCheckIntervalMs: number;
  /** Anti-stuck: posun menší než tohle (px) mezi dvěma kontrolami se počítá jako "nehýbe se". */
  stuckMoveThresholdPx: number;
  /** Anti-stuck: kumulovaný čas bez reálného pohybu (ms), po kterém se enemy považuje za zaseklého. */
  stuckTimeoutMs: number;
}

export interface UpdateEnemyAiInput {
  enemy: Enemy;
  player: { x: number; y: number };
  walls: Wall[];
  deltaMs: number;
  config: EnemyAiConfig;
  rng?: () => number;
}

function pickInvestigationTarget(
  enemy: Enemy,
  player: { x: number; y: number },
  distanceToPlayer: number,
  walls: Wall[],
  config: EnemyAiConfig,
  rng: () => number,
): Vec2 {
  return createInvestigationTarget({
    playerX: player.x,
    playerY: player.y,
    distanceToPlayer,
    noiseCloseRangePx: config.investigationNoiseCloseRangePx,
    noiseFarPx: config.investigationNoiseFarPx,
    closeDistanceThresholdPx: config.investigationCloseDistanceThresholdPx,
    enemyRadius: enemy.radius,
    walls,
    mapWidth: config.mapWidth,
    mapHeight: config.mapHeight,
    maxAttempts: config.investigationMaxAttempts,
    rng,
  });
}

/**
 * Jeden krok AI nepřítele (viz EnemyMode) — čistá funkce, vrací NOVÝ Enemy
 * stav, nemutuje vstup. Volající (MiniGameCanvas.tsx) si podle vráceného
 * `mode !== "wounded"` a nové pozice sám vyhodnotí dotyk s hráčem
 * (game over) — tahle funkce sama o sobě game over nerozhoduje.
 *
 * Pořadí rozhodování každý tik:
 * 1. wounded (stunRemainingMs > 0) přebíjí všechno — jen odpočítá, nehýbe se.
 *    Jakmile stun doběhne, hned tenhle tik zvolí nový investigationTarget a
 *    přejde do "investigating".
 * 2. Jinak: vidí nepřítel TEĎ hráče (vision cone + line-of-sight)? Pokud
 *    ano → "chasing" (v aggroRange rychlejší).
 * 3. Jinak: pokud byl předtím "chasing" (právě ztratil hráče z dohledu) →
 *    nový investigationTarget poblíž (přibližné) polohy hráče, "investigating".
 * 4. Jinak podle aktuálního módu: "waiting" odpočítá/přejde na nový target;
 *    "investigating" jde k cíli, po dosažení přejde do "waiting".
 */
export function updateEnemyAi(input: UpdateEnemyAiInput): Enemy {
  const { enemy, player, walls, deltaMs, config, rng = Math.random } = input;

  if (enemy.stunRemainingMs > 0) {
    const stunRemainingMs = tickEnemyStun(enemy.stunRemainingMs, deltaMs);
    if (stunRemainingMs > 0) {
      return { ...enemy, stunRemainingMs, mode: "wounded" };
    }
    const distanceToPlayer = distance(enemy.x, enemy.y, player.x, player.y);
    const target = pickInvestigationTarget(enemy, player, distanceToPlayer, walls, config, rng);
    return {
      ...enemy,
      stunRemainingMs: 0,
      mode: "investigating",
      investigationTarget: target,
      waitRemainingMs: 0,
      stuckCheckPosition: { x: enemy.x, y: enemy.y },
      stuckCheckElapsedMs: 0,
      stuckTotalMs: 0,
    };
  }

  const distanceToPlayer = distance(enemy.x, enemy.y, player.x, player.y);
  const canSee = canEnemySeePlayer({
    enemyX: enemy.x,
    enemyY: enemy.y,
    visionAngle: enemy.visionAngle,
    visionAngleRad: config.visionAngleRad,
    visionRange: config.visionRange,
    playerX: player.x,
    playerY: player.y,
    walls,
  });

  if (canSee) {
    const speed = distanceToPlayer <= config.aggroRange ? config.chaseSpeed * config.aggroSpeedMultiplier : config.chaseSpeed;
    const step = stepTowards(enemy.x, enemy.y, player.x, player.y, speed);
    const moved = moveWithWallSliding(enemy.x, enemy.y, step.dx, step.dy, enemy.radius, walls, config.mapWidth, config.mapHeight);
    const visionAngle = angleBetween(enemy.x, enemy.y, player.x, player.y);

    // Stuck accumulaci navazujeme jen mezi po sobě jdoucími "chasing" tiky — čerstvý
    // vstup do chasing z jiného módu nesmí zdědit starý (jinam vztažený) čítač.
    const wasAlreadyChasing = enemy.mode === "chasing";
    const stuck = trackStuck(
      moved.x,
      moved.y,
      wasAlreadyChasing ? enemy.stuckCheckPosition : { x: enemy.x, y: enemy.y },
      wasAlreadyChasing ? enemy.stuckCheckElapsedMs : 0,
      wasAlreadyChasing ? enemy.stuckTotalMs : 0,
      deltaMs,
      config.stuckCheckIntervalMs,
      config.stuckMoveThresholdPx,
      config.stuckTimeoutMs,
    );

    if (stuck.isStuck) {
      // Zaseklý o zeď při honičce — vzdáme se honičky (line-of-sight pravidla se
      // vyhodnotí znovu příští tik) a vydáme se na nový přibližný bod.
      const target = pickInvestigationTarget(enemy, player, distanceToPlayer, walls, config, rng);
      return {
        ...enemy,
        x: moved.x,
        y: moved.y,
        mode: "investigating",
        investigationTarget: target,
        waitRemainingMs: 0,
        stuckCheckPosition: { x: moved.x, y: moved.y },
        stuckCheckElapsedMs: 0,
        stuckTotalMs: 0,
      };
    }

    return {
      ...enemy,
      x: moved.x,
      y: moved.y,
      mode: "chasing",
      visionAngle,
      waitRemainingMs: 0,
      stuckCheckPosition: stuck.stuckCheckPosition,
      stuckCheckElapsedMs: stuck.stuckCheckElapsedMs,
      stuckTotalMs: stuck.stuckTotalMs,
    };
  }

  if (enemy.mode === "chasing") {
    // Právě ztratil hráče z dohledu — jde zkontrolovat místo, kde ho naposledy viděl.
    const target = pickInvestigationTarget(enemy, player, distanceToPlayer, walls, config, rng);
    return {
      ...enemy,
      mode: "investigating",
      investigationTarget: target,
      waitRemainingMs: 0,
      stuckCheckPosition: { x: enemy.x, y: enemy.y },
      stuckCheckElapsedMs: 0,
      stuckTotalMs: 0,
    };
  }

  if (enemy.mode === "waiting") {
    const waitRemainingMs = Math.max(0, enemy.waitRemainingMs - deltaMs);
    if (waitRemainingMs > 0) {
      return { ...enemy, waitRemainingMs, mode: "waiting" };
    }
    const target = pickInvestigationTarget(enemy, player, distanceToPlayer, walls, config, rng);
    return {
      ...enemy,
      mode: "investigating",
      investigationTarget: target,
      waitRemainingMs: 0,
      stuckCheckPosition: { x: enemy.x, y: enemy.y },
      stuckCheckElapsedMs: 0,
      stuckTotalMs: 0,
    };
  }

  // mode === "investigating"
  const target = enemy.investigationTarget;
  const distanceToTarget = distance(enemy.x, enemy.y, target.x, target.y);
  if (distanceToTarget <= config.investigationArrivalRadius) {
    const waitRemainingMs = config.waitMinMs + rng() * (config.waitMaxMs - config.waitMinMs);
    return { ...enemy, mode: "waiting", waitRemainingMs };
  }

  const step = stepTowards(enemy.x, enemy.y, target.x, target.y, config.searchSpeed);
  const moved = moveWithWallSliding(enemy.x, enemy.y, step.dx, step.dy, enemy.radius, walls, config.mapWidth, config.mapHeight);
  const visionAngle = angleBetween(enemy.x, enemy.y, target.x, target.y);

  const stuck = trackStuck(
    moved.x,
    moved.y,
    enemy.stuckCheckPosition,
    enemy.stuckCheckElapsedMs,
    enemy.stuckTotalMs,
    deltaMs,
    config.stuckCheckIntervalMs,
    config.stuckMoveThresholdPx,
    config.stuckTimeoutMs,
  );

  if (stuck.isStuck) {
    // Zaseklý o zeď při hledání podezřelého bodu — zvol nový, ať se AI neuvíznutá
    // navěky nebijí do stejné zdi.
    const newTarget = pickInvestigationTarget(enemy, player, distanceToPlayer, walls, config, rng);
    return {
      ...enemy,
      x: moved.x,
      y: moved.y,
      mode: "investigating",
      investigationTarget: newTarget,
      visionAngle,
      stuckCheckPosition: { x: moved.x, y: moved.y },
      stuckCheckElapsedMs: 0,
      stuckTotalMs: 0,
    };
  }

  return {
    ...enemy,
    x: moved.x,
    y: moved.y,
    mode: "investigating",
    visionAngle,
    stuckCheckPosition: stuck.stuckCheckPosition,
    stuckCheckElapsedMs: stuck.stuckCheckElapsedMs,
    stuckTotalMs: stuck.stuckTotalMs,
  };
}

// ── Kontrakt pro budoucí spuštění z hlavní hry (viz
// components/minigame/EmergencyMiniGame.tsx) — čisté, testovatelné funkce
// pro vstup/výsledek, žádné React/DOM.

/** Chybí-li equipment i (deprecated) shots, minihra běží se starým výchozím chováním — brokovnice + 1 náboj. */
export const DEFAULT_EQUIPMENT: EmergencyMiniGameEquipment = { hasShotgun: true, ammo: 1 };

/** ammo nikdy záporné a vždy celé číslo; bez brokovnice se ammo interně chová jako 0 (nejde vystřelit, i kdyby input poslal ammo > 0). */
function normalizeEquipment(equipment: EmergencyMiniGameEquipment): EmergencyMiniGameEquipment {
  const ammo = Math.max(0, Math.floor(equipment.ammo));
  return { hasShotgun: equipment.hasShotgun, ammo: equipment.hasShotgun ? ammo : 0 };
}

/**
 * Skutečná výbava hráče na vstupu do minihry (viz EmergencyMiniGameEquipment
 * v types.ts). `input.equipment` má přednost; chybí-li, spadne na (deprecated)
 * `input.shots` kvůli zpětné kompatibilitě starších vstupů/testů
 * (`{ hasShotgun: shots > 0, ammo: shots }`); chybí-li obojí, DEFAULT_EQUIPMENT.
 * Nové scénáře (viz debugScenarios.ts) už `shots` nepoužívají.
 */
export function resolveEquipmentFromInput(input: Pick<EmergencyMiniGameInput, "equipment" | "shots">): EmergencyMiniGameEquipment {
  if (input.equipment) return normalizeEquipment(input.equipment);
  if (typeof input.shots === "number") return normalizeEquipment({ hasShotgun: input.shots > 0, ammo: input.shots });
  return DEFAULT_EQUIPMENT;
}

/** Jestli teď (mezerníkem) může vystřelit — hra musí běžet, hráč musí mít brokovnici A aspoň 1 náboj. */
export function canFireWeapon(input: { status: MiniGameStatus; hasShotgun: boolean; ammo: number }): boolean {
  return input.status === "playing" && input.hasShotgun && input.ammo > 0;
}

/** HUD popisek stavu zbraně — musí jasně rozlišit "bez zbraně" od "zbraň, ale bez nábojů" (viz zadání). */
export function createWeaponHudLabel(hasShotgun: boolean, ammo: number): string {
  return hasShotgun ? `Zbraň: brokovnice · Náboje: ${ammo}` : "Zbraň: žádná";
}

export interface ApplyShotInput {
  /** Aktuální výbava hráče (viz canFireWeapon) — NE celý Player, jen relevantní pole. */
  player: { hasShotgun: boolean; ammo: number };
  /** Pozice/směr pro hit-detekci (viz isEnemyHit) — samostatně od `player` výše, ať funkce nezávisí na celém Player tvaru. */
  playerPosition: { x: number; y: number; direction: Direction };
  enemy: { x: number; y: number; radius: number; alive: boolean };
  coneAngleRad: number;
  range: number;
  walls: Wall[];
  status: MiniGameStatus;
  shotFlashDurationMs: number;
}

export interface ApplyShotResult {
  /** false = mezerník nic neudělal (chybí zbraň/náboj/hra neběží) — volající nesmí měnit ammo/shotsUsed/shotFlash. */
  fired: boolean;
  ammo: number;
  /** 0 nebo 1 — kolik přičíst k dosavadnímu shotsUsed. */
  shotsUsedDelta: number;
  /** 0 pokud fired === false (nezobrazovat shot flash), jinak shotFlashDurationMs. */
  shotFlashRemainingMs: number;
  /** Jestli výstřel skutečně zranil nepřítele (v cone + range + line-of-sight, viz isEnemyHit) — false i při "fired: true", pokud je to miss/zeď. */
  hit: boolean;
}

/**
 * Jeden pokus o výstřel mezerníkem — čistá funkce, žádná mutace. Bez
 * brokovnice nebo bez náboje (viz canFireWeapon) se nic nespotřebuje a
 * nezasáhne (`fired: false`); jinak se náboj vždy spotřebuje a shot flash
 * vždy spustí, ať už `hit` vyjde jakkoliv (zeď mezi hráčem a nepřítelem dělá
 * z "fired" zásahu i tak jen miss, viz isEnemyHit).
 */
export function applyShot(input: ApplyShotInput): ApplyShotResult {
  if (!canFireWeapon({ status: input.status, hasShotgun: input.player.hasShotgun, ammo: input.player.ammo })) {
    return { fired: false, ammo: input.player.ammo, shotsUsedDelta: 0, shotFlashRemainingMs: 0, hit: false };
  }

  const hit = isEnemyHit({
    player: input.playerPosition,
    enemy: input.enemy,
    coneAngleRad: input.coneAngleRad,
    range: input.range,
    walls: input.walls,
  });

  return {
    fired: true,
    ammo: input.player.ammo - 1,
    shotsUsedDelta: 1,
    shotFlashRemainingMs: input.shotFlashDurationMs,
    hit,
  };
}

export function createDeadResult(elapsedMs: number, shotsUsed: number): EmergencyMiniGameResult {
  return { outcome: "dead", reason: "monster", elapsedMs, shotsUsed };
}

/** Battery item pro objective "collect_item" — viz createWorldEffectsForCompletedObjective. Zatím jediná "amount" hodnota v MVP mapování, proto konfigurovatelná konstanta místo natvrdo napsaného čísla. */
export const DEFAULT_BATTERY_ENERGY_RECHARGE = 35;

/**
 * Efekty pro hlavní hru odvozené ze splněného dílčího úkolu — ČISTÁ příprava
 * dat pro `returned.worldEffects` (viz types.ts), samo o sobě nic nemění a
 * nic z game/core nezná/nevolá. MVP mapování: battery/fuse/bulb/shotgun/ammo
 * mají po jednom efektu; key/toolbox a "reached_location" zatím žádný ([]) —
 * připraveno pro budoucí scénáře, ne aktivně použité teď.
 */
export function createWorldEffectsForCompletedObjective(completedObjective: EmergencyCompletedObjective): EmergencyWorldEffect[] {
  if (completedObjective.type !== "collected_item") return [];

  switch (completedObjective.itemId) {
    case "battery":
      return [{ type: "energy_recharged", amount: DEFAULT_BATTERY_ENERGY_RECHARGE }];
    case "fuse":
      return [{ type: "generator_repaired" }];
    case "bulb":
      return [{ type: "bulbs_serviced" }];
    case "shotgun":
      return [{ type: "shotgun_acquired" }];
    case "ammo":
      return [{ type: "ammo_acquired", amount: 1 }];
    case "key":
    case "toolbox":
      return [];
  }
}

/**
 * `completedObjective` je volitelné — return_to_office se vrátí bez něj,
 * collect_item ho vyplní (viz completeObjective/canReturnToOffice níže).
 * Když je vyplněný, `worldEffects` se odvodí automaticky (viz
 * createWorldEffectsForCompletedObjective) — volající si je nevymýšlí ručně.
 */
export function createReturnedResult(
  elapsedMs: number,
  shotsUsed: number,
  completedObjective?: EmergencyCompletedObjective,
): EmergencyMiniGameResult {
  if (!completedObjective) return { outcome: "returned", elapsedMs, shotsUsed };

  const worldEffects = createWorldEffectsForCompletedObjective(completedObjective);
  return worldEffects.length > 0
    ? { outcome: "returned", elapsedMs, shotsUsed, completedObjective, worldEffects }
    : { outcome: "returned", elapsedMs, shotsUsed, completedObjective };
}

export function createFailedResult(elapsedMs: number, shotsUsed: number): EmergencyMiniGameResult {
  return { outcome: "failed", reason: "objective_failed", elapsedMs, shotsUsed };
}

// ── Mise: základní smyčka "kancelář → jdu ven → splním úkol → vracím se do
// kanceláře → onComplete" (viz EmergencyMissionPhase/EmergencyMissionState v
// types.ts). Čisté, testovatelné funkce — EmergencyMiniGame.tsx je jen volá.

export function createInitialMissionState(): EmergencyMissionState {
  return { phase: "outbound" };
}

export function updateMissionPhase(mission: EmergencyMissionState, phase: EmergencyMissionPhase): EmergencyMissionState {
  return { ...mission, phase };
}

/**
 * Splní dílčí úkol (např. sebrání věci) a přepne misi do "returning" — hráč
 * se teď musí vrátit do kanceláře, samotné splnění úkolu minihru NEKONČÍ.
 * Idempotentní: pokud mise už není "outbound" (úkol už byl splněný dřív,
 * nebo je mise už "completed"), vrátí ji beze změny — věc nejde sebrat
 * podruhé a nejde tím "vrátit" už dokončenou misi zpátky do "returning".
 */
export function completeObjective(mission: EmergencyMissionState, completedObjective: EmergencyCompletedObjective): EmergencyMissionState {
  if (mission.phase !== "outbound") return mission;
  return updateMissionPhase({ ...mission, completedObjective }, "returning");
}

/**
 * Jestli teď (v exit zóně, E stisknuté) může mise skončit jako "returned".
 * Vždy vyžaduje, aby hráč už opustil startovní zónu (viz
 * START_ZONE_LEAVE_RADIUS_PX/hasLeftStartZone) — beze změny oproti
 * dosavadnímu chování return_to_office. Pro "collect_item" navíc vyžaduje
 * dokončený dílčí úkol (mission.phase === "returning"); dokud úkol není
 * splněný, návrat do kanceláře misi neukončí (jen HUD hint "Nejdřív splň
 * úkol."). Pro "survive" v MVP exit zóna misi nekončí vůbec.
 */
export function canReturnToOffice(objective: MiniGameObjective, mission: EmergencyMissionState, hasLeftStartZone: boolean): boolean {
  if (!hasLeftStartZone) return false;
  if (objective === "return_to_office") return true;
  if (objective === "collect_item") return mission.phase === "returning";
  return false;
}
