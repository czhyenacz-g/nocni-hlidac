// Sdílené typy pro herní stav, nezávislé na UI.

// Fyzické pozice nepřítele na trase. "outside" (mimo dohled žádné kamery) a
// "at_door" (u dveří — stav pro DoorView, ne kamera) nejsou nutně kamerou
// vidět; ostatní stage odpovídají konkrétním kamerám přes
// CameraDefinition.enemyVisibleAtStage. Který podmnožinu stage nepřítel na
// své trase skutečně navštíví, určuje EnemyDefinition.routeVariants
// (jedna se vylosuje při startu směny — viz GameState.enemyRoute).
// "breach" je připravená pro budoucí trasy (žádná současná ji nepoužívá) — je
// to jen druhá stage, na kterou reaguje repel dveře+světlo stejně jako na
// "at_door" (viz gameReducer isAtDoorStage), ne rozpad "at_door" na jemnější kroky.
export type EnemyStage =
  | "outside"
  | "outer_yard"
  | "right_hallway"
  | "left_hallway"
  | "door_hallway"
  | "at_door"
  | "breach"
  | "attack";

/** Poslední rozhodnutí nepřítele při vyhodnocení ENEMY_ADVANCE/TICK — pro DebugPanel. */
export type EnemyMoveDecision =
  | "advance"
  | "stay"
  | "retreat"
  | "waiting_at_door"
  | "gave_up"
  | "light_repelled"
  | "attack"
  | "returned_unverified";

export type ScreenId = "menu" | "loading" | "playing" | "death" | "win";

/** Kam se hráč v místnosti právě dívá — ovládá to, co je aktuálně klikatelné. */
export type PlayerView = "desk" | "door" | "generator";

/**
 * normal — pravidelně pípá, vše v pořádku
 * silentFault — porucha, generátor mlčí; hráč má férový reakční čas na restart
 * criticalBeeping — reakční čas vypršel, rychlé pípání + extra spotřeba energie
 * restarting — hráč omylem restartoval funkční generátor; krátký výpadek se
 *   stejnou extra spotřebou jako criticalBeeping, ale tichý — trest za zbytečný klik
 */
export type GeneratorState = "normal" | "silentFault" | "criticalBeeping" | "restarting";

export type CameraId = "outer_yard" | "right_hallway" | "left_hallway" | "door_hallway";

/**
 * overview — hráč vidí všechny kamery jako malé monitory v mřížce
 * (CameraMonitorGrid), jen štítek + statický šum, žádný živý obraz. Nepočítá
 * se jako aktivní sledování konkrétní kamery (viz isEnemyBeingWatched v
 * gameReducer.ts) — jinak by šlo sledovat všechny kamery najednou zdarma.
 * detail — hráč zvětšil jednu konkrétní kameru (CameraDetailView); teprve
 * tady platí `cameraOpen`, camera focus/šum a zpomalení nepřítele.
 */
export type CameraViewMode = "overview" | "detail";

export type CameraType = "outside" | "hallway" | "door" | "utility";

export interface CameraDefinition {
  id: CameraId;
  label: string;
  /** Krátký popis pro UI (např. tooltip/podnadpis) — volitelný. */
  description?: string;
  /** Pořadí v panelu; nižší = blíž venku. Kamery bez order se řadí za ty s order, v pořadí v poli. */
  order?: number;
  /**
   * Fyzická pozice odpovídající rozložení chodeb — zatím jen dokumentační
   * metadata (žádná herní logika na tom nestaví). CameraMonitorGrid.tsx
   * ji nekonzumuje, overview je jednotná 2×N mřížka podle `order`; připravené
   * pro případný budoucí spatial layout.
   */
  position?: "left" | "right" | "center";
  type?: CameraType;
  /** Stage nepřítele, ve kterém je na této kameře vidět. */
  enemyVisibleAtStage: EnemyStage;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  /**
   * Možné celé trasy — při startu směny se jedna náhodně vylosuje (viz
   * gameState.ts#pickRouteVariant) a po zbytek směny se používá jen ona
   * (state.enemyRoute). Pro nepřítele s jedinou trasou stačí pole s jedním prvkem.
   */
  routeVariants: EnemyStage[][];
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
   * čekání u zavřených dveří, než se nepřítel vzdá a vrátí na start trasy.
   * Nezávislé na světle — viz doorLightRepelRequiredMs pro kombinovaný efekt
   * zavřených dveří a světla (gameReducer ENEMY_ADVANCE).
   */
  doorHoldRangeMs: { min: number; max: number };
  /**
   * Kolik ms musí NEPŘETRŽITĚ platit všechny tři podmínky současně — dveře
   * zavřené, světlo zapnuté, nepřítel u dveří ("at_door"/"breach") — než ho to
   * odežene (repel). Sleduje se v TICKu (jemněji než enemyTickMs), ne v
   * ENEMY_ADVANCE — viz gameReducer.ts#updateDoorLightRepel. Světlo samo o
   * sobě (otevřené dveře) ani zavřené dveře bez světla repel nikdy nespustí.
   */
  doorLightRepelRequiredMs: number;
  /** Kam se nepřítel vrátí po repelu — stejný typ resetu jako vzdání se standoffu u dveří. */
  monsterRetreatStage: EnemyStage;
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
  /**
   * Jak dlouho (ms) po výběru kamery trvá "ladění signálu" (šum), než se
   * zobrazí ostrý obraz — viz game/core/cameraFocus.ts. Zatím pevná hodnota,
   * ale připravená na to, aby se později počítala podle napětí/energie/generátoru.
   */
  cameraFocusMs: number;
  blackout: BlackoutDefinition;
}

