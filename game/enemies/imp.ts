import { EnemyDefinition } from "../core/types";
import { IMP } from "./monsterDefinitions";

// Přechodný tvar pro `NightDefinition.enemy: EnemyDefinition` (viz
// game/nights/night01.ts) — hodnoty už NEJSOU definované tady, jen odvozené
// z `IMP.gameplay` (jediný zdroj pravdy, viz monsterDefinitions.ts#IMP), ať
// nevznikne druhá kopie stejných čísel. `id: "imp"` je jediný zdroj pravdy
// pro "který monster právě běží" (viz NightDefinition.enemy.id,
// monsterDefinitions.ts#getMonsterDefinition) — žádné druhé paralelní pole.
export const IMP_ENEMY: EnemyDefinition = {
  id: IMP.id,
  ...IMP.gameplay,
};
