import { GameAction } from "./gameActions";
import { createInitialGameState } from "./gameState";
import { EnemyStage, GameState, NightDefinition } from "./types";
import {
  BULB_REPLACE_DURATION_MS,
  EMERGENCY_RUN_WINDUP_DURATION_MS,
  GENERATOR_OVERLOAD_DOOR_DURATION_MS,
  GENERATOR_OVERLOAD_WINDUP_DURATION_MS,
  MAX_POWER,
  OFFICE_BREACH_REACTION_WINDOW_MS,
  OFFICE_THREAT_GRACE_HIGH_MS,
  OFFICE_THREAT_GRACE_LOW_MS,
  OFFICE_THREAT_GRACE_MEDIUM_MS,
  THINK_IT_OVER_WINDUP_DURATION_MS,
  TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS,
} from "../balancing/constants";
import { isTitanBreachIrreversible, isTitanEncounterActive } from "./titanEncounter";
import { getBlackoutPhaseIndex } from "../visuals/blackoutPhase";
import { DEFAULT_DIFFICULTY, DIFFICULTY_RULES, Difficulty } from "../difficulty/difficultyConfig";
import { computeNightScaling, NightScaling } from "../difficulty/nightScaling";
import { computeStressTimeScale } from "./stressTimeScale";
import { isNearRoomLightActive } from "./roomBulbs";
import { isOfficeBreachResolved } from "./officeBreachAftermath";
import { computePowerDrainBreakdown } from "./powerDrain";
import { canStartBatteryEmergencyRun } from "./emergencyMiniGameIntegration";
import { resolveLivesRemainingAfterDeath } from "./gameMode";
import { confirmMonsterHit } from "./monsterEnding";
import { canRequestAmmo, requestSingleAmmo } from "./shotgunEquipment";
import {
  canDebugTriggerGhoulCameraAttack,
  debugSkipActiveAttackToOffline,
  debugSkipToLastFrame,
  debugTriggerGhoulCameraAttack,
  findDisabledCameraIdForEnemyStage,
  INACTIVE_CAMERA_DAMAGE,
  isEnemyOnDisabledCameraStage,
  updateCameraDamagePhase,
} from "./cameraDamage";
import { DISABLED_CAMERA_FOOTSTEPS_COOLDOWN_MS, GHOUL_CAMERA_ATTACK_RETREAT_PAUSE_MS } from "./cameraDamageConfig";
import {
  isDoorAttackGraceActive,
  isMonsterAtDoor,
  shouldDoorHallwayUvForceRetreat,
  shouldDoorLightForceRetreat,
} from "./doorEncounter";
import { stepBackOneStage } from "./enemyRoute";
import { getMonsterDefinition } from "../enemies/monsterDefinitions";
import { resolveImpAdvance } from "../enemies/resolveImpAdvance";
import { resolveTitanAdvance } from "../enemies/resolveTitanAdvance";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Kam se monstrum posune jako hrozba přenesená z EmergencyMiniGame (viz
// gameActions.ts APPLY_OFFICE_THREAT_ON_RETURN, GAME_DESIGN.md) — první
// kandidát, který je skutečně v aktivní trase dané směny (stejný "nikdy
// route.indexOf(...) === -1" důvod jako MONSTER_RETREAT_CANDIDATES výše).
// "low" zůstává o kus dál od dveří (chodba), "medium" je přímo chodba před
// camera roomem (door_hallway), "high" je u dveří samotných — ale POŘÁD bez
// jakéhokoliv útoku tady, ten se (pokud vůbec) rozhodne až v příští
// ENEMY_ADVANCE, na jejím vlastním pravidelném tiku (viz doorEncounter.ts).
const OFFICE_THREAT_STAGE_CANDIDATES: Record<"low" | "medium" | "high", EnemyStage[]> = {
  low: ["right_hallway", "left_hallway", "outer_yard"],
  medium: ["door_hallway", "right_hallway", "left_hallway"],
  high: ["at_door", "breach", "door_hallway"],
};

function pickOfficeThreatStage(route: EnemyStage[], intensity: "low" | "medium" | "high"): EnemyStage | null {
  return OFFICE_THREAT_STAGE_CANDIDATES[intensity].find((stage) => route.includes(stage)) ?? null;
}

// Jak dlouho (ms od návratu) běží enemyDoorAttackGraceUntilMs podle intenzity
// hrozby — viz OFFICE_THREAT_GRACE_*_MS v balancing/constants.ts,
// doorEncounter.ts#isDoorAttackGraceActive.
const OFFICE_THREAT_GRACE_DURATION_MS: Record<"low" | "medium" | "high", number> = {
  low: OFFICE_THREAT_GRACE_LOW_MS,
  medium: OFFICE_THREAT_GRACE_MEDIUM_MS,
  high: OFFICE_THREAT_GRACE_HIGH_MS,
};

// Když je aktivní SONICKÉ DĚLO (ne pouhé sledování detailu kamery, viz
// zadání "sledování kamer je zdarma a bez vlivu na monstrum"), energie jen
// ubývá. Jinak (dveře/pohled zavřené kamery/otevřená kamera bez děla) se
// pomalu dobíjí, ale spotřeba zavřených dveří / rozsvíceného světla dobíjení
// dál přebíjí — viz GAME_DESIGN.md.
// Kritický stav generátoru navrch přidá pevnou extra spotřebu (jako 2x zavřené
// dveře + rozsvícené světlo), bez ohledu na to, jestli jsou skutečně zapnuté.
// Skutečný výpočet žije v game/core/powerDrain.ts#computePowerDrainBreakdown —
// jediné místo pravdy, sdílené s DebugPanel.tsx "Power drain breakdown", ať se
// diagnostika nikdy nerozejde od skutečného chování (viz TECH_DESIGN.md).
function applyPowerDelta(
  state: GameState,
  night: NightDefinition,
  deltaMs: number,
  nightScaling: NightScaling,
): number {
  const seconds = deltaMs / 1000;
  const { netPerSecond } = computePowerDrainBreakdown(state, night, nightScaling);
  return clamp(state.power + netPerSecond * seconds, 0, MAX_POWER);
}

type GeneratorTickResult = Pick<
  GameState,
  | "generatorState"
  | "generatorNextBeepAtMs"
  | "generatorBeepSeq"
  | "generatorSilentSinceMs"
  | "generatorFaultCount"
  | "generatorRestartUntilMs"
>;

// Vyhodnotí generátor pro daný elapsedMs: spuštění (jediné) poruchy, přechod
// ze ticha do kritického pípání po vypršení reakčního času, konec "restarting"
// penalizace, a plánování dalšího pípnutí (normální/kritické tempo). Čistá
// funkce, žádné audio zde — to spouští UI podle změny generatorBeepSeq/
// generatorState (viz app/play/page.tsx).
// state.nightFeatures.generatorFaultsEnabled=false (viz
// game/difficulty/nightConfig.ts) jen vypne SPUŠTĚNÍ nové poruchy — generátor
// zůstává "normal" po celou směnu, ale ruční RESTART_GENERATOR (omylem
// restartovaný funkční generátor) zůstává nezávisle možný, viz gameReducer.ts.
function updateGenerator(state: GameState, night: NightDefinition, elapsedMs: number): GeneratorTickResult {
  const cfg = night.generator;
  let generatorState = state.generatorState;
  let generatorNextBeepAtMs = state.generatorNextBeepAtMs;
  let generatorBeepSeq = state.generatorBeepSeq;
  let generatorSilentSinceMs = state.generatorSilentSinceMs;
  let generatorFaultCount = state.generatorFaultCount;
  let generatorRestartUntilMs = state.generatorRestartUntilMs;

  if (
    state.nightFeatures.generatorFaultsEnabled &&
    generatorState === "normal" &&
    generatorFaultCount < cfg.faultMaxPerShift &&
    elapsedMs >= state.generatorFaultAtMs
  ) {
    generatorState = "silentFault";
    generatorSilentSinceMs = elapsedMs;
    generatorFaultCount += 1;
  } else if (generatorState === "silentFault") {
    const since = generatorSilentSinceMs ?? elapsedMs;
    if (elapsedMs - since >= cfg.silentGraceMs) {
      generatorState = "criticalBeeping";
      generatorNextBeepAtMs = elapsedMs; // první varovné pípnutí hned při přechodu
    }
  } else if (generatorState === "restarting") {
    if (generatorRestartUntilMs !== null && elapsedMs >= generatorRestartUntilMs) {
      generatorState = "normal";
      generatorRestartUntilMs = null;
      generatorNextBeepAtMs = elapsedMs + cfg.beepIntervalMs;
    }
  }

  // "restarting" pípá stejně rychle jako "criticalBeeping" — obojí má
  // stejnou zrychlenou spotřebu energie (viz applyPowerDelta), hráč to má
  // slyšet v obou případech, ne jen tiše sledovat rychle klesající energii.
  if (generatorState === "normal" || generatorState === "criticalBeeping" || generatorState === "restarting") {
    if (elapsedMs >= generatorNextBeepAtMs) {
      generatorBeepSeq += 1;
      const interval = generatorState === "normal" ? cfg.beepIntervalMs : cfg.criticalBeepIntervalMs;
      generatorNextBeepAtMs =
        generatorNextBeepAtMs + interval < elapsedMs ? elapsedMs + interval : generatorNextBeepAtMs + interval;
    }
  }

  return {
    generatorState,
    generatorNextBeepAtMs,
    generatorBeepSeq,
    generatorSilentSinceMs,
    generatorFaultCount,
    generatorRestartUntilMs,
  };
}

type DoorLightRepelResult = Pick<
  GameState,
  | "doorLightRepelMs"
  | "monsterRetreatRoarSeq"
  | "enemyStage"
  | "lastEnemyDecision"
  | "enemyAtDoorSinceMs"
  | "enemyDoorHoldTargetMs"
  | "enemyDoorHoldProgressMs"
  | "enemyForcedRetreatUntilMs"
  | "enemyForcedRetreatChance"
  | "enemyForcedRetreatNextStepAtMs"
>;

// Jemný časovač pro kombinaci dveře zavřené + světlo zapnuté + nepřítel u dveří
// — počítá se v TICKu (deltaMs v řádu ~100 ms), ne v ENEMY_ADVANCE
// (~enemyTickMs), aby repel přišel rychle a předvídatelně (~1.5 s), ne v
// hrubých skocích. Kdykoliv některá ze tří podmínek přestane platit, časovač
// se okamžitě vynuluje — světlo samo (dveře otevřené) ani zavřené dveře bez
// světla repel nikdy nespustí, viz GAME_DESIGN.md "Světlo a dveře".
function updateDoorLightRepel(state: GameState, night: NightDefinition, deltaMs: number): DoorLightRepelResult {
  const unchanged: DoorLightRepelResult = {
    doorLightRepelMs: state.doorLightRepelMs,
    monsterRetreatRoarSeq: state.monsterRetreatRoarSeq,
    enemyStage: state.enemyStage,
    lastEnemyDecision: state.lastEnemyDecision,
    enemyAtDoorSinceMs: state.enemyAtDoorSinceMs,
    enemyDoorHoldTargetMs: state.enemyDoorHoldTargetMs,
    enemyDoorHoldProgressMs: state.enemyDoorHoldProgressMs,
    enemyForcedRetreatUntilMs: state.enemyForcedRetreatUntilMs,
    enemyForcedRetreatChance: state.enemyForcedRetreatChance,
    enemyForcedRetreatNextStepAtMs: state.enemyForcedRetreatNextStepAtMs,
  };

  // Titan je na světlo/UV/sonic/forced-retreat mechaniky imunní (viz zadání
  // "5. TITAN A OBRANNÉ MECHANIKY") — na rozdíl od sonic cannon/gave_up/
  // ghoul-camera-attack (ty žijí jen uvnitř resolveImpAdvance, Titan se k
  // nim nikdy nedostane) je tenhle TICK subroutine monstrum-agnostický
  // (spouští se podle `state.enemyStage`/`doorClosed`/`lightOn`, ne podle
  // aktivního resolveru), takže potřebuje explicitní guard tady.
  if (night.enemy.id === "titan") return unchanged;

  const conditionsMet = shouldDoorLightForceRetreat(state);
  if (!conditionsMet) {
    return state.doorLightRepelMs === 0 ? unchanged : { ...unchanged, doorLightRepelMs: 0 };
  }

  const doorLightRepelMs = state.doorLightRepelMs + deltaMs;
  if (doorLightRepelMs < night.enemy.doorLightRepelRequiredMs) {
    return { ...unchanged, doorLightRepelMs };
  }

  // Repel: o jeden krok zpět (ne teleport na monsterRetreatStage) + dočasné
  // okno zvýšené šance na další ústup (viz zadání "ať hráč vidí bestii
  // utíkat", night.enemy.forcedRetreatAfterLightRepel — nejsilnější/
  // nejjistější ze tří spouštěčů). Žádné audio tady, jen sekvenční čítač
  // (viz app/play/page.tsx, stejný vzor jako generatorBeepSeq).
  return {
    doorLightRepelMs: 0,
    monsterRetreatRoarSeq: state.monsterRetreatRoarSeq + 1,
    enemyStage: stepBackOneStage(state.enemyRoute, state.enemyStage),
    lastEnemyDecision: "light_repelled",
    enemyAtDoorSinceMs: null,
    enemyDoorHoldTargetMs: null,
    enemyDoorHoldProgressMs: 0,
    enemyForcedRetreatUntilMs: state.elapsedMs + night.enemy.forcedRetreatAfterLightRepel.durationMs,
    enemyForcedRetreatChance: night.enemy.forcedRetreatAfterLightRepel.chance,
    // První krok teprve za celou enemyTickMs periodu (viz zadání "moc rychle
    // uteklo") — bez tohohle by mohl ENEMY_ADVANCE tik náhodou přijít skoro
    // hned po repelu, ať hráč nestihne monstrum na kameře vůbec zahlédnout.
    enemyForcedRetreatNextStepAtMs: state.elapsedMs + night.enemyTickMs,
  };
}

// Na rozdíl od DoorLightRepelResult výše NENÍ Pick (všechny klíče vždy
// přítomné) — je to záměrně Partial. doorLightRepelUpdate i
// doorHallwayUvRepelUpdate sdílejí stejná pole GameState
// (monsterRetreatRoarSeq/enemyStage/lastEnemyDecision/monsterRetreatedTo/
// monsterRetreatVerified) a oba se spreadují do stejného výsledného objektu
// v TICKu (viz níže) — kdyby "no-op" větev vracela VŠECHNA pole i beze
// změny (jako u DoorLightRepelResult), přepsala by při spreadu i skutečnou
// změnu, kterou tenhle tik provedl ten DRUHÝ repel updater (enemyStage
// at_door/door_hallway se nikdy nepřekrývají, takže nejvýš jeden z nich
// smí v daném tiku cokoliv měnit — ten druhý musí ve svém "no-op" výsledku
// tahle pole úplně VYNECHAT, ne vracet stejné/staré hodnoty).
type DoorHallwayUvRepelResult = { doorHallwayUvRepelMs: number } & Partial<
  Pick<
    GameState,
    | "monsterRetreatRoarSeq"
    | "enemyStage"
    | "lastEnemyDecision"
    | "monsterRetreatedTo"
    | "monsterRetreatVerified"
    | "enemyForcedRetreatUntilMs"
    | "enemyForcedRetreatChance"
    | "enemyForcedRetreatNextStepAtMs"
  >
>;

// Stejný princip jako updateDoorLightRepel výše, ale pro nepřítele v
// "door_hallway" (o krok dřív) — dveře zavřené + UV SKUTEČNĚ svítí (viz
// shouldDoorHallwayUvForceRetreat) po night.enemy.doorHallwayUvRepelRequiredMs
// (výchozí ~7 s, výrazně pomalejší než 1.5 s u dveří — UV je tu slabší/
// pomalejší varovný nástroj, ne náhrada za stejně rychlý at_door repel).
// O jeden krok zpět (ne teleport na náhodný bod jako dřív) + dočasné okno
// slabší zvýšené šance na ústup (viz night.enemy.forcedRetreatAfterUvRepel).
// monsterRetreatedTo/monsterRetreatVerified se nastaví stejně jako dřív —
// hráč útěk musí/může potvrdit kamerou (viz OPEN_CAMERA), přesně jako u
// give_up. Roar/kroky ústupu hrají stejně jako u at_door repelu (sdílený
// monsterRetreatRoarSeq, viz app/play/page.tsx) — žádný nový audio event.
function updateDoorHallwayUvRepel(
  state: GameState,
  night: NightDefinition,
  deltaMs: number,
  requireMonsterRetreatVerification: boolean,
): DoorHallwayUvRepelResult {
  // Stejný guard/důvod jako updateDoorLightRepel výše — Titan ignoruje UV repel.
  if (night.enemy.id === "titan") return { doorHallwayUvRepelMs: 0 };

  const conditionsMet = shouldDoorHallwayUvForceRetreat(state);
  if (!conditionsMet) {
    return { doorHallwayUvRepelMs: 0 };
  }

  const doorHallwayUvRepelMs = state.doorHallwayUvRepelMs + deltaMs;
  if (doorHallwayUvRepelMs < night.enemy.doorHallwayUvRepelRequiredMs) {
    return { doorHallwayUvRepelMs };
  }

  const retreatedTo = stepBackOneStage(state.enemyRoute, state.enemyStage);
  return {
    doorHallwayUvRepelMs: 0,
    monsterRetreatRoarSeq: state.monsterRetreatRoarSeq + 1,
    enemyStage: retreatedTo,
    lastEnemyDecision: "hallway_light_repelled",
    monsterRetreatedTo: retreatedTo,
    // Bez požadavku na ověření (easy, nebo vypnuté
    // monsterRetreatVerificationEnabled tuhle noc) rovnou "ověřeno" — stejná
    // konvence jako gave_up v ENEMY_ADVANCE.
    monsterRetreatVerified: !requireMonsterRetreatVerification,
    enemyForcedRetreatUntilMs: state.elapsedMs + night.enemy.forcedRetreatAfterUvRepel.durationMs,
    enemyForcedRetreatChance: night.enemy.forcedRetreatAfterUvRepel.chance,
    enemyForcedRetreatNextStepAtMs: state.elapsedMs + night.enemyTickMs,
  };
}

// Partial (ne Pick jako u ostatních *Result typů výše) — ze STEJNÉHO důvodu
// jako DoorHallwayUvRepelResult: tenhle updater a doorLightRepelUpdate/
// doorHallwayUvRepelUpdate sdílejí `enemyStage`/`enemyForcedRetreat*` pole a
// všechny se spreadují do stejného výsledného objektu v TICKu. Kdyby "beze
// změny" větev vracela `enemyStage: state.enemyStage` explicitně, přebila by
// při spreadu i skutečnou změnu, kterou ve STEJNÉM tiku provedl jiný
// updater (např. light-repel) — "no-op" tady proto musí pole úplně
// VYNECHAT, ne vracet starou hodnotu.
type SonicCannonPendingRetreatResult = { sonicCannonPendingRetreat: GameState["sonicCannonPendingRetreat"] } & Partial<
  Pick<GameState, "enemyStage" | "enemyForcedRetreatUntilMs" | "enemyForcedRetreatChance" | "enemyForcedRetreatNextStepAtMs">
>;

// Dokončení sonického ústupu ODLOŽENÉHO v ENEMY_ADVANCE (viz
// GameState.sonicCannonPendingRetreat výše) — teprve teď (po
// SONIC_CANNON_RETREAT_REVEAL_MS, kdy hráč měl šanci vidět ústupovou
// animaci/reakci na PŮVODNÍ stage) se `enemyStage` skutečně přesune na
// `targetStage` a spustí se stejné "viditelný útěk" okno jako po
// light/UV repelu nebo útoku na kameru (`enemyForcedRetreatUntilMs` atd.,
// chance 0 — čisté zamrznutí, žádný další vynucený pohyb).
function resolveSonicCannonPendingRetreat(
  state: GameState,
  night: NightDefinition,
  elapsedMs: number,
): SonicCannonPendingRetreatResult {
  const pending = state.sonicCannonPendingRetreat;
  if (pending === null || elapsedMs < pending.revealUntilMs) {
    return { sonicCannonPendingRetreat: pending };
  }

  return {
    sonicCannonPendingRetreat: null,
    enemyStage: pending.targetStage,
    enemyForcedRetreatUntilMs: elapsedMs + GHOUL_CAMERA_ATTACK_RETREAT_PAUSE_MS,
    enemyForcedRetreatChance: 0,
    enemyForcedRetreatNextStepAtMs: elapsedMs + night.enemyTickMs,
  };
}

type RoomBulbsTickResult = Pick<GameState, "roomBulbs" | "bulbBreakSeq" | "lightOn">;

// Životnost žárovky ubývá jen tehdy, když místnost REÁLNĚ svítí
// (isNearRoomLightActive — vypínač zapnutý A žárovka ještě funkční), ne
// podle samotné polohy vypínače. Jakmile dojde na 0, žárovka jednou (ne
// opakovaně) "praskne": `broken: true`, `lightOn` se vynuluje (vypínač sám
// od sebe cvakne zpět, prasklá žárovka nic nedává) a `bulbBreakSeq` se
// zvýší přesně jednou, ať UI spustí zvuk (viz app/play/page.tsx, stejný
// vzor jako generatorBeepSeq/monsterRetreatRoarSeq).
function updateRoomBulbs(state: GameState, deltaMs: number): RoomBulbsTickResult {
  // nightFeatures.bulbLifetimeEnabled=false (viz game/difficulty/nightConfig.ts)
  // — životnost se vůbec neodečítá, žárovka nemůže prasknout opotřebením.
  if (!state.nightFeatures.bulbLifetimeEnabled || !isNearRoomLightActive(state)) {
    return { roomBulbs: state.roomBulbs, bulbBreakSeq: state.bulbBreakSeq, lightOn: state.lightOn };
  }

  const bulb = state.roomBulbs.nearRoom;
  const nextRemainingMs = Math.max(0, bulb.remainingMs - deltaMs);
  const brokeNow = nextRemainingMs <= 0;

  return {
    roomBulbs: {
      ...state.roomBulbs,
      nearRoom: { ...bulb, remainingMs: nextRemainingMs, broken: brokeNow || bulb.broken },
    },
    bulbBreakSeq: brokeNow ? state.bulbBreakSeq + 1 : state.bulbBreakSeq,
    lightOn: brokeNow ? false : state.lightOn,
  };
}

// `roomBulbs`/`bulbsRemaining` jsou jen volitelné, ať se nikdy blind-spreadnou
// přes výsledek updateRoomBulbs výše — kdyby tenhle typ vždycky vracel
// `roomBulbs` (i "beze změny" = `state.roomBulbs`), spread by v TICKu přebil i
// skutečně spočítaný drain z updateRoomBulbs, protože ten běží nad
// ORIGINÁLNÍM `state`, ne nad už-updatovaným.
interface BulbReplacementTickResult {
  bulbReplacement: GameState["bulbReplacement"];
}

// Progres výměny žárovky roste, jen dokud je `active` — nezávislé na
// updateRoomBulbs výše (ta žárovku nikdy neopraví, jen ji nechá prasknout,
// dokud běží výměna zůstává `broken: true` a `isNearRoomLightActive` tak dál
// vrací `false`, žádný konflikt). DŮLEŽITÉ (viz zadání "profilový kontrakt
// V1" oprava architektonické odchylky): tenhle tik už SÁM O SOBĚ výměnu
// nedokončuje — jen zvedá `progressMs`, zastaví se (clamp) na
// `BULB_REPLACE_DURATION_MS` a zůstává `active`. Skutečné spotřebování
// náhradní žárovky (bulbsRemaining-1) a oprava roomBulbs je až
// `CONFIRM_BULB_REPLACEMENT` akce níže — tu dispatchuje VÝHRADNĚ
// orchestrační vrstva (app/play/page.tsx), a to buď rovnou (Training/
// anonymní), nebo teprve PO úspěšném potvrzení serverem (Hardcore, viz
// lib/playerProfile/bulbInventoryActions.ts). Reducer sám žádný fetch/await
// neprovádí — jen čeká na explicitní CONFIRM/CANCEL.
function updateBulbReplacement(state: GameState, deltaMs: number): BulbReplacementTickResult {
  if (!state.bulbReplacement.active) {
    return { bulbReplacement: state.bulbReplacement };
  }

  const progressMs = Math.min(BULB_REPLACE_DURATION_MS, state.bulbReplacement.progressMs + deltaMs);
  return { bulbReplacement: { ...state.bulbReplacement, progressMs } };
}

const INACTIVE_BULB_REPLACEMENT: GameState["bulbReplacement"] = { active: false, startedAtMs: null, progressMs: 0 };

/**
 * Jestli hráč MŮŽE teď spustit ruční výměnu žárovky u dveří — sdílená podmínka
 * mezi `START_BULB_REPLACEMENT` (reducer) a UI (`DoorView.tsx` přes
 * `app/play/page.tsx`/`GameScreen.tsx`), ať se stejná pravidla nerozjedou na
 * dvou místech zvlášť. Záměrně BEZE ZMÍNKY `roomBulbs.nearRoom.broken` —
 * výměna je "zásobníková" (jako výměna nábojů), jde vyměnit žárovku kdykoliv,
 * i skoro novou, ne jen po prasknutí (viz GAME_DESIGN.md "Žárovky").
 */
export function canReplaceBulb(state: GameState): boolean {
  // nightFeatures.bulbReplacementEnabled=false (viz game/difficulty/nightConfig.ts)
  // — výměnu vůbec nejde spustit tuhle noc; ikonka v DoorView.tsx zůstává
  // vidět, jen neaktivní (stejný `canReplaceBulb` gate jako ostatní podmínky níže).
  if (!state.nightFeatures.bulbReplacementEnabled) return false;
  if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null) return false;
  if (state.playerView !== "door" || state.doorClosed) return false;
  if (state.bulbReplacement.active) return false;
  if (state.bulbsRemaining <= 0) return false;
  return true;
}

