import { TensionInput } from "../core/types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Spočítá tensionLevel (0 = klid, 1 = maximální napětí) z aktuálního herního stavu.
 * Samostatný mechanismus, který vizuální komponenty jen čtou — žádná náhodná CSS logika v UI.
 *
 * Napětí ZÁMĚRNĚ nezávisí na zbývajícím čase do rána (`remainingMs`/`durationMs`) —
 * blížící se konec směny sám o sobě není nebezpečí a neměl by ztmavovat/desaturovat
 * obraz (viz zadání "odstraň závislost atmosféry na čase — když končí směna, tak by
 * to nemělo mít vliv"). Napětí řídí jen skutečné ohrožení: energie, blízkost
 * monstra, blackout.
 */
export function computeTensionLevel(input: TensionInput): number {
  if (input.gameStatus === "blackout") return 1;

  const powerRatio = 1 - clamp01(input.power / input.startPower);

  const enemyProximity = {
    outside: 0,
    outer_yard: 0.2,
    right_hallway: 0.4,
    left_hallway: 0.4,
    door_hallway: 0.65,
    at_door: 0.85,
    breach: 0.92,
    attack: 1,
    // Definitivně vyřazené monstrum (viz EnemyStage#graveyard) — žádné
    // napětí z blízkosti, stejně jako "outside".
    graveyard: 0,
  }[input.enemyStage];

  const atDoor = input.enemyStage === "at_door" || input.enemyStage === "breach";
  const doorDanger = atDoor && !input.doorClosed ? 0.3 : 0;

  const tension = powerRatio * 0.35 + enemyProximity * 0.5 + doorDanger;

  return clamp01(tension);
}
