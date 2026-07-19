import { EnemyStage } from "./types";

/**
 * Jeden krok zpátky na trase z `currentStage` (viz zadání "ať hráč vidí
 * bestii utíkat, ne teleport") — sdílené mezi hlavním monster resolverem
 * (viz game/enemies/resolveImpAdvance.ts, normální 10% ústup i "vzdání se"
 * u dveří) a TICKovými repely (světlo, UV — viz gameReducer.ts
 * updateDoorLightRepel/updateDoorHallwayUvRepel). Žije mimo oba, ať
 * gameReducer.ts nemusí importovat z game/enemies/ a resolver nemusí
 * importovat z gameReducer.ts (cyklický import). Na začátku trasy
 * (`outside`, index 0) není kam couvat dál — vrátí stejnou stage.
 */
export function stepBackOneStage(route: EnemyStage[], currentStage: EnemyStage): EnemyStage {
  const currentIndex = route.indexOf(currentStage);
  const previousIndex = Math.max(currentIndex - 1, 0);
  return route[previousIndex] ?? currentStage;
}