/**
 * Progres dosáhl konce a čeká na `CONFIRM_BULB_REPLACEMENT` (viz
 * updateBulbReplacement výše) — orchestrační vrstva (app/play/page.tsx) tohle
 * sleduje a podle toho buď rovnou potvrdí (Training/anonymní), nebo napřed
 * zavolá server (Hardcore).
 */
export function isBulbReplacementReadyToConfirm(state: GameState): boolean {
  return state.bulbReplacement.active && state.bulbReplacement.progressMs >= BULB_REPLACE_DURATION_MS;
}

/**
 * Jestli aktuálně běžící výměnu (na kterou se dosud NEDOSÁHLO konce
 * progresu) smí zavření dveří/odchod od dveří/smrt bez následku zrušit —
 * `false`, jakmile je `isBulbReplacementReadyToConfirm` (výměna je fyzicky
 * hotová, čeká jen na potvrzení serveru/reduceru, ne na riziko u dveří) —
 * viz TOGGLE_DOOR/LOOK_AT_ akce níže, které dřív cancelovaly KAŽDÉ
 * `bulbReplacement.active`, i těsně po dokončení progresu.
 */
function isBulbReplacementCancelableByViewChange(state: GameState): boolean {
  return state.bulbReplacement.active && !isBulbReplacementReadyToConfirm(state);
}

// Progres držení "Jít ven" roste, jen dokud je `active` — stejná mechanika
// jako updateBulbReplacement výše. Po dosažení EMERGENCY_RUN_WINDUP_DURATION_MS
// se `emergencyRunWindup` vrátí na neaktivní a `emergencyRunReadySeq` se
// jednou zvýší — to je jediný signál ven z reduceru, že se má EmergencyMiniGame
// skutečně spustit (viz app/play/page.tsx).
function updateEmergencyRunWindup(
  state: GameState,
  deltaMs: number,
): Pick<GameState, "emergencyRunWindup" | "emergencyRunReadySeq"> {
  if (!state.emergencyRunWindup.active) {
    return { emergencyRunWindup: state.emergencyRunWindup, emergencyRunReadySeq: state.emergencyRunReadySeq };
  }

  const progressMs = state.emergencyRunWindup.progressMs + deltaMs;
  if (progressMs >= EMERGENCY_RUN_WINDUP_DURATION_MS) {
    return {
      emergencyRunWindup: { active: false, startedAtMs: null, progressMs: 0 },
      emergencyRunReadySeq: state.emergencyRunReadySeq + 1,
    };
  }

  return { emergencyRunWindup: { ...state.emergencyRunWindup, progressMs }, emergencyRunReadySeq: state.emergencyRunReadySeq };
}

