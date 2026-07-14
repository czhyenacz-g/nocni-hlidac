import { GameState } from "./types";
import { MONSTER_MIN_LOCATION_STAY_MS } from "../balancing/constants";

/**
 * Jestli běžný pravděpodobnostní ENEMY_ADVANCE hod (advance/retreat/stay)
 * SMÍ proběhnout — `false`, dokud monstrum nesetrvalo ve svém aktuálním
 * `enemyStage` aspoň `MONSTER_MIN_LOCATION_STAY_MS[enemyStage]` (viz zadání
 * "minimální pobyt monstra v lokaci"). Stage bez záznamu v configu (`outer_yard`,
 * `at_door`, `breach`, `attack`) nikdy neblokuje — vrací `false` rovnou.
 *
 * Volající (gameReducer.ts ENEMY_ADVANCE) tenhle helper POUŽÍVÁ JEN pro
 * běžnou pravděpodobnostní větev — explicitní scriptované přesuny (repely,
 * gave_up, brokovnice, office threat, forced-retreat okna) ho vůbec nevolají,
 * takže nikdy nemůžou být blokované.
 */
export function isMonsterMinStayBlocking(state: GameState): boolean {
  const minStayMs = MONSTER_MIN_LOCATION_STAY_MS[state.enemyStage];
  if (minStayMs === undefined) return false;
  return state.elapsedMs - state.enemyLocationEnteredAtMs < minStayMs;
}
