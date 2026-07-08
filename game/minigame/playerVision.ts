import { distance, hasLineOfSight, isPointInCone } from "./logic";
import { Wall } from "./types";

// Omezená viditelnost hráče (fog of war, viz zadání) — čisté, testovatelné
// funkce. NEZÁVISLÉ na útočné výseči hráče (CONE_ANGLE_RAD/CONE_RANGE v
// logic.ts/config.ts) — ta zůstává gameplay hit-detekce (isEnemyHit/applyShot),
// tohle je jen "co hráč vidí" pro rendering/fog (viz
// components/minigame/EmergencyMiniGame.tsx#draw). Sdílí ale STEJNOU
// line-of-sight logiku (hasLineOfSight) a stejný "bod ve výseči" primitiv
// (isPointInCone) jako enemy vidění, ne vlastní přepsanou verzi.

export interface PlayerVisionConfig {
  /** Poloměr (px) periferního kruhu kolem hráče — všechny směry. */
  peripheralRangePx: number;
  /** Dosah (px) směrové výseče před hráčem. */
  directionalRangePx: number;
  /** Úhel (rad) směrové výseče před hráčem. */
  directionalAngleRad: number;
}

export interface PlayerVisionPoint {
  playerX: number;
  playerY: number;
  /** Aktuální směr pohledu hráče (rad) — stejný úhel jako pro útočnou výseč, viz DIRECTION_ANGLES v logic.ts. */
  facingAngle: number;
  pointX: number;
  pointY: number;
}

/** Bod je v periferním kruhu (blízké okolí, všechny směry) — bez ohledu na zdi/LOS, jen vzdálenost. */
export function isPointInPlayerPeripheralVision(input: PlayerVisionPoint, config: PlayerVisionConfig): boolean {
  return distance(input.playerX, input.playerY, input.pointX, input.pointY) <= config.peripheralRangePx;
}

/** Bod je ve směrové výseči před hráčem — bez ohledu na zdi/LOS, jen úhel + dosah. */
export function isPointInPlayerDirectionalVision(input: PlayerVisionPoint, config: PlayerVisionConfig): boolean {
  return isPointInCone(
    input.pointX,
    input.pointY,
    input.playerX,
    input.playerY,
    input.facingAngle,
    config.directionalAngleRad,
    config.directionalRangePx,
  );
}

export type PlayerVisibilityReason = "peripheral" | "directional" | "blocked" | "out_of_range";

export interface PlayerVisibilityResult {
  visible: boolean;
  reason: PlayerVisibilityReason;
}

/**
 * Jestli hráč TEĎ vidí daný bod — periferní kruh NEBO směrová výseč (viz
 * výše), A ZÁROVEŇ musí platit line of sight (zdi/regály/stroje blokují,
 * stejné `hasLineOfSight` jako enemy vidění i shotgun hit-detekce, žádná
 * vlastní přepsaná verze). Mimo dosah obou vrstev = "out_of_range" (LOS se
 * ani nepočítá, zbytečné); v dosahu, ale za zdí = "blocked".
 */
export function getPlayerVisibilityAtPoint(input: PlayerVisionPoint, walls: Wall[], config: PlayerVisionConfig): PlayerVisibilityResult {
  const inPeripheral = isPointInPlayerPeripheralVision(input, config);
  const inDirectional = isPointInPlayerDirectionalVision(input, config);

  if (!inPeripheral && !inDirectional) return { visible: false, reason: "out_of_range" };

  const hasLos = hasLineOfSight(input.playerX, input.playerY, input.pointX, input.pointY, walls);
  if (!hasLos) return { visible: false, reason: "blocked" };

  return { visible: true, reason: inPeripheral ? "peripheral" : "directional" };
}