const INACTIVE_EMERGENCY_RUN_WINDUP: GameState["emergencyRunWindup"] = { active: false, startedAtMs: null, progressMs: 0 };

// Progres držení "Nechat si to projít hlavou" — stejná mechanika jako
// updateEmergencyRunWindup výše, jen jiná konstanta a jiné "seq" pole. Po
// dosažení THINK_IT_OVER_WINDUP_DURATION_MS se `thinkItOverReadySeq` jednou
// zvýší — app/play/page.tsx podle toho zobrazí jen textovou hlášku, žádnou
// minihru (na rozdíl od emergencyRunReadySeq).
function updateThinkItOverWindup(
  state: GameState,
  deltaMs: number,
): Pick<GameState, "thinkItOverWindup" | "thinkItOverReadySeq"> {
  if (!state.thinkItOverWindup.active) {
    return { thinkItOverWindup: state.thinkItOverWindup, thinkItOverReadySeq: state.thinkItOverReadySeq };
  }

  const progressMs = state.thinkItOverWindup.progressMs + deltaMs;
  if (progressMs >= THINK_IT_OVER_WINDUP_DURATION_MS) {
    return {
      thinkItOverWindup: { active: false, startedAtMs: null, progressMs: 0 },
      thinkItOverReadySeq: state.thinkItOverReadySeq + 1,
    };
  }

  return { thinkItOverWindup: { ...state.thinkItOverWindup, progressMs }, thinkItOverReadySeq: state.thinkItOverReadySeq };
}

const INACTIVE_THINK_IT_OVER_WINDUP: GameState["thinkItOverWindup"] = { active: false, startedAtMs: null, progressMs: 0 };

/**
 * Sdílená podmínka "PŘETÍŽIT GENERÁTOR" NENÍ teď použitelné — bez ohledu na
 * to, jestli hráč zrovna drží tlačítko, nebo se to teprve chystá udělat.
 * `canStartGeneratorOverloadWindup` (níže) ji používá jako "smí to vůbec
 * začít", `updateGeneratorOverloadWindup` (níže) jako "smí to ještě
 * pokračovat" — např. skutečná porucha generátoru, co se náhodou vylosuje
 * uprostřed třísekundového držení, držení okamžitě zruší (viz zadání
 * "ztráta možnosti použít generátor"), ne až při příštím pokusu.
 */
function isGeneratorOverloadWindupBlocked(state: GameState): boolean {
  if (!state.nightFeatures.generatorOverloadEnabled) return true;
  if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null) return true;
  if (state.playerView !== "generator") return true;
  if (state.generatorState !== "normal") return true;
  if (state.doorDestroyed || state.doorGeneratorOverloadUntilMs !== null) return true;
  return false;
}

// Progres držení "PŘETÍŽIT GENERÁTOR" — stejná mechanika jako
// updateEmergencyRunWindup/updateThinkItOverWindup výše. Navíc (na rozdíl od
// těch dvou) každý tik znovu ověří isGeneratorOverloadWindupBlocked — pokud
// se mezitím (uprostřed držení) stane cokoliv, co by dnes zabránilo ZAČÍT
// (skutečná porucha, blackout, změna pohledu, ...), držení se okamžitě zruší
// beze spuštění přetížení, ne až při dalším pokusu. Po dosažení
// GENERATOR_OVERLOAD_WINDUP_DURATION_MS se `generatorOverloadReadySeq`
// jednou zvýší — to je signál pro app/play/page.tsx, ať dispatchne
// START_GENERATOR_OVERLOAD (skutečné spuštění desetisekundového přetížení).
function updateGeneratorOverloadWindup(
  state: GameState,
  deltaMs: number,
): Pick<GameState, "generatorOverloadWindup" | "generatorOverloadReadySeq"> {
  if (!state.generatorOverloadWindup.active) {
    return { generatorOverloadWindup: state.generatorOverloadWindup, generatorOverloadReadySeq: state.generatorOverloadReadySeq };
  }

  if (isGeneratorOverloadWindupBlocked(state)) {
    return {
      generatorOverloadWindup: { active: false, startedAtMs: null, progressMs: 0 },
      generatorOverloadReadySeq: state.generatorOverloadReadySeq,
    };
  }

  const progressMs = state.generatorOverloadWindup.progressMs + deltaMs;
  if (progressMs >= GENERATOR_OVERLOAD_WINDUP_DURATION_MS) {
    return {
      generatorOverloadWindup: { active: false, startedAtMs: null, progressMs: 0 },
      generatorOverloadReadySeq: state.generatorOverloadReadySeq + 1,
    };
  }

  return {
    generatorOverloadWindup: { ...state.generatorOverloadWindup, progressMs },
    generatorOverloadReadySeq: state.generatorOverloadReadySeq,
  };
}

const INACTIVE_GENERATOR_OVERLOAD_WINDUP: GameState["generatorOverloadWindup"] = {
  active: false,
  startedAtMs: null,
  progressMs: 0,
};

/**
 * Dokončení probíhajícího přetížení generátoru (viz
 * GameState.doorGeneratorOverloadUntilMs, START_GENERATOR_OVERLOAD) — čistě
 * časová věc jako updateCameraDamagePhase/resolveSonicCannonPendingRetreat,
 * nezávislá na deltaMs. Mimo přetížení (`null`) beze změny. Po vypršení se
 * dveře nevratně zničí — STEJNÝ výsledek jako akce DESTROY_DOOR
 * (`doorDestroyed: true, doorClosed: false`) — VŽDY, bez výjimky (smrt
 * Titana dveře nezachrání, viz zadání).
 *
 * Jediné výjimečné chování: pokud je aktivní monstrum Titan (`night.enemy.id
 * === "titan"` — dnes nikdy nenastane, žádná NightDefinition Titana
 * nepoužívá, ale kontrola je tu připravená a typově bezpečná, `EnemyDefinition.id`
 * je `string`) A je PRÁVĚ TEĎ u dveří (`isMonsterAtDoor`, stejná definice
 * jako zbytek hry — `"at_door"` i `"breach"`), přetížení ho navíc přesune do
 * `"graveyard"` (definitivně mimo hru do konce noci). Jde o JEDINÉ
 * autoritativní místo tohohle rozhodnutí (viz zadání "TICK / overload
 * completion resolver, ne komponenta/DoorView/zvuk"). Záměrně NEnastavuje
 * `monsterDefeated` — to pole spouští MonsterDefeatedScreen/hidden
 * ending/shotgun odměnu, což s environmentální smrtí Titana od generátoru
 * nemá nic společného (viz zadání "nesmí být použito pro Titana").
 *
 * `isMonsterAtDoor` už sama vylučuje případ "útok už začal" — jakmile
 * resolveImpAdvance/budoucí resolveTitanAdvance jednou rozhodne smrt hráče,
 * `enemyStage` se ve STEJNÉM dispatchi přepne na `"attack"` (ne `"at_door"`/
 * `"breach"`), takže `isMonsterAtDoor` od tohohle okamžiku vrací `false` —
 * Titan tak nikdy neumře přetížením PO zahájení nevratného player-death flow
 * (nejkonzervativnější varianta, viz zadání).
 */
function updateDoorGeneratorOverload(
  state: GameState,
  night: NightDefinition,
  elapsedMs: number,
): Pick<GameState, "doorGeneratorOverloadUntilMs" | "doorDestroyed" | "doorClosed" | "titanOverloadDeathRevealUntilMs"> &
  Partial<Pick<GameState, "enemyStage">> {
  if (state.doorGeneratorOverloadUntilMs === null) {
    // Žádný `enemyStage` klíč v návratu — tenhle update se spreaduje do
    // TICKu AŽ PO doorLightRepel/doorHallwayUvRepel update (viz volání
    // níže), takže kdyby tu vždy vracel `enemyStage: state.enemyStage`
    // (PŘED-tikovou hodnotu), přebil by jejich legitimní změnu stage zpátky
    // na starou hodnotu. Klíč se objeví jen tehdy, když tahle funkce
    // SKUTEČNĚ o přesunu do graveyardu rozhoduje (viz níže).
    //
    // `titanOverloadDeathRevealUntilMs` je naproti tomu VÝHRADNĚ v
    // majetku téhle funkce (jen ona ho nastavuje, viz níže), takže ho lze
    // bezpečně vracet nepodmíněně ve všech větvích — buď probíhající
    // reveal vyprší (elapsedMs ho přesáhl), nebo prochází beze změny.
    const revealExpired = state.titanOverloadDeathRevealUntilMs !== null && elapsedMs >= state.titanOverloadDeathRevealUntilMs;
    return {
      doorGeneratorOverloadUntilMs: null,
      doorDestroyed: state.doorDestroyed,
      doorClosed: state.doorClosed,
      titanOverloadDeathRevealUntilMs: revealExpired ? null : state.titanOverloadDeathRevealUntilMs,
    };
  }
  if (elapsedMs >= state.doorGeneratorOverloadUntilMs) {
    const titanAtDoor = night.enemy.id === "titan" && isMonsterAtDoor(state);
    return {
      doorGeneratorOverloadUntilMs: null,
      doorDestroyed: true,
      doorClosed: false,
      titanOverloadDeathRevealUntilMs: titanAtDoor
        ? elapsedMs + TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS
        : state.titanOverloadDeathRevealUntilMs,
      ...(titanAtDoor ? { enemyStage: "graveyard" as const } : {}),
    };
  }
  return {
    doorGeneratorOverloadUntilMs: state.doorGeneratorOverloadUntilMs,
    doorDestroyed: state.doorDestroyed,
    doorClosed: state.doorClosed,
    titanOverloadDeathRevealUntilMs: state.titanOverloadDeathRevealUntilMs,
  };
}

/**
 * Jestli hráč MŮŽE teď začít držet "Nechat si to projít hlavou" na
 * left_wall — vyžaduje brokovnici (GameState.hasShotgun, viz zadání "ve
 * chvíli, kdy už budu vlastnit brokovnici"), jinak stejné herní guardy jako
 * canStartEmergencyRunWindup. Na rozdíl od "Jít ven" nevyžaduje otevřené
 * dveře — hráč jen přemýšlí, nikam neodchází.
 */
export function canStartThinkItOverWindup(state: GameState): boolean {
  if (!state.hasShotgun) return false;
  if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null) return false;
  if (state.playerView !== "left_wall") return false;
  if (state.thinkItOverWindup.active) return false;
  return true;
}

/**
 * Jestli by RESTART_GENERATOR PRÁVĚ TEĎ skutečně opravil vadný generátor —
 * sdílená podmínka mezi reducerem (RESTART_GENERATOR "úspěšná" větev, viz
 * níže) a UI (app/play/page.tsx#handleRestartGenerator, pro
 * game/core/playerProfileStats.ts#recordGeneratorRestarted — statistika se
 * má počítat jen za SKUTEČNOU opravu, ne za zbytečný klik na funkční
 * generátor, viz generatorAccidentalRestartSeq). Stejný vzor jako
 * canReplaceBulb/canStartEmergencyRunWindup výše — čte se PŘED dispatchem,
 * ze stejného stavu, jaký reducer sám uvidí.
 */
export function willGeneratorRestartSucceed(state: GameState): boolean {
  if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null) return false;
  return state.generatorState !== "normal" && state.generatorState !== "restarting";
}

/**
 * Jestli hráč MŮŽE teď začít držet "PŘETÍŽIT GENERÁTOR" na generator pohledu
 * — sdílená podmínka mezi `START_GENERATOR_OVERLOAD_WINDUP` (reducer) a UI
 * (GeneratorView.tsx přes app/play/page.tsx), stejný vzor jako
 * `canStartEmergencyRunWindup`. Night feature flag (viz
 * game/difficulty/nightConfig.ts#generatorOverloadEnabled) se kontroluje
 * tady, ne jen skrytím tlačítka v UI. Vyžaduje `generatorState === "normal"`
 * (ne uprostřed jiné poruchy/restartu) a dveře, které ještě nejsou zničené
 * ani zrovna nepřetěžují — jde spustit jen jednou za noc.
 */
export function canStartGeneratorOverloadWindup(state: GameState): boolean {
  if (state.generatorOverloadWindup.active) return false;
  return !isGeneratorOverloadWindupBlocked(state);
}

/**
 * Jestli hráč MŮŽE teď začít držet "Jít ven" na left_wall — sdílená podmínka
 * mezi `START_EMERGENCY_RUN_WINDUP` (reducer) a UI (`LeftWallView.tsx` přes
 * `app/play/page.tsx`/`GameScreen.tsx`), stejný vzor jako `canReplaceBulb`.
 * Night feature flag (emergencyRunsEnabled/batteryRunEnabled) se kontroluje
 * zvlášť přes `canStartBatteryEmergencyRun` (viz
 * game/core/emergencyMiniGameIntegration.ts) — tahle funkce ho volá, ať
 * existuje jen jedno místo, které obě podmínky (night feature + herní stav)
 * skládá dohromady.
 */
export function canStartEmergencyRunWindup(state: GameState): boolean {
  if (!canStartBatteryEmergencyRun(state.nightFeatures)) return false;
  if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null) return false;
  if (state.playerView !== "left_wall" || state.doorClosed) return false;
  if (state.emergencyRunWindup.active) return false;
  return true;
}

/**
 * Reducer je čistá funkce (state, action) -> state; herní pravidla dané směny
 * přijímá jako parametr. Obtížnost je zatím jen interní (žádné UI/query
 * parametr, viz game/difficulty/difficultyConfig.ts) — herní logika níže nikdy
 * nerozesetá `if (difficulty === "hard")`, jen čte konkrétní pravidla z `rules`.
 */
