import { circlesTouch, clamp, distance, stepTowards } from "./logic";
import { EmergencyMissionPhase, EmergencyMissionState, MiniGameObjective, Vec2 } from "./types";

// Čistá logika pro mobilní/tap-to-move ovládání (viz
// components/minigame/EmergencyMiniGame.tsx) — žádné canvas/DOM/React tady,
// snadno testovatelné (viz touchControls.test.ts). Doplňuje game/minigame/logic.ts
// o věci specifické pro dotykové ovládání, samo o sobě neřeší pohyb po
// zdech/AI (ten dál žije v logic.ts#moveWithWallSliding/updateEnemyAi).

export interface MoveTowardsTargetResult {
  dx: number;
  dy: number;
  /** true, jakmile je hráč uvnitř arrivalRadiusPx — dx/dy jsou pak vždy 0. */
  arrived: boolean;
}

/**
 * Jeden krok pohybu směrem k tap-to-move cíli — stejný princip jako
 * stepTowards (viz logic.ts), navíc s "dost blízko, zastav" prahem. Volající
 * (EmergencyMiniGame.tsx#tick) výsledné dx/dy pošle přes stávající
 * moveWithWallSliding, ať kolize se zdmi/překážkami platí úplně stejně jako
 * pro klávesnicový pohyb — tahle funkce sama o sobě zdi neřeší.
 */
export function computeMoveTowardsTarget(
  x: number,
  y: number,
  target: Vec2,
  speed: number,
  arrivalRadiusPx: number,
): MoveTowardsTargetResult {
  const dist = distance(x, y, target.x, target.y);
  if (dist <= arrivalRadiusPx) return { dx: 0, dy: 0, arrived: true };
  const step = stepTowards(x, y, target.x, target.y, Math.min(speed, dist));
  return { dx: step.dx, dy: step.dy, arrived: false };
}

/** Ořízne tap/click bod na souřadnice uvnitř mapy — stejné omezení, jaké má i hráč samotný (viz moveWithWallSliding). */
export function resolveMoveTargetFromWorldPoint(worldX: number, worldY: number, mapWidth: number, mapHeight: number): Vec2 {
  return { x: clamp(worldX, 0, mapWidth), y: clamp(worldY, 0, mapHeight) };
}

/**
 * Guard proti tomu, aby klik na UI tlačítko (střelba, návrat, restart) omylem
 * nastavil i pohybový cíl — canvas nemá žádné potomky, takže `target ===
 * currentTarget` je u kliků přímo na mapu vždy true; kliky na tlačítka mimo
 * canvas tenhle handler vůbec nezavolají (jiný DOM uzel), tahle funkce jen
 * dělá záměr explicitní a testovatelný.
 */
export function shouldHandleMapPointerEvent(eventTargetIsMapSurface: boolean): boolean {
  return eventTargetIsMapSurface;
}

/** Jak dlouho (ms) po nastavení zůstává tap-to-move marker vidět, než zmizí (i když hráč ještě nedorazil). */
export function isMoveTargetMarkerVisible(elapsedMsSinceSet: number, durationMs: number): boolean {
  return elapsedMsSinceSet < durationMs;
}

export interface AutoCollectItemInput {
  objective: MiniGameObjective;
  missionPhase: EmergencyMissionPhase;
  playerX: number;
  playerY: number;
  playerRadius: number;
  itemPosition?: Vec2;
  itemRadius: number;
}

/**
 * Jestli se má věc (collect_item) TEĎ automaticky sebrat — dotykem, bez
 * nutnosti klávesy E (viz zadání "sjednotit pro PC i mobil"). Mimo
 * "collect_item" nebo mimo "outbound" fázi (věc už sebraná/mise jiná) vždy
 * false — samotné sebrání pak dál řeší existující completeObjective
 * (logic.ts), tahle funkce jen říká "ano, dotýká se".
 */
export function shouldAutoCollectItem(input: AutoCollectItemInput): boolean {
  if (input.objective !== "collect_item") return false;
  if (input.missionPhase !== "outbound") return false;
  if (!input.itemPosition) return false;
  return circlesTouch(input.playerX, input.playerY, input.playerRadius, input.itemPosition.x, input.itemPosition.y, input.itemRadius);
}

export interface CanShowReturnButtonInput {
  status: "playing" | "won" | "gameOver";
  inExitZone: boolean;
  objective: MiniGameObjective;
  mission: EmergencyMissionState;
  hasLeftStartZone: boolean;
}

/**
 * Jestli se má zobrazit klikací "VRÁTIT DO KANCELÁŘE" tlačítko — vždy jen
 * když by E teď skutečně dokončilo misi (viz logic.ts#canReturnToOffice),
 * jinak by tlačítko mohlo lhát o tom, co udělá (viz zadání "jasné, co chybí"
 * — chybějící krok se dál ukazuje jen textovým hintem, ne tímhle tlačítkem).
 */
export function canShowReturnButton(input: CanShowReturnButtonInput, canReturnToOfficeNow: boolean): boolean {
  return input.status === "playing" && input.inExitZone && canReturnToOfficeNow;
}

export interface TouchCapabilityInput {
  matchesCoarsePointer: boolean;
  hasTouchSupport: boolean;
}

/** Robustní, ne dokonalá detekce "je tohle dotykové zařízení" — pointer:coarse OR touch support (viz zadání). */
export function isTouchCapableDevice(input: TouchCapabilityInput): boolean {
  return input.matchesCoarsePointer || input.hasTouchSupport;
}

/** Mobilní tlačítko střelby se ukazuje jen na dotykovém zařízení A jen když má hráč brokovnici (viz zadání). */
export function canShowMobileFireButton(input: { isTouchDevice: boolean; hasShotgun: boolean }): boolean {
  return input.isTouchDevice && input.hasShotgun;
}

/** Bez nábojů zůstává tlačítko vidět, ale disabled s textem "BEZ NÁBOJŮ" (viz zadání). */
export function isMobileFireButtonDisabled(ammo: number): boolean {
  return ammo <= 0;
}

/** CSS ochrana proti označování textu / long-press menu na mobilu (viz zadání) — sdílený styl pro root/canvas/overlays. */
export const NO_TEXT_SELECT_STYLE = {
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
} as const;
