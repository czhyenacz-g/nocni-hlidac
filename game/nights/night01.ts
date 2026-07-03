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
  enemy: BASIC_INTRUDER,
  cameras: OBJECT13_CAMERAS,
  enemyTickMs: 1500,
};
