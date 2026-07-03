import { CameraId } from "./types";

export type GameAction =
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
  | { type: "TICK"; deltaMs: number }
  | { type: "ENEMY_ADVANCE" }
  | { type: "GO_TO_MENU" };
