// Sdílené typy pro herní stav, nezávislé na UI.

export type EnemyStage =
  | "outside"
  | "camera_01_far"
  | "camera_02_hall"
  | "camera_03_door"
  | "attack";

export type ScreenId = "menu" | "playing" | "death" | "win";

/** Kam se hráč v místnosti právě dívá — ovládá to, co je aktuálně klikatelné. */
export type PlayerView = "desk" | "door" | "generator";

/**
 * normal — pravidelně pípá, vše v pořádku
 * silentFault — porucha, generátor mlčí; hráč má férový reakční čas na restart
 * criticalBeeping — reakční čas vypršel, rychlé pípání + extra spotřeba energie
 */
export type GeneratorState = "normal" | "silentFault" | "criticalBeeping";

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
  /** Kolik energie za sekundu se vrátí, když hráč aktivně nesleduje kamery (viz gameReducer TICK). */
  rechargePerSecondWhenIdle: number;
  enemy: EnemyDefinition;
  cameras: CameraDefinition[];
  /** Interval (ms), jak často se vyhodnocuje postup nepřítele. */
  enemyTickMs: number;
  generator: GeneratorDefinition;
}

export interface GeneratorDefinition {
  /** Interval (ms) normálního pípání. */
  beepIntervalMs: number;
  /** Interval (ms) rychlého varovného pípání v kritickém stavu. */
  criticalBeepIntervalMs: number;
  /** Kolik ms ticha (bez trestu) má hráč na to, aby si všiml poruchy a restartoval generátor. */
  silentGraceMs: number;
  /** Kolikrát nejvýš se generátor za směnu může porouchat. */
  faultMaxPerShift: number;
  /** Časové okno (elapsedMs), ve kterém se náhodně vylosuje okamžik poruchy — nikdy hned na začátku směny. */
  faultEarliestAtMs: number;
  faultLatestAtMs: number;
}

export type DeathReason = "door_open_at_attack" | "power_depleted";

export interface GameState {
  screen: ScreenId;
  nightId: string;

  elapsedMs: number;
  remainingMs: number;

  power: number;

  playerView: PlayerView;

  doorClosed: boolean;
  lightOn: boolean;

  cameraOpen: boolean;
  activeCameraId: CameraId | null;

  generatorState: GeneratorState;
  /** elapsedMs, kdy má zaznít další pípnutí (normální i kritické tempo). */
  generatorNextBeepAtMs: number;
  /** Zvyšuje se při každém pípnutí — UI podle změny spouští zvuk (viz app/play/page.tsx). */
  generatorBeepSeq: number;
  /** elapsedMs, kdy začalo ticho po poruše — null mimo silentFault. */
  generatorSilentSinceMs: number | null;
  /** elapsedMs, kdy se má (jednou) vylosovaná porucha spustit. */
  generatorFaultAtMs: number;
  /** Kolikrát už se porucha za tuto směnu spustila (viz generator.faultMaxPerShift). */
  generatorFaultCount: number;

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
