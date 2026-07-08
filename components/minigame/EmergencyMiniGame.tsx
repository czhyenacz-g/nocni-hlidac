"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
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
  EXIT_ZONE,
  INVESTIGATION_ARRIVAL_RADIUS_PX,
  INVESTIGATION_CLOSE_DISTANCE_THRESHOLD_PX,
  INVESTIGATION_MAX_ATTEMPTS,
  INVESTIGATION_NOISE_CLOSE_PX,
  INVESTIGATION_NOISE_FAR_PX,
  ITEM_RADIUS,
  ITEM_SPAWN_POSITION,
  MINIGAME_WORLD_SCALE,
  SHOT_FLASH_DURATION_MS,
  START_ZONE_LEAVE_RADIUS_PX,
  STUCK_CHECK_INTERVAL_MS,
  STUCK_MOVE_THRESHOLD_PX,
  STUCK_TIMEOUT_MS,
  WALLS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
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
  moveWithWallSliding,
  resolveEquipmentFromInput,
  updateEnemyAi,
  updateMissionPhase,
} from "@/game/minigame/logic";

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
  /** Objective "return_to_office": true, jakmile hráč aspoň jednou opustí okolí startu — EXIT_ZONE se počítá až pak (viz zadání "ne hned na startu"). */
  hasLeftStartZone: boolean;
  /** Základní smyčka mise (viz game/minigame/logic.ts#completeObjective/canReturnToOffice) — nahrazuje dřívější jednoduché `itemCollected: boolean`: sebrání věci je jen mezistav ("returning"), ne konec minihry. */
  mission: EmergencyMissionState;
  /** Hráčova startovní pozice (viz hasLeftStartZone) — uložená při vytvoření, ne přepočítávaná z CANVAS/WORLD konstant, ať vždy odpovídá skutečnému createInitialPlayer(). */
  startX: number;
  startY: number;
}

function createInitialState(input: EmergencyMiniGameInput): MiniGameRefState {
  const equipment = resolveEquipmentFromInput(input);
  const player = createInitialPlayer(equipment);
  const enemy = createInitialEnemy(player);
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
  };
}

