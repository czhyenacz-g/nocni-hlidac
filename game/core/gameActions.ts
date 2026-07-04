import { CameraId } from "./types";

export type GameAction =
  | { type: "START_LOADING" }
  | { type: "START_SHIFT" }
  | { type: "RESTART_SHIFT" }
  | { type: "TOGGLE_DOOR" }
  | { type: "TOGGLE_LIGHT" }
  | { type: "LOOK_AT_DOOR" }
  | { type: "LOOK_AT_DESK" }
  | { type: "LOOK_AT_GENERATOR" }
  | { type: "RESTART_GENERATOR" }
  | { type: "OPEN_CAMERA"; cameraId: CameraId }
  | { type: "CLOSE_CAMERAS" }
  | { type: "TOGGLE_AUDIO_MUTED" }
  // stressLevel (0..1, viz game/audio/useHeartbeatStress.ts) je volitelný —
  // řídí jen game/core/stressTimeScale.ts, chybí-li, čas běží normální
  // rychlostí (stejné jako stressLevel 0). currentNight (survivedNights + 1,
  // viz game/core/survivedNights.ts) řídí jen game/difficulty/nightScaling.ts,
  // chybí-li, bere se jako noc 1 (žádné ztěžování). Ani jedno pole nezajímá
  // zbytek herní logiky/audia.
  | { type: "TICK"; deltaMs: number; stressLevel?: number; currentNight?: number }
  | { type: "ENEMY_ADVANCE" }
  | { type: "GO_TO_MENU" };