export interface BlackoutDefinition {
  /** Jak dlouho (ms) blackout trvá, než přijde smrt, pokud mezitím neskončí směna. */
  durationMs: number;
  /** Tři hranice (ms od začátku blackoutu) mezi čtyřmi atmosférickými fázemi — viz GAME_DESIGN.md. */
  phaseThresholdsMs: [number, number, number];
  /** Pokud směna doběhne do konce dřív, než blackout skončí, hráč přežije. */
  canBeSurvivedIfShiftEnds: boolean;
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
  /**
   * Kolik ms trvá "restarting" penalizace, když hráč restartuje generátor,
   * co byl v pořádku (`generatorState === "normal"`) — zbytečný klik ho na
   * chvíli vyřadí, se stejnou extra spotřebou energie jako criticalBeeping.
   */
  restartPenaltyMs: number;
}

export type DeathReason = "door_open_at_attack" | "blackout_timeout" | "bulb_replacement_attack";

/**
 * Stav jedné žárovky v místnosti — omezená životnost reálného svícení (viz
 * game/core/roomBulbs.ts). `remainingMs`/`broken` se přenášejí mezi
 * dny/nocemi (campaign hodnota, ne per-směna reset), jen se sníženou
 * hodnotou se automaticky neopravuje — jen skutečně prasklá žárovka se
 * vymění v denním servisu po přežité směně.
 */
export interface RoomBulbState {
  remainingMs: number;
  maxMs: number;
  broken: boolean;
}

/**
 * Zatím jen `nearRoom` (chodba/kamera nejblíž hráči u dveří, door_hallway) —
 * struktura je `Record`-like záměrně, ať jde později přidat další místnosti
 * beze změny tvaru.
 */
export interface RoomBulbsState {
  nearRoom: RoomBulbState;
}

/**
 * Ruční výměna prasklé žárovky hráčem (viz gameReducer.ts
 * START_BULB_REPLACEMENT/TICK, DoorView.tsx) — riskantní akce, dveře musí
 * zůstat otevřené celou dobu. `progressMs` roste v TICKu, dokud `active`;
 * po dosažení `BULB_REPLACE_DURATION_MS` se žárovka opraví a `active` spadne
 * zpět na `false`. Zrušeno (bez opravy) při odchodu z DoorView nebo zavření
 * dveří uprostřed výměny — riziko musí trvat po celou dobu, ne jen na startu.
 */
export interface BulbReplacementState {
  active: boolean;
  startedAtMs: number | null;
  progressMs: number;
}

export type GameStatus = "normal" | "blackout";

export interface GameState {
  screen: ScreenId;
  nightId: string;

  elapsedMs: number;
  remainingMs: number;

  power: number;
  /**
   * "blackout" = baterie na nule, všechny systémy vypnuté, zámek povolil.
   * Hráč přežije, pokud směna doběhne do konce dřív než blackoutElapsedMs
   * dosáhne night.blackout.durationMs — jinak smrt. Viz GAME_DESIGN.md "Blackout".
   */
  gameStatus: GameStatus;
  /** Nastřádaný čas (ms) od začátku blackoutu — 0 mimo blackout. */
  blackoutElapsedMs: number;
  /**
   * Zvyšuje se při každém přechodu na další atmosférickou fázi blackoutu (viz
   * game/visuals/blackoutPhase.ts#getBlackoutPhaseIndex) — UI podle změny
   * spouští odpovídající zvuk (kroky/dech), stejný vzor jako generatorBeepSeq.
   * Samotnou fázi (0–3) si nikdo neukládá duplicitně, počítá se čistou funkcí
   * z blackoutElapsedMs, kdykoliv je potřeba (BlackoutView, DebugPanel).
   */
  blackoutPhaseSeq: number;

  playerView: PlayerView;

  doorClosed: boolean;
  lightOn: boolean;

  /**
   * true jen v `cameraViewMode === "detail"` — overview (mřížka náhledů) se
   * nikdy nepočítá jako otevřená/aktivně sledovaná kamera, viz CameraViewMode.
   */
  cameraOpen: boolean;
  activeCameraId: CameraId | null;
  /** overview (mřížka monitorů) vs. detail (zvětšená jedna kamera) — viz CameraViewMode. */
  cameraViewMode: CameraViewMode;
  /** elapsedMs, kdy skončí "ladění signálu" po výběru kamery — viz game/core/cameraFocus.ts. */
  cameraFocusUntilMs: number | null;

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
  /** elapsedMs, kdy skončí "restarting" penalizace — null mimo tento stav. */
  generatorRestartUntilMs: number | null;

