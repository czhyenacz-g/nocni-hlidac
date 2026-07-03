import { TensionInput } from "../core/types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Spočítá tensionLevel (0 = klid, 1 = maximální napětí) z aktuálního herního stavu.
 * Samostatný mechanismus, který vizuální komponenty jen čtou — žádná náhodná CSS logika v UI.
 */
export function computeTensionLevel(input: TensionInput): number {
  const powerRatio = 1 - clamp01(input.power / input.startPower);
  const timeRatio = 1 - clamp01(input.remainingMs / input.durationMs);

  const enemyProximity = {
    outside: 0,
    outer_yard: 0.2,
    right_hallway: 0.4,
    left_hallway: 0.4,
    door_hallway: 0.65,
    at_door: 0.85,
    breach: 0.92,
    attack: 1,
  }[input.enemyStage];

  const atDoor = input.enemyStage === "at_door" || input.enemyStage === "breach";
  const doorDanger = atDoor && !input.doorClosed ? 0.3 : 0;

  const tension =
    powerRatio * 0.3 +
    timeRatio * 0.15 +
    enemyProximity * 0.45 +
    doorDanger;

  return clamp01(tension);
}
