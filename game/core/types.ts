// Sdílené typy pro herní stav, nezávislé na UI.
import { NightFeatureFlags } from "../difficulty/nightConfig";
import { GameMode } from "./gameMode";

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
  // Zavřené dveře + UV skutečně svítí, nepřítel v "door_hallway" (ne ještě
  // u dveří) — viz doorHallwayUvRepelMs/updateDoorHallwayUvRepel. Na rozdíl
  // od "light_repelled" (okamžitý, slyšitelný, bez ověření) tenhle repel
  // prochází stejným "vzdání se" flow jako standoff u dveří
  // (monsterRetreatedTo/monsterRetreatVerified) — hráč útěk musí/může
  // potvrdit kamerou.
  | "hallway_light_repelled"
  | "attack"
  | "returned_unverified"
  // Monstrum se posunulo blíž ke kanceláři jako přenesená hrozba z
  // EmergencyMiniGame (viz gameActions.ts APPLY_OFFICE_THREAT_ON_RETURN),
  // ne z normálního postupu po trase v ENEMY_ADVANCE.
  | "office_threat_on_return"
  // Útok by NASTAL (otevřené dveře, monstrum u dveří), ale grace period po
  // návratu z minihry (enemyDoorAttackGraceUntilMs) ho zadržela — viz
  // doorEncounter.ts#isDoorAttackGraceActive. Žádná smrt, žádný door bang
  // (ten je jen pro zavřené dveře) — monstrum jen dál čeká u dveří.
  | "office_threat_grace"
  // Monstrum FYZICKY doběhlo do kanceláře v EmergencyMiniGame (viz
  // EmergencyWorldEffect "monster_reached_office", gameReducer.ts
  // APPLY_MONSTER_REACHED_OFFICE_AFTERMATH) — posune enemyStage k
  // dveřím/hale stejně jako "office_threat_on_return", ale s vlastní delší
  // grace (OFFICE_BREACH_REACTION_WINDOW_MS) a spustí i rozbitou žárovku +
  // poruchu generátoru (viz game/core/officeBreachAftermath.ts).
  | "monster_reached_office_aftermath"
  // Potvrzený zásah brokovnicí po bezpečném návratu (viz
  // gameReducer.ts#CONFIRM_MONSTER_HIT, game/core/monsterEnding.ts) —
  // monstrum se stáhne zpátky na night.enemy.monsterRetreatStage, ať hráče
  // hned po návratu nezabije stejné monstrum, které právě trefil. Nikdy na
  // 10. (posledním) zásahu — ten místo toho spustí "monsterDefeated".
  | "monster_hit_confirmed"
  // Útok Ghoula na kameru PŘEVZAL kontrolu nad výsledným pohybem tohohle
  // hodu (viz zadání "nepřidávej navíc druhý retreat ze sonického děla") —
  // Ghoul ustoupil o jeden krok směrem ven (stejný `stepBackOneStage` helper
  // jako gave_up/light_repelled), bez ohledu na to, co by jinak udělal
  // normální/sonic-modified hod. Nikdy neznamená "blíž ke kanceláři".
  | "ghoul_camera_attack";

// "briefing" = krátký panel před START_SHIFT/RESTART_SHIFT (viz
// components/screens/BriefingScreen.tsx, game/difficulty/nightConfig.ts) —
// mezikrok po "loading" (nový start) i po smrti/výhře (retry), nikdy se
// nezobrazí uprostřed běžící směny.
// "monsterDefeated" — skrytý true ending (viz zadání, game/core/monsterEnding.ts,
// components/screens/MonsterDefeatedScreen.tsx): 10 potvrzených zásahů
// monstra brokovnicí za jednu noc. Má přednost před běžným "win" flow — jen
// gameReducer.ts#CONFIRM_MONSTER_HIT do něj přechází, nikdy TICK/ENEMY_ADVANCE.
export type ScreenId = "menu" | "loading" | "briefing" | "playing" | "death" | "win" | "monsterDefeated";