export function createGameReducer(night: NightDefinition, difficulty: Difficulty = DEFAULT_DIFFICULTY) {
  const rules = DIFFICULTY_RULES[difficulty];

  return function gameReducer(state: GameState, action: GameAction): GameState {
    // Kombinuje difficulty pravidlo (rules.monster_check_or_return — zatím
    // vždy true, žádné UI pro volbu obtížnosti) s night feature flagem
    // (state.nightFeatures.monsterRetreatVerificationEnabled — skutečně
    // aktivní ovladač, viz game/difficulty/nightConfig.ts). Ověření je
    // potřeba, jen když obojí platí zároveň.
    const requireMonsterRetreatVerification =
      rules.monster_check_or_return && state.nightFeatures.monsterRetreatVerificationEnabled;

    // Celý switch je zabalený do IIFE a jeho výsledek jde přes
    // withEnemyStageVisitSeed (viz definice níže) — centrální, jedno místo,
    // ne rozeseté po desítkách jednotlivých case větví, které by jinak
    // musely samy hlídat, jestli zrovna mění enemyStage.
    const nextState = ((): GameState => {
      switch (action.type) {
      case "START_LOADING":
        return {
          ...createInitialGameState(night),
          audioMuted: state.audioMuted,
          officeDoorLockMs: state.officeDoorLockMs,
          screen: "loading",
        };

      case "SHOW_BRIEFING":
        // Opravdu "jen přechod na screen, žádná jiná změna stavu" (viz
        // gameActions.ts komentář u SHOW_BRIEFING) — dřív se sem volalo
        // createInitialGameState(night) BEZ argumentů, což ticho přepsalo
        // gameMode zpátky na "normal", livesRemaining na 3 a brokovnici na
        // "žádná". app/play/page.tsx#handleBeginShift (větev "restart", volaná
        // z handleRestart/handleCinematicComplete) pak čte přesně TENHLE
        // vymazaný state jako "předchozí run" — v Hardcore to tiše převedlo
        // run na Normal (proto text "Zbývající životy: 2" po druhé smrti) a
        // při přechodu do další noci to smazalo admin/test brokovnici (viz
        // regresní bugreport). Zachování těchhle polí přes SHOW_BRIEFING
        // opravuje obojí v jednom místě, beze změny START_SHIFT/RESTART_SHIFT
        // (ty už svoje argumenty dostávaly správně).
        return {
          ...createInitialGameState(night, {
            gameMode: state.gameMode,
            livesRemaining: state.livesRemaining,
            hasShotgun: state.hasShotgun,
            shotgunAmmo: state.shotgunAmmo,
            hasDoubleBarrelShotgun: state.hasDoubleBarrelShotgun,
            // Stejný regresní bug jako gameMode/lives/shotgun výše (viz
            // komentář nahoře) — bez tohohle by SHOW_BRIEFING tiše vynuloval
            // GameState.monsterKilledThisRun na KAŽDÉM přechodu do další noci
            // (i uprostřed jednoho Hardcore runu), než ho handleBeginShift
            // vůbec stihne přečíst pro RESTART_SHIFT (viz
            // app/play/page.tsx#handleBeginShift, game/core/night30Ending.ts).
            monsterKilledThisRun: state.monsterKilledThisRun,
          }),
          audioMuted: state.audioMuted,
          officeDoorLockMs: state.officeDoorLockMs,
          screen: "briefing",
        };

      case "START_SHIFT":
        return {
          ...createInitialGameState(night, {
            roomBulbs: action.roomBulbs,
            bulbsRemaining: action.bulbsRemaining,
            nightFeatures: action.nightFeatures,
            gameMode: action.gameMode,
            livesRemaining: action.livesRemaining,
            hasShotgun: action.hasShotgun,
            shotgunAmmo: action.shotgunAmmo,
            hasDoubleBarrelShotgun: action.hasDoubleBarrelShotgun,
            monsterKilledThisRun: action.monsterKilledThisRun,
          }),
          audioMuted: state.audioMuted,
          officeDoorLockMs: state.officeDoorLockMs,
          screen: "playing",
          isRunning: true,
        };

      case "RESTART_SHIFT":
        return {
          ...createInitialGameState(night, {
            roomBulbs: action.roomBulbs,
            bulbsRemaining: action.bulbsRemaining,
            nightFeatures: action.nightFeatures,
            gameMode: action.gameMode,
            livesRemaining: action.livesRemaining,
            hasShotgun: action.hasShotgun,
            shotgunAmmo: action.shotgunAmmo,
            hasDoubleBarrelShotgun: action.hasDoubleBarrelShotgun,
            monsterKilledThisRun: action.monsterKilledThisRun,
          }),
          audioMuted: state.audioMuted,
          officeDoorLockMs: state.officeDoorLockMs,
          screen: "playing",
          isRunning: true,
        };

      case "GO_TO_MENU":
        return {
          ...createInitialGameState(night),
          audioMuted: state.audioMuted,
          officeDoorLockMs: state.officeDoorLockMs,
          screen: "menu",
        };

      case "TOGGLE_AUDIO_MUTED":
        return { ...state, audioMuted: !state.audioMuted };

      case "SET_OFFICE_DOOR_LOCK_MS":
        return { ...state, officeDoorLockMs: action.value };

      // Admin-only debug nástroj (viz zadání, gameActions.ts komentář u
      // SET_DEBUG_NIGHT) — jen `debugNightOverride`, žádné jiné pole se
      // nemění, žádný screen přechod. Clamp jen zdola (>= 1) a shora (<=
      // 999, bezpečnostní strop proti absurdní hodnotě z numeric inputu) —
      // konkrétní horní hranice není herně významná, jen ochrana před NaN/
      // zápornými/extrémními čísly.
      case "SET_DEBUG_NIGHT":
        return { ...state, debugNightOverride: Math.min(999, Math.max(1, Math.round(action.night))) };

      case "START_BULB_REPLACEMENT": {
        // Riskantní ruční akce — jde jen z DoorView, jen s otevřenými dveřmi,
        // "zásobníková" výměna (kdykoliv, ne jen po prasknutí, viz
        // canReplaceBulb výše), a jen jednou (žádná paralelní druhá výměna).
        // Nesplněná podmínka = tichý no-op, ne chyba.
        if (!canReplaceBulb(state)) return state;

        return {
          ...state,
          bulbReplacement: { active: true, startedAtMs: state.elapsedMs, progressMs: 0 },
        };
      }

      // Puštění tlačítka / pointer leave / cancel před dokončením (viz
      // DoorView.tsx) — no-op, pokud žádná výměna zrovna neběží. Bez dalších
      // guard podmínek: zrušit rozběhnutou výměnu je vždy bezpečné, ať k tomu
      // dojde odkudkoli.
      case "CANCEL_BULB_REPLACEMENT":
        if (!state.bulbReplacement.active) return state;
        return { ...state, bulbReplacement: INACTIVE_BULB_REPLACEMENT };

      // Viz gameActions.ts pro plné zdůvodnění — jediné místo, které
      // skutečně spotřebuje náhradní žárovku a opraví roomBulbs. No-op,
      // pokud výměna zrovna není ready-to-confirm (nikdy nespotřebuje žárovku
      // navíc kvůli pozdnímu/zdvojenému dispatchi orchestrační vrstvy).
      case "CONFIRM_BULB_REPLACEMENT": {
        if (!isBulbReplacementReadyToConfirm(state)) return state;
        return {
          ...state,
          bulbReplacement: INACTIVE_BULB_REPLACEMENT,
          roomBulbs: {
            ...state.roomBulbs,
            nearRoom: { ...state.roomBulbs.nearRoom, remainingMs: state.roomBulbs.nearRoom.maxMs, broken: false },
          },
          // isBulbReplacementReadyToConfirm garantuje, že výměna vůbec mohla
          // začít (canReplaceBulb vyžadovalo bulbsRemaining > 0 na startu) —
          // žádný clamp navíc potřeba.
          bulbsRemaining: state.bulbsRemaining - 1,
          bulbReplaceSuccessSeq: state.bulbReplaceSuccessSeq + 1,
        };
      }

      case "START_EMERGENCY_RUN_WINDUP": {
        // Titan aktivní -> pokus opustit stanoviště je okamžitý Game Over
        // (viz zadání "Pokus odejít do minihry během Titanova útoku"),
        // KONTROLOVANÉ PŘED `canStartEmergencyRunWindup` (a tedy před
        // jakoukoliv navigací do minihry) — minihra se vůbec nezaloží,
        // hráč se nikam nepřesune, `setActiveMiniGame` v app/play/page.tsx
        // se nikdy nezavolá, protože windup nikdy nedoběhne (viz zadání
        // "kliknutí na minihru nesmí nejdřív změnit obrazovku a teprve
        // potom vyvolat smrt"). Stejná finalizace smrti jako ostatní
        // reasony (isRunning/screen/livesRemaining) — jen jiný `deathReason`.
        if (isTitanEncounterActive(state, night)) {
          return {
            ...state,
            isRunning: false,
            screen: "death",
            deathReason: "titan_ambush_emergency_run",
            livesRemaining: resolveLivesRemainingAfterDeath(state.gameMode, state.livesRemaining),
          };
        }
        // Stejný vzor jako START_BULB_REPLACEMENT — riskantní ruční akce,
        // jde jen z left_wall, jen s otevřenými dveřmi, jen jednou. Nesplněná
        // podmínka je tichý no-op, ne chyba.
        if (!canStartEmergencyRunWindup(state)) return state;
        return {
          ...state,
          emergencyRunWindup: { active: true, startedAtMs: state.elapsedMs, progressMs: 0 },
        };
      }

      // Puštění tlačítka / pointer leave / cancel před dokončením (viz
      // LeftWallView.tsx) — no-op, pokud žádné držení zrovna neběží.
      case "CANCEL_EMERGENCY_RUN_WINDUP":
        if (!state.emergencyRunWindup.active) return state;
        return { ...state, emergencyRunWindup: INACTIVE_EMERGENCY_RUN_WINDUP };

      case "START_THINK_IT_OVER_WINDUP": {
        if (!canStartThinkItOverWindup(state)) return state;
        return {
          ...state,
          thinkItOverWindup: { active: true, startedAtMs: state.elapsedMs, progressMs: 0 },
        };
      }

      case "CANCEL_THINK_IT_OVER_WINDUP":
        if (!state.thinkItOverWindup.active) return state;
        return { ...state, thinkItOverWindup: INACTIVE_THINK_IT_OVER_WINDUP };

      case "START_GENERATOR_OVERLOAD_WINDUP": {
        if (!canStartGeneratorOverloadWindup(state)) return state;
        return {
          ...state,
          generatorOverloadWindup: { active: true, startedAtMs: state.elapsedMs, progressMs: 0 },
        };
      }

      case "CANCEL_GENERATOR_OVERLOAD_WINDUP":
        if (!state.generatorOverloadWindup.active) return state;
        return { ...state, generatorOverloadWindup: INACTIVE_GENERATOR_OVERLOAD_WINDUP };

      case "START_GENERATOR_OVERLOAD": {
        // Dispatchuje jen app/play/page.tsx po doběhnutí
        // START_GENERATOR_OVERLOAD_WINDUP (viz generatorOverloadReadySeq) —
        // guard tady je obranná kontrola stejného tvaru jako
        // canStartGeneratorOverloadWindup (bez windup.active podmínky, ta
        // už v tuhle chvíli sama zase neplatí).
        if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null) return state;
        if (state.generatorState !== "normal") return state;
        if (state.doorDestroyed || state.doorGeneratorOverloadUntilMs !== null) return state;
        return {
          ...state,
          // Energetické chování PŘESNĚ jako RESTART_GENERATOR "úspěšná"
          // větev níže — beze změny updateGenerator/applyPowerDelta logiky,
          // jen jiná (delší, pevná) doba trvání.
          generatorState: "restarting",
          generatorRestartUntilMs: state.elapsedMs + GENERATOR_OVERLOAD_DOOR_DURATION_MS,
          generatorSilentSinceMs: null,
          generatorNextBeepAtMs: state.elapsedMs,
          // Samostatné pole jen pro dveře (viz updateDoorGeneratorOverload v
          // TICK) — NEZÁVISLÉ na generatorRestartUntilMs výše, i když má dnes
          // stejnou hodnotu. Dveře se zamknou na door_generator_overload
          // obrázek, dokud tohle nevyprší.
          doorGeneratorOverloadUntilMs: state.elapsedMs + GENERATOR_OVERLOAD_DOOR_DURATION_MS,
          doorClosed: false,
          // Vynucený přesun pohledu na dveře (viz zadání "hra automaticky
          // přesune pohled hráče ke dveřím") — autoritativní stavová změna
          // stejným tvarem jako LOOK_AT_DOOR (playerView + zavření kamer),
          // ne simulovaný klik. Hráč to nemůže odmítnout ani obejít — stejný
          // "vynucený" charakter jako blackout přebíjející playerView v
          // GameScreen.tsx, jen tady přímo přepisem playerView samotného.
          playerView: "door",
          cameraOpen: false,
          activeCameraId: null,
          cameraViewMode: "overview",
          cameraFocusUntilMs: null,
        };
      }

      case "TOGGLE_DOOR":
        // Dveře jde přepnout jen v pohledu na dveře — hráč se tam musí nejdřív
        // otočit (LOOK_AT_DOOR). Debug panel simuluje oba kroky najednou.
        // V blackoutu zámek povolil — dveře jsou vždy "otevřené" a nejdou zavřít.
        // Během doorDeathReveal (viz ENEMY_ADVANCE/TICK) je hra fakticky u konce —
        // dveře se nedají přepnout, ať hráč "neuteče" z už rozhodnuté smrti.
        // Zničené dveře (viz DESTROY_DOOR/START_GENERATOR_OVERLOAD) jsou
        // navždy otevřené — no-op, ne jen "nejde zavřít" (invariant
        // doorDestroyed ⟹ doorClosed===false by tímhle no-opem zůstal
        // zachovaný i bez samostatné kontroly, ale explicitní podmínka je
        // čitelnější než spoléhat na to, že doorClosed už je false).
        // Probíhající přetížení generátoru (doorGeneratorOverloadUntilMs)
        // dveře stejně zamyká, ještě než je definitivně zničí — "hráč nesmí
        // dveře ovládat" po celou dobu, ne až po dokončení.
        if (
          !state.isRunning ||
          state.playerView !== "door" ||
          state.gameStatus === "blackout" ||
          state.doorDeathRevealUntilMs !== null ||
          state.doorDestroyed ||
          state.doorGeneratorOverloadUntilMs !== null
        )
          return state;

        // Otevírání (ne zavírání) dveří, kdy monstrum předtím "vzdalo" čekání
        // (viz ENEMY_ADVANCE "gave_up") a hráč ještě neověřil kamerou, kam
        // odešlo: bez požadavku na ověření (easy, nebo tahle noc má
        // monsterRetreatVerificationEnabled vypnuté) je vždy bezpečné. Jinak
        // bez ověření se monstrum vrátí do "door_hallway" (ne rovnou
        // "at_door") — trest, ale ne okamžitý teleport ke dveřím: hráč ještě
        // dostane krátkou šanci si všimnout (na kameře door_hallway) a
        // stihnout dveře znovu zavřít, než monstrum normálním ENEMY_ADVANCE
        // postupem dojde až k "at_door". lastEnemyDecision zůstává
        // "returned_unverified" (typovaný union, neměněno) — teď znamená
        // konkrétně "vráceno do door_hallway", ne do at_door, viz
        // GAME_DESIGN.md "Odchod monstra od dveří".
        if (
          state.doorClosed &&
          requireMonsterRetreatVerification &&
          state.monsterRetreatedTo !== null &&
          !state.monsterRetreatVerified
        ) {
          return {
            ...state,
            doorClosed: false,
            enemyStage: "door_hallway",
            lastEnemyDecision: "returned_unverified",
            enemyAtDoorSinceMs: null,
            enemyDoorHoldTargetMs: null,
            enemyDoorHoldProgressMs: 0,
            monsterRetreatedTo: null,
            monsterRetreatVerified: false,
          };
        }

        return {
          ...state,
          doorClosed: !state.doorClosed,
          monsterRetreatedTo: null,
          monsterRetreatVerified: false,
          // Výměna žárovky vyžaduje otevřené dveře po celou dobu (riziko musí
          // trvat, ne jen na startu) — zavření dveří uprostřed výměny ji
          // zruší beze změny životnosti/broken (viz DoorView.tsx, START_BULB_REPLACEMENT).
          // Pokud už progres dosáhl konce (isBulbReplacementReadyToConfirm),
          // zavření dveří ji NERUŠÍ — fyzicky je hotová, čeká jen na potvrzení
          // (viz isBulbReplacementCancelableByViewChange výše).
          bulbReplacement:
            !state.doorClosed && isBulbReplacementCancelableByViewChange(state) ? INACTIVE_BULB_REPLACEMENT : state.bulbReplacement,
        };

      case "DESTROY_DOOR":
        // Čistý základ pro budoucí přetížení generátoru (viz TODO.md) —
        // atomicky zničí dveře, beze změny playerView/UI. Zatím nenapojeno
        // na žádný trigger v produkční hře. Žádná monster/at_door podmínka
        // tady záměrně není — tu bude mít až budoucí generátorový resolver,
        // tahle akce jen aplikuje už rozhodnutý výsledek.
        return {
          ...state,
          doorDestroyed: true,
          doorClosed: false,
        };

      case "TOGGLE_LIGHT":
        if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null)
          return state;
        // Prasklá žárovka — vypínač cvakne, ale nic se nestane (viz
        // game/core/roomBulbs.ts#isNearRoomLightActive). Bez téhle guardy by
        // šlo "zapnout" lightOn i s prasklou žárovkou, což by porušilo
        // invariant, na kterém stojí výběr osvětleného snímku kamery i drain
        // životnosti v TICKu.
        if (state.roomBulbs.nearRoom.broken) return state;
        // Bezpečnostní pravidlo (viz zadání "Nelze rozsvítit při otevřených
        // dveřích" — hrozilo by ozáření chodby): ZAPNUTÍ je zablokované,
        // dokud jsou dveře otevřené. VYPNUTÍ zůstává vždy možné (snižuje
        // riziko, nikdy ho nezvyšuje) — proto se podmínka váže jen na
        // `!state.lightOn` (chystané zapnutí), ne na `doorClosed` samotné.
        // `lightOn` se v tomhle případě vůbec nezmění, jen se zvýší
        // `lightToggleBlockedSeq`, ať LightControl.tsx zobrazí krátké
        // upozornění (stejný vzor jako generatorAccidentalRestartSeq).
        if (!state.lightOn && !state.doorClosed) {
          return { ...state, lightToggleBlockedSeq: state.lightToggleBlockedSeq + 1 };
        }
        return { ...state, lightOn: !state.lightOn };

      case "LOOK_AT_DOOR":
        // Kamery se při odchodu od stolu vždy zavřou — hráč se nedívá na dveře
        // a zároveň na kameru, žádná nezůstane "otevřená" na pozadí.
        if (!state.isRunning || state.doorDeathRevealUntilMs !== null) return state;
        return {
          ...state,
          playerView: "door",
          cameraOpen: false,
          activeCameraId: null,
          cameraViewMode: "overview",
          cameraFocusUntilMs: null,
          // "PŘETÍŽIT GENERÁTOR" jde spustit jen na generator pohledu (viz
          // canStartGeneratorOverloadWindup) — odchod jinam rozběhnuté
          // držení zruší, stejný důvod jako emergencyRunWindup u LOOK_AT_DESK.
          generatorOverloadWindup: state.generatorOverloadWindup.active
            ? INACTIVE_GENERATOR_OVERLOAD_WINDUP
            : state.generatorOverloadWindup,
        };

      case "LOOK_AT_DESK":
        // Viz zadání "Automatické přepnutí na dveře při finálním útoku
        // Titana" — jakmile Titan vstoupí do nevratné "breach" fáze
        // (game/core/titanEncounter.ts#isTitanBreachIrreversible), odchod
        // pryč ze dveří je zamčený, ať hráč nemůže "utéct" pohledem z
        // rozehrané breach/death sekvence. LOOK_AT_DOOR sám tenhle guard
        // nemá (odchod NA dveře zůstává vždy možný).
        if (!state.isRunning || state.doorDeathRevealUntilMs !== null || isTitanBreachIrreversible(state, night)) return state;
        // Odchod z DoorView zruší rozběhnutou výměnu žárovky (beze změny
        // životnosti/broken) — riziko je "zůstaň u otevřených dveří", ne jen
        // "klikni a schovej se", viz START_BULB_REPLACEMENT.
        return {
          ...state,
          playerView: "desk",
          bulbReplacement: isBulbReplacementCancelableByViewChange(state) ? INACTIVE_BULB_REPLACEMENT : state.bulbReplacement,
          // Odchod z left_wall zruší i rozběhnuté držení "Jít ven" (stejný
          // důvod jako bulbReplacement výše) — riziko musí trvat, dokud hráč
          // fyzicky drží tlačítko, ne přežít přechod na jiný pohled.
          emergencyRunWindup: state.emergencyRunWindup.active ? INACTIVE_EMERGENCY_RUN_WINDUP : state.emergencyRunWindup,
          // Stejný důvod jako emergencyRunWindup výše, jen pro "Nechat si to
          // projít hlavou" (viz zadání).
          thinkItOverWindup: state.thinkItOverWindup.active ? INACTIVE_THINK_IT_OVER_WINDUP : state.thinkItOverWindup,
          generatorOverloadWindup: state.generatorOverloadWindup.active
            ? INACTIVE_GENERATOR_OVERLOAD_WINDUP
            : state.generatorOverloadWindup,
        };

      case "LOOK_AT_GENERATOR":
        // Stejný breach-lock jako LOOK_AT_DESK výše.
        if (!state.isRunning || state.doorDeathRevealUntilMs !== null || isTitanBreachIrreversible(state, night)) return state;
        return {
          ...state,
          playerView: "generator",
          cameraOpen: false,
          activeCameraId: null,
          cameraViewMode: "overview",
          cameraFocusUntilMs: null,
          bulbReplacement: isBulbReplacementCancelableByViewChange(state) ? INACTIVE_BULB_REPLACEMENT : state.bulbReplacement,
          emergencyRunWindup: state.emergencyRunWindup.active ? INACTIVE_EMERGENCY_RUN_WINDUP : state.emergencyRunWindup,
          thinkItOverWindup: state.thinkItOverWindup.active ? INACTIVE_THINK_IT_OVER_WINDUP : state.thinkItOverWindup,
        };

      case "LOOK_AT_LEFT_WALL":
        // Čistě atmosférický pohled bez vlastní herní logiky — stejně jako
        // LOOK_AT_GENERATOR zavře kamery a odchod od stolu, ale nic dalšího
        // (žádný drain, žádný nový mechanický stav). Stejný breach-lock jako
        // LOOK_AT_DESK výše.
        if (!state.isRunning || state.doorDeathRevealUntilMs !== null || isTitanBreachIrreversible(state, night)) return state;
        return {
          ...state,
          playerView: "left_wall",
          cameraOpen: false,
          activeCameraId: null,
          cameraViewMode: "overview",
          cameraFocusUntilMs: null,
          bulbReplacement: isBulbReplacementCancelableByViewChange(state) ? INACTIVE_BULB_REPLACEMENT : state.bulbReplacement,
          generatorOverloadWindup: state.generatorOverloadWindup.active
            ? INACTIVE_GENERATOR_OVERLOAD_WINDUP
            : state.generatorOverloadWindup,
        };

      case "LOOK_AT_MAP":
        // Čistě informativní pohled bez vlastní herní logiky — stejný vzor
        // jako LOOK_AT_LEFT_WALL (zavře kamery, zruší rozběhnutou výměnu
        // žárovky), žádný drain, žádná změna trasy nepřítele. Stejný
        // breach-lock jako LOOK_AT_DESK výše.
        if (!state.isRunning || state.doorDeathRevealUntilMs !== null || isTitanBreachIrreversible(state, night)) return state;
        return {
          ...state,
          playerView: "object_map",
          cameraOpen: false,
          activeCameraId: null,
          cameraViewMode: "overview",
          cameraFocusUntilMs: null,
          bulbReplacement: isBulbReplacementCancelableByViewChange(state) ? INACTIVE_BULB_REPLACEMENT : state.bulbReplacement,
          emergencyRunWindup: state.emergencyRunWindup.active ? INACTIVE_EMERGENCY_RUN_WINDUP : state.emergencyRunWindup,
          thinkItOverWindup: state.thinkItOverWindup.active ? INACTIVE_THINK_IT_OVER_WINDUP : state.thinkItOverWindup,
          generatorOverloadWindup: state.generatorOverloadWindup.active
            ? INACTIVE_GENERATOR_OVERLOAD_WINDUP
            : state.generatorOverloadWindup,
        };

      case "RESTART_GENERATOR": {
        // V blackoutu generátor úplně chcípl — standardní restart ho nevzkřísí.
        if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null)
          return state;

        // Omylem restartovaný funkční generátor — zbytečný klik ho na chvíli
        // vyřadí (stejná extra spotřeba jako criticalBeeping), místo aby byl no-op.
        if (state.generatorState === "normal") {
          return {
            ...state,
            generatorState: "restarting",
            generatorRestartUntilMs: state.elapsedMs + night.generator.restartPenaltyMs,
            generatorSilentSinceMs: null,
            // Stejné rychlé pípání jako criticalBeeping (viz updateGenerator)
            // — energie během "restarting" utíká stejně rychle, hráč to má
            // slyšet hned, ne až při dalším přirozeném pípnutí.
            generatorNextBeepAtMs: state.elapsedMs,
            // Zbytečný klik na FUNKČNÍ generátor — GeneratorView.tsx podle
            // změny zobrazí krátkou posměšnou hlášku (viz zadání).
            generatorAccidentalRestartSeq: state.generatorAccidentalRestartSeq + 1,
          };
        }

        // Restart už probíhá — druhý klik na tom nic nemění.
        if (state.generatorState === "restarting") return state;

        return {
          ...state,
          generatorState: "normal",
          generatorSilentSinceMs: null,
          generatorNextBeepAtMs: state.elapsedMs + night.generator.beepIntervalMs,
        };
      }

      case "OPEN_CAMERA":
        // V blackoutu jsou kamery mrtvé — nejdou zapnout ani přepnout.
        // Klik na monitor v overview mřížce -> zoom do detailu dané kamery;
        // teprve tady se počítá jako aktivní sledování (viz isEnemyBeingWatched).
        if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null)
          return state;

        // Hráč právě uviděl kameru, kam monstrum odešlo po "vzdání se" čekání
        // u dveří (viz ENEMY_ADVANCE "gave_up") -> potvrzeno, otevření dveří
        // je teď bezpečné (viz TOGGLE_DOOR).
        const camera = night.cameras.find((c) => c.id === action.cameraId);
        const monsterRetreatVerified =
          state.monsterRetreatedTo !== null && camera?.enemyVisibleAtStage === state.enemyStage
            ? true
            : state.monsterRetreatVerified;

        return {
          ...state,
          cameraOpen: true,
          activeCameraId: action.cameraId,
          cameraViewMode: "detail",
          // Nová "ladění signálu" perioda při každém výběru/přepnutí kamery —
          // CameraView zobrazí šum, dokud state.elapsedMs nedosáhne tohoto času.
          cameraFocusUntilMs: state.elapsedMs + night.cameraFocusMs,
          monsterRetreatVerified,
        };

      case "CLOSE_CAMERAS":
        // Návrat z detailu zpět na overview mřížku (tlačítko "Zpět na přehled")
        // i vynucené zavření kamer jinde v reduceru — vždy stejný cílový stav.
        // sonicCannonActive se tu NEnuluje explicitně — withSonicCannonAutoOff
        // (viz konec souboru) to udělá centrálně, stejně jako pro každou jinou
        // cestu, kterou cameraOpen padne na false.
        return {
          ...state,
          cameraOpen: false,
          activeCameraId: null,
          cameraViewMode: "overview",
          cameraFocusUntilMs: null,
        };

      case "TOGGLE_SONIC_CANNON": {
        if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null)
          return state;

        // Vypnutí funguje vždy (i kdyby mezitím accidentally přestaly platit
        // podmínky pro aktivaci) — jen zrušit `active`. `sonicCannonToggleSeq`
        // se zvyšuje TADY (ruční akce), na rozdíl od tichého
        // `withSonicCannonAutoOff` (viz konec souboru), který stejné pole
        // nuluje beze změny seq — přesně proto, aby UI (viz app/play/page.tsx)
        // umělo přehrát cvaknutí jen pro tenhle záměrný toggle, ne pro
        // "kamera se zrovna zavřela" tichý reset.
        if (state.sonicCannonActive) {
          return {
            ...state,
            sonicCannonActive: false,
            sonicCannonToggleSeq: state.sonicCannonToggleSeq + 1,
            lastSonicCannonToggleReason: "manual_off",
          };
        }

        // Aktivace vyžaduje otevřený DETAIL kamery na stole (ne overview,
        // ne dveře/generátor/zeď — stejná podmínka jako dřívější
        // isEnemyBeingWatched) a nějakou energii (viz zadání "sonické dělo
        // bez dostatku energie se vypne nebo nejde aktivovat") — bez těchhle
        // podmínek je TOGGLE tiché no-op, ne pád/výjimka (a tedy i beze
        // změny sonicCannonToggleSeq — žádné cvaknutí za neúspěšný pokus).
        if (!state.cameraOpen || state.cameraViewMode !== "detail" || state.playerView !== "desk" || state.power <= 0)
          return state;

        // ZÁMĚRNÁ ZMĚNA (viz zadání "sonický kanón musí fungovat i u
        // vyřazené kamery") — dřívější blokace aktivace na plně offline
        // kameře byla ODSTRANĚNA. Mikrofon offline kamery zůstává funkční
        // (viz zadání "obraz je offline, ale mikrofon zůstává aktivní"),
        // takže hráč Ghoula pozná i bez obrazu a dělo ho pořád smí odpudit —
        // `isSonicCannonAffectingEnemy` (sonicCannon.ts) na `cameraDamage`
        // vůbec nezávisí, jen na `activeCameraId`/`enemyStage` shodě.

        return {
          ...state,
          sonicCannonActive: true,
          sonicCannonToggleSeq: state.sonicCannonToggleSeq + 1,
          lastSonicCannonToggleReason: "manual_on",
        };
      }

      case "TICK": {
        if (!state.isRunning) return state;

        const elapsedMs = state.elapsedMs + action.deltaMs;
        // Horor efekt: při vyšším stresu ubývá čas do úsvitu pomaleji (viz
        // game/core/stressTimeScale.ts) — remainingMs proto NENÍ odvozené z
        // elapsedMs (to dál běží reálnou rychlostí, řídí generátor/kamery/
        // nepřítele beze změny), ale nezávisle ubývá o `deltaMs * timeScale`.
        // Nikdy neskáče nahoru — jen pomalejší odpočet, nikdy zrychlení nad
        // reálný čas ani přičtení navíc.
        const stressTimeScale = computeStressTimeScale(action.stressLevel ?? 0);
        const remainingMs = clamp(state.remainingMs - action.deltaMs * stressTimeScale, 0, night.durationMs);

        // Night scaling (viz game/difficulty/nightScaling.ts) — nezávislé na
        // Difficulty (easy/medium/hard), progresivně škáluje jen energy
        // drain podle toho, kolikátou noc v řadě hlídač slouží (action.currentNight
        // = survivedNights + 1 z app/play/page.tsx). Chybějící/neplatná
        // hodnota se bere jako noc 1 (žádné ztěžování).
        const nightScaling = computeNightScaling(action.currentNight ?? 1);

        // ── Krátký "reveal" moment před finalizací smrti u dveří (viz
        // ENEMY_ADVANCE) — hráč vidí monstrum ve dveřích (door_open_death_0,
        // SceneBackground v GameScreen.tsx), teprve pak se dokončí přechod na
        // DeathScreen. Lokální mezistav jen pro tenhle jeden případ, nic jiného
        // se tu nepočítá (generátor/energie/door-light repel jsou beztak
        // irelevantní, hra je fakticky rozhodnutá).
        if (state.doorDeathRevealUntilMs !== null) {
          if (elapsedMs >= state.doorDeathRevealUntilMs) {
            return {
              ...state,
              elapsedMs,
              remainingMs,
              isRunning: false,
              screen: "death",
              livesRemaining: resolveLivesRemainingAfterDeath(state.gameMode, state.livesRemaining),
            };
          }
          return { ...state, elapsedMs, remainingMs };
        }

        // ── Blackout: baterie na nule, všechny systémy mrtvé — vlastní, mnohem
        // jednodušší časování. Generátor/door-light repel/energie se tu vůbec
        // nepočítají, jsou to mrtvé systémy. Jediné, co běží, je čas směny a
        // blackoutElapsedMs proti sobě — viz GAME_DESIGN.md "Blackout".
        if (state.gameStatus === "blackout") {
          const blackoutElapsedMs = state.blackoutElapsedMs + action.deltaMs;

          // Fáze se posunula (viz getBlackoutPhaseIndex) -> zvyš čítač, ať UI
          // podle změny spustí odpovídající zvuk (kroky/dech, viz
          // app/play/page.tsx). Reducer sám žádné audio nevolá.
          const prevPhase = getBlackoutPhaseIndex(state.blackoutElapsedMs, night.blackout);
          const nextPhase = getBlackoutPhaseIndex(blackoutElapsedMs, night.blackout);
          const blackoutPhaseSeq = nextPhase !== prevPhase ? state.blackoutPhaseSeq + 1 : state.blackoutPhaseSeq;

          // Roar krátce PŘED smrtí (viz BlackoutDefinition.roarLeadMs,
          // GameState.blackoutRoarSeq) — hranice je nezávislá na
          // phaseThresholdsMs/fázovém textu výše, jen na durationMs. Zvyšuje
          // se přesně jednou, v tiku, kdy se blackoutElapsedMs poprvé
          // dostane přes tuhle hranici.
          const roarThresholdMs = night.blackout.durationMs - night.blackout.roarLeadMs;
          const blackoutRoarSeq =
            state.blackoutElapsedMs < roarThresholdMs && blackoutElapsedMs >= roarThresholdMs
              ? state.blackoutRoarSeq + 1
              : state.blackoutRoarSeq;

          if (night.blackout.canBeSurvivedIfShiftEnds && remainingMs <= 0) {
            return {
              ...state,
              elapsedMs,
              remainingMs: 0,
              blackoutElapsedMs,
              blackoutPhaseSeq,
              blackoutRoarSeq,
              isRunning: false,
              screen: "win",
            };
          }

          if (blackoutElapsedMs >= night.blackout.durationMs) {
            return {
              ...state,
              elapsedMs,
              remainingMs,
              blackoutElapsedMs,
              blackoutPhaseSeq,
              blackoutRoarSeq,
              isRunning: false,
              screen: "death",
              deathReason: "blackout_timeout",
              livesRemaining: resolveLivesRemainingAfterDeath(state.gameMode, state.livesRemaining),
            };
          }

          return {
            ...state,
            elapsedMs,
            remainingMs,
            blackoutElapsedMs,
            blackoutPhaseSeq,
            blackoutRoarSeq,
            // Blackout = "všechny systémy mrtvé", včetně rozběhnutého
            // přetížení generátoru — dveře se blackoutem beztak už nuceně
            // otevírají (viz TOGGLE_DOOR), takže probíhající přetížení tady
            // ztrácí smysl. Na rozdíl od doorDestroyed se dveře tímhle
            // NEZNIČÍ — blackout je jiný, dočasný stav (přežije se koncem
            // směny), zničení dveří má zůstat výhradně následkem dokončeného
            // přetížení, ne vedlejším efektem výpadku proudu.
            generatorOverloadWindup: state.generatorOverloadWindup.active
              ? INACTIVE_GENERATOR_OVERLOAD_WINDUP
              : state.generatorOverloadWindup,
            doorGeneratorOverloadUntilMs: null,
            titanOverloadDeathRevealUntilMs: null,
          };
        }

        const generatorUpdate = updateGenerator(state, night, elapsedMs);
        const doorLightRepelUpdate = updateDoorLightRepel(state, night, action.deltaMs);
        // Nezávislé na doorLightRepelUpdate výše — jiná stage (door_hallway,
        // ne at_door), jiný (pomalejší) požadovaný čas, jiný výsledek
        // (vzdání se s ověřením, ne okamžitý teleport) — viz
        // updateDoorHallwayUvRepel.
        const doorHallwayUvRepelUpdate = updateDoorHallwayUvRepel(
          state,
          night,
          action.deltaMs,
          requireMonsterRetreatVerification,
        );
        // Životnost žárovky se počítá z PŘED-tikového state.lightOn (stejně
        // jako applyPowerDelta níže) — pokud tenhle tik žárovka právě praskne,
        // spotřeba/drain za tenhle tik se ještě počítá, jako by svítila celou
        // dobu; teprve od PŘÍŠTÍHO tiku je lightOn skutečně false.
        const roomBulbsUpdate = updateRoomBulbs(state, action.deltaMs);
        // Nezávislé na roomBulbsUpdate výše (ta žárovku nikdy neopraví, jen
        // nechá prasknout) — dokud běží výměna je žárovka pořád `broken`,
        // takže obě aktualizace roomBulbs se nikdy nepřebíjí protichůdně.
        const bulbReplacementUpdate = updateBulbReplacement(state, action.deltaMs);
        // Nezávislé na bulbReplacementUpdate — jiná riskantní ruční akce,
        // jiný pohled (left_wall, ne door), oba mohou nanejvýš být "active"
        // po jednom, nikdy současně (LOOK_AT_* mezi nimi vždy zruší tu druhou).
        const emergencyRunWindupUpdate = updateEmergencyRunWindup(state, action.deltaMs);
        // Nezávislé na obou výše — jiná riskantní/vedlejší akce (viz zadání
        // "Nechat si to projít hlavou"), stejný "nanejvýš jedna active"
        // vzor (LOOK_AT_* mezi nimi zruší tu druhou).
        const thinkItOverWindupUpdate = updateThinkItOverWindup(state, action.deltaMs);
        // Nezávislé na obou windupech výše — jiná riskantní ruční akce, jiný
        // pohled (generator, ne left_wall), stejný "nanejvýš jedna active"
        // vzor (LOOK_AT_* mezi nimi zruší tu druhou).
        const generatorOverloadWindupUpdate = updateGeneratorOverloadWindup(state, action.deltaMs);
        // Dokončení probíhajícího přetížení (viz doorGeneratorOverloadUntilMs)
        // — nezávislé na generatorOverloadWindupUpdate výše (ten řídí jen
        // DRŽENÍ tlačítka, tohle už samotné PŘETÍŽENÍ po jeho doběhnutí).
        const doorGeneratorOverloadUpdate = updateDoorGeneratorOverload(state, night, elapsedMs);
        // Postupné ztmavování/zrnění po útoku Ghoula na kameru (viz zadání) —
        // čistě časová věc (attackStartedAtMs -> elapsedMs), nezávislá na
        // deltaMs stejně jako blackoutElapsedMs výše. cameraOfflineSeq se tu
        // zvýší PŘESNĚ v tiku, kdy "attacking" poprvé přejde na "offline".
        const cameraDamageUpdate = updateCameraDamagePhase(state, elapsedMs);
        // Dokončení odloženého sonického ústupu (viz
        // GameState.sonicCannonPendingRetreat, resolveSonicCannonPendingRetreat
        // výše) — čistě časová věc jako cameraDamageUpdate, nezávislá na
        // deltaMs.
        const sonicCannonPendingRetreatUpdate = resolveSonicCannonPendingRetreat(state, night, elapsedMs);
        const power = applyPowerDelta({ ...state, ...generatorUpdate }, night, action.deltaMs, nightScaling);

        if (power <= 0) {
          // Baterie na nule -> blackout, ne okamžitá smrt. Zámek povolí (dveře
          // "otevřené"), systémy jdou vypnout — viz TOGGLE_DOOR/TOGGLE_LIGHT/
          // OPEN_CAMERA/RESTART_GENERATOR guardy výše. Rozběhnutá výměna
          // žárovky i držení "Jít ven" se zruší — blackout přeruší
          // i tohle, stejně jako všechno ostatní.
          return {
            ...state,
            ...generatorUpdate,
            ...doorLightRepelUpdate,
            ...doorHallwayUvRepelUpdate,
            ...roomBulbsUpdate,
            elapsedMs,
            remainingMs,
            power: 0,
            gameStatus: "blackout",
            blackoutElapsedMs: 0,
            doorClosed: false,
            lightOn: false,
            cameraOpen: false,
            activeCameraId: null,
            cameraViewMode: "overview",
            cameraFocusUntilMs: null,
            bulbReplacement: INACTIVE_BULB_REPLACEMENT,
            emergencyRunWindup: INACTIVE_EMERGENCY_RUN_WINDUP,
            thinkItOverWindup: INACTIVE_THINK_IT_OVER_WINDUP,
            // Stejný důvod jako blackout přes durationMs výše — probíhající
            // přetížení se zruší, dveře se tímhle NEZNIČÍ (jen zůstávají
            // otevřené jako všechno ostatní systém během blackoutu).
            generatorOverloadWindup: state.generatorOverloadWindup.active
              ? INACTIVE_GENERATOR_OVERLOAD_WINDUP
              : state.generatorOverloadWindup,
            doorGeneratorOverloadUntilMs: null,
            titanOverloadDeathRevealUntilMs: null,
          };
        }

        if (remainingMs <= 0) {
          return {
            ...state,
            ...generatorUpdate,
            ...doorLightRepelUpdate,
            ...doorHallwayUvRepelUpdate,
            ...roomBulbsUpdate,
            ...bulbReplacementUpdate,
            ...emergencyRunWindupUpdate,
            ...thinkItOverWindupUpdate,
            ...generatorOverloadWindupUpdate,
            ...doorGeneratorOverloadUpdate,
            ...cameraDamageUpdate,
            ...sonicCannonPendingRetreatUpdate,
            elapsedMs,
            remainingMs: 0,
            power,
            isRunning: false,
            screen: "win",
          };
        }

        // "monster_reached_office" krize (viz officeBreachAftermath.ts) se
        // sama vypne, jakmile hráč vyřeší všechny tři kroky — jinak by
        // libovolná POZDĚJŠÍ, nesouvisející porucha generátoru/přirozeně
        // prasklá žárovka omylem znovu ukázala krizové texty (viz
        // resolveOfficeBreachPhase, který čte stejná pole). `updateBulbReplacement`
        // už žárovku sám neopravuje (viz komentář výše u tý funkce) — jediný
        // zdroj pravdy pro `broken` je teď `roomBulbsUpdate.roomBulbs`.
        const officeBreachAftermathActive =
          state.officeBreachAftermathActive &&
          !isOfficeBreachResolved({
            doorClosed: state.doorClosed,
            generatorState: generatorUpdate.generatorState,
            bulbBroken: roomBulbsUpdate.roomBulbs.nearRoom.broken,
          });

        return {
          ...state,
          ...generatorUpdate,
          ...doorLightRepelUpdate,
          ...doorHallwayUvRepelUpdate,
          ...roomBulbsUpdate,
          ...bulbReplacementUpdate,
          ...emergencyRunWindupUpdate,
          ...thinkItOverWindupUpdate,
          ...generatorOverloadWindupUpdate,
          ...doorGeneratorOverloadUpdate,
          ...cameraDamageUpdate,
          ...sonicCannonPendingRetreatUpdate,
          elapsedMs,
          remainingMs,
          power,
          officeBreachAftermathActive,
        };
      }

      case "ENEMY_ADVANCE": {
        // Kolikátá noc v řadě (viz game/core/survivedNights.ts) — jediné
        // místo, kde ji ENEMY_ADVANCE potřebuje (limit vyřazených kamer
        // podle čísla noci, viz cameraDamageConfig.ts#MAX_DISABLED_CAMERAS_BY_NIGHT).
        // Stejný `?? 1` fallback jako TICK.currentNight.
        const currentNightNumber = action.currentNight ?? 1;
        // V blackoutu je pozice nepřítele zamrzlá — hrozbu odteď representuje
        // blackoutElapsedMs v TICKu, ne další postup po trase. Během
        // doorDeathReveal je útok už rozhodnutý (viz níže) — žádný další
        // postup/rozhodnutí nepřítele už nemá smysl počítat.
        // monsterDefeated (viz CONFIRM_MONSTER_HIT níže) zamrzne postup na
        // zbytek noci JEN pro opakovanou porážku (první životní výhra run
        // rovnou ukončí přes screen "monsterDefeated"/isRunning: false, takže
        // by se sem stejně nikdy nedostala) — bestie zadání "je mrtvá, ale
        // nebyla poslední" zůstává mimo hru, dokud noc neskončí.
        if (
          !state.isRunning ||
          state.gameStatus === "blackout" ||
          state.doorDeathRevealUntilMs !== null ||
          state.monsterDefeated ||
          // Sonické odražení čeká na dokončení revealu (viz
          // GameState.sonicCannonPendingRetreat, TICK níže) — žádný další
          // hod/pohyb, dokud hráč neviděl ústup na PŮVODNÍ stage doběhnout.
          state.sonicCannonPendingRetreat !== null ||
          // Definitivně vyřazené monstrum (viz EnemyStage#graveyard,
          // updateDoorGeneratorOverload níže — dnes jediný zdroj) už nikdy
          // nedostává další advance, bez ohledu na to, kolikrát se tahle
          // akce ještě dispatchne. Na rozdíl od monsterDefeated (resetuje se
          // příští noc společně s ostatním runtime stavem, ne dřív) tu není
          // žádný samostatný "je run u konce"/screen efekt — graveyard je
          // čistě gameplay pohybový stav.
          state.enemyStage === "graveyard"
        )
          return state;

        // Rozhodovací logika konkrétního hlavního monstra žije mimo reducer
        // (viz zadání "vyčleň rozhodovací logiku hlavního monstra... do
        // samostatné testovatelné vrstvy pro Impa") — reducer už jen zjistí
        // aktivní monstrum podle `night.enemy.id` (jediný zdroj identity,
        // beze změny) a zavolá jeho resolver. Připraveno na budoucí
        // `resolveTitanAdvance` (viz zadání "co nedělat" — Titan se v tomhle
        // kroku NEIMPLEMENTUJE, jen se pro něj nechává místo v switch
        // větvi). Neznámé/nepodporované monstrum záměrně SELŽE VIDITELNĚ
        // (throw), ne tiše no-opem — `night.enemy.id` bez odpovídajícího
        // resolveru je konfigurační chyba (chybějící registrace/resolver),
        // ne běžný runtime stav, který by šel bezpečně ignorovat. Dnes
        // nikdy nenastane (jediný registrovaný `MonsterId` je `"imp"`, viz
        // monsterDefinitions.ts).
        const monster = getMonsterDefinition(night.enemy.id);
        if (!monster) {
          throw new Error(`Unknown monster id: ${night.enemy.id}`);
        }
        const decision = ((): Partial<GameState> => {
          switch (monster.id) {
            case "imp":
              return resolveImpAdvance({ state, night, currentNightNumber, requireMonsterRetreatVerification });
            case "titan":
              return resolveTitanAdvance({ state, night });
            default:
              throw new Error(`Unsupported monster resolver: ${monster.id}`);
          }
        })();
        return { ...state, ...decision };
      }

      case "RECHARGE_POWER":
        if (action.amount <= 0 || !state.isRunning) return state;
        return {
          ...state,
          power: clamp(state.power + action.amount, 0, MAX_POWER),
          // Viz GameState.powerRechargeSeq — PowerMeter.tsx podle změny
          // přehraje delší CSS animaci výplně (zadání "uspokojivý efekt").
          powerRechargeSeq: state.powerRechargeSeq + 1,
        };

      case "EMERGENCY_MINIGAME_DIED":
        // Stejný death flow jako ostatní smrti (viz TICK blackout_timeout /
        // ENEMY_ADVANCE výše) — jen spuštěný zvenčí, ne z herní smyčky.
        if (!state.isRunning) return state;
        return {
          ...state,
          isRunning: false,
          screen: "death",
          deathReason: "emergency_run",
          livesRemaining: resolveLivesRemainingAfterDeath(state.gameMode, state.livesRemaining),
          // Smrt venku zahazuje VŠECHNY nepotvrzené zásahy monstra (viz zadání
          // "hidden true ending") — monsterHitsToday se NEZVYŠUJE, pending se
          // celý vynuluje, bez ohledu na to, kolik jich bylo.
          pendingMonsterHits: 0,
        };

      case "APPLY_OFFICE_THREAT_ON_RETURN": {
        // Stejné guardy jako ENEMY_ADVANCE — v blackoutu/doorDeathRevealu už
        // je pozice nepřítele/výsledek směny beztak rozhodnutý, hrozba z
        // minihry na tom nic nemění. `enemyStage === "graveyard"` navíc
        // brání "vzkříšení" definitivně vyřazeného monstra zpátky na
        // normální stage (viz zadání "advance cesty mimo centrální guard,
        // oprav i je") — bez týhle podmínky by tahle akce mohla monstrum z
        // graveyardu přesunout na `pickOfficeThreatStage` výsledek.
        if (
          !state.isRunning ||
          state.gameStatus === "blackout" ||
          state.doorDeathRevealUntilMs !== null ||
          state.enemyStage === "graveyard"
        )
          return state;

        const nextStage = pickOfficeThreatStage(state.enemyRoute, action.intensity);
        // Žádný vhodný stage v aktuální trase (nemělo by nastat pro běžné
        // noci, ale route se losuje z routeVariants — bezpečný no-op, ne
        // pád/nekonzistentní stav) — NIKDY nespadne na náhodnou/neplatnou stage.
        if (nextStage === null) return state;

        const nextIsAtDoor = nextStage === "at_door" || nextStage === "breach";

        return {
          ...state,
          enemyStage: nextStage,
          lastEnemyDecision: "office_threat_on_return",
          // Stejný reset jako běžný postup v ENEMY_ADVANCE (viz výše) — ať se
          // door-hold časovač/verifikace ústupu nezaseknou na stavu z úplně
          // jiné (předchozí) situace u dveří.
          enemyAtDoorSinceMs: nextIsAtDoor ? state.elapsedMs : null,
          enemyDoorHoldTargetMs: null,
          enemyDoorHoldProgressMs: 0,
          monsterRetreatedTo: null,
          monsterRetreatVerified: false,
          // Krátké férové okno zavřít dveře (viz OFFICE_THREAT_GRACE_*_MS,
          // doorEncounter.ts#isDoorAttackGraceActive) — jen pro OTEVŘENÉ dveře;
          // zavřené dveře blokují útok/spustí door bang bez ohledu na tohle.
          enemyDoorAttackGraceUntilMs: state.elapsedMs + OFFICE_THREAT_GRACE_DURATION_MS[action.intensity],
        };
      }

      case "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH": {
        // Stejné guardy jako APPLY_OFFICE_THREAT_ON_RETURN výše (včetně
        // graveyard ochrany proti "vzkříšení").
        if (
          !state.isRunning ||
          state.gameStatus === "blackout" ||
          state.doorDeathRevealUntilMs !== null ||
          state.enemyStage === "graveyard"
        )
          return state;

        // Stejný "high" kandidátní seznam/reuse jako APPLY_OFFICE_THREAT_ON_RETURN
        // (viz OFFICE_THREAT_STAGE_CANDIDATES výše) — monstrum už fyzicky
        // doběhlo do kanceláře v minihře, "high" (u dveří/hala) je jediná
        // smysluplná intenzita, žádná volba navíc.
        const nextStage = pickOfficeThreatStage(state.enemyRoute, "high");
        if (nextStage === null) return state;

        const nextIsAtDoor = nextStage === "at_door" || nextStage === "breach";

        return {
          ...state,
          enemyStage: nextStage,
          lastEnemyDecision: "monster_reached_office_aftermath",
          enemyAtDoorSinceMs: nextIsAtDoor ? state.elapsedMs : null,
          enemyDoorHoldTargetMs: null,
          enemyDoorHoldProgressMs: 0,
          monsterRetreatedTo: null,
          monsterRetreatVerified: false,
          // Delší reakční okno než officeThreatOnReturn (viz
          // OFFICE_BREACH_REACTION_WINDOW_MS v balancing/constants.ts) —
          // monstrum tentokrát FYZICKY dorazilo, hráč potřebuje reálný čas
          // doběhnout ke dveřím, ne jen 1–1.8s.
          enemyDoorAttackGraceUntilMs: state.elapsedMs + OFFICE_BREACH_REACTION_WINDOW_MS,
          // Dveřní/kancelářská žárovka praskne přes existující roomBulbs
          // systém (viz game/core/roomBulbs.ts) — stejné pole/tvar jako
          // přirozené prasknutí v TICKu, jen vynucené okamžitě. Bez zbytečné
          // druhé bulb_break audio reakce, pokud už byla prasklá.
          roomBulbs: {
            ...state.roomBulbs,
            nearRoom: { ...state.roomBulbs.nearRoom, remainingMs: 0, broken: true },
          },
          bulbBreakSeq: state.roomBulbs.nearRoom.broken ? state.bulbBreakSeq : state.bulbBreakSeq + 1,
          // Generátor vypadne přes existující generatorState mechanismus
          // (viz updateGenerator výše) — rovnou "criticalBeeping" (hlasité,
          // urgentní), ne tichý "silentFault": hráč se právě vrátil ze
          // stresové situace, tichou poruchu by si nemusel včas všimnout.
          generatorState: "criticalBeeping",
          generatorSilentSinceMs: null,
          generatorNextBeepAtMs: state.elapsedMs,
          generatorFaultCount: state.generatorFaultCount + 1,
          officeBreachAftermathActive: true,
        };
      }

      case "APPLY_SHOTGUN_EFFECTS":
        // Stejný guard jako RECHARGE_POWER — mimo běžící směnu (např. hráč už
        // zemřel dřív v téhle směně jiným způsobem) se stav zbraně nemá nijak
        // dopočítávat. Hodnoty jsou už finální (viz
        // game/core/shotgunEquipment.ts#applyShotgunEmergencyReturn), reducer
        // je jen zapíše.
        if (!state.isRunning) return state;
        return { ...state, hasShotgun: action.hasShotgun, shotgunAmmo: action.shotgunAmmo };

      // "ZAŽÁDAT O MUNICI" na LeftWallView.tsx (viz zadání) — přidá přesně
      // jeden náboj, nikdy nad kapacitu (viz
      // game/core/shotgunEquipment.ts#requestSingleAmmo). Bez brokovnice
      // nebo na plné kapacitě je no-op — zvuk odmítnutí řeší
      // app/play/page.tsx#handleRequestAmmo ještě před dispatchem.
      case "REQUEST_AMMO":
        if (!state.isRunning || !canRequestAmmo(state)) return state;
        return { ...state, shotgunAmmo: requestSingleAmmo(state) };

      // Hráč venku PRÁVĚ TEĎ trefil monstrum brokovnicí (viz
      // EmergencyMiniGame.tsx#fireShot, app/play/page.tsx#onMonsterHit) —
      // zásah se ještě NEPOČÍTÁ (viz zadání), jen se přičte do pending
      // počítadla, ať EMERGENCY_MINIGAME_DIED ví, kolik má zahodit. Za
      // jednu výpravu může přijít až dvakrát (dvouhlavňovka, viz
      // GameState.pendingMonsterHits) — EmergencyMiniGame.tsx zavolá znovu
      // jen po uplynutí wounded/recover okna (MONSTER_WOUNDED_RECOVER_MS).
      case "MARK_PENDING_MONSTER_HIT":
        if (!state.isRunning) return state;
        return { ...state, pendingMonsterHits: state.pendingMonsterHits + 1 };

      // Bezpečný návrat s potvrzenými zásahy (viz
      // app/play/page.tsx#handleEmergencyMiniGameComplete, result.monsterHit) —
      // jediné místo, které skutečně zvyšuje monsterHitsToday, o CELÉ
      // state.pendingMonsterHits najednou (viz confirmMonsterHit). Na 10.
      // zásahu spustí hidden true ending (screen "monsterDefeated") místo
      // pokračování běžné hry — má přednost před normálním win/death flow,
      // nečeká se do 6:00.
      case "CONFIRM_MONSTER_HIT": {
        if (!state.isRunning) return state;
        const result = confirmMonsterHit(
          state.monsterHitsToday,
          state.pendingMonsterHits,
          state.nightFeatures.monsterTrueEndingRequiredHits,
        );

        if (result.monsterDefeated && !action.alreadyDefeatedBefore) {
          // Poslední (10.) zásah rovnou končí hru MonsterDefeatedScreenem —
          // žádný "stažení ven" reset kanceláře už nemá smysl (hra už
          // nepokračuje běžným loopem), viz zadání.
          return {
            ...state,
            monsterHitsToday: result.monsterHitsToday,
            pendingMonsterHits: 0,
            monsterDefeated: true,
            monsterKilledThisRun: true,
            isRunning: false,
            screen: "monsterDefeated",
          };
        }

        if (result.monsterDefeated) {
          // Opakovaná porážka (viz zadání "bestie je mrtvá, ale nebyla
          // poslední", gameActions.ts#alreadyDefeatedBefore) — na rozdíl od
          // první životní výhry výše NEkončí run: hra pokračuje běžně dál,
          // jen se nepřítel stáhne a na zbytek noci zůstane mimo hru
          // (monsterDefeated: true zamrzne ENEMY_ADVANCE, viz výše). Trvalé
          // statistiky/odměny (recordMonsterDefeat/recordMonsterKill,
          // hardcore-profile sync) se zapisují v app/play/page.tsx přímo u
          // tohohle dispatche, ne přes MonsterDefeatedScreen — ten se tu
          // nezobrazuje.
          return {
            ...state,
            monsterHitsToday: result.monsterHitsToday,
            pendingMonsterHits: 0,
            monsterDefeated: true,
            monsterKilledThisRun: true,
            enemyStage: night.enemy.monsterRetreatStage,
            lastEnemyDecision: "monster_hit_confirmed",
            enemyAtDoorSinceMs: null,
            enemyDoorHoldTargetMs: null,
            enemyDoorHoldProgressMs: 0,
            doorLightRepelMs: 0,
            doorHallwayUvRepelMs: 0,
            enemyDoorAttackGraceUntilMs: null,
            monsterRetreatedTo: null,
            monsterRetreatVerified: false,
          };
        }

        return {
          ...state,
          monsterHitsToday: result.monsterHitsToday,
          pendingMonsterHits: 0,
          monsterDefeated: false,
          // Potvrzený zásah stáhne monstrum zpátky na bezpečný start trasy
          // (viz zadání "po návratu hráč nesmí být okamžitě zabit monstrem,
          // které právě trefil") — stejná stage jako door-light repel
          // (night.enemy.monsterRetreatStage), žádná dlouhá imunita, jen
          // "bestie začne znovu venku". Vyčistí i stejný balík
          // bezprostředního door/repel/standoff stavu jako
          // APPLY_OFFICE_THREAT_ON_RETURN výše, ať nic z předchozí situace u
          // dveří nezůstane viset a matoucně neovlivní normální monster loop
          // pokračující odtamtud.
          enemyStage: night.enemy.monsterRetreatStage,
          lastEnemyDecision: "monster_hit_confirmed",
          enemyAtDoorSinceMs: null,
          enemyDoorHoldTargetMs: null,
          enemyDoorHoldProgressMs: 0,
          doorLightRepelMs: 0,
          doorHallwayUvRepelMs: 0,
          enemyDoorAttackGraceUntilMs: null,
          monsterRetreatedTo: null,
          monsterRetreatVerified: false,
        };
      }

      // Sebraná žárovka v emergency výpravě, potvrzená bezpečným návratem
      // (viz game/core/emergencyMiniGameIntegration.ts#resolveBulbsGainedFromWorldEffects) —
      // stejný guard jako RECHARGE_POWER/APPLY_SHOTGUN_EFFECTS, přičte se do
      // existujícího bulbsRemaining skladu.
      case "ADD_BULBS_REMAINING":
        if (action.amount <= 0 || !state.isRunning) return state;
        return { ...state, bulbsRemaining: state.bulbsRemaining + action.amount };

      // Dev-only ruční spuštění (viz zadání "spolehlivě otestovat",
      // game/core/cameraDamage.ts#canDebugTriggerGhoulCameraAttack) —
      // obchází JEN náhodný hod, ne ostatní podmínky. Mimo běžící směnu
      // (např. hráč už zemřel) je no-op, stejný guard jako ostatní akce.
      case "DEBUG_TRIGGER_GHOUL_CAMERA_ATTACK":
        if (!state.isRunning || !canDebugTriggerGhoulCameraAttack(state, night, action.currentNight ?? 1)) return state;
        return {
          ...state,
          cameraDamage: debugTriggerGhoulCameraAttack(state, isNearRoomLightActive(state), action.animationId),
          cameraAttackStartedSeq: state.cameraAttackStartedSeq + 1,
        };

      // Dev-only reset bez čekání na novou noc (viz zadání "resetovat stav
      // poškození kamer"). `cameraAttackStartedSeq`/`cameraOfflineSeq`
      // zůstávají beze změny (monotónní počítadla, stejná konvence jako
      // `sonicCannonToggleSeq` — nikdy se ručně nevrací zpět).
      case "DEBUG_RESET_CAMERA_DAMAGE":
        return { ...state, cameraDamage: INACTIVE_CAMERA_DAMAGE };

      // Dev-only: teleportuje Ghoula na lokaci PRVNÍ vyřazené kamery (viz
      // zadání "otestovat mikrofon") — no-op bez žádné vyřazené kamery.
      // `enemyStage` změna sama spustí withDisabledCameraFootsteps na konci
      // reduceru (stejný wrapper jako u produkčního pohybu).
      case "DEBUG_MOVE_ENEMY_TO_DISABLED_CAMERA": {
        const [firstDisabledCameraId] = state.cameraDamage.disabledCameraIds;
        if (!firstDisabledCameraId) return state;
        const targetCamera = night.cameras.find((c) => c.id === firstDisabledCameraId);
        if (!targetCamera) return state;
        return { ...state, enemyStage: targetCamera.enemyVisibleAtStage };
      }

      // Dev-only "SPUSTIT TITANA" (viz zadání "8. ADMIN / DEBUG OVLÁDÁNÍ") —
      // no-op, pokud aktivní `night` zrovna NENÍ Titanova (app/play/page.tsx
      // přepne night/reducer na NIGHT_15 PŘED tímhle dispatchem, viz
      // handleDebugStartTitan tam). Nastaví Titana na první stage jeho
      // (jediné) trasy A přepíše `enemyRoute` na tuhle trasu — nutné i
      // tehdy, kdyby `state.enemyRoute` ještě držel Impovu trasu z
      // předchozí, jinak právě dohrávané noci. `enemyLocationEnteredAtMs`/
      // `enemyStageVisitSeq` se aktualizují samy (withEnemyStageVisitSeed
      // níže), žádný ruční reset timeru tady.
      case "DEBUG_START_TITAN": {
        if (!state.isRunning || night.enemy.id !== "titan") return state;
        const route = night.enemy.routeVariants[0];
        return { ...state, enemyRoute: route, enemyStage: route[0] };
      }

      // Dev-only "TITAN: DALŠÍ STAGE" — posune Titana přesně o jednu stage
      // po JEHO současné trase (`state.enemyRoute`), stejná trasa jako
      // normální gameplay. No-op mimo Titanovu noc, v "attack"/"graveyard",
      // nebo už na poslední stage trasy — nikdy nepřeskakuje rovnou do
      // "graveyard" (ten je vyhrazený VÝHRADNĚ generátorovému přetížení,
      // viz updateDoorGeneratorOverload, beze změny).
      case "DEBUG_ADVANCE_TITAN_STAGE": {
        if (!state.isRunning || night.enemy.id !== "titan") return state;
        if (state.enemyStage === "attack" || state.enemyStage === "graveyard") return state;
        const route = state.enemyRoute;
        const currentIndex = route.indexOf(state.enemyStage);
        if (currentIndex === -1 || currentIndex >= route.length - 1) return state;
        return { ...state, enemyStage: route[currentIndex + 1] };
      }

      // Dev-only: ručně přehraje zvuk kroků z mikrofonu bez ohledu na
      // cooldown (viz zadání) — respektuje STEJNÉ pravidlo výběru kamery
      // jako produkční cesta (viz app/play/page.tsx, zadání "zda replay v
      // DebugPanelu respektuje stejná pravidla"): událost se váže na
      // PRÁVĚ otevřenou kameru (`activeCameraId`), ne na tu, kde Ghoul
      // fyzicky stojí — bez otevřené kamery (`null`) se tedy záměrně nic
      // neozve, přesně jako by se to nestalo u skutečné události.
      case "DEBUG_PLAY_DISABLED_CAMERA_FOOTSTEPS":
        return {
          ...state,
          disabledCameraFootstepsSeq: state.disabledCameraFootstepsSeq + 1,
          lastDisabledCameraFootstepsCameraId: state.activeCameraId,
        };

      case "SET_DEBUG_GHOUL_CAMERA_ATTACK_CHANCE_OVERRIDE":
        return { ...state, debugGhoulCameraAttackChanceOverride: action.chance };

      // Dev-only: skočí přímo na hold posledního snímku (viz zadání
      // "přeskočit na poslední frame") — nemění cameraOfflineSeq/disabledCameraIds,
      // jen posune activeAttack.startedAtMs do minulosti.
      case "DEBUG_SKIP_CAMERA_ATTACK_TO_LAST_FRAME":
        if (state.cameraDamage.activeAttack === null) return state;
        return { ...state, cameraDamage: debugSkipToLastFrame(state) };

      // Dev-only: okamžitě dokončí právě probíhající útok (viz zadání
      // "přeskočit rovnou do offline stavu") — stejný cameraOfflineSeq bump
      // jako produkční přechod v TICKu, jen bez čekání.
      case "DEBUG_SKIP_CAMERA_ATTACK_TO_OFFLINE": {
        if (state.cameraDamage.activeAttack === null) return state;
        return {
          ...state,
          cameraDamage: debugSkipActiveAttackToOffline(state),
          cameraOfflineSeq: state.cameraOfflineSeq + 1,
        };
      }

      default:
        return state;
      }
    })();

    return withDisabledCameraFootsteps(night, state, withSonicCannonAutoOff(state, withEnemyStageVisitSeed(state, nextState)));
  };
}

