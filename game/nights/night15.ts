import { NightDefinition } from "../core/types";
import { OBJECT13_CAMERAS } from "../cameras/cameras.object13";
import { TITAN_ENEMY } from "../enemies/titan";
import { NIGHT_01 } from "./night01";

// Titanova noc (viz zadání "2. TITAN PRO 15. NOC", "7. 15. NOC") — stejná
// budova/kamery/generátor/energie jako NIGHT_01 (žádné nové balancování
// zatím požadované), jediný skutečný rozdíl je `enemy: TITAN_ENEMY`. Zbytek
// polí je explicitně vypsaný (ne `{...NIGHT_01, enemy: TITAN_ENEMY}`) — ať
// je NightDefinition čitelná bez nutnosti skákat mezi dvěma soubory, stejná
// konvence jako night01.ts samo.
export const NIGHT_15: NightDefinition = {
  id: "night15",
  title: "Objekt 13: Titan",
  durationMs: NIGHT_01.durationMs,
  startPower: NIGHT_01.startPower,
  powerDrainPerSecond: NIGHT_01.powerDrainPerSecond,
  rechargePerSecondWhenIdle: NIGHT_01.rechargePerSecondWhenIdle,
  enemy: TITAN_ENEMY,
  cameras: OBJECT13_CAMERAS,
  defaultCameraId: NIGHT_01.defaultCameraId,
  enemyTickMs: NIGHT_01.enemyTickMs,
  cameraFocusMs: NIGHT_01.cameraFocusMs,
  generator: NIGHT_01.generator,
  blackout: NIGHT_01.blackout,
};