/** Kam se hráč v místnosti právě dívá — ovládá to, co je aktuálně klikatelné. */
export type PlayerView = "desk" | "door" | "generator" | "left_wall" | "object_map";

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
  /**
   * Šance na postup na další stage při každém enemy tick (0–1) — BEZ ohledu
   * na to, jestli hráč zrovna sleduje kameru (na žádost "běžné sledování
   * kamer je zdarma a bez vlivu na monstrum"). Jediné, co tyhle výchozí
   * pravděpodobnosti dočasně nahradí, je aktivní sonické dělo mířící na
   * kameru s monstrem — viz `SONIC_CANNON_*_CHANCE` v balancing/constants.ts
   * a `game/core/sonicCannon.ts`.
   */
  advanceChance: number;
  /**
   * Šance vrátit se při každém enemy ticku o jeden krok zpět na trase (0–1).
   * Nezávislá na advanceChance — zbytek pravděpodobnosti
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
  /**
   * Stejný princip jako `doorLightRepelRequiredMs`, ale pro nepřítele v
   * `door_hallway` — o krok dřív, a proto výrazně pomalejší (výchozí ~7000 ms
   * vs. 1500 ms u dveří). UV má být slabší/pomalejší varovný nástroj o krok
   * dřív, ne stejně silná náhrada za at_door repel. Viz
   * `doorEncounter.ts#shouldDoorHallwayUvForceRetreat`,
   * `gameReducer.ts#updateDoorHallwayUvRepel`.
   */
  doorHallwayUvRepelRequiredMs: number;
  /**
   * "Viditelný útěk" po odražení (viz GameState.enemyForcedRetreatUntilMs,
   * gameReducer.ts) — `light_repelled`/`hallway_light_repelled`/`gave_up`
   * posunou monstrum jen o JEDEN krok zpátky na trase a pak na `durationMs`
   * dočasně zvýší jeho šanci na další ústup na `chance` (místo okamžitého
   * teleportu na `monsterRetreatStage`/náhodný bod jako dřív). Světlo u
   * zavřených dveří je nejsilnější/nejjistější odražení (100 %), UV o krok
   * dřív v `door_hallway` slabší (60 %), vzdání se timeoutem bez světla
   * (`gave_up`) nejslabší (40 %) — a všechny záměrně dost dlouhé, ať hráč
   * stihne mezitím třeba vyměnit žárovku (viz zadání).
   */
  forcedRetreatAfterLightRepel: { durationMs: number; chance: number };
  forcedRetreatAfterUvRepel: { durationMs: number; chance: number };
  forcedRetreatAfterGaveUp: { durationMs: number; chance: number };
  /** Kam se nepřítel vrátí po potvrzeném zásahu brokovnicí (viz gameReducer.ts CONFIRM_MONSTER_HIT) — jediné zbývající použití, repely u dveří/UV/gave_up už tenhle teleport nepoužívají. */
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
  /**
   * O kolik ms PŘED `durationMs` (koncem blackoutu, smrtí) zahraje
   * `blackout_monster_roar` — viz GameState.blackoutRoarSeq. Musí být menší
   * než `durationMs` a dost velké, ať roar stihne doznít před samotnou smrtí
   * (viz GAME_DESIGN.md "Blackout scare sequence").
   */
  roarLeadMs: number;
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

/**
 * "emergency_run" = hráč zemřel uvnitř nouzové minihry (viz
 * EmergencyMiniGame, app/play/page.tsx#handleEmergencyMiniGameComplete) —
 * stejný death flow jako ostatní důvody, jen jiný text na DeathScreen.
 */
export type DeathReason = "door_open_at_attack" | "blackout_timeout" | "bulb_replacement_attack" | "emergency_run";

/**
 * Výsledek jednoho ENEMY_ADVANCE hodu ovlivněného aktivním sonickým dělem
 * (viz zadání, GameState.lastSonicCannonResult, game/core/sonicCannon.ts) —
 * "success" = monstrum ustoupilo (retreat), "stay" = zůstalo, "fail" =
 * pokračovalo vpřed (advance). Jméno "fail" (ne "advance") sedí s
 * kanonickými kategoriemi rádiových hlášek (viz
 * game/radio/monsterRepelRadioMessages.ts) — z pohledu hráče je postup
 * monstra vpřed neúspěch použití děla, ne neutrální popis pohybu.
 */
export type MonsterRepelRadioResult = "success" | "stay" | "fail";

/**
 * Identifikátor obrázkové sekvence útoku Ghoula na kameru (viz zadání,
 * game/core/cameraDamage.ts#resolveGhoulCameraAttackAnimationId,
 * game/cameras/cameraAttackAnimation.object13.ts#GHOUL_CAMERA_ATTACK_ANIMATIONS) —
 * typ žije v `game/core` (výběr sekvence podle kamery je herní rozhodnutí),
 * skutečné snímky/cesty k WebP souborům žijí v `game/cameras` (vizuální
 * data), stejné směřování závislosti jako `CameraId`/`CameraDefinition`
 * (cameras závisí na core, nikdy naopak).
 */
export type GhoulCameraAttackAnimationId = "left_hallway" | "right_hallway" | "door_hallway" | "door_hallway_light";

/**
 * Vizuální fáze útoku Ghoula na JEDNU konkrétní kameru (viz zadání) — čistě
 * ODVOZENÁ hodnota (viz game/core/cameraDamage.ts#resolveCameraAttackVisualPhase),
 * NIKDE se neukládá přímo v GameState.cameraDamage (ten drží jen
 * `activeAttack`/`disabledCameraIds`, ze kterých se tahle fáze pro
 * konkrétní kameru+elapsedMs dopočítá). `"approaching-camera"` renderuje
 * skutečnou obrázkovou sekvenci (frames přehrávají se + hold posledního
 * snímku, viz game/cameras/cameraAttackAnimation.object13.ts) nebo CSS
 * fallback, pokud sekvence pro danou kameru neexistuje (`outer_yard`).
 * `"signal-failing"` je krátký závěrečný CSS "ztmavni/zrnění" ohon PO
 * doběhnutí sekvence+hold, těsně před `"offline"` (viz
 * GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS + GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS
 * < CAMERA_FAILURE_TRANSITION_MS v cameraDamageConfig.ts).
 */
export type CameraAttackVisualPhase = "idle" | "approaching-camera" | "signal-failing" | "offline";