// Viz GameState.enemyStageVisitSeq/enemyLocationEnteredAtMs — jediné místo,
// které je mění, ať se nemusí opakovat/hlídat ve všech ~15 case větvích, co
// enemyStage nastavují. `nextState === state` (žádná změna/no-op guard) je
// běžný případ, `===` srovnání enemyStage samo o sobě stačí, i kdyby
// nextState byl nový objekt se stejnou hodnotou stage.
// `enemyLocationEnteredAtMs` se aktualizuje na `nextState.elapsedMs` (ne
// `previousState.elapsedMs`) — v TICKu se elapsedMs mění ve STEJNÉM
// dispatchi, ve kterém může dojít i ke skutečnému přesunu (např. door-light
// repel), takže `nextState.elapsedMs` je vždy ten správný "teď" okamžik
// přesunu; mimo TICK je `nextState.elapsedMs === previousState.elapsedMs`,
// beze změny.
function withEnemyStageVisitSeed(previousState: GameState, nextState: GameState): GameState {
  if (nextState.enemyStage === previousState.enemyStage) return nextState;
  return {
    ...nextState,
    enemyStageVisitSeq: previousState.enemyStageVisitSeq + 1,
    enemyLocationEnteredAtMs: nextState.elapsedMs,
  };
}

// Viz GameState.sonicCannonActive — sonické dělo se NIKDY nesmí "skrytě"
// nechat běžet dál, jakmile přestanou platit podmínky, za kterých šlo
// zapnout (viz zadání, seznam "Sonické dělo se automaticky vypne při").
// Centrální wrapper kolem CELÉHO reduceru (stejný vzor jako
// withEnemyStageVisitSeed výše) — pokrývá i cesty, které cameraOpen/
// isRunning/gameStatus mění MIMO explicitní TOGGLE_SONIC_CANNON/CLOSE_CAMERAS
// (blackout v TICKu, konec směny, smrt, OPEN_CAMERA na jinou kameru, ...),
// aniž by je bylo nutné jednotlivě vyjmenovávat a riskovat, že se na
// některou zapomene. `activeCameraId` porovnání proti PŘEDCHOZÍMU stavu
// zachytí i "přepnutí na jinou kameru" (cameraOpen/detail/desk zůstávají
// beze změny, jen se mění, KTERÁ kamera).
function withSonicCannonAutoOff(previousState: GameState, nextState: GameState): GameState {
  if (!nextState.sonicCannonActive) return nextState;
  const stillValid =
    nextState.isRunning &&
    nextState.gameStatus !== "blackout" &&
    nextState.cameraOpen &&
    nextState.cameraViewMode === "detail" &&
    nextState.playerView === "desk" &&
    nextState.activeCameraId === previousState.activeCameraId;
  return stillValid ? nextState : { ...nextState, sonicCannonActive: false };
}

