import { EnemyDefinition } from "../core/types";

// První a zatím jediný typ nepřítele. Trasa: venku -> chodba daleko -> chodba blízko -> u dveří -> útok.
export const BASIC_INTRUDER: EnemyDefinition = {
  id: "basic_intruder",
  name: "Neznámá postava",
  route: ["outside", "camera_01_far", "camera_02_hall", "camera_03_door", "attack"],
  advanceChance: 0.16,
  watchedAdvanceMultiplier: 0.5,
  doorHoldBeforeResetMs: 6000,
};
