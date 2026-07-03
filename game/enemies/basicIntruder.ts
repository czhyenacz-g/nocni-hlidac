import { EnemyDefinition } from "../core/types";

// První a zatím jediný typ nepřítele. Trasa: venku -> chodba daleko -> chodba blízko -> u dveří -> útok.
export const BASIC_INTRUDER: EnemyDefinition = {
  id: "basic_intruder",
  name: "Neznámá postava",
  route: ["outside", "camera_01_far", "camera_02_hall", "camera_03_door", "attack"],
  advanceChance: 0.16,
  watchedAdvanceMultiplier: 0.5,
  // Beze světla se vzdá po 6–8 s (náhodně); se světlem 2x rychleji, tedy efektivně 3–4 s.
  doorHoldRangeMs: { min: 6000, max: 8000 },
  doorHoldLightAccelMultiplier: 2,
};
