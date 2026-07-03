import { NightDefinition } from "../core/types";
import { OBJECT13_CAMERAS } from "../cameras/cameras.object13";
import { BASIC_INTRUDER } from "../enemies/basicIntruder";

// Definice první směny. Každá další směna bude vlastní soubor v této složce.
export const NIGHT_01: NightDefinition = {
  id: "night01",
  title: "Objekt 13: První směna",
  durationMs: 150_000, // 2:30
  startPower: 100,
  powerDrainPerSecond: {
    doorClosed: 1.4,
    lightOn: 1.0,
    cameraOpen: 0.2,
    idle: 0.15,
  },
  // 1 % za 3 s = 1/3 % za sekundu — viz GAME_DESIGN.md "Energie".
  rechargePerSecondWhenIdle: 1 / 3,
  enemy: BASIC_INTRUDER,
  cameras: OBJECT13_CAMERAS,
  enemyTickMs: 1500,
  generator: {
    beepIntervalMs: 5000,
    criticalBeepIntervalMs: 700,
    silentGraceMs: 10000,
    faultMaxPerShift: 1,
    faultEarliestAtMs: 45000,
    faultLatestAtMs: 110000,
  },
};
