"use client";

import { CSSProperties, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CONE_ANGLE_RAD,
  CONE_RANGE,
  ENEMY_AGGRO_RANGE,
  ENEMY_AGGRO_SPEED_MULTIPLIER,
  ENEMY_CHASE_SPEED,
  ENEMY_SEARCH_SPEED,
  ENEMY_STUN_DURATION_MS,
  ENEMY_VISION_ANGLE_RAD,
  ENEMY_VISION_RANGE,
  ENEMY_VISION_RAY_COUNT,
  ENEMY_VISION_RAY_STEP_PX,
  ENEMY_WAIT_MAX_MS,
  ENEMY_WAIT_MIN_MS,
  INVESTIGATION_ARRIVAL_RADIUS_PX,
  INVESTIGATION_CLOSE_DISTANCE_THRESHOLD_PX,
  INVESTIGATION_MAX_ATTEMPTS,
  INVESTIGATION_NOISE_CLOSE_PX,
  INVESTIGATION_NOISE_FAR_PX,
  ITEM_RADIUS,
  MINIGAME_PLAYER_DIRECTIONAL_VISION_RANGE_PX,
  MINIGAME_PLAYER_PERIPHERAL_VISION_RANGE_PX,
  MINIGAME_PLAYER_VISION_ANGLE_DEG,
  MINIGAME_PLAYER_VISION_ANGLE_RAD,
  MINIGAME_PLAYER_VISION_RAY_COUNT,
  MINIGAME_PLAYER_VISION_RAY_STEP_PX,
  OFFICE_THREAT_NEAR_OFFICE_RADIUS_PX,
  OFFICE_THREAT_NEAR_PLAYER_RADIUS_PX,
  SHOT_FLASH_DURATION_MS,
  START_ZONE_LEAVE_RADIUS_PX,
  STUCK_CHECK_INTERVAL_MS,
  STUCK_MOVE_THRESHOLD_PX,
  STUCK_TIMEOUT_MS,
  computeMiniGameWorldScale,
  createInitialEnemy,
  createInitialPlayer,
} from "@/game/minigame/config";
import {
  Direction,
  EmergencyMiniGameInput,
  EmergencyMiniGameResult,
  EmergencyMissionPhase,
  EmergencyMissionState,
  Enemy,
  EnemyMode,
  MiniGameItemId,
  MiniGameStatus,
  Player,
  Vec2,
  Wall,
} from "@/game/minigame/types";
import {
  DIRECTION_ANGLES,
  EnemyAiConfig,
  applyShot,
  canReturnToOffice,
  castVisionCone,
  circleIntersectsWall,
  circlesTouch,
  completeObjective,
  createDeadResult,
  createInitialMissionState,
  createReturnedResult,
  createWeaponHudLabel,
  directionFromVector,
  distance,
  getOfficeMarkerLabel,
  moveWithWallSliding,
  resolveEquipmentFromInput,
  shouldHighlightOfficeMarker,
  updateEnemyAi,
  updateMissionPhase,
} from "@/game/minigame/logic";
import { MiniGameLayout, MiniGameLayoutWall } from "@/game/minigame/layoutTypes";
import { getMiniGameRoomDisplayLabel, getMiniGameWallRenderStyle, shouldShowRoomLabelByDefault } from "@/game/minigame/mapVisuals";
import { DEFAULT_MINIGAME_LAYOUT_ID, getMiniGameLayout } from "@/game/minigame/layouts";
import { ResolvedMiniGamePlacement, getRoomBoundsForSlot, resolveMiniGamePlacement } from "@/game/minigame/layoutPlacement";
import { createRandomSeed } from "@/game/minigame/seededRandom";
import { getMiniGameSlotDebugLabel, getRoomAtPoint, getSelectedSlotIds, isMiniGameDevToggleHit } from "@/game/minigame/devOverlay";
import { evaluateOfficeThreatOnReturn } from "@/game/minigame/officeThreat";
import { PlayerVisionConfig, getPlayerVisibilityAtPoint } from "@/game/minigame/playerVision";

interface EmergencyMiniGameProps {
  input: EmergencyMiniGameInput;
  /** Zavolá se PŘESNĚ jednou za smysluplný konec mise (dead/returned) — viz completedRef guard níže. Sebrání věci samo o sobě onComplete NEVOLÁ, viz completeObjective/canReturnToOffice v game/minigame/logic.ts. */
  onComplete?: (result: EmergencyMiniGameResult) => void;
  /** Zatím jen Escape během hraní — žádná další UI cesta k "cancel" v tomhle MVP. */
  onCancel?: () => void;
}

// Znovupoužitelný "nouzová obchůzka" modul — vlastní requestAnimationFrame
// smyčka mimo React render cyklus. Mutable herní stav žije v refu (gameRef),
// ať se hra neproháněla přes setState 60×/s; do Reactu (useState
// status/ammoLeft/enemyMode/woundedMsLeft/result) se propisuje jen při
// SKUTEČNÉ změně, aby se stavový panel/overlay překreslil. Zatím NENÍ
// napojený na hlavní hru (/play) — jen připravený kontrakt (input/
// onComplete/onCancel), viz app/minihra/page.tsx pro samostatné použití.
interface MiniGameRefState {
  player: Player;
  enemy: Enemy;
  status: MiniGameStatus;
  /** > 0 = výseč krátce bliká po výstřelu (zásah i minutí) — čistě vizuální, viz fireShot/draw. */
  shotFlashRemainingMs: number;
  /** Kolik ms uplynulo od startu/restartu, dokud hra běží — vrací se v EmergencyMiniGameResult.elapsedMs. */
  elapsedMs: number;
  /** Kolik výstřelů hráč skutečně vypálil (ne kolik mu zbylo) — vrací se v EmergencyMiniGameResult.shotsUsed. */
  shotsUsed: number;
  /** Objective "return_to_office": true, jakmile hráč aspoň jednou opustí okolí startu — game.exitZone se počítá až pak (viz zadání "ne hned na startu"). */
  hasLeftStartZone: boolean;
  /** Základní smyčka mise (viz game/minigame/logic.ts#completeObjective/canReturnToOffice) — nahrazuje dřívější jednoduché `itemCollected: boolean`: sebrání věci je jen mezistav ("returning"), ne konec minihry. */
  mission: EmergencyMissionState;
  /** Hráčova startovní pozice (viz hasLeftStartZone) — uložená při vytvoření, ne přepočítávaná z CANVAS/WORLD konstant, ať vždy odpovídá skutečnému createInitialPlayer(). */
  startX: number;
  startY: number;
  /** Datově definovaná mapa (viz game/minigame/layoutTypes.ts) — zvolená podle input.layoutId, DEFAULT_MINIGAME_LAYOUT_ID jako fallback. */
  layout: MiniGameLayout;
  /** Vyřešené sloty (start/exit/monster spawn/objective) pro tenhle konkrétní run — viz game/minigame/layoutPlacement.ts. Debug HUD z tohohle čte layoutId/seed/vybrané sloty. */
  placement: ResolvedMiniGamePlacement;
  /**
   * = layout.walls, uložené zvlášť ať tick()/draw()/fireShot() nemusí pokaždé
   * sahat do gameRef.current.layout.walls. Typ MiniGameLayoutWall (ne jen
   * Wall) záměrně — draw() potřebuje `kind` pro vizuální styl (viz
   * game/minigame/mapVisuals.ts#getMiniGameWallRenderStyle); strukturální
   * nadmnožina Wall, takže se dál beze změny předává do
   * moveWithWallSliding/castVisionCone/isEnemyHit apod.
   */
  walls: MiniGameLayoutWall[];
  worldWidth: number;
  worldHeight: number;
  /** Jednotné měřítko pro vykreslení tohohle konkrétního (libovolně velkého) layoutu do CANVAS_WIDTH×CANVAS_HEIGHT — viz computeMiniGameWorldScale. */
  scale: number;
  /** "Návratová zóna" pro E/exit interakci — bounds místnosti obsahující placement.playerExitSlotId, ne natvrdo zadaný obdélník. */
  exitZone: Wall;
  /** Pozice objective itemu ("collect_item") pro tenhle run — chybí pro jiné objective. */
  itemPosition?: Vec2;
  /** Statická AI konfigurace se souřadnicemi TOHOTO layoutu (mapWidth/mapHeight) — jednou spočítaná při vytvoření, ne module-level konstanta (různé layouty mají různě velký svět). */
  enemyAiConfig: EnemyAiConfig;
  /**
   * Jestli je monstrum TEĎ ve viditelnosti hráče (viz
   * game/minigame/playerVision.ts#getPlayerVisibilityAtPoint) — počítá se
   * jednou za tik (ne opakovaně v draw()), draw() i dev lišta čtou stejnou
   * hodnotu. Mimo viditelnost se monstrum v běžném režimu vůbec nekreslí
   * (hlavní hororový efekt fogu, viz zadání).
   */
  enemyVisibleToPlayer: boolean;
}