  /** Trasa vylosovaná při startu směny z enemy.routeVariants — platí po celou směnu. */
  enemyRoute: EnemyStage[];
  enemyStage: EnemyStage;
  /** Poslední rozhodnutí při vyhodnocení ENEMY_ADVANCE — jen pro DebugPanel, žádná logika na něm nestaví. */
  lastEnemyDecision: EnemyMoveDecision;
  enemyAtDoorSinceMs: number | null;
  /** Vylosovaný cíl (ms) aktuálního čekání u dveří — null mimo standoff u zavřených dveří. */
  enemyDoorHoldTargetMs: number | null;
  enemyDoorHoldProgressMs: number;
  /**
   * Nastřádaný čas (ms), po který nepřetržitě platí dveře zavřené + světlo
   * zapnuté + nepřítel u dveří — viz EnemyDefinition.doorLightRepelRequiredMs.
   * Kdykoliv některá podmínka přestane platit, resetuje se na 0.
   */
  doorLightRepelMs: number;
  /** Zvyšuje se při každém repelu — UI podle změny spouští monsterRetreatRoar (viz app/play/page.tsx). */
  monsterRetreatRoarSeq: number;

  /**
   * Kam monstrum odešlo poté, co se u zavřených dveří "vzdalo" čekání
   * (ENEMY_ADVANCE "gave_up") — `null` mimo tenhle stav. Na `medium`/`hard`
   * (`DIFFICULTY_RULES.monster_check_or_return`) musí hráč tohle místo najít
   * na kameře (`monsterRetreatVerified`), než je bezpečné dveře otevřít —
   * viz GAME_DESIGN.md "Odchod monstra od dveří".
   */
  monsterRetreatedTo: EnemyStage | null;
  /**
   * Jestli hráč už na kameře viděl, kam monstrum odešlo. `true` rovnou na
   * `easy` (pravidlo vypnuté, žádné ověřování není potřeba). Dokud je
   * `monsterRetreatedTo` nastavené a tohle `false`, otevření dveří pošle
   * monstrum okamžitě zpátky ke dveřím (TOGGLE_DOOR).
   */
  monsterRetreatVerified: boolean;

  deathReason: DeathReason | null;
  /**
   * elapsedMs, kdy se má finalizovat smrt "door_open_at_attack" — null mimo
   * tenhle konkrétní krátký "reveal" moment. Nastaví ho ENEMY_ADVANCE místo
   * okamžitého přechodu na `screen: "death"` (hráč se navíc automaticky
   * "otočí" ke dveřím, `playerView: "door"`), TICK ho pak po
   * DOOR_DEATH_REVEAL_DURATION_MS finalizuje. Lokální mezistav jen pro tenhle
   * jeden případ (viz GAME_DESIGN.md "Smrt u dveří") — blackout i ostatní
   * smrti (žádná jiná dnes neexistuje) zůstávají beze změny, screen přejde na
   * "death" rovnou jako dřív.
   */
  doorDeathRevealUntilMs: number | null;

  /**
   * Campaign stav žárovek per místnost (viz game/core/roomBulbs.ts) — na
   * rozdíl od většiny `GameState` polí se NEresetuje na fixní výchozí hodnotu
   * při každé směně; `createInitialGameState` ho přebírá jako volitelný
   * override (`app/play/page.tsx` ho načte z localStorage přes
   * `getRoomBulbs()`), ať poškození žárovky přežije restart/další noc.
   */
  roomBulbs: RoomBulbsState;
  /** Zvyšuje se přesně jednou při prasknutí žárovky — UI podle změny spouští audio (viz app/play/page.tsx). */
  bulbBreakSeq: number;
  /** Ruční výměna prasklé žárovky (viz BulbReplacementState) — vždy resetováno na novou směnu, nikdy se nepřenáší mezi nocemi. */
  bulbReplacement: BulbReplacementState;
  /**
   * Campaign počet náhradních žárovek (viz game/core/bulbInventory.ts) — na
   * rozdíl od `bulbBreakSeq`/`bulbReplacement` se přenáší mezi nocemi/smrtí
   * stejně jako `roomBulbs`: `createInitialGameState` ho přebírá jako
   * volitelný override, `app/play/page.tsx` ho čte/zapisuje přes
   * `getBulbsRemaining()`/`setBulbsRemaining()`. V `GameState` musí žít, aby
   * ho ruční výměna žárovky mohla spotřebovat přímo v reduceru (TICK), ne
   * jen na hranicích směny.
   */
  bulbsRemaining: number;

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
  /** Blackout je vždy maximální napětí bez ohledu na ostatní vstupy. */
  gameStatus: GameStatus;
}