/**
 * Stav vyřazení kamer Ghoulem (viz zadání, game/core/cameraDamage.ts,
 * game/core/cameraDamageConfig.ts) — podporuje VÍCE vyřazených kamer za
 * noc (limit podle čísla noci, viz getMaxDisabledCamerasForNight), proto
 * pole, ne skalár. `activeAttack` drží nejvýš JEDEN právě probíhající
 * pětisekundový přechod najednou (druhý útok nemůže začít, dokud první
 * neskončí — viz CAMERA_ATTACK_COOLDOWN_MS, delší než samotný přechod).
 * `animationId` se vybere JEDNOU při spuštění útoku (viz
 * game/core/cameraDamage.ts#resolveGhoulCameraAttackAnimationId, "door_hallway"
 * podle světla v okamžiku spuštění) a dál se po dobu útoku NEMĚNÍ, i kdyby
 * se mezitím světlo přepnulo. `lastAttackAtMs`/`lastFootstepsAtMs` jsou
 * nezávislé cooldowny (útok na kameru vs. přehrání mikrofonních kroků).
 */
export interface CameraDamageState {
  disabledCameraIds: CameraId[];
  activeAttack: { cameraId: CameraId; startedAtMs: number; animationId: GhoulCameraAttackAnimationId | null } | null;
  lastAttackAtMs: number | null;
  lastFootstepsAtMs: number | null;
}

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

/**
 * Držení tlačítka "Jít ven" (viz gameReducer.ts
 * START_EMERGENCY_RUN_WINDUP/CANCEL_EMERGENCY_RUN_WINDUP/TICK,
 * LeftWallView.tsx) — stejný "drž a riskuj" vzor jako BulbReplacementState.
 * `progressMs` roste v TICKu, dokud `active`; po dosažení
 * EMERGENCY_RUN_WINDUP_DURATION_MS se `active` spadne zpět na `false` a
 * `GameState.emergencyRunReadySeq` se zvýší (viz tam) — teprve to je signál
 * pro app/play/page.tsx, ať skutečně spustí EmergencyMiniGame. Zrušeno
 * (bez efektu) při puštění tlačítka nebo odchodu z left_wall pohledu.
 */
export interface EmergencyRunWindupState {
  active: boolean;
  startedAtMs: number | null;
  progressMs: number;
}

/**
 * Držení "Nechat si to projít hlavou" (viz zadání) — vedlejší tlačítko na
 * left_wall, vidět jen s brokovnicí (GameState.hasShotgun). Stejný
 * "drž a riskuj" vzor jako EmergencyRunWindupState výše (`progressMs` roste
 * v TICKu, dokud `active`), ale po dosažení THINK_IT_OVER_WINDUP_DURATION_MS
 * se NESPOUŠTÍ žádná minihra — `GameState.thinkItOverReadySeq` se jen zvýší
 * a app/play/page.tsx podle toho zobrazí čistě textovou hlášku (viz
 * gameReducer.ts, THINK_IT_OVER_WINDUP_DURATION_MS v game/balancing/constants.ts).
 */
export interface ThinkItOverWindupState {
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
   * Zvyšuje se přesně jednou při každém RECHARGE_POWER s kladným `amount`
   * (viz gameReducer.ts, app/play/page.tsx#handleEmergencyMiniGameComplete
   * po přinesení baterie) — stejný "seq" vzor jako bulbBreakSeq/
   * generatorBeepSeq výše. `power` samotné se v reduceru mění okamžitě
   * (gameplay hodnota), tohle pole slouží JEN PowerMeter.tsx, aby poznal
   * "tenhle konkrétní skok byl dobití" a přehrál delší, postupnou CSS
   * animaci výplně (viz zadání "uspokojivý efekt"), místo okamžitého skoku
   * nebo pomalé animace i běžného odčerpávání v TICKu.
   */
  powerRechargeSeq: number;
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
  /**
   * Zvyšuje se přesně jednou za blackout, v okamžiku, kdy blackoutElapsedMs
   * poprvé dosáhne `night.blackout.durationMs - night.blackout.roarLeadMs`
   * (viz gameReducer.ts TICK, "gameStatus === blackout" větev) — signál pro
   * app/play/page.tsx, ať zahraje `blackout_monster_roar` krátce PŘED
   * finálním přechodem na screen "death" (deathReason "blackout_timeout"),
   * ne až spolu s ním. Stejný "seq counter, reducer nikdy nevolá audio"
   * vzor jako blackoutPhaseSeq výše.
   */
  blackoutRoarSeq: number;

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
  /**
   * Zvýší se pokaždé, když se `enemyStage` skutečně změní na jinou hodnotu
   * (viz gameReducer.ts#withEnemyStageVisitSeed — centrální wrapper kolem
   * celého reduceru, ne rozeseté po jednotlivých case větvích). Slouží jako
   * "seed" pro výběr `monster`/`fleeing` obrázku kamery
   * (game/cameras/cameraAssets.object13.ts#getCameraImageSrc) — beze změny
   * by `pickDeterministic` se stále stejným (čistě `cameraId`) seedem
   * vracelo navěky STEJNÝ obrázek pro danou kameru (viz zadání "pořád ty
   * samé"). S tímhle polem v seedu se obrázek vybere znovu při KAŽDÉM
   * novém příchodu monstra na kameru, ale zůstává stabilní (nebliká), dokud
   * tam beze změny stage zůstává.
   */
  enemyStageVisitSeq: number;
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
  /**
   * Stejný princip jako `doorLightRepelMs`, ale pro nepřítele v `door_hallway`
   * (o krok dál od dveří) — dveře zavřené + UV SKUTEČNĚ svítí
   * (`isNearRoomLightActive`, ne jen `state.lightOn`) po
   * `EnemyDefinition.doorHallwayUvRepelRequiredMs` (výchozí ~7 s, výrazně
   * pomalejší než 1.5 s u dveří — UV je o krok dřív slabší/pomalejší nástroj,
   * ne náhrada za at_door repel). Kdykoliv některá podmínka přestane platit
   * (dveře otevřené, UV zhasnuté/žárovka praskne, nepřítel opustí
   * `door_hallway`), resetuje se na 0 — viz
   * `doorEncounter.ts#shouldDoorHallwayUvForceRetreat`,
   * `gameReducer.ts#updateDoorHallwayUvRepel`.
   */
  doorHallwayUvRepelMs: number;
  /** Zvyšuje se při každém repelu (dveřní i hallway UV) — UI podle změny spouští monsterRetreatRoar (viz app/play/page.tsx). */
  monsterRetreatRoarSeq: number;
  /**
   * Zvyšuje se přesně jednou za každý ENEMY_ADVANCE tik, kdy monstrum u
   * zavřených dveří útočí, ale útok je zablokovaný (viz
   * game/core/doorEncounter.ts#isDoorAttackBlockedByClosedDoor) — NIKDY
   * náhodně, jen jako přímý důsledek stejné větve, která by při otevřených
   * dveřích znamenala smrt. UI podle změny spouští monsterDoorBang (viz
   * app/play/page.tsx) — stejný "seq" vzor jako monsterRetreatRoarSeq/bulbBreakSeq.
   */
  doorBangSeq: number;