function createInitialState(input: EmergencyMiniGameInput): MiniGameRefState {
  const layout = getMiniGameLayout(input.layoutId ?? DEFAULT_MINIGAME_LAYOUT_ID);
  const seed = input.seed ?? createRandomSeed();
  const placement = resolveMiniGamePlacement(layout, input, seed);

  const equipment = resolveEquipmentFromInput(input);
  const player = createInitialPlayer(equipment, placement.playerStart);
  const enemy = createInitialEnemy(player, placement.monsterSpawn, layout.walls, layout.world.width, layout.world.height);
  const exitZone = getRoomBoundsForSlot(layout, placement.playerExitSlotId);

  return {
    player,
    enemy,
    status: "playing",
    shotFlashRemainingMs: 0,
    startX: player.x,
    startY: player.y,
    elapsedMs: 0,
    shotsUsed: 0,
    hasLeftStartZone: false,
    mission: createInitialMissionState(),
    layout,
    placement,
    walls: layout.walls,
    worldWidth: layout.world.width,
    worldHeight: layout.world.height,
    scale: computeMiniGameWorldScale(layout.world.width, layout.world.height),
    exitZone,
    itemPosition: placement.objectivePosition,
    enemyAiConfig: createEnemyAiConfig(layout.world.width, layout.world.height),
    enemyVisibleToPlayer: false,
  };
}

const ITEM_LABELS_ACCUSATIVE: Record<MiniGameItemId, string> = {
  fuse: "pojistku",
  bulb: "žárovku",
  key: "klíč",
  toolbox: "nářadí",
  battery: "baterii",
  shotgun: "brokovnici",
  ammo: "náboj",
};

/** Nominativ pro item marker na mapě ("BATERIE (E)") a "Sebráno: ..." text — viz draw()/won overlay. */
const ITEM_LABELS_NOMINATIVE: Record<MiniGameItemId, string> = {
  fuse: "Pojistka",
  bulb: "Žárovka",
  key: "Klíč",
  toolbox: "Nářadí",
  battery: "Baterie",
  shotgun: "Brokovnice",
  ammo: "Náboj",
};

/** HUD hint pod REŽIM řádkem — vysvětluje hráči, co má aktuálně udělat (viz mission phase / EmergencyMissionPhase). */
function getMissionHint(
  objective: EmergencyMiniGameInput["objective"],
  itemToCollect: MiniGameItemId | undefined,
  missionPhase: EmergencyMissionPhase,
  inExitZone: boolean,
): string {
  if (objective === "survive") return "Cíl: Přežij hlídku.";

  if (objective === "return_to_office") {
    if (missionPhase === "completed") return "Splněno.";
    return inExitZone ? "Stiskni E pro návrat do kanceláře." : "Cíl: Vrať se do kanceláře.";
  }

  // objective === "collect_item"
  const itemLabel = ITEM_LABELS_ACCUSATIVE[itemToCollect ?? "fuse"];
  if (missionPhase === "outbound") {
    return inExitZone ? "Nejdřív splň úkol." : `Cíl: Najdi a seber ${itemLabel}. [E]`;
  }
  if (missionPhase === "returning") {
    return inExitZone ? "Stiskni E pro návrat do kanceláře." : "Věc získána. Vrať se do kanceláře.";
  }
  return "Splněno.";
}

// Konfigurace AI (viz game/minigame/logic.ts#updateEnemyAi) — mapWidth/
// mapHeight teď závisí na ZVOLENÉM layoutu (různé mapy mají různě velký
// svět), proto funkce místo dřívější module-level konstanty; volá se jednou
// při createInitialState, ne přepočítává se každý tik.
function createEnemyAiConfig(mapWidth: number, mapHeight: number): EnemyAiConfig {
  return {
    searchSpeed: ENEMY_SEARCH_SPEED,
    chaseSpeed: ENEMY_CHASE_SPEED,
    aggroSpeedMultiplier: ENEMY_AGGRO_SPEED_MULTIPLIER,
    aggroRange: ENEMY_AGGRO_RANGE,
    visionRange: ENEMY_VISION_RANGE,
    visionAngleRad: ENEMY_VISION_ANGLE_RAD,
    waitMinMs: ENEMY_WAIT_MIN_MS,
    waitMaxMs: ENEMY_WAIT_MAX_MS,
    investigationArrivalRadius: INVESTIGATION_ARRIVAL_RADIUS_PX,
    investigationNoiseCloseRangePx: INVESTIGATION_NOISE_CLOSE_PX,
    investigationNoiseFarPx: INVESTIGATION_NOISE_FAR_PX,
    investigationCloseDistanceThresholdPx: INVESTIGATION_CLOSE_DISTANCE_THRESHOLD_PX,
    investigationMaxAttempts: INVESTIGATION_MAX_ATTEMPTS,
    mapWidth,
    mapHeight,
    stuckCheckIntervalMs: STUCK_CHECK_INTERVAL_MS,
    stuckMoveThresholdPx: STUCK_MOVE_THRESHOLD_PX,
    stuckTimeoutMs: STUCK_TIMEOUT_MS,
  };
}

// Omezená viditelnost hráče (fog of war, viz game/minigame/playerVision.ts)
// — na rozdíl od ENEMY_AI_CONFIG nezávisí na layoutu/světě, stačí jedna
// statická konfigurace složená jednou z config.ts konstant.
const PLAYER_VISION_CONFIG: PlayerVisionConfig = {
  peripheralRangePx: MINIGAME_PLAYER_PERIPHERAL_VISION_RANGE_PX,
  directionalRangePx: MINIGAME_PLAYER_DIRECTIONAL_VISION_RANGE_PX,
  directionalAngleRad: MINIGAME_PLAYER_VISION_ANGLE_RAD,
};

const MODE_LABELS: Record<EnemyMode, string> = {
  investigating: "Pátrání",
  waiting: "Čeká",
  chasing: "Lov",
  wounded: "Zraněno",
};

const MOVE_KEYS: Record<string, { dx: number; dy: number }> = {
  w: { dx: 0, dy: -1 },
  arrowup: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  arrowdown: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  arrowleft: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
  arrowright: { dx: 1, dy: 0 },
};

