import { EnemyDefinition } from "../core/types";

// První a zatím jediný typ nepřítele. Trasa vede přes pravou chodbu — levá
// chodba (left_hallway) existuje jako kamera, ale tato trasa jí neprochází;
// je připravená pro budoucího nepřítele/směnu s jinou trasou.
export const BASIC_INTRUDER: EnemyDefinition = {
  id: "basic_intruder",
  name: "Neznámá postava",
  route: ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"],
  advanceChance: 0.16,
  watchedAdvanceMultiplier: 0.5,
  // Zbytek pravděpodobnosti (1 - 0.16 - 0.10 = 0.74) znamená, že zůstává na místě.
  retreatChance: 0.1,
  // Beze světla se vzdá po 6–8 s (náhodně); se světlem 2x rychleji, tedy efektivně 3–4 s.
  doorHoldRangeMs: { min: 6000, max: 8000 },
  doorHoldLightAccelMultiplier: 2,
};