const ITEM_LABELS_ACCUSATIVE: Record<MiniGameItemId, string> = {
  fuse: "pojistku",
  bulb: "žárovku",
  key: "klíč",
  toolbox: "nářadí",
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

// Statická konfigurace AI (viz game/minigame/logic.ts#updateEnemyAi) — složená
// jednou z config.ts konstant, ne přepočítávaná každý tik.
const ENEMY_AI_CONFIG: EnemyAiConfig = {
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
  mapWidth: WORLD_WIDTH,
  mapHeight: WORLD_HEIGHT,
  stuckCheckIntervalMs: STUCK_CHECK_INTERVAL_MS,
  stuckMoveThresholdPx: STUCK_MOVE_THRESHOLD_PX,
  stuckTimeoutMs: STUCK_TIMEOUT_MS,
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
      walls: WALLS,
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
  // 2. Návrat do kanceláře (EXIT_ZONE, hráč opustil start, viz
  //    canReturnToOffice) — tohle JE jediné místo, které volá onComplete.
  //    Pro collect_item vyžaduje dokončený dílčí úkol (mission.phase ===
  //    "returning"); dokud není, E v kanceláři misi neukončí.
  function handleObjectiveKey() {
    const game = gameRef.current;
    if (game.status !== "playing") return;

    if (input.objective === "collect_item" && game.mission.phase === "outbound") {
      const touchingItem = circlesTouch(
        game.player.x,
        game.player.y,
        game.player.radius,
        ITEM_SPAWN_POSITION.x,
        ITEM_SPAWN_POSITION.y,
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

    const inExitZoneNow = circleIntersectsWall(game.player.x, game.player.y, game.player.radius, EXIT_ZONE);
    if (inExitZoneNow && canReturnToOffice(input.objective, game.mission, game.hasLeftStartZone)) {
      game.mission = updateMissionPhase(game.mission, "completed");
      setMissionPhase(game.mission.phase);
      completeGame(createReturnedResult(game.elapsedMs, game.shotsUsed, game.mission.completedObjective), "won");
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
    // "respektuj výkon").
    const gridCanvas = createGridCanvas();

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
            WALLS,
            WORLD_WIDTH,
            WORLD_HEIGHT,
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
        setInExitZone(circleIntersectsWall(game.player.x, game.player.y, game.player.radius, EXIT_ZONE));

        if (game.enemy.alive) {
          game.enemy = updateEnemyAi({
            enemy: game.enemy,
            player: { x: game.player.x, y: game.player.y },
            walls: WALLS,
            deltaMs,
            config: ENEMY_AI_CONFIG,
          });

          // Game over jen když enemy NENÍ wounded a fyzicky se dotkne hráče —
          // wounded se dotykem game over nikdy nezpůsobí (viz zadání).
          if (
            game.enemy.mode !== "wounded" &&
            circlesTouch(game.player.x, game.player.y, game.player.radius, game.enemy.x, game.enemy.y, game.enemy.radius)
          ) {
            completeGame(createDeadResult(game.elapsedMs, game.shotsUsed), "gameOver");
          }

          setEnemyMode(game.enemy.mode);
          // Zaokrouhleno na desetiny sekundy — React re-render přeskočí,
          // dokud se zobrazená hodnota skutečně nezmění (setState se stejnou
          // hodnotou je no-op), takže tohle nezpůsobuje re-render 60×/s.
          setWoundedMsLeft(game.enemy.mode === "wounded" ? Math.ceil(game.enemy.stunRemainingMs / 100) * 100 : null);
        }
      }

      draw(ctx, game, gridCanvas, input);
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
                          ? `Sebráno: ${result.completedObjective.itemId}. Vrátil ses do kanceláře.`
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
// prostoru (WORLD_WIDTH/HEIGHT, ne fyzická CANVAS_WIDTH/HEIGHT) — draw() ho
// kopíruje pod stejným ctx.scale(MINIGAME_WORLD_SCALE) jako zbytek scény, ať
// mřížka pokryje celou (větší) mapu, ne jen její levý horní roh.
function createGridCanvas(): HTMLCanvasElement {
  const gridCanvas = document.createElement("canvas");
  gridCanvas.width = WORLD_WIDTH;
  gridCanvas.height = WORLD_HEIGHT;
  const gridCtx = gridCanvas.getContext("2d");
  if (!gridCtx) return gridCanvas;

  gridCtx.strokeStyle = "rgba(46, 143, 92, 0.08)";
  gridCtx.lineWidth = 1;
  for (let x = 0; x <= WORLD_WIDTH; x += 20) {
    gridCtx.beginPath();
    gridCtx.moveTo(x + 0.5, 0);
    gridCtx.lineTo(x + 0.5, WORLD_HEIGHT);
    gridCtx.stroke();
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += 20) {
    gridCtx.beginPath();
    gridCtx.moveTo(0, y + 0.5);
    gridCtx.lineTo(WORLD_WIDTH, y + 0.5);
    gridCtx.stroke();
  }

  gridCtx.strokeStyle = "rgba(46, 143, 92, 0.18)";
  for (let x = 0; x <= WORLD_WIDTH; x += 100) {
    gridCtx.beginPath();
    gridCtx.moveTo(x + 0.5, 0);
    gridCtx.lineTo(x + 0.5, WORLD_HEIGHT);
    gridCtx.stroke();
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += 100) {
    gridCtx.beginPath();
    gridCtx.moveTo(0, y + 0.5);
    gridCtx.lineTo(WORLD_WIDTH, y + 0.5);
    gridCtx.stroke();
  }

  return gridCanvas;
}

function draw(ctx: CanvasRenderingContext2D, game: MiniGameRefState, gridCanvas: HTMLCanvasElement, input: EmergencyMiniGameInput) {
  const { player, enemy, status } = game;

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Pozadí — velmi tmavá zelenočerná, ne plochá šedá. Vyplňuje se ve fyzickém
  // pixelovém prostoru canvasu (PŘED ctx.scale níže), ať pokryje celou plochu
  // beze zbytku.
  ctx.fillStyle = "#020a05";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Jediné místo, kde se world → screen měřítko aplikuje (viz
  // MINIGAME_WORLD_SCALE/WORLD_WIDTH/WORLD_HEIGHT v config.ts) — od teď je
  // celý zbytek draw() v souřadnicích herního světa (stejných, v jakých žije
  // player/enemy/WALLS), canvas je ale fyzicky pořád CANVAS_WIDTH×CANVAS_HEIGHT.
  ctx.save();
  ctx.scale(MINIGAME_WORLD_SCALE, MINIGAME_WORLD_SCALE);

  ctx.drawImage(gridCanvas, 0, 0);

  // Zdi — tmavá výplň + zelený neonový obrys s glow, ať jasně čnějí z gridu.
  ctx.save();
  ctx.shadowColor = "rgba(63, 224, 138, 0.85)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "rgba(6, 26, 16, 0.9)";
  ctx.strokeStyle = "#3fe08a";
  ctx.lineWidth = 2;
  for (const wall of WALLS) {
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
  }
  ctx.restore();

  // Objective marker — exit zóna ("return_to_office") nebo item ("collect_item").
  if (input.objective === "return_to_office") {
    ctx.save();
    ctx.strokeStyle = game.hasLeftStartZone ? "rgba(93, 255, 160, 0.8)" : "rgba(93, 255, 160, 0.3)";
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.strokeRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.width, EXIT_ZONE.height);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(93, 255, 160, 0.85)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("KANCELÁŘ (E)", EXIT_ZONE.x + EXIT_ZONE.width / 2, EXIT_ZONE.y - 6);
    ctx.restore();
  } else if (input.objective === "collect_item" && game.mission.phase === "outbound") {
    ctx.save();
    ctx.shadowColor = "rgba(250, 204, 21, 0.9)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(ITEM_SPAWN_POSITION.x, ITEM_SPAWN_POSITION.y, ITEM_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(250, 204, 21, 0.9)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${input.itemToCollect ?? "item"} (E)`, ITEM_SPAWN_POSITION.x, ITEM_SPAWN_POSITION.y - 16);
    ctx.restore();
  }

  // Výseč vidění nepřítele — samostatná od hráčovy, červená/oranžová,
  // omezená zdmi jednoduchým raycastingem (viz castVisionCone). Wounded
  // nic nevyhodnocuje, takže se nevykresluje vůbec.
  if (enemy.alive && enemy.mode !== "wounded") {
    const points = castVisionCone({
      originX: enemy.x,
      originY: enemy.y,
      facingAngle: enemy.visionAngle,
      coneAngleRad: ENEMY_VISION_ANGLE_RAD,
      range: ENEMY_VISION_RANGE,
      walls: WALLS,
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
  const facing = DIRECTION_ANGLES[player.direction];
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

  // Konec world→screen měřítka nastaveného výše (ctx.scale(MINIGAME_WORLD_SCALE, ...)).
  ctx.restore();
}
