import { Direction, EnemyAiState, Wall } from "./types";

// Čistá herní logika prototypu minihry — žádné canvas/DOM/React tady,
// snadno testovatelné (viz logic.test.ts). components/minigame/MiniGameCanvas.tsx
// tyhle funkce jen volá a kreslí podle výsledku.

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
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
 * Jestli je cílový kruh (typicky nepřítel) v dosahu a úhlu výseče. Jednoduchá
 * geometrie (vzdálenost + úhlový rozdíl), ne přesný raycast/occlusion zdmi —
 * pro prototyp stačí, viz zadání "není potřeba dokonalý pathfinding/occlusion".
 * `targetRadius` přidává malou úhlovou toleranci, ať cíl na okraji výseče
 * "z půlky uvnitř" nepůsobí jako zjevný miss.
 */
export function isTargetInCone(input: ConeCheckInput): boolean {
  const { originX, originY, direction, coneAngleRad, range, targetX, targetY, targetRadius } = input;
  const dist = distance(originX, originY, targetX, targetY);
  if (dist > range + targetRadius) return false;
  if (dist === 0) return true;

  const angleToTarget = Math.atan2(targetY - originY, targetX - originX);
  const facingAngle = DIRECTION_ANGLES[direction];
  const angleDiff = Math.abs(normalizeAngle(angleToTarget - facingAngle));
  const angularTolerance = Math.atan2(targetRadius, dist);

  return angleDiff <= coneAngleRad / 2 + angularTolerance;
}

export interface FireShotInput {
  player: { x: number; y: number; direction: Direction };
  enemy: { x: number; y: number; radius: number; alive: boolean };
  coneAngleRad: number;
  range: number;
}

/** Jestli by výstřel TEĎ zasáhl nepřítele — mrtvý nepřítel se nikdy netrefí (žádný "double kill"). */
export function isEnemyHit(input: FireShotInput): boolean {
  if (!input.enemy.alive) return false;
  return isTargetInCone({
    originX: input.player.x,
    originY: input.player.y,
    direction: input.player.direction,
    coneAngleRad: input.coneAngleRad,
    range: input.range,
    targetX: input.enemy.x,
    targetY: input.enemy.y,
    targetRadius: input.enemy.radius,
  });
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

/**
 * Odvodí AI stav nepřítele podle vzdálenosti k hráči — mimo `awarenessRange`
 * je "idle" (neví o hráči, nejde po něm přímo), uvnitř `awarenessRange` je
 * "chasing", uvnitř (kratšího) `aggroRange` je "aggro". `aggroRange` musí
 * být <= `awarenessRange`, jinak by "aggro" nikdy nenastalo (typický případ:
 * aggroRange = shotgunRange, awarenessRange = shotgunRange * 6).
 */
export function computeEnemyAiState(distanceToPlayer: number, awarenessRange: number, aggroRange: number): EnemyAiState {
  if (distanceToPlayer <= aggroRange) return "aggro";
  if (distanceToPlayer <= awarenessRange) return "chasing";
  return "idle";
}

/** "aggro" násobí základní rychlost, "chasing"/"idle" ji nechává beze změny (idle bloudění řeší volající zvlášť, ne tahle funkce). */
export function enemySpeedForState(baseSpeed: number, state: EnemyAiState, aggroSpeedMultiplier: number): number {
  return state === "aggro" ? baseSpeed * aggroSpeedMultiplier : baseSpeed;
}