  /**
   * elapsedMs, do kterého ENEMY_ADVANCE nesmí u dveří dokončit smrtelný útok
   * (otevřené dveře) — `null` mimo tohle okno. Nastavuje VÝHRADNĚ
   * APPLY_OFFICE_THREAT_ON_RETURN (viz gameReducer.ts, game/minigame/officeThreat.ts)
   * hned po úspěšném návratu z EmergencyMiniGame s aktivní hrozbou — hráč má
   * pár vteřin na to stihnout zavřít dveře, než se door encounter chová
   * normálně. Zavřené dveře BĚHEM týhle doby útok blokují úplně stejně jako
   * jindy (isDoorAttackBlockedByClosedDoor se na tomhle poli vůbec neptá) —
   * grace mění jen výsledek OTEVŘENÝCH dveří, nikdy zavřených. Mimo tenhle
   * návrat se nikdy nenastavuje, takže běžný door encounter je beze změny.
   */
  enemyDoorAttackGraceUntilMs: number | null;

  /**
   * `true` od bezpečného návratu s worldEffect "monster_reached_office" (viz
   * gameReducer.ts APPLY_MONSTER_REACHED_OFFICE_AFTERMATH,
   * game/core/officeBreachAftermath.ts#resolveOfficeBreachPhase), dokud hráč
   * nevyřeší všechny tři kroky (zavřít dveře, restartovat generátor, vyměnit
   * žárovku) — TICK ho pak sám vypne zpátky na `false`
   * (isOfficeBreachResolved). Jediné nové pole pro celou tuhle krizi — fáze
   * samotná se vždy dopočítává čistě z existujících polí
   * (doorClosed/generatorState/roomBulbs), nikdy neukládaná duplicitně.
   * Vždy `false` na nový/opakovaný run (createInitialGameState), nikdy
   * nepřežívá restart/další noc.
   */
  officeBreachAftermathActive: boolean;

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

  /**
   * "Viditelný útěk" po odražení u dveří (viz zadání "ať hráč vidí bestii
   * utíkat, ne teleport") — `light_repelled`/`hallway_light_repelled`/
   * `gave_up` teď monstrum posunou jen o JEDEN krok zpátky na trase (ne
   * rovnou na `monsterRetreatStage`/náhodný bod), a otevřou tohle časové
   * okno: dokud `elapsedMs < enemyForcedRetreatUntilMs`, `ENEMY_ADVANCE`
   * (běžná pravděpodobnostní větev, mimo `at_door`/`breach`) použije
   * `advanceChance: 0` a `retreatChance: enemyForcedRetreatChance` místo
   * hodnot z `NightDefinition.enemy` — monstrum se tak nemůže přiblížit a
   * má zvýšenou/jistou šanci couvnout další krok každý tik, dokud okno
   * nevyprší nebo nedojde na `outside` (odkud už není kam couvat). Mimo
   * tohle okno (`null`) se `ENEMY_ADVANCE` chová úplně normálně. Konkrétní
   * síla/délka okna je různá pro každý spouštěč (viz gameReducer.ts).
   */
  enemyForcedRetreatUntilMs: number | null;
  /** Viz `enemyForcedRetreatUntilMs` — `null`, dokud okno neběží. */
  enemyForcedRetreatChance: number | null;
  /**
   * Nejbližší `elapsedMs`, kdy smí proběhnout DALŠÍ krok vynuceného ústupu
   * (viz `enemyForcedRetreatUntilMs` výše) — `ENEMY_ADVANCE` běží na
   * vlastním, na repelu NEZÁVISLÉM intervalu (`NightDefinition.enemyTickMs`,
   * viz gameLoop.ts), takže první tik po repelu mohl dřív přijít skoro
   * okamžitě (fáze časovače náhodou "due"), místo aby hráč měl jistou celou
   * `enemyTickMs` periodu vidět monstrum na jedné kameře. Dokud
   * `elapsedMs < enemyForcedRetreatNextStepAtMs`, `ENEMY_ADVANCE` v tomhle
   * okně jen "čeká" (`lastEnemyDecision: "stay"`, žádný roll) — jakmile se
   * krok skutečně vyhodnotí (ať už couvne, nebo díky šanci < 100 % zůstane
   * stát), posune se o další `enemyTickMs` dopředu. `null`, dokud okno
   * neběží.
   */
  enemyForcedRetreatNextStepAtMs: number | null;

