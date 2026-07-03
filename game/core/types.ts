// Sdílené typy pro herní stav, nezávislé na UI.

export type EnemyStage =
  | "outside"
  | "camera_01_far"
  | "camera_02_hall"
  | "camera_03_door"
  | "attack";

export type ScreenId = "menu" | "playing" | "death" | "win";

export type CameraId = "camera_01_far" | "camera_02_hall" | "camera_03_door";

export interface CameraDefinition {
  id: CameraId;
  label: string;
  /** Stage nepřítele, ve kterém je na této kameře vidět. */
  enemyVisibleAtStage: EnemyStage;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  route: EnemyStage[];
  /** Šance na postup na další stage při každém enemy tick (0–1). */
  advanceChance: number;
  /** Násobitel šance na postup, když ho hráč sleduje na kameře. */
  watchedAdvanceMultiplier: number;
  /** Jak dlouho (ms) může stát u dveří, než se resetuje, pokud jsou zavřené. */
  doorHoldBeforeResetMs: number;
}

export interface NightDefinition {
  id: string;
  title: string;
  durationMs: number;
  startPower: number;
  /** Kolik energie za sekundu spotřebují jednotlivé systémy. */
  powerDrainPerSecond: {
    doorClosed: number;
    lightOn: number;
    cameraOpen: number;
    idle: number;
  };
  enemy: EnemyDefinition;
  cameras: CameraDefinition[];
  /** Interval (ms), jak často se vyhodnocuje postup nepřítele. */
  enemyTickMs: number;
}

export type DeathReason = "door_open_at_attack" | "power_depleted";

export interface GameState {
  screen: ScreenId;
  nightId: string;

  elapsedMs: number;
  remainingMs: number;

  power: number;

  doorClosed: boolean;
  lightOn: boolean;

  cameraOpen: boolean;
  activeCameraId: CameraId | null;

  enemyStage: EnemyStage;
  enemyAtDoorSinceMs: number | null;

  deathReason: DeathReason | null;

  isRunning: boolean;
  audioMuted: boolean;
}

export interface TensionInput {
  power: number;
  startPower: number;
  remainingMs: number;
  durationMs: number;
  enemyStage: EnemyStage;
  doorClosed: boolean;
}
