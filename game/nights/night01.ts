import { NightDefinition } from "../core/types";
import { OBJECT13_CAMERAS } from "../cameras/cameras.object13";
import { IMP_ENEMY } from "../enemies/imp";

// Definice první směny. Každá další směna bude vlastní soubor v této složce.
export const NIGHT_01: NightDefinition = {
  id: "night01",
  title: "Objekt 13: První směna",
  durationMs: 150_000, // 2:30
  startPower: 100,
  powerDrainPerSecond: {
    // Sazby přeladěné na žádost: doorClosed 1.4 -> 1, lightOn 1.0 -> 1.4,
    // cameraOpen 0.2 -> 0.1 (kamery citelně levnější na sledování).
    doorClosed: 1,
    lightOn: 1.4,
    cameraOpen: 0.1,
    idle: 0.15,
  },
  // 1 % za 12 s = 1/12 % za sekundu (čtvrtina původní rychlosti 1/3) —
  // viz GAME_DESIGN.md "Energie".
  rechargePerSecondWhenIdle: 1 / 12,
  enemy: IMP_ENEMY,
  cameras: OBJECT13_CAMERAS,
  defaultCameraId: "outer_yard",
  enemyTickMs: 2000,
  cameraFocusMs: 700,
  generator: {
    beepIntervalMs: 5000,
    // Dvakrát za sekundu — stejné pípnutí jako normální provoz (viz
    // app/play/page.tsx), jen rychlejší tempo. Jediná signalizace kromě
    // rychlého poklesu energie, viz game/core/generatorUrgency.ts.
    criticalBeepIntervalMs: 500,
    silentGraceMs: 10000,
    faultMaxPerShift: 1,
    faultEarliestAtMs: 45000,
    faultLatestAtMs: 110000,
    restartPenaltyMs: 5000,
  },
  blackout: {
    durationMs: 12000,
    phaseThresholdsMs: [2000, 5000, 8000],
    canBeSurvivedIfShiftEnds: true,
    // Roar zahraje 1 s před koncem blackoutu (11000 ms) — dost dlouho po
    // začátku poslední fáze (8000 ms), aby zbylo ticho/heartbeat "před"
    // roarem, a dost před durationMs, aby roar stihl doznít před smrtí.
    roarLeadMs: 1000,
  },
};
