// Čistá rozhodovací funkce pro "kterým obrázkem nahradit generickou dveřní
// scénu, pokud vůbec" (viz zadání "3. Priorita zobrazení" — vyňato z
// DoorView.tsx, ať jde nezávisle otestovat bez React Testing Library, stejný
// vzor jako game/visuals/doorMonsterOverlay.ts). Volající (DoorView.tsx)
// tenhle výsledek už jen aplikuje jako jediný snímek scény.

import { DoorMonsterOverlay } from "./doorMonsterOverlay";
import { TITAN_AT_DOOR_SRC, TITAN_ATTACK_SRC, TITAN_BREACH_SRC, TITAN_OVERLOAD_DEATH_SRC } from "./titanDoorAssets";

export interface ResolveTitanDoorOverrideSrcInput {
  /** viz GameState.doorDeathRevealUntilMs !== null — monstrum ve dveřích, smrt už rozhodnuta (Impova mechanika, ale sdílené pole). */
  isDoorDeathReveal: boolean;
  /** Titanova stage je `"attack"` — jen relevantní uvnitř `isDoorDeathReveal`. */
  isTitanAttack: boolean;
  /**
   * TRVALÝ stav "Titan byl tuto noc zabit" (`enemyStage === "graveyard"`) —
   * na rozdíl od dřívějšího `isTitanOverloadDeathReveal` (dočasné 3s okno)
   * NIKDY sám nevyprší, takže obrázek zůstane vidět až do konce noci (viz
   * zadání "2. Poslední obrázek mrtvého Titana").
   */
  isTitanGraveyard: boolean;
  /** viz GameState.doorGeneratorOverloadUntilMs !== null — probíhající desetisekundový countdown. */
  doorGeneratorOverloadActive: boolean;
  /** Snímek countdownu specifický pro Titana (viz resolveTitanOverloadFrameSrc) — `null`, pokud Titan není u dveří. */
  titanOverloadFrameSrc: string | null;
  /** viz GameState.doorDestroyed — trvale zničené dveře. */
  doorDestroyed: boolean;
  /** viz game/visuals/doorMonsterOverlay.ts#resolveDoorMonsterOverlay. */
  doorMonsterOverlay: DoorMonsterOverlay;
}

/**
 * Priorita (viz zadání "3. Priorita zobrazení"): `isDoorDeathReveal` >
 * `isTitanGraveyard` (trvalé, do konce noci) > probíhající přetížení >
 * at_door/breach overlay > `null` (generická dveřní scéna beze změny).
 * `isTitanGraveyard` má vyšší prioritu než probíhající přetížení i
 * at_door/breach overlay ČISTĚ pro čitelnost/budoucí jistotu — tyhle větve
 * se s ní ve skutečnosti nikdy nesejdou (Titan v graveyardu se už nikdy
 * nevrátí na at_door/breach ani nespustí další přetížení, viz
 * gameReducer.ts#updateDoorGeneratorOverload/ENEMY_ADVANCE guard).
 */
export function resolveTitanDoorOverrideSrc(input: ResolveTitanDoorOverrideSrcInput): string | null {
  if (input.isDoorDeathReveal) {
    return input.isTitanAttack ? TITAN_ATTACK_SRC : null;
  }
  if (input.isTitanGraveyard) {
    return TITAN_OVERLOAD_DEATH_SRC;
  }
  if (input.doorGeneratorOverloadActive) {
    return input.titanOverloadFrameSrc;
  }
  if (!input.doorDestroyed && input.doorMonsterOverlay === "titan_breach") {
    return TITAN_BREACH_SRC;
  }
  if (!input.doorDestroyed && input.doorMonsterOverlay === "titan_at_door") {
    return TITAN_AT_DOOR_SRC;
  }
  return null;
}