  /**
   * `elapsedMs`, kdy monstrum naposledy SKUTEČNĚ vstoupilo do svého
   * aktuálního `enemyStage` (viz zadání "minimální pobyt monstra v
   * lokaci") — jediný zdroj pravdy, aktualizovaný centrálně ve
   * `withEnemyStageVisitSeed` (gameReducer.ts), stejným "stage se skutečně
   * změnila" testem jako `enemyStageVisitSeq`, takže ho není třeba
   * duplikovat v ~10 jednotlivých větvích, které `enemyStage` nastavují
   * (ENEMY_ADVANCE, door-light/UV repel, gave_up, office threat, potvrzený
   * zásah brokovnicí, ...). `game/core/monsterMinStay.ts#isMonsterMinStayBlocking`
   * ho porovnává s `MONSTER_MIN_LOCATION_STAY_MS[enemyStage]` — dokud
   * minimální doba neuplynula, běžný pravděpodobnostní ENEMY_ADVANCE hod se
   * vůbec neprovede (žádný roll, jen "stay"). NEBLOKUJE explicitní
   * scriptované přesuny (repely, gave_up, brokovnice, ...) — ty svůj vlastní
   * přesun provedou vždy, jen se tím (stejně jako každý jiný skutečný
   * přesun) posune tenhle timestamp dopředu.
   */
  enemyLocationEnteredAtMs: number;

  /**
   * Ruční aktivní režim "SONICKÉ DĚLO" v detailu právě otevřené kamery (viz
   * zadání) — NENÍ jednorázový hod, dokud běží, mění pravděpodobnosti
   * DALŠÍHO relevantního ENEMY_ADVANCE hodu (viz
   * `game/core/sonicCannon.ts#isSonicCannonAffectingEnemy`,
   * `SONIC_CANNON_*_CHANCE` v balancing/constants.ts) a spotřebovává energii
   * (viz `game/core/powerDrain.ts`, dřív svázané s pouhým sledováním kamery,
   * teď jen s tímhle polem). Automaticky se vypíná (nikdy neschovaně dál
   * neběží na jiné kameře) při zavření detailu/přepnutí kamery/blackoutu/
   * konci směny — viz `withSonicCannonAutoOff` v gameReducer.ts. Nikdy
   * persistentní (vždy `false` na `createInitialGameState`).
   */
  sonicCannonActive: boolean;
  /**
   * Zvyšuje se přesně jednou za KAŽDÝ relevantní ENEMY_ADVANCE hod, který
   * použil `SONIC_CANNON_*_CHANCE` (tj. sonické dělo bylo aktivní a mířilo
   * na kameru, kde se monstrum skutečně nachází) — stejný "seq counter,
   * reducer nikdy nevolá audio" vzor jako `monsterRetreatRoarSeq`/
   * `doorBangSeq`. `app/play/page.tsx` podle změny přehraje odpovídající
   * rádiovou hlášku (viz `game/radio/monsterRepelRadioMessages.ts`) —
   * VÝHRADNĚ pro tenhle jeden hod, nikdy pro běžný hod bez sonického děla
   * ani pro hod zablokovaný minimálním pobytem (ten se vůbec neprovede).
   */
  sonicCannonResultSeq: number;
  /** Výsledek POSLEDNÍHO sonicCannonResultSeq hodu — `null`, dokud žádný neproběhl. Viz sonicCannonResultSeq výše. */
  lastSonicCannonResult: MonsterRepelRadioResult | null;

  /**
   * Zvyšuje se PŘESNĚ při skutečné, záměrné změně `sonicCannonActive` (viz
   * zadání "dolaď sonické dělo... jasná zvuková odezva") — ruční
   * `TOGGLE_SONIC_CANNON` (zapnutí i vypnutí) A automatické vypnutí po
   * prvním skutečném sonic-modified decision ticku (viz ENEMY_ADVANCE).
   * ZÁMĚRNĚ SE NEZVYŠUJE, když `sonicCannonActive` spadne na `false` "potichu"
   * přes `withSonicCannonAutoOff` (zavření detailu/přepnutí kamery/blackout/
   * konec směny — viz zadání "žádný click při resetu stavu... pokud by to
   * působilo rušivě") — jen tahle tichá cesta by jinak měnila
   * `sonicCannonActive` beze změny tohohle seq. `app/play/page.tsx` podle
   * změny přehraje PRÁVĚ JEDNO mechanické cvaknutí (viz
   * `AUDIO_EVENTS.lightClick`, znovupoužitý — žádný nový click event).
   */
  sonicCannonToggleSeq: number;
  /** Důvod POSLEDNÍ změny `sonicCannonToggleSeq` — `null`, dokud k žádné nedošlo. Viz sonicCannonToggleSeq výše. */
  lastSonicCannonToggleReason: "manual_on" | "manual_off" | "result_auto_off" | null;

