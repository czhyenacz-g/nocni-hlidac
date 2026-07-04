import { CameraDefinition, CameraId, EnemyStage, GeneratorState, PlayerView } from "../core/types";
import {
  BACKUP_POWER_STRESS_BONUS,
  GENERATOR_RESTART_STRESS_BONUS,
  HEARTBEAT_VOLUME_MULTIPLIER,
  MIN_AMBIENT_STRESS_MULTIPLIER,
} from "../balancing/constants";

export interface ComputeHeartbeatTargetStressInput {
  playerView: PlayerView;
  /** `state.cameraOpen && state.cameraViewMode === "detail"` — overview mřížka se nikdy nepočítá. */
  isCameraDetailOpen: boolean;
  activeCameraId: CameraId | null;
  enemyStage: EnemyStage;
  doorClosed: boolean;
  cameras: CameraDefinition[];
}

/**
 * Cílová hladina stresu (0..100) podle toho, jestli hráč zrovna vidí
 * monstrum v detailu kamery — viz GAME_DESIGN.md "Stres a heartbeat". Nikdy
 * nepředpokládá konkrétní camera id napevno (levá/pravá chodba se losuje per
 * směna, viz basicIntruder.ts routeVariants) — vždy se ptá `cameras`, na
 * které kameře je monstrum skutečně vidět, stejný vzor jako
 * `isEnemyBeingWatched` v gameReducer.ts. Pro první verzi se řeší jen detail
 * kamery (`isCameraDetailOpen`) — overview mřížka cíleně stres nezvedá.
 */
export function computeHeartbeatTargetStress(input: ComputeHeartbeatTargetStressInput): number {
  const { playerView, isCameraDetailOpen, activeCameraId, enemyStage, doorClosed, cameras } = input;

  if (playerView !== "desk" || !isCameraDetailOpen || !activeCameraId) return 0;

  const camera = cameras.find((c) => c.id === activeCameraId);
  if (!camera || camera.enemyVisibleAtStage !== enemyStage) return 0;

  switch (enemyStage) {
    case "outer_yard":
      return 20;
    case "left_hallway":
    case "right_hallway":
      return 40;
    case "door_hallway":
      // Otevřené dveře + monstrum v nejbližší chodbě = nejvyšší ohrožení
      // (100). Zavřené dveře pořád signalizují stres, ale ne plnou paniku
      // (45) — heartbeat má říkat "pořád je tam", ne "zavři dveře", když už
      // zavřené jsou.
      return doorClosed ? 45 : 100;
    default:
      return 0;
  }
}

/**
 * Jednorázový (stavově řízený, ne akumulující se) bonus stresu, dokud
 * generátor rychle spotřebovává nouzovou energii — `criticalBeeping`
 * (skutečná porucha protáhlá přes reakční čas) i `restarting` (hráč omylem
 * restartoval FUNKČNÍ generátor, stejná zrychlená spotřeba jako
 * `criticalBeeping`, viz `applyPowerDelta`/`generatorExtraDrain` v
 * gameReducer.ts) mají stejně rychlé pípání i rychlý pokles energie —
 * `restarting` o to víc, že je to vlastní chyba, ne náhoda. Vrací se čerstvě
 * z `state.generatorState` každý tik, ne z uloženého "applied" flagu — dokud
 * fáze trvá, bonus zůstává stejný (nesčítá se), a jakmile skončí (restart
 * dokončen, restart směny), zmizí sám od sebe beze zvláštního resetu.
 */
export function computeGeneratorStressBonus(generatorState: GeneratorState): number {
  if (generatorState === "criticalBeeping") return BACKUP_POWER_STRESS_BONUS;
  if (generatorState === "restarting") return GENERATOR_RESTART_STRESS_BONUS;
  return 0;
}

export interface HeartbeatVolumes {
  slowVolume: number;
  fastVolume: number;
}

type CurvePoint = readonly [stress: number, volume: number];

const SLOW_VOLUME_CURVE: readonly CurvePoint[] = [
  [0, 0],
  [20, 0.1],
  [40, 0.22],
  [65, 0.42],
  [100, 0.42],
];

const FAST_VOLUME_CURVE: readonly CurvePoint[] = [
  [60, 0.35],
  [70, 0.5],
  [100, 0.7],
];

function lerpCurve(points: readonly CurvePoint[], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    if (x <= x2) {
      const t = (x - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return points[points.length - 1][1];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Crossfade mezi heartbeat_slow_reverb (nízký/střední stres) a
 * heartbeat_fast_reverb (nejvyšší stres) podle plynulé stress hodnoty
 * (0..100, ne target — viz useHeartbeatStress.ts): stress <= 60 hraje jen
 * slow, stress >= 80 hraje jen fast, 60–80 je plynulý přechod (ne tvrdé
 * cvaknutí) — viz GAME_DESIGN.md "Stres a heartbeat".
 */
export function computeHeartbeatVolumes(stress0to100: number): HeartbeatVolumes {
  const stress = clamp01(stress0to100 / 100) * 100;
  const fadeToFast = clamp01((stress - 60) / 20);
  const fadeSlow = 1 - fadeToFast;

  const slowVolume = stress <= 0 ? 0 : lerpCurve(SLOW_VOLUME_CURVE, stress) * fadeSlow;
  const fastVolume = fadeToFast <= 0 ? 0 : lerpCurve(FAST_VOLUME_CURVE, stress) * fadeToFast;

  // Playtest feedback: pořád moc tichý i po +12dB boostu souborů (viz
  // assets/audio/README.md) — o dalších ~20 % hlasitěji (HEARTBEAT_VOLUME_MULTIPLIER),
  // capnuté na 1.0, ať nepřestřelí a nezkreslí (audio.volume je 0..1).
  return {
    slowVolume: clamp01(slowVolume * HEARTBEAT_VOLUME_MULTIPLIER),
    fastVolume: clamp01(fastVolume * HEARTBEAT_VOLUME_MULTIPLIER),
  };
}

/**
 * Ambient (ambience_loop) při vyšším stresu plynule ztiší, ať heartbeat víc
 * vynikne — lineárně od 100 % (stress 0) do `MIN_AMBIENT_STRESS_MULTIPLIER`
 * (stress 100 %). Násobí se základní `AUDIO_CONFIG` hlasitostí ambience v
 * useHeartbeatStress.ts, tahle funkce jen vrací multiplikátor (0..1).
 */
export function computeAmbientStressMultiplier(stressNormalized: number): number {
  const stress = clamp01(stressNormalized);
  return 1 - stress * (1 - MIN_AMBIENT_STRESS_MULTIPLIER);
}