// Mikrofon offline kamery (viz zadání "vyřazení kamery znamená pouze ztrátu
// obrazu, ne zvuku") — centrální wrapper kolem CELÉHO reduceru (stejný vzor
// jako withEnemyStageVisitSeed/withSonicCannonAutoOff výše), ať pokryje
// VŠECHNY cesty, kterými se Ghoul může ocitnout v lokaci s offline kamerou
// (normální postup, gave_up, light/UV repel, office threat, CONFIRM_MONSTER_HIT
// retreat, i vlastní ústup po útoku na kameru), aniž by je bylo nutné
// jednotlivě vyjmenovávat. Trigger je průnik DVOU nezávislých příčin do
// jedné podmínky — "byl Ghoul na lokaci s offline kamerou" přešlo z false na
// true — což správně pokryje jak "Ghoul vstoupil do už offline lokace", tak
// "kamera se v TÉHLE lokaci, kde Ghoul už stál, právě teď dokončila vyřadit"
// (viz zadání "nebo pokud je již v lokaci v momentě úplného vyřazení
// kamery"), bez dvou samostatných kontrolních míst.
function withDisabledCameraFootsteps(night: NightDefinition, previousState: GameState, nextState: GameState): GameState {
  const wasOnDisabledCamera = isEnemyOnDisabledCameraStage(previousState, night);
  const disabledCameraId = findDisabledCameraIdForEnemyStage(nextState, night);
  if (wasOnDisabledCamera || disabledCameraId === null) return nextState;

  const cooldownExpired =
    nextState.cameraDamage.lastFootstepsAtMs === null ||
    nextState.elapsedMs - nextState.cameraDamage.lastFootstepsAtMs >= DISABLED_CAMERA_FOOTSTEPS_COOLDOWN_MS;
  if (!cooldownExpired) return nextState;

  return {
    ...nextState,
    cameraDamage: { ...nextState.cameraDamage, lastFootstepsAtMs: nextState.elapsedMs },
    disabledCameraFootstepsSeq: nextState.disabledCameraFootstepsSeq + 1,
    lastDisabledCameraFootstepsCameraId: disabledCameraId,
  };
}