  /**
   * Vzácná reakce Ghoula na sonické dělo (viz zadání "finální chování",
   * game/core/cameraDamage.ts) — hod na útok kamery proběhne PŘI KAŽDÉM
   * použití sonického děla na Ghoula (bez ohledu na `sonicResult`), v
   * ENEMY_ADVANCE. Podporuje víc vyřazených kamer za noc (limit podle čísla
   * noci, viz cameraDamageConfig.ts#MAX_DISABLED_CAMERAS_BY_NIGHT). Nikdy
   * persistentní mezi nocemi — vždy čerstvé `{ disabledCameraIds: [],
   * activeAttack: null, lastAttackAtMs: null, lastFootstepsAtMs: null }` na
   * `createInitialGameState` (žádný override parametr, stejná konvence jako
   * `monsterHitsToday`). Save uprostřed noci s už vyřazenými kamerami
   * zůstává zachovaný beze změny (žádná časovaná obnova mimo start noci).
   */
  cameraDamage: CameraDamageState;
  /**
   * Zvyšuje se PŘESNĚ jednou, když se spustí NOVÝ útok na kameru (idle ->
   * activeAttack) — stejný "seq counter, reducer nikdy nevolá audio" vzor
   * jako `sonicCannonResultSeq`. `app/play/page.tsx` podle změny přehraje
   * `AUDIO_EVENTS.cameraDamageStart`.
   */
  cameraAttackStartedSeq: number;
  /**
   * Zvyšuje se PŘESNĚ jednou, když se právě probíhající útok (activeAttack)
   * v TICKu dokončí přechodem do `disabledCameraIds` (ne jeho začátek — viz
   * `cameraAttackStartedSeq` výše). `app/play/page.tsx` podle změny přehraje
   * `AUDIO_EVENTS.cameraSignalLost` A spustí textovou rádiovou hlášku (viz
   * `game/radio/useCameraDisabledRadioMessage.ts`) — teprve TEĎ, ne už při
   * začátku ztmavování (viz zadání "zpráva se nesmí spustit už při začátku
   * pětisekundového ztmavování"). Při více vyřazeních za noc se zvyšuje
   * znovu při KAŽDÉM novém dokončeném vyřazení.
   */
  cameraOfflineSeq: number;
  /**
   * Zvyšuje se, když Ghoul VSTOUPÍ do lokace s už offline kamerou (nebo tam
   * už stojí ve chvíli, kdy se kamera na tomhle místě dokončí vyřadit) — viz
   * zadání "mikrofon zůstává funkční", `game/core/cameraDamage.ts`
   * `isEnemyOnDisabledCameraStage`. Respektuje
   * `DISABLED_CAMERA_FOOTSTEPS_COOLDOWN_MS` (viz `cameraDamage.lastFootstepsAtMs`)
   * — needávkuje se donekonečna, dokud Ghoul na místě zůstává.
   * `app/play/page.tsx` podle změny přehraje existující zvuk kroků (viz
   * `AUDIO_EVENTS.disabledCameraFootsteps`).
   */
  disabledCameraFootstepsSeq: number;

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
  /**
   * Zvyšuje se přesně jednou při ÚSPĚŠNÉM dokončení ruční výměny žárovky
   * (ne při startu, cancelu, ani smrti během výměny) — stejný "seq" vzor jako
   * `bulbBreakSeq`, UI podle změny spustí zvuk (`bulb_replace_success`, viz
   * app/play/page.tsx) a krátkou textovou hlášku (viz DoorView.tsx).
   */
  bulbReplaceSuccessSeq: number;

  /**
   * Zvyšuje se přesně jednou pokaždé, když hráč restartuje generátor, co
   * ve skutečnosti běžel v pořádku (`generatorState === "normal"`) — viz
   * gameReducer.ts RESTART_GENERATOR. Restart během skutečné poruchy
   * (`silentFault`/`criticalBeeping`) tenhle čítač nezvyšuje. Stejný "seq"
   * vzor jako `bulbReplaceSuccessSeq` — GeneratorView.tsx podle změny
   * zobrazí krátkou posměšnou hlášku ("To byla pěkný blbost...").
   */
  generatorAccidentalRestartSeq: number;

  /** Držení tlačítka "Jít ven" (viz EmergencyRunWindupState) — vždy resetováno na novou směnu, nikdy se nepřenáší mezi nocemi, stejně jako bulbReplacement. */
  emergencyRunWindup: EmergencyRunWindupState;
  /**
   * Zvyšuje se přesně jednou při ÚSPĚŠNÉM dokončení držení "Jít ven" (ne při
   * startu, cancelu, ani smrti během držení) — stejný "seq" vzor jako
   * `bulbReplaceSuccessSeq`. app/play/page.tsx podle změny skutečně spustí
   * EmergencyMiniGame (viz handleStartEmergencyRunWindup) — samotný reducer
   * o EmergencyMiniGame nic neví, jen odpočítává držení.
   */
  emergencyRunReadySeq: number;