export default function EmergencyMiniGame({ input, onComplete, onCancel }: EmergencyMiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<MiniGameRefState>(createInitialState(input));
  const heldKeysRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  // rAF timestamp z předchozího ticku — potřeba pro deltaMs (odpočet
  // shotFlashRemainingMs/enemy.stunRemainingMs/waitRemainingMs/elapsedMs),
  // ne pro pohyb (ten zůstává fixní na tik, beze změny oproti dřívějšku).
  const lastTimestampRef = useRef<number | null>(null);
  // Guard proti opakovanému onComplete — jakmile jednou zavoláme, nesmí se
  // to stát znovu, i kdyby tick() proběhl ještě několikrát před cancelAnimationFrame.
  const completedRef = useRef(false);

  const [status, setStatus] = useState<MiniGameStatus>("playing");
  const [ammoLeft, setAmmoLeft] = useState(() => resolveEquipmentFromInput(input).ammo);
  // Zobrazený odpočet "Zranění: X.X s" — `null` mimo wounded mód. Aktualizuje
  // se každý tik, ale React re-render přeskočí, dokud se zaokrouhlená hodnota
  // skutečně nezmění (setState se stejnou hodnotou = bailout).
  const [woundedMsLeft, setWoundedMsLeft] = useState<number | null>(null);
  // Nenápadný HUD status ("Režim: Pátrání/Čeká/Lov/Zraněno") — stejný bailout
  // vzor jako woundedMsLeft, mění se jen při skutečném přechodu módu.
  const [enemyMode, setEnemyMode] = useState<EnemyMode>("investigating");
  // Fáze mise (viz EmergencyMissionPhase) — mění se jen při skutečném
  // přechodu (sebrání věci, návrat), stejný bailout vzor jako enemyMode.
  const [missionPhase, setMissionPhase] = useState<EmergencyMissionPhase>("outbound");
  // Jestli hráč TEĎ stojí v exit zóně — čistě pro HUD hint ("Nejdřív splň
  // úkol." / "Stiskni E pro návrat..."), počítá se každý tik s bailoutem.
  const [inExitZone, setInExitZone] = useState(false);
  // Poslední odeslaný výsledek — `null`, dokud hra neskončí smysluplným
  // koncem. Debug stránka (app/minihra/page.tsx) ho může zobrazit dál poté,
  // co se tahle komponenta případně odmountuje (drží si vlastní kopii).
  const [result, setResult] = useState<EmergencyMiniGameResult | null>(null);

  // Skrytý developer overlay (viz zadání) — NENÍ security feature, jen dev
  // pomůcka pro tuhle jednu session (žádný localStorage, viz report). Zapíná/
  // vypíná se přes isMiniGameDevToggleHit (Shift + pravý klik do pravého
  // horního rohu canvasu), viz handleCanvasContextMenu níže. Ref zrcadlí
  // state, ať tick()/draw() (uvnitř efektu s deps `[input]`) vždy čte
  // AKTUÁLNÍ hodnotu bez nutnosti ten velký efekt kvůli přepnutí remountovat.
  const [isDevOverlayEnabled, setIsDevOverlayEnabled] = useState(false);
  const isDevOverlayEnabledRef = useRef(isDevOverlayEnabled);
  useEffect(() => {
    isDevOverlayEnabledRef.current = isDevOverlayEnabled;
  }, [isDevOverlayEnabled]);
  // Aktuální místnost hráče pro dev lištu (viz getRoomAtPoint) — počítá se
  // jen v tiku, jen když je overlay zapnutý (běžná hra ho vůbec nepočítá).
  // setState se stejnou hodnotou je React no-op, takže tohle nepůsobí re-render
  // 60×/s, stejný bailout vzor jako inExitZone/enemyMode výše.
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  // Jestli je monstrum TEĎ ve viditelnosti hráče — jen pro dev lištu (viz
  // zadání "zda je monster currently visible"), stejný bailout vzor jako
  // currentRoomId výše. Skutečné SKRÝVÁNÍ monstra na canvasu čte
  // gameRef.current.enemyVisibleToPlayer přímo v draw(), ne tenhle state.
  const [isMonsterVisibleToPlayer, setIsMonsterVisibleToPlayer] = useState(false);

  function handleCanvasContextMenu(event: ReactMouseEvent<HTMLCanvasElement>) {
    const hit = isMiniGameDevToggleHit({
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
      button: event.button,
      shiftKey: event.shiftKey,
      canvasWidth: event.currentTarget.clientWidth,
      canvasHeight: event.currentTarget.clientHeight,
    });
    if (!hit) return; // běžný pravý klik mimo roh (nebo bez Shiftu) — normální chování prohlížeče, nic dalšího.
    event.preventDefault();
    setIsDevOverlayEnabled((enabled) => !enabled);
  }

  function restart() {
    gameRef.current = createInitialState(input);
    lastTimestampRef.current = null;
    completedRef.current = false;
    setStatus("playing");
    setAmmoLeft(gameRef.current.player.ammo);
    setWoundedMsLeft(null);
    setEnemyMode(gameRef.current.enemy.mode);
    setMissionPhase(gameRef.current.mission.phase);
    setInExitZone(false);
    setResult(null);
  }

  // Jediné místo, odkud se volá onComplete — completedRef zajistí, že se to
  // stane nejvýš jednou za běh (i kdyby tick() stihl proběhnout vícekrát
  // po nastavení výsledku, než se smyčka skutečně zastaví/status přestane
  // být "playing").
  function completeGame(gameResult: EmergencyMiniGameResult, nextStatus: MiniGameStatus) {
    if (completedRef.current) return;
    completedRef.current = true;
    gameRef.current.status = nextStatus;
    setStatus(nextStatus);
    setResult(gameResult);
    onComplete?.(gameResult);
  }

  // Mezerník je jen "pokus" — jestli se z něj stane skutečný výstřel (a co se
  // spotřebuje) rozhoduje čistě applyShot/canFireWeapon (viz logic.ts). Bez
  // brokovnice nebo bez náboje se NIC nemění: ammo, shotsUsed ani shot flash.
  function fireShot() {
    const game = gameRef.current;
    const result = applyShot({
      player: { hasShotgun: game.player.hasShotgun, ammo: game.player.ammo },
      playerPosition: game.player,
      enemy: game.enemy,
      coneAngleRad: CONE_ANGLE_RAD,
      range: CONE_RANGE,
      walls: game.walls,
      status: game.status,
      shotFlashDurationMs: SHOT_FLASH_DURATION_MS,
    });
    if (!result.fired) return;

    game.player.ammo = result.ammo;
    game.shotsUsed += result.shotsUsedDelta;
    setAmmoLeft(game.player.ammo);
    // Čistě vizuální bliknutí výseče — nezávisí na tom, jestli výstřel trefí.
    game.shotFlashRemainingMs = result.shotFlashRemainingMs;

    if (result.hit) {
      // Zásah NENÍ smrt — monstrum zůstane na místě a dočasně se omráčí
      // (viz ENEMY_STUN_DURATION_MS), hra dál běží (status zůstává "playing").
      game.enemy.stunRemainingMs = ENEMY_STUN_DURATION_MS;
      game.enemy.mode = "wounded";
    }
    // Miss (i miss "za zdí"): náboj je pryč, hra dál běží, enemy nezraněn.
  }

  // "E" — dvě věci, které pro MVP dává smysl řešit explicitním stiskem (ne
  // pouhým vstupem do zóny/dotykem, ať se nic nespustí "omylem" průchodem):
  //
  // 1. Sebrání věci (collect_item, dotyk s itemem, mise ještě "outbound") —
  //    NEKONČÍ minihru, jen přepne misi do "returning" (viz
  //    completeObjective) — hráč se musí ještě vrátit do kanceláře.
  // 2. Návrat do kanceláře (game.exitZone, hráč opustil start, viz
  //    canReturnToOffice) — tohle JE jediné místo, které volá onComplete.
  //    Pro collect_item vyžaduje dokončený dílčí úkol (mission.phase ===
  //    "returning"); dokud není, E v kanceláři misi neukončí.
  function handleObjectiveKey() {
    const game = gameRef.current;
    if (game.status !== "playing") return;

    if (input.objective === "collect_item" && game.mission.phase === "outbound" && game.itemPosition) {
      const touchingItem = circlesTouch(
        game.player.x,
        game.player.y,
        game.player.radius,
        game.itemPosition.x,
        game.itemPosition.y,
        ITEM_RADIUS,
      );
      if (touchingItem) {
        game.mission = completeObjective(game.mission, {
          type: "collected_item",
          itemId: input.itemToCollect ?? "fuse",
        });
        setMissionPhase(game.mission.phase);
        return;
      }
    }

    const inExitZoneNow = circleIntersectsWall(game.player.x, game.player.y, game.player.radius, game.exitZone);
    if (inExitZoneNow && canReturnToOffice(input.objective, game.mission, game.hasLeftStartZone)) {
      game.mission = updateMissionPhase(game.mission, "completed");
      setMissionPhase(game.mission.phase);

      // "Donesl jsem baterii, ale přivedl jsem si to za sebou" (viz zadání) —
      // vyhodnotí se jen TEĎ, při skutečném návratu, z aktuálního stavu
      // enemy/player/exitZone. Nikdy nezpůsobí smrt tady ani v hlavní hře
      // instantně — app/play/page.tsx z výsledku přečte jen `intensity` a
      // dispatchne gameReducer.ts#APPLY_OFFICE_THREAT_ON_RETURN, které jen
      // posune enemyStage, nikdy sama o sobě nezabije.
      const officeThreatOnReturn = evaluateOfficeThreatOnReturn({
        enemyMode: game.enemy.mode,
        enemyPosition: { x: game.enemy.x, y: game.enemy.y },
        playerPosition: { x: game.player.x, y: game.player.y },
        officeZone: game.exitZone,
        nearPlayerRadiusPx: OFFICE_THREAT_NEAR_PLAYER_RADIUS_PX,
        nearOfficeRadiusPx: OFFICE_THREAT_NEAR_OFFICE_RADIUS_PX,
      });

      completeGame(
        createReturnedResult(game.elapsedMs, game.shotsUsed, game.mission.completedObjective, officeThreatOnReturn),
        "won",
      );
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key === " " || key === "spacebar") {
        event.preventDefault();
        fireShot();
        return;
      }
      if (key === "r") {
        event.preventDefault();
        restart();
        return;
      }
      if (key === "e") {
        event.preventDefault();
        handleObjectiveKey();
        return;
      }
      if (key === "escape") {
        onCancel?.();
        return;
      }
      if (MOVE_KEYS[key]) {
        event.preventDefault();
        heldKeysRef.current.add(key);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (MOVE_KEYS[key]) heldKeysRef.current.delete(key);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Radarová mřížka se vykreslí JEDNOU do offscreen canvasu a dál se jen
    // kopíruje (drawImage) — kreslit desítky linek znovu každý frame by byl
    // zbytečný výkonový náklad pro čistě dekorativní vrstvu (viz zadání
    // "respektuj výkon"). Velikost mřížky odpovídá SKUTEČNÉMU světu
    // zvoleného layoutu (gameRef.current.worldWidth/worldHeight), ne
    // natvrdo jedné mapě — layout se mezi mounty téhle komponenty nemění
    // (nový scénář/input vždy remountuje přes `key`, viz app/minihra/page.tsx).
    const gridCanvas = createGridCanvas(gameRef.current.worldWidth, gameRef.current.worldHeight);
    // Fog of war (viz game/minigame/playerVision.ts) se kreslí do vlastního
    // offscreen canvasu KAŽDÝ frame (obsah se mění s pozicí/směrem hráče, na
    // rozdíl od statické gridCanvas výše) — pořád stejná world-space
    // velikost, jen znovu vykreslená přes destination-out kompozici (viz
    // draw()), ať jde jednoduše přes ctx.drawImage přenést do hlavního
    // canvasu jedním voláním.
    const fogCanvas = document.createElement("canvas");
    fogCanvas.width = gameRef.current.worldWidth;
    fogCanvas.height = gameRef.current.worldHeight;

    const tick = (timestamp: number) => {
      const game = gameRef.current;
      const lastTimestamp = lastTimestampRef.current;
      // ~1 frame @60fps na první tik (ještě nemáme předchozí timestamp) — jen
      // pro deltaMs odpočtů níže (shotFlash/stun/wait/elapsed), pohyb
      // zůstává fixní na tik.
      const deltaMs = lastTimestamp === null ? 16.67 : timestamp - lastTimestamp;
      lastTimestampRef.current = timestamp;

      if (game.status === "playing") {
        game.elapsedMs += deltaMs;

        if (game.shotFlashRemainingMs > 0) {
          game.shotFlashRemainingMs = Math.max(0, game.shotFlashRemainingMs - deltaMs);
        }

        let dx = 0;
        let dy = 0;
        for (const key of heldKeysRef.current) {
          const move = MOVE_KEYS[key];
          if (!move) continue;
          dx += move.dx;
          dy += move.dy;
        }

        if (dx !== 0 || dy !== 0) {
          const length = Math.hypot(dx, dy) || 1;
          const moved = moveWithWallSliding(
            game.player.x,
            game.player.y,
            (dx / length) * game.player.speed,
            (dy / length) * game.player.speed,
            game.player.radius,
            game.walls,
            game.worldWidth,
            game.worldHeight,
          );
          game.player.x = moved.x;
          game.player.y = moved.y;
          game.player.direction = directionFromVector(dx, dy, game.player.direction);
        }

        if (!game.hasLeftStartZone) {
          if (distance(game.player.x, game.player.y, game.startX, game.startY) > START_ZONE_LEAVE_RADIUS_PX) {
            game.hasLeftStartZone = true;
          }
        }

        // Čistě pro HUD hint (viz getMissionHint) — setState bailout, mění se
        // jen při skutečném vstupu/opuštění zóny, ne 60×/s.
        setInExitZone(circleIntersectsWall(game.player.x, game.player.y, game.player.radius, game.exitZone));

        // Aktuální místnost hráče — jen pro dev lištu, počítá se jen když je
        // overlay zapnutý (běžná hra tenhle výpočet vůbec nedělá). Stejný
        // setState-bailout vzor jako výše.
        if (isDevOverlayEnabledRef.current) {
          const room = getRoomAtPoint(game.layout, { x: game.player.x, y: game.player.y });
          setCurrentRoomId(room?.id ?? null);
        }

        if (game.enemy.alive) {
          game.enemy = updateEnemyAi({
            enemy: game.enemy,
            player: { x: game.player.x, y: game.player.y },
            walls: game.walls,
            deltaMs,
            config: game.enemyAiConfig,
          });

          // Game over jen když enemy NENÍ wounded a fyzicky se dotkne hráče —
          // wounded se dotykem game over nikdy nezpůsobí (viz zadání).
          if (
            game.enemy.mode !== "wounded" &&
            circlesTouch(game.player.x, game.player.y, game.player.radius, game.enemy.x, game.enemy.y, game.enemy.radius)
          ) {
            completeGame(createDeadResult(game.elapsedMs, game.shotsUsed), "gameOver");
          }

          // Omezená viditelnost hráče (fog of war, viz
          // game/minigame/playerVision.ts) — počítá se jednou tady, ne
          // znovu v draw(); draw() i dev lišta (React state níže) čtou
          // stejnou hodnotu z gameRef.
          game.enemyVisibleToPlayer = getPlayerVisibilityAtPoint(
            {
              playerX: game.player.x,
              playerY: game.player.y,
              facingAngle: DIRECTION_ANGLES[game.player.direction],
              pointX: game.enemy.x,
              pointY: game.enemy.y,
            },
            game.walls,
            PLAYER_VISION_CONFIG,
          ).visible;
          if (isDevOverlayEnabledRef.current) {
            setIsMonsterVisibleToPlayer(game.enemyVisibleToPlayer);
          }

          setEnemyMode(game.enemy.mode);
          // Zaokrouhleno na desetiny sekundy — React re-render přeskočí,
          // dokud se zobrazená hodnota skutečně nezmění (setState se stejnou
          // hodnotou je no-op), takže tohle nezpůsobuje re-render 60×/s.
          setWoundedMsLeft(game.enemy.mode === "wounded" ? Math.ceil(game.enemy.stunRemainingMs / 100) * 100 : null);
        }
      }

      draw(ctx, game, gridCanvas, fogCanvas, input, isDevOverlayEnabledRef.current);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <div className="flex flex-col gap-3" style={{ fontFamily: "'Courier New', monospace" }}>
      {/* HUD panel — radarový styl: tmavé pozadí, tenké zelené linky, glow. */}
      <div
        className="p-3 text-xs flex flex-wrap gap-x-6 gap-y-1"
        style={{
          background: "rgba(3, 15, 8, 0.9)",
          border: "1px solid #1f6b45",
          boxShadow: "0 0 10px rgba(31,107,69,0.5), inset 0 0 12px rgba(0,0,0,0.6)",
          color: "#6fe3a0",
        }}
      >
        <div style={{ textShadow: "0 0 4px rgba(111,227,160,0.8)" }}>
          STAV:{" "}
          {status === "playing" ? "PROBÍHÁ OBCHŮZKA" : status === "won" ? "SPLNĚNO" : "MONSTRUM TĚ DOSTALO"}
        </div>
        <div style={{ textShadow: "0 0 4px rgba(111,227,160,0.8)" }}>
          {createWeaponHudLabel(gameRef.current.player.hasShotgun, ammoLeft).toUpperCase()}
        </div>
        <div style={{ color: "#3f7a58" }}>REŽIM: {MODE_LABELS[enemyMode].toUpperCase()}</div>
        {status === "playing" && (
          <div style={{ color: "#5dffa0", textShadow: "0 0 4px rgba(93,255,160,0.6)" }}>
            {getMissionHint(input.objective, input.itemToCollect, missionPhase, inExitZone)}
          </div>
        )}
        {woundedMsLeft !== null && (
          <div style={{ color: "#ff5c5c", textShadow: "0 0 4px rgba(255,92,92,0.8)" }}>
            ZRANĚNÍ: {(woundedMsLeft / 1000).toFixed(1)} s
          </div>
        )}
        <div style={{ color: "#3f7a58" }}>SYSTÉM: AKTIVNÍ · MŘÍŽKA: 1.0m</div>
        <div style={{ color: "#3f7a58" }}>WASD / šipky: pohyb · mezerník: výstřel · E: akce · R: restart</div>
      </div>

      {/* Skrytý developer overlay (viz zadání) — NENÍ v běžném HUDu, jen po
          zapnutí (Shift + pravý klik do pravého horního rohu canvasu, viz
          handleCanvasContextMenu). Čte se přímo z gameRef.current (layout/
          placement se v rámci jednoho běhu neměně, mění se jen při
          restartu, který stejně vynutí re-render). */}
      {isDevOverlayEnabled && (
        <div
          className="p-2 text-[10px] flex flex-wrap gap-x-4 gap-y-1"
          style={{ background: "rgba(3, 15, 8, 0.7)", border: "1px solid #1f6b45", color: "#4c8a6a" }}
        >
          <div style={{ color: "#6fe3a0" }}>DEV MÓD</div>
          <div>
            LAYOUT: {gameRef.current.layout.id} ({gameRef.current.layout.name})
          </div>
          <div>SEED: {gameRef.current.placement.seed}</div>
          <div>
            OBJECTIVE: {input.objective}
            {input.itemToCollect ? ` (${input.itemToCollect})` : ""}
          </div>
          <div>PHASE: {missionPhase}</div>
          <div>START: {gameRef.current.placement.playerStartSlotId}</div>
          <div>EXIT: {gameRef.current.placement.playerExitSlotId}</div>
          <div>MONSTER SPAWN: {gameRef.current.placement.monsterSpawnSlotId}</div>
          {gameRef.current.placement.objectiveSlotId && <div>OBJECTIVE SLOT: {gameRef.current.placement.objectiveSlotId}</div>}
          <div>ROOM: {currentRoomId ?? "?"}</div>
          <div>
            VISION: {MINIGAME_PLAYER_VISION_ANGLE_DEG}° / peripheral {MINIGAME_PLAYER_PERIPHERAL_VISION_RANGE_PX}px / directional{" "}
            {MINIGAME_PLAYER_DIRECTIONAL_VISION_RANGE_PX}px
          </div>
          <div>MONSTER VISIBLE: {isMonsterVisibleToPlayer ? "YES" : "NO"}</div>
        </div>
      )}

      {/* Rámeček herní plochy — zelený obrys + rohové radar značky + scanline overlay. */}
      <div
        className="relative w-full"
        style={{
          border: "1px solid #1f6b45",
          background: "#020a05",
          boxShadow: "0 0 16px rgba(31,107,69,0.35)",
          padding: "10px",
        }}
      >
        {(["tl", "tr", "bl", "br"] as const).map((corner) => (
          <CornerTick key={corner} corner={corner} />
        ))}

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-auto block"
            style={{ maxWidth: `${CANVAS_WIDTH}px` }}
            onContextMenu={handleCanvasContextMenu}
          />

          {/* Jemný scanline efekt přes canvas — čistě CSS, žádný extra draw call. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 3px)",
              mixBlendMode: "multiply",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)",
            }}
          />

          {status !== "playing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75">
              <div
                className="p-6 text-center"
                style={{
                  background: "rgba(3, 15, 8, 0.92)",
                  border: `1px solid ${status === "won" ? "#1f6b45" : "#7a1f1f"}`,
                  boxShadow: `0 0 18px ${status === "won" ? "rgba(31,107,69,0.6)" : "rgba(220,38,38,0.55)"}`,
                }}
              >
                {status === "won" ? (
                  <>
                    <div className="text-sm font-bold mb-1" style={{ color: "#5dffa0", textShadow: "0 0 8px rgba(93,255,160,0.7)" }}>
                      OBJECTIVE SPLNĚNO.
                    </div>
                    <div className="text-xs mb-3" style={{ color: "#6fe3a0" }}>
                      {result?.outcome === "returned" &&
                        (result.completedObjective?.type === "collected_item"
                          ? `Sebráno: ${ITEM_LABELS_NOMINATIVE[result.completedObjective.itemId]}. Vrátil ses do kanceláře.`
                          : "Vrátil ses do kanceláře.")}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-bold mb-3" style={{ color: "#ff5c5c", textShadow: "0 0 8px rgba(255,92,92,0.8)" }}>
                    MONSTRUM TĚ DOSTALO.
                  </div>
                )}
                <div className="text-xs" style={{ color: "#6fe3a0" }}>
                  R — restart
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Malá "L" značka v rohu rámečku — radarový/HUD detail, čistě dekorativní.
function CornerTick({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const size = 14;
  const style: CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    borderColor: "#3fe08a",
    ...(corner === "tl" && { top: 2, left: 2, borderTop: "2px solid", borderLeft: "2px solid" }),
    ...(corner === "tr" && { top: 2, right: 2, borderTop: "2px solid", borderRight: "2px solid" }),
    ...(corner === "bl" && { bottom: 2, left: 2, borderBottom: "2px solid", borderLeft: "2px solid" }),
    ...(corner === "br" && { bottom: 2, right: 2, borderBottom: "2px solid", borderRight: "2px solid" }),
  };
  return <div style={style} aria-hidden="true" />;
}

// Offscreen canvas s jemnou radarovou mřížkou (menší linky po 20px, větší po
// 100px, velmi nízká opacity) — vykreslí se jednou při mountu, pak se každý
// frame jen zkopíruje (viz tick() výše). Velikost/rozestupy jsou ve WORLD
// prostoru zvoleného layoutu (worldWidth/worldHeight, ne fyzická
// CANVAS_WIDTH/HEIGHT) — draw() ho kopíruje pod stejným ctx.scale(game.scale)
// jako zbytek scény, ať mřížka pokryje celou (libovolně velkou) mapu, ne jen
// její levý horní roh.
function createGridCanvas(worldWidth: number, worldHeight: number): HTMLCanvasElement {
  const gridCanvas = document.createElement("canvas");
  gridCanvas.width = worldWidth;
  gridCanvas.height = worldHeight;
  const gridCtx = gridCanvas.getContext("2d");
  if (!gridCtx) return gridCanvas;

  gridCtx.strokeStyle = "rgba(46, 143, 92, 0.08)";
  gridCtx.lineWidth = 1;
  for (let x = 0; x <= worldWidth; x += 20) {
    gridCtx.beginPath();
    gridCtx.moveTo(x + 0.5, 0);
    gridCtx.lineTo(x + 0.5, worldHeight);
    gridCtx.stroke();
  }
  for (let y = 0; y <= worldHeight; y += 20) {
    gridCtx.beginPath();
    gridCtx.moveTo(0, y + 0.5);
    gridCtx.lineTo(worldWidth, y + 0.5);
    gridCtx.stroke();
  }

  gridCtx.strokeStyle = "rgba(46, 143, 92, 0.18)";
  for (let x = 0; x <= worldWidth; x += 100) {
    gridCtx.beginPath();
    gridCtx.moveTo(x + 0.5, 0);
    gridCtx.lineTo(x + 0.5, worldHeight);
    gridCtx.stroke();
  }
  for (let y = 0; y <= worldHeight; y += 100) {
    gridCtx.beginPath();
    gridCtx.moveTo(0, y + 0.5);
    gridCtx.lineTo(worldWidth, y + 0.5);
    gridCtx.stroke();
  }

  return gridCanvas;
}

function draw(
  ctx: CanvasRenderingContext2D,
  game: MiniGameRefState,
  gridCanvas: HTMLCanvasElement,
  fogCanvas: HTMLCanvasElement,
  input: EmergencyMiniGameInput,
  devOverlayEnabled: boolean,
) {
  const { player, enemy, status } = game;
  const facing = DIRECTION_ANGLES[player.direction];
  // Dev overlay ignoruje fog úplně (ladicí režim má vidět celou mapu, viz
  // zadání) — běžný hráč (devOverlayEnabled === false) vidí jen to, co je
  // ve viditelnosti (game.enemyVisibleToPlayer, itemVisible níže).
  const enemyVisible = devOverlayEnabled || game.enemyVisibleToPlayer;
  const itemVisible =
    devOverlayEnabled ||
    (game.itemPosition !== undefined &&
      getPlayerVisibilityAtPoint(
        { playerX: player.x, playerY: player.y, facingAngle: facing, pointX: game.itemPosition.x, pointY: game.itemPosition.y },
        game.walls,
        PLAYER_VISION_CONFIG,
      ).visible);

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Pozadí — velmi tmavá zelenočerná, ne plochá šedá. Vyplňuje se ve fyzickém
  // pixelovém prostoru canvasu (PŘED ctx.scale níže), ať pokryje celou plochu
  // beze zbytku.
  ctx.fillStyle = "#020a05";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Jediné místo, kde se world → screen měřítko aplikuje (viz
  // computeMiniGameWorldScale v config.ts, game.scale) — od teď je celý
  // zbytek draw() v souřadnicích herního světa (stejných, v jakých žije
  // player/enemy/game.walls), canvas je ale fyzicky pořád CANVAS_WIDTH×CANVAS_HEIGHT.
  ctx.save();
  ctx.scale(game.scale, game.scale);

  ctx.drawImage(gridCanvas, 0, 0);

  // Obrysy místností + popisky hlavních zón (viz zadání "vizuální/design
  // pass" — mapa má na první pohled číst jako půdorys/evakuační plán, ne
  // jen aréna se zdmi) — VŽDY vidět, ne jen v dev overlayi. Chodby (kind
  // "corridor"/"service") dostanou jemně odlišný nádech, ať jsou hlavní
  // trasy vizuálně čitelné; popisek (getMiniGameRoomDisplayLabel) se
  // zobrazí jen pro "identifikující" druhy místností (viz
  // shouldShowRoomLabelByDefault v game/minigame/mapVisuals.ts) — layoutId/
  // seed/slot id zůstávají výhradně v dev overlayi (viz níže), jméno
  // místnosti na mapě je záměrně považováno za herně/atmosférický obsah,
  // ne debug údaj.
  ctx.save();
  for (const room of game.layout.rooms) {
    const { x, y, width, height } = room.bounds;
    const isCorridor = room.kind === "corridor" || room.kind === "service";
    ctx.fillStyle = isCorridor ? "rgba(63, 224, 138, 0.035)" : "rgba(63, 224, 138, 0.015)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgba(63, 224, 138, 0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, width - 1), Math.max(0, height - 1));

    if (shouldShowRoomLabelByDefault(room.kind)) {
      ctx.fillStyle = "rgba(163, 255, 200, 0.4)";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(getMiniGameRoomDisplayLabel(room), x + 10, y + 10);
    }
  }
  ctx.restore();

  // Zdi/regály/stroje/překážky — styl podle MiniGameLayoutWall.kind (viz
  // getMiniGameWallRenderStyle) — "wall"/"door_block" zůstávají klasická
  // zeď (beze změny oproti dřívějšku), "shelf" dostane vnitřní příčky
  // (police), "machine" vnitřní panel (rozvaděč), "obstacle" je menší,
  // tlumenější blok bez glow (bedna/stůl, ne strukturální zeď).
  ctx.save();
  for (const wall of game.walls) {
    const style = getMiniGameWallRenderStyle(wall);

    if (style === "shelf") {
      ctx.shadowColor = "rgba(63, 224, 138, 0.85)";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "rgba(6, 26, 16, 0.9)";
      ctx.strokeStyle = "#3fe08a";
      ctx.lineWidth = 2;
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(63, 224, 138, 0.5)";
      ctx.lineWidth = 1;
      const slatCount = Math.max(2, Math.round(wall.width / 40));
      for (let i = 1; i < slatCount; i++) {
        const slatX = wall.x + (wall.width / slatCount) * i;
        ctx.beginPath();
        ctx.moveTo(slatX, wall.y + 2);
        ctx.lineTo(slatX, wall.y + wall.height - 2);
        ctx.stroke();
      }
    } else if (style === "machine") {
      ctx.shadowColor = "rgba(63, 224, 138, 0.85)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(10, 34, 20, 0.95)";
      ctx.strokeStyle = "#3fe08a";
      ctx.lineWidth = 2;
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(93, 255, 160, 0.55)";
      ctx.lineWidth = 1;
      const inset = 6;
      ctx.strokeRect(wall.x + inset, wall.y + inset, Math.max(0, wall.width - inset * 2), Math.max(0, wall.height - inset * 2));
    } else if (style === "obstacle") {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(20, 40, 12, 0.85)";
      ctx.strokeStyle = "rgba(163, 255, 130, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    } else {
      // "wall" i "door_block" — klasická zeď, beze změny oproti dřívějšku.
      ctx.shadowColor = "rgba(63, 224, 138, 0.85)";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(6, 26, 16, 0.9)";
      ctx.strokeStyle = "#3fe08a";
      ctx.lineWidth = 2;
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();

  // Kancelářský marker (exit zóna) — orientační bod pro návrat, VŽDY vidět
  // bez ohledu na objective (viz zadání "hráč hned po startu ví, kam se má
  // vrátit"), ne jen pro return_to_office jako dřív. Text/zvýraznění řídí
  // čisté helpery getOfficeMarkerLabel/shouldHighlightOfficeMarker (viz
  // game/minigame/logic.ts) — čistě vizuální, NEMĚNÍ pravidla dokončení mise
  // (ta žije jen v canReturnToOffice/handleObjectiveKey).
  {
    const inExitZoneNow = circleIntersectsWall(player.x, player.y, player.radius, game.exitZone);
    const officeHighlighted =
      shouldHighlightOfficeMarker(game.mission, input.objective) ||
      (input.objective === "return_to_office" && game.hasLeftStartZone);
    const officeLabel = getOfficeMarkerLabel(game.mission, input.objective, inExitZoneNow, game.hasLeftStartZone);

    ctx.save();
    ctx.fillStyle = officeHighlighted ? "rgba(93, 255, 160, 0.14)" : "rgba(93, 255, 160, 0.05)";
    ctx.fillRect(game.exitZone.x, game.exitZone.y, game.exitZone.width, game.exitZone.height);

    ctx.shadowColor = "rgba(93, 255, 160, 0.85)";
    ctx.shadowBlur = officeHighlighted ? 10 : 4;
    ctx.strokeStyle = officeHighlighted ? "rgba(93, 255, 160, 0.85)" : "rgba(93, 255, 160, 0.35)";
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.strokeRect(game.exitZone.x, game.exitZone.y, game.exitZone.width, game.exitZone.height);
    ctx.setLineDash([]);

    // Rohové značky (stejný radarový detail jako rámeček canvasu, viz
    // CornerTick v JSX níže) — plné linky přes rohy, ať zóna čte jasně jako
    // "cíl" i bez zaostření na celý (přerušovaný) obrys.
    const tick = 10;
    ctx.lineWidth = 2;
    ctx.strokeStyle = officeHighlighted ? "rgba(163, 255, 200, 0.95)" : "rgba(163, 255, 200, 0.5)";
    const corners: Array<[number, number, number, number]> = [
      [game.exitZone.x, game.exitZone.y, 1, 1],
      [game.exitZone.x + game.exitZone.width, game.exitZone.y, -1, 1],
      [game.exitZone.x, game.exitZone.y + game.exitZone.height, 1, -1],
      [game.exitZone.x + game.exitZone.width, game.exitZone.y + game.exitZone.height, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + tick * dx, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + tick * dy);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = officeHighlighted ? "rgba(163, 255, 200, 0.95)" : "rgba(93, 255, 160, 0.6)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(officeLabel, game.exitZone.x + game.exitZone.width / 2, game.exitZone.y - 6);
    ctx.restore();
  }

  // Item marker — jen "collect_item", dokud věc není sebraná (viz mission.phase),
  // a jen ve viditelnosti hráče (fog, viz zadání "item samotný kresli až ve
  // viditelnosti") — dev overlay ho ukáže vždycky (itemVisible výše).
  if (input.objective === "collect_item" && game.mission.phase === "outbound" && game.itemPosition && itemVisible) {
    const itemPosition = game.itemPosition;
    ctx.save();
    ctx.shadowColor = "rgba(250, 204, 21, 0.9)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(itemPosition.x, itemPosition.y, ITEM_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(250, 204, 21, 0.9)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${ITEM_LABELS_NOMINATIVE[input.itemToCollect ?? "fuse"].toUpperCase()} (E)`, itemPosition.x, itemPosition.y - 16);
    ctx.restore();
  }

  // Výseč vidění nepřítele — samostatná od hráčovy, červená/oranžová,
  // omezená zdmi jednoduchým raycastingem (viz castVisionCone). Wounded
  // nic nevyhodnocuje, takže se nevykresluje vůbec. Mimo viditelnost hráče
  // (fog, viz enemyVisible výše) se nekreslí vůbec — hlavní hororový efekt
  // fogu (monstrum, které hráč nevidí, se nesmí prozradit vlastní výsečí).
  if (enemy.alive && enemy.mode !== "wounded" && enemyVisible) {
    const points = castVisionCone({
      originX: enemy.x,
      originY: enemy.y,
      facingAngle: enemy.visionAngle,
      coneAngleRad: ENEMY_VISION_ANGLE_RAD,
      range: ENEMY_VISION_RANGE,
      walls: game.walls,
      rayCount: ENEMY_VISION_RAY_COUNT,
      stepPx: ENEMY_VISION_RAY_STEP_PX,
    });

    const waitingPulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
    const fillAlpha = enemy.mode === "chasing" ? 0.22 : enemy.mode === "waiting" ? 0.1 + waitingPulse * 0.06 : 0.09;

    ctx.save();
    ctx.fillStyle = `rgba(239, 68, 68, ${fillAlpha})`;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    for (const point of points) ctx.lineTo(point.x, point.y);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = "rgba(239, 68, 68, 0.7)";
    ctx.shadowBlur = enemy.mode === "chasing" ? 10 : 4;
    ctx.strokeStyle = enemy.mode === "chasing" ? "rgba(248, 113, 113, 0.65)" : "rgba(239, 68, 68, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Výseč vidění/zásahu hráče — poloprůhledný radarový kužel + jasnější
  // oblouk na konci dosahu. Stejný výpočet (facing/CONE_ANGLE_RAD/CONE_RANGE)
  // jako dřív, mění se jen kreslení. Krátké bliknutí po výstřelu
  // (shotFlashRemainingMs, viz fireShot) je čistě vizuální — nemění dosah
  // ani úhel, jen dočasně zesvětlí výplň/glow. Bez brokovnice (hasShotgun
  // false) je to jen "směr pohledu", ne "dostřel" — slabší výplň/obrys, žádná
  // bojová konotace (shot flash se navíc bez brokovnice nikdy nespustí, viz
  // fireShot/applyShot).
  const coneStart = facing - CONE_ANGLE_RAD / 2;
  const coneEnd = facing + CONE_ANGLE_RAD / 2;
  const isFlashing = game.shotFlashRemainingMs > 0;
  const hasShotgun = player.hasShotgun;

  ctx.save();
  ctx.fillStyle = status === "gameOver"
    ? "rgba(220, 38, 38, 0.16)"
    : isFlashing
      ? "rgba(232, 255, 238, 0.55)"
      : hasShotgun
        ? "rgba(120, 235, 130, 0.14)"
        : "rgba(120, 235, 130, 0.05)";
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.arc(player.x, player.y, CONE_RANGE, coneStart, coneEnd);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = isFlashing ? "rgba(255, 255, 255, 0.95)" : "rgba(163, 255, 130, 0.8)";
  ctx.shadowBlur = isFlashing ? 16 : hasShotgun ? 6 : 2;
  ctx.strokeStyle = isFlashing ? "rgba(255, 255, 255, 0.9)" : hasShotgun ? "rgba(163, 255, 130, 0.55)" : "rgba(163, 255, 130, 0.25)";
  ctx.lineWidth = isFlashing ? 2.5 : hasShotgun ? 1.5 : 1;
  ctx.beginPath();
  ctx.arc(player.x, player.y, CONE_RANGE, coneStart, coneEnd);
  ctx.stroke();
  ctx.restore();

  // Nepřítel — červený radarový bod, glow/barva podle módu: investigating
  // normální, waiting lehce pulzuje, chasing silnější a pulzující, wounded
  // bliká bílá/tmavě červená + pulzující prstenec (jasně vyřazený, ne mrtvý).
  // Celý blok (bod i prstenec) je mimo viditelnost hráče (fog) skrytý úplně
  // — to je hlavní hororový efekt fogu (viz zadání "monster mimo viditelnost
  // nesmí být normálně vidět"), dev overlay ho vždycky ukáže (enemyVisible výše).
  if (enemyVisible) {
    ctx.save();
    ctx.shadowColor = enemy.mode === "wounded" ? "rgba(255, 255, 255, 0.9)" : "rgba(220, 38, 38, 0.9)";
    if (!enemy.alive) {
      ctx.shadowBlur = 4;
      ctx.fillStyle = "#4b5563";
    } else if (enemy.mode === "wounded") {
      ctx.shadowBlur = 16;
      ctx.fillStyle = (performance.now() / 180) % 2 < 1 ? "#ffffff" : "#7a1f1f";
    } else if (enemy.mode === "investigating") {
      ctx.shadowBlur = 6;
      ctx.fillStyle = "#ef4444";
    } else if (enemy.mode === "waiting") {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
      ctx.shadowBlur = 6 + pulse * 4;
      ctx.fillStyle = "#ef4444";
    } else {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 100);
      ctx.shadowBlur = 16 + pulse * 10;
      ctx.fillStyle = "#ef4444";
    }
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (enemy.alive && enemy.mode === "wounded") {
      // Pulzující prstenec navíc kolem omráčeného nepřítele — ať je i na
      // dálku jasné, že je dočasně vyřazený, ne jen "trochu blikající".
      const ringPulse = 0.5 + 0.5 * Math.sin(performance.now() / 220);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + ringPulse * 0.35})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 6 + ringPulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Hráč — světlý zelenobílý bod s glow + malý směrník podle direction.
  ctx.save();
  ctx.shadowColor = "rgba(200, 255, 220, 0.9)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#d9ffe8";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3fe08a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x + Math.cos(facing) * player.radius, player.y + Math.sin(facing) * player.radius);
  ctx.lineTo(player.x + Math.cos(facing) * (player.radius + 10), player.y + Math.sin(facing) * (player.radius + 10));
  ctx.stroke();
  ctx.restore();

  // Fog of war (viz zadání, game/minigame/playerVision.ts) — hráč vidí jen
  // periferní kruh (MINIGAME_PLAYER_PERIPHERAL_VISION_RANGE_PX, všechny
  // směry) a směrovou výseč před sebou (MINIGAME_PLAYER_DIRECTIONAL_VISION_RANGE_PX,
  // MINIGAME_PLAYER_VISION_ANGLE_RAD) — obojí omezené zdmi STEJNÝM
  // raycastingem (castVisionCone) jako nepřítelova výseč výše, ne vlastní
  // přepsaná verze. Vykreslí se do samostatného offscreen fogCanvasu (tmavá
  // výplň, pak "destination-out" vyříznutí viditelných tvarů), teprve pak
  // jedním drawImage přenese na hlavní canvas — nutné, protože kdyby se
  // "destination-out" použilo přímo na už vykreslenou scénu, smazalo by i
  // samotnou scénu pod sebou, ne jen tmavou vrstvu navrch. Dev overlay fog
  // úplně přeskočí (ladicí režim vidí celou mapu, viz zadání).
  if (!devOverlayEnabled) {
    const fogCtx = fogCanvas.getContext("2d");
    if (fogCtx) {
      fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
      fogCtx.fillStyle = "rgba(2, 8, 4, 0.94)";
      fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

      fogCtx.globalCompositeOperation = "destination-out";
      // Měkký okraj zdarma — canvas 2D filter blur na vyříznuté tvary (viz
      // zadání "měkký okraj, pokud to jde jednoduše"), ne vlastní gradient
      // matematika navíc.
      fogCtx.filter = "blur(10px)";

      const peripheralPoints = castVisionCone({
        originX: player.x,
        originY: player.y,
        facingAngle: 0,
        coneAngleRad: Math.PI * 2,
        range: MINIGAME_PLAYER_PERIPHERAL_VISION_RANGE_PX,
        walls: game.walls,
        rayCount: MINIGAME_PLAYER_VISION_RAY_COUNT,
        stepPx: MINIGAME_PLAYER_VISION_RAY_STEP_PX,
      });
      fogCtx.beginPath();
      fogCtx.moveTo(peripheralPoints[0].x, peripheralPoints[0].y);
      for (const p of peripheralPoints) fogCtx.lineTo(p.x, p.y);
      fogCtx.closePath();
      fogCtx.fill();

      const directionalPoints = castVisionCone({
        originX: player.x,
        originY: player.y,
        facingAngle: facing,
        coneAngleRad: MINIGAME_PLAYER_VISION_ANGLE_RAD,
        range: MINIGAME_PLAYER_DIRECTIONAL_VISION_RANGE_PX,
        walls: game.walls,
        rayCount: MINIGAME_PLAYER_VISION_RAY_COUNT,
        stepPx: MINIGAME_PLAYER_VISION_RAY_STEP_PX,
      });
      fogCtx.beginPath();
      fogCtx.moveTo(player.x, player.y);
      for (const p of directionalPoints) fogCtx.lineTo(p.x, p.y);
      fogCtx.closePath();
      fogCtx.fill();

      fogCtx.filter = "none";
      fogCtx.globalCompositeOperation = "source-over";
    }
    ctx.drawImage(fogCanvas, 0, 0);
  }

  // Skrytý developer overlay (viz zadání, devOverlay.ts) — kreslí se JAKO
  // POSLEDNÍ (přes všechno ostatní), ať jsou room obrysy/sloty vždy vidět
  // navrch. Běžný hráč tohle nikdy neuvidí (devOverlayEnabled je false, dokud
  // se skrytě nezapne, viz EmergencyMiniGame#handleCanvasContextMenu).
  if (devOverlayEnabled) {
    // Obrysy místností + malé id/name — jen orientační, nic víc (viz zadání
    // "pokud je to jednoduché" — bounds jsou obyčejné obdélníky, snadné).
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.font = "9px monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (const room of game.layout.rooms) {
      const { x, y, width, height } = room.bounds;
      ctx.strokeRect(x, y, width, height);
      ctx.fillText(`${room.id}`, x + 4, y + 3);
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Sloty jako písmena (viz getMiniGameSlotDebugLabel) — vybrané sloty pro
    // TENHLE run (viz getSelectedSlotIds) výrazně odlišené od ostatních.
    const selectedSlotIds = getSelectedSlotIds(game.placement);
    ctx.save();
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const slot of game.layout.slots) {
      const isSelected = selectedSlotIds.has(slot.id);
      const label = getMiniGameSlotDebugLabel(slot);
      const radius = isSelected ? 9 : 6;

      ctx.globalAlpha = isSelected ? 0.4 : 0.18;
      ctx.fillStyle = isSelected ? "#ffe066" : "#ffffff";
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.shadowColor = isSelected ? "rgba(255, 224, 102, 0.9)" : "transparent";
      ctx.shadowBlur = isSelected ? 6 : 0;
      ctx.fillStyle = isSelected ? "#ffe066" : "rgba(255, 255, 255, 0.85)";
      ctx.fillText(label, slot.x, slot.y);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // Konec world→screen měřítka nastaveného výše (ctx.scale(game.scale, ...)).
  ctx.restore();
}
