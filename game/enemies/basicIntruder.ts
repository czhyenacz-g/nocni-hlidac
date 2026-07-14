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
  // Zbytek pravděpodobnosti (1 - 0.16 - 0.10 = 0.74) znamená, že zůstává na místě.
  retreatChance: 0.1,
  // U dveří se vzdá po náhodných 6–8 s — nezávisle na světle (viz doorLightRepelRequiredMs
  // pro kombinovaný efekt zavřených dveří + světla, který je mnohem rychlejší a jasnější).
  doorHoldRangeMs: { min: 6000, max: 8000 },
  // Zavřené dveře + zapnuté světlo + u dveří po sobě 1.5 s -> okamžitý repel s řevem.
  doorLightRepelRequiredMs: 1500,
  // Stejná kombinace o krok dřív (door_hallway, ne až u dveří) je záměrně
  // pomalejší (~7 s) — slabší/pomalejší varovný nástroj, ne náhrada za
  // stejně rychlý at_door repel (viz doorHallwayUvRepelRequiredMs v types.ts).
  doorHallwayUvRepelRequiredMs: 7000,
  // Viditelný útěk po odražení (viz zadání "ať hráč vidí bestii utíkat, ne
  // teleport") — konkrétní čísla: světlo u dveří je nejsilnější a nejjistější
  // (100 % po ~11 s — dost na to, aby stihlo dojít celou trasou až na
  // "outside", 4 kroky po enemyTickMs 2 s, s rezervou), UV v door_hallway o
  // krok dřív je slabší (60 % po ~6.5 s), vzdání se timeoutem bez světla
  // (gave_up) nejslabší (40 % po ~10 s). Všechna okna jsou navíc dost dlouhá,
  // ať hráč stihne mezitím třeba vyměnit žárovku.
  forcedRetreatAfterLightRepel: { durationMs: 11_000, chance: 1 },
  forcedRetreatAfterUvRepel: { durationMs: 6_500, chance: 0.6 },
  forcedRetreatAfterGaveUp: { durationMs: 10_000, chance: 0.4 },
  monsterRetreatStage: "outside",
};