  /** Držení "Nechat si to projít hlavou" (viz ThinkItOverWindupState) — vždy resetováno na novou směnu, stejná konvence jako emergencyRunWindup. */
  thinkItOverWindup: ThinkItOverWindupState;
  /**
   * Zvyšuje se přesně jednou při ÚSPĚŠNÉM dokončení držení "Nechat si to
   * projít hlavou" — stejný "seq" vzor jako `emergencyRunReadySeq` výše, ale
   * app/play/page.tsx podle změny jen zobrazí textovou hlášku, žádnou minihru.
   */
  thinkItOverReadySeq: number;

  /**
   * Které mechaniky jsou tuhle noc zapnuté (viz game/difficulty/nightConfig.ts)
   * — vyřešené jednou při START_SHIFT/RESTART_SHIFT (app/play/page.tsx pošle
   * getNightConfig(currentNight).features) a odtud čte zbytek reduceru,
   * stejný "resolve při startu, čti ze state" vzor jako roomBulbs/bulbsRemaining.
   */
  nightFeatures: NightFeatureFlags;

  /**
   * Zvolený herní režim (viz game/core/gameMode.ts) — na rozdíl od většiny
   * `GameState` polí se NErepretuje na výchozí hodnotu při restartu stejné
   * směny: `createInitialGameState` ho přebírá jako volitelný override,
   * stejná konvence jako `roomBulbs`/`bulbsRemaining` výše. Zvolí se jednou na
   * MainMenuScreen a zůstává neměnný po celou dobu jednoho runu (do návratu
   * do menu), gameReducer.ts ho jen předává dál.
   */
  gameMode: GameMode;
  /**
   * Kolik životů zbývá (viz GAME_MODE_CONFIG.startingLives) — stejná
   * "přenáší se přes restart" konvence jako `gameMode` výše. Smrt ho sníží
   * (viz gameReducer.ts#resolveLivesRemainingAfterDeath); `app/play/page.tsx`
   * podle výsledné hodnoty pozná, jestli Normal run pokračuje (>0) nebo
   * skutečně skončil (0), a při dalším RESTART_SHIFT/START_SHIFT pošle
   * odpovídající hodnotu dál (zachovanou, nebo čerstvou při novém runu).
   */
  livesRemaining: number;

  /**
   * Trvalé vlastnictví brokovnice pro AKTUÁLNÍ run (viz
   * game/core/shotgunEquipment.ts, zadání "první krok k true endingu") —
   * stejná "přenáší se přes restart, resetuje na nový run" konvence jako
   * `gameMode`/`livesRemaining` výše, NE campaign hodnota jako
   * `roomBulbs`/`bulbsRemaining` (nový run vždy začíná bez brokovnice).
   * Sebrání v EmergencyMiniGame samo o sobě tohle pole nemění — nastavuje ho
   * až `APPLY_SHOTGUN_EFFECTS` po bezpečném návratu do kanceláře (viz
   * app/play/page.tsx#handleEmergencyMiniGameComplete).
   */
  hasShotgun: boolean;
  /**
   * `true` jen pro dvouhlavňovku (viz shotgunEquipment.ts#isDoubleBarrelShotgun,
   * game/core/monsterDefeatReward.ts#doubleBarrelUnlocked) — nikdy `true`,
   * pokud `hasShotgun` je `false` (viz createFreshRunShotgunEquipment).
   * Jediná cesta, jak tohle pole nastavit na `true`, je začátek nového runu
   * s odemčenou trvalou odměnou (true ending) — worldEffect
   * "shotgun_acquired" v minihře vždy znamená BĚŽNOU brokovnici, nikdy
   * tohle pole nezmění (viz applyShotgunEmergencyReturn).
   */
  hasDoubleBarrelShotgun: boolean;
  /**
   * Aktuální munice (0 až `getShotgunMaxAmmo`, viz shotgunEquipment.ts) —
   * vždy 0, dokud `hasShotgun` není `true`; strop je 1 pro běžnou
   * brokovnici, 2 pro dvouhlavňovku. Dobíjí se na max při každém startu
   * nové/opakované noci a při každém bezpečném návratu z emergency výpravy
   * (viz getRechargedShotgunAmmo) — MVP pravidlo je "vždy plný zásobník po
   * dobití", žádné postupné doplňování.
   */
  shotgunAmmo: number;

