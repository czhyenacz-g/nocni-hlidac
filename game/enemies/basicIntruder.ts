import { EnemyDefinition } from "../core/types";

// První a zatím jediný typ nepřítele. Dvě stejně pravděpodobné varianty trasy —
// pravou nebo levou chodbou — se losují jednou při startu směny
// (gameState.ts#pickRouteVariant), po zbytek směny platí vylosovaná.
export const BASIC_INTRUDER: EnemyDefinition = {
  id: "basic_intruder",
  name: "Neznámá postava",
  routeVariants: [
    ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"],
    ["outside", "outer_yard", "left_hallway", "door_hallway", "at_door", "attack"],
  ],
  advanceChance: 0.16,
  watchedAdvanceMultiplier: 0.5,
  // Zbytek pravděpodobnosti (1 - 0.16 - 0.10 = 0.74) znamená, že zůstává na místě.
  retreatChance: 0.1,
  // U dveří se vzdá po náhodných 6–8 s — nezávisle na světle (viz doorLightRepelRequiredMs
  // pro kombinovaný efekt zavřených dveří + světla, který je mnohem rychlejší a jasnější).
  doorHoldRangeMs: { min: 6000, max: 8000 },
  // Zavřené dveře + zapnuté světlo + u dveří po sobě 1.5 s -> okamžitý repel s řevem.
  doorLightRepelRequiredMs: 1500,
  monsterRetreatStage: "outside",
};
