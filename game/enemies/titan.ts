import { EnemyDefinition } from "../core/types";
import { TITAN } from "./monsterDefinitions";

// Stejný přechodný tvar jako IMP_ENEMY (imp.ts) — hodnoty odvozené výhradně
// z `TITAN.gameplay` (monsterDefinitions.ts), ne druhá kopie čísel.
export const TITAN_ENEMY: EnemyDefinition = {
  id: TITAN.id,
  ...TITAN.gameplay,
};