  /**
   * Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — na rozdíl
   * od `hasShotgun`/`shotgunAmmo` (přenáší se přes celý run) je tohle
   * počítadlo "za JEDNU noc": `createInitialGameState` ho VŽDY nastaví na
   * čerstvou výchozí hodnotu, i při RESTART_SHIFT (opakování stejné noci po
   * smrti v Normal režimu) — žádný override parametr, žádná výjimka.
   */
  monsterHitsToday: number;
  /**
   * Kolik zásahů monstra brokovnicí hráč BĚHEM aktuální emergency výpravy
   * zaznamenal, ale ještě nepotvrdil (viz gameActions.ts
   * MARK_PENDING_MONSTER_HIT, EmergencyMiniGame.tsx#fireShot) — zvyšuje se
   * o 1 při KAŽDÉM zásahu. Bezpečný návrat ho potvrdí celý najednou
   * (CONFIRM_MONSTER_HIT: `monsterHitsToday += pendingMonsterHits`, tohle
   * se vrátí na `0`); smrt venku (EMERGENCY_MINIGAME_DIED) ho ZAHODÍ celé
   * beze změny `monsterHitsToday` — zásah se tedy nikdy nepočítá bez
   * bezpečného návratu. Číselný typ umí až 2 zásahy za jednu výpravu s
   * dvouhlavňovkou (viz game/core/shotgunEquipment.ts,
   * EmergencyMiniGame.tsx `monsterHitsThisRun` counter + wounded/recover
   * gate), 1 s běžnou brokovnicí.
   */
  pendingMonsterHits: number;
  /**
   * `true`, jakmile `monsterHitsToday` dosáhne
   * `MONSTER_TRUE_ENDING_REQUIRED_HITS` (viz CONFIRM_MONSTER_HIT) — trvalý
   * příznak pro tenhle run, `screen` zároveň přejde na `"monsterDefeated"`
   * (viz MonsterDefeatedScreen.tsx). Nový run (GO_TO_MENU -> START_SHIFT)
   * ho vždy vynuluje zpátky na `false`.
   */
  monsterDefeated: boolean;
  /**
   * `true`, jakmile hráč BĚHEM AKTUÁLNÍHO RUNU aspoň jednou potvrdil zásah,
   * který porazil monstrum (viz CONFIRM_MONSTER_HIT, `result.monsterDefeated`
   * — první i opakovaná porážka, `monsterDefeated` výše se na rozdíl od
   * tohohle pole resetuje KAŽDOU noc). Stejná "přenáší se přes
   * restart/další noc, resetuje na nový run" konvence jako `hasShotgun`
   * výše (viz app/play/page.tsx#handleBeginShift) — NENÍ to totéž jako
   * `game/core/monsterDefeatReward.ts#monsterDefeatsCount` (ten je
   * celoživotní přes všechny runy). Používá se pro rozlišení Hardcore
   * "no-kill" endingu noci 30 (viz game/core/night30Ending.ts) od běžné
   * výhry — hráč mohl bestii porazit v MINULÉM runu, na tomhle poli nezáleží.
   */
  monsterKilledThisRun: boolean;

  /**
   * Admin-only debug override "aktuální noc" (viz zadání "testovací nástroj
   * pro late-run scény", DebugPanel.tsx, gameActions.ts SET_DEBUG_NIGHT) —
   * `null` = normální výpočet (app/play/page.tsx `currentNight`, ze
   * survivedNights/serverRunState.currentRun), jinak ho PŘEBÍJÍ. Ovlivňuje
   * jen "jaké číslo noci se použije" pro rozhodnutí navázaná na
   * `currentNight` V MOMENTĚ přechodu na "win"/"death" (Night 30 ending,
   * Valhala) — NEpřepočítává zpětně `nightFeatures` (ty se řeší jednou při
   * START_SHIFT/RESTART_SHIFT, dřív, než admin override vůbec může
   * nastavit). Nikdy nezasahuje do gameMode/livesRemaining/hasShotgun/
   * monsterKilledThisRun/roomBulbs — čistě navíc pole, resetuje se jako
   * kterékoliv jiné per-run pole na START_SHIFT/RESTART_SHIFT/GO_TO_MENU
   * (createInitialGameState default `null`), admin si ho na dalším testu
   * nastaví znovu.
   */
  debugNightOverride: number | null;
  /**
   * Dev-only override efektivní šance útoku Ghoula na kameru (viz zadání
   * "nastavit šanci na 100 procent", DebugPanel.tsx) — `null` = použij
   * produkční `GHOUL_CAMERA_ATTACK_CHANCE` (0.05) beze změny.
   * `game/core/cameraDamageConfig.ts#GHOUL_CAMERA_ATTACK_CHANCE` SAMOTNÁ se
   * tímhle nikdy nepřepisuje — jen efektivní hodnota, kterou
   * `attemptGhoulCameraAttack` použije pro `rollGhoulCameraAttack`. Stejná
   * "resetuje se jako kterékoliv jiné per-run pole" konvence jako
   * `debugNightOverride` výše (createInitialGameState default `null`).
   */
  debugGhoulCameraAttackChanceOverride: number | null;

  isRunning: boolean;
  audioMuted: boolean;
  /**
   * Hráčem nastavitelná délka zamčení dveří kanceláře v emergency minihře
   * (viz game/minigame/config.ts#EMERGENCY_OFFICE_DOOR_LOCK_MS/
   * OFFICE_DOOR_LOCK_MIN_MS/MAX_MS, LeftWallView.tsx posuvník — zobrazený
   * jen s brokovnicí, zadání "kompenzovat horší mobilní ovládání").
   * Perzistuje přes celou session stejně jako `audioMuted` (zachovává se
   * přes START_LOADING/SHOW_BRIEFING/START_SHIFT/RESTART_SHIFT/GO_TO_MENU
   * v gameReducer.ts), ne per-night reset. `EMERGENCY_MONSTER_OFFICE_TARGET_DELAY_MS`
   * zůstává nezávisle pevných 5s, tímhle polem neovlivněné.
   */
  officeDoorLockMs: number;
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
