import { DIFFICULTY_RULES, Difficulty } from "../difficulty/difficultyConfig";
import { MONSTER_MIN_LOCATION_STAY_MS } from "../balancing/constants";
import { isMonsterMinStayBlocking } from "./monsterMinStay";
import { isSonicCannonAffectingEnemy, isSonicCannonRunning } from "./sonicCannon";
import { CameraId, EnemyMoveDecision, EnemyStage, GameState, NightDefinition } from "./types";

export interface EnemyDebugInfo {
  stage: EnemyStage;
  route: EnemyStage[];
  /** Podle toho, jestli aktuální `route` obsahuje `left_hallway`/`right_hallway` (viz imp.ts routeVariants). */
  routeBranch: "left" | "right" | "none";
  activeCameraId: CameraId | null;
  cameraViewMode: GameState["cameraViewMode"];
  /**
   * Čistě "kdyby ses díval na tuhle kameru v detailu, viděl bys monstrum?" —
   * jen `camera.enemyVisibleAtStage === enemyStage`, nezávisle na tom, jestli
   * je hráč skutečně v detailu (viz `isBeingWatched` níže pro tenhle rozdíl).
   */
  visibleOnActiveCamera: boolean;
  /** Hráč se dívá na detail kamery, na které je monstrum vidět — čistě informativní, na movement/energii dnes nemá žádný vliv (viz sonicCannonRunning/sonicCannonAffectingEnemy níže). */
  isBeingWatched: boolean;
  /** Viz GameState.sonicCannonActive + game/core/sonicCannon.ts#isSonicCannonRunning — dělo fyzicky běží (spotřebovává energii), bez ohledu na to, jestli zrovna míří na monstrum. */
  sonicCannonRunning: boolean;
  /** Viz game/core/sonicCannon.ts#isSonicCannonAffectingEnemy — dělo běží A míří přesně na kameru, kde se monstrum nachází (tenhle tik by použil SONIC_CANNON_*_CHANCE). */
  sonicCannonAffectingEnemy: boolean;
  /** Viz game/core/monsterMinStay.ts#isMonsterMinStayBlocking — příští ENEMY_ADVANCE hod je zablokovaný minimálním pobytem v lokaci. */
  minStayBlocking: boolean;
  /** `MONSTER_MIN_LOCATION_STAY_MS[stage]`, `null` pro stage bez omezení (viz balancing/constants.ts). */
  minStayMs: number | null;
  lastDecision: EnemyMoveDecision;
  difficulty: Difficulty;
  /** rules.monster_check_or_return pro aktuální obtížnost (viz difficultyConfig.ts). */
  monsterCheckOrReturnActive: boolean;
  /** Hráč ještě musí ověřit kamerou, kam monstrum odešlo (viz gameReducer.ts TOGGLE_DOOR/OPEN_CAMERA). */
  verificationRequired: boolean;
  /** Kamera, na které by se ověření mělo stát (podle CameraDefinition.enemyVisibleAtStage === monsterRetreatedTo). */
  verificationCameraId: CameraId | null;
  /** Kdyby hráč TEĎ otevřel dveře, vrátí se monstrum okamžitě zpátky ke dveřím? */
  openingDoorWouldReturnMonster: boolean;
  doorClosed: boolean;
  lightOn: boolean;
}

/**
 * Diagnostický selector pro DebugPanel.tsx — jen čte/odvozuje z existujícího
 * GameState, nic nemění a nic nerozhoduje. Několik hodnot (routeBranch,
 * visibleOnActiveCamera, verificationCameraId, openingDoorWouldReturnMonster)
 * dnes NIKDE v `GameState` explicitně uložené nejsou — reducer si je počítá
 * ad-hoc na místě, kde je zrovna potřebuje (viz TOGGLE_DOOR/OPEN_CAMERA v
 * gameReducer.ts). Tahle funkce je jen znovu odvozuje pro zobrazení, stejnou
 * logikou, ne paralelní/odlišnou.
 */
export function buildEnemyDebugInfo(state: GameState, night: NightDefinition, difficulty: Difficulty): EnemyDebugInfo {
  const rules = DIFFICULTY_RULES[difficulty];
  const route = state.enemyRoute;
  const routeBranch = route.includes("left_hallway") ? "left" : route.includes("right_hallway") ? "right" : "none";

  const activeCamera = state.activeCameraId ? (night.cameras.find((c) => c.id === state.activeCameraId) ?? null) : null;
  const visibleOnActiveCamera = activeCamera?.enemyVisibleAtStage === state.enemyStage;
  const isBeingWatched = state.playerView === "desk" && state.cameraOpen && visibleOnActiveCamera;

  // Stejná kombinace jako gameReducer.ts requireMonsterRetreatVerification —
  // difficulty rule AND night feature flag (viz game/difficulty/nightConfig.ts),
  // ne jen samotné rules.monster_check_or_return.
  const verificationRequired =
    rules.monster_check_or_return &&
    state.nightFeatures.monsterRetreatVerificationEnabled &&
    state.monsterRetreatedTo !== null &&
    !state.monsterRetreatVerified;
  const verificationCamera =
    state.monsterRetreatedTo !== null
      ? (night.cameras.find((c) => c.enemyVisibleAtStage === state.monsterRetreatedTo) ?? null)
      : null;

  return {
    stage: state.enemyStage,
    route,
    routeBranch,
    activeCameraId: state.activeCameraId,
    cameraViewMode: state.cameraViewMode,
    visibleOnActiveCamera,
    isBeingWatched,
    sonicCannonRunning: isSonicCannonRunning(state),
    sonicCannonAffectingEnemy: isSonicCannonAffectingEnemy(state, night),
    minStayBlocking: isMonsterMinStayBlocking(state),
    minStayMs: MONSTER_MIN_LOCATION_STAY_MS[state.enemyStage] ?? null,
    lastDecision: state.lastEnemyDecision,
    difficulty,
    monsterCheckOrReturnActive: rules.monster_check_or_return,
    verificationRequired,
    verificationCameraId: verificationCamera?.id ?? null,
    // Stejná podmínka jako trestná větev v gameReducer.ts TOGGLE_DOOR.
    openingDoorWouldReturnMonster: state.doorClosed && verificationRequired,
    doorClosed: state.doorClosed,
    lightOn: state.lightOn,
  };
}
