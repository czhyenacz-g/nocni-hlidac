// Sdílené typy pro herní stav, nezávislé na UI.

// Fyzické pozice nepřítele na trase. "outside" (mimo dohled žádné kamery) a
// "at_door" (u dveří — stav pro DoorView, ne kamera) nejsou nutně kamerou
// vidět; ostatní stage odpovídají konkrétním kamerám přes
// CameraDefinition.enemyVisibleAtStage. Který podmnožinu stage nepřítel na
// své trase skutečně navštíví, určuje EnemyDefinition.route.
export type EnemyStage =
  | "outside"
  | "outer_yard"
  | "right_hallway"
  | "left_hallway"
  | "door_hallway"
  | "at_door"
  | "attack";

/** Poslední rozhodnutí nepřítele při vyhodnocení ENEMY_ADVANCE — pro DebugPanel. */
export type EnemyMoveDecision = "advance" | "stay" | "retreat" | "waiting_at_door" | "gave_up" | "attack";

export type ScreenId = "menu" | "playing" | "death" | "win";

/** Kam se hráč v místnosti právě dívá — ovládá to, co je aktuálně klikatelné. */
export type PlayerView = "desk" | "door" | "generator";

/**
 * normal — pravidelně pípá, vše v pořádku
 * silentFault — porucha, generátor mlčí; hráč má férový reakční čas na restart
 * criticalBeeping — reakční čas vypršel, rychlé pípání + extra spotřeba energie
 */
export type GeneratorState = "normal" | "silentFault" | "criticalBeeping";

export type CameraId = "outer_yard" | "right_hallway" | "left_hallway" | "door_hallway";

export type CameraType = "outside" | "hallway" | "door" | "utility";

export interface CameraDefinition {
  id: CameraId;
  label: string;
  /** Krátký popis pro UI (např. tooltip/podnadpis) — volitelný. */
  description?: string;
  /** Pořadí v panelu; nižší = blíž venku. Kamery bez order se řadí za ty s order, v pořadí v poli. */
  order?: number;
  type?: CameraType;
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
  /**
   * Šance vrátit se při každém enemy ticku o jeden krok zpět na trase (0–1).
   * Nezávislá na advanceChance/watchedAdvanceMultiplier — zbytek pravděpodobnosti
   * (1 - advanceChance - retreatChance) znamená, že zůstává na místě.
   */
  retreatChance: number;
  /**
   * Rozsah (ms), ze kterého se při každém příchodu ke dveřím vylosuje cíl
   * čekání u zavřených dveří, než se nepřítel vzdá a vrátí na start trasy —
   * beze světla v chodbě (viz gameReducer ENEMY_ADVANCE).
   */
  doorHoldRangeMs: { min: number; max: number };
  /**
   * Násobitel rychlosti, kterým se čekání blíží k vylosovanému cíli, když
   * svítí světlo do chodby. Efekt je okamžitý — zapnutí/vypnutí světla
   * uprostřed čekání zrychlí/zpomalí zbytek od té chvíle.
   */
  doorHoldLightAccelMultiplier: number;
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
  /**
   * Kamery dostupné v této směně. Žádný kód mimo tento konfigurační objekt (a
   * data v game/cameras/) nesmí seznam kamer předpokládat — UI ho vždy
   * vykresluje odsud, počet a kombinace se může mezi směnami lišit.
   */
  cameras: CameraDefinition[];
  /** Kamera, na kterou se přednastaví activeCameraId při startu směny (musí být v cameras). */
  defaultCameraId: CameraId;
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
  /** Poslední rozhodnutí při vyhodnocení ENEMY_ADVANCE — jen pro DebugPanel, žádná logika na něm nestaví. */
  lastEnemyDecision: EnemyMoveDecision;
  enemyAtDoorSinceMs: number | null;
  /** Vylosovaný cíl (ms) aktuálního čekání u dveří — null mimo standoff u zavřených dveří. */
  enemyDoorHoldTargetMs: number | null;
  /** Efektivní nastřádaný čas (ms) čekání — zrychluje se, když svítí světlo (viz gameReducer). */
  enemyDoorHoldProgressMs: number;

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
