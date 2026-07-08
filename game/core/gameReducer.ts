import { GameAction } from "./gameActions";
import { createInitialGameState } from "./gameState";
import { EnemyDefinition, EnemyStage, GameState, NightDefinition } from "./types";
import { BULB_REPLACE_DURATION_MS, DOOR_DEATH_REVEAL_DURATION_MS, MAX_POWER } from "../balancing/constants";
import { getBlackoutPhaseIndex } from "../visuals/blackoutPhase";
import { DEFAULT_DIFFICULTY, DIFFICULTY_RULES, Difficulty } from "../difficulty/difficultyConfig";
import { computeNightScaling, NightScaling } from "../difficulty/nightScaling";
import { computeStressTimeScale } from "./stressTimeScale";
import { isNearRoomLightActive } from "./roomBulbs";
import { computePowerDrainBreakdown } from "./powerDrain";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isEnemyBeingWatched(state: GameState, night: NightDefinition): boolean {
  // playerView !== "desk" (dveře/generátor) nikdy nepočítá jako sledování kamer,
  // i kdyby cameraOpen zůstalo true — stejná podmínka jako watchingCameras
  // v applyPowerDelta. LOOK_AT_DOOR/LOOK_AT_GENERATOR navíc kamery rovnou zavírá.
  if (state.playerView !== "desk" || !state.cameraOpen || !state.activeCameraId) return false;
  const camera = night.cameras.find((c) => c.id === state.activeCameraId);
  return camera?.enemyVisibleAtStage === state.enemyStage;
}

// "breach" je zatím jen připravená pro budoucí trasy (žádná ji dnes nepoužívá),
// ale reaguje na ni stejná logika (standoff u dveří i door-light repel) jako
// na "at_door" — ať funguje beze změny reduceru, až se jednou objeví v trase.
function isAtDoorStage(state: GameState): boolean {
  return state.enemyStage === "at_door" || state.enemyStage === "breach";
}

// Vylosuje (jednou na standoff u zavřených dveří) cíl efektivního čekání, než
// se nepřítel vzdá — viz doorHoldRangeMs / doorHoldLightAccelMultiplier v
// basicIntruder.ts a použití v ENEMY_ADVANCE níže.
function rollDoorHoldTargetMs(enemy: EnemyDefinition): number {
  const { min, max } = enemy.doorHoldRangeMs;
  return min + Math.random() * (max - min);
}

// Kam nepřítel odejde, když se u zavřených dveří "vzdá" čekání (viz
// ENEMY_ADVANCE "gave_up") — vybírá jen z lokací, které jsou skutečně v
// aktivní trase dané směny (routeVariants má vždy jen JEDNU z left_hallway/
// right_hallway), ať pozdější route.indexOf(...) nikdy nedostane -1.
const MONSTER_RETREAT_CANDIDATES: EnemyStage[] = ["outer_yard", "left_hallway", "right_hallway"];

function pickMonsterRetreatLocation(route: EnemyStage[]): EnemyStage {
  const candidates = MONSTER_RETREAT_CANDIDATES.filter((stage) => route.includes(stage));
  if (candidates.length === 0) return "outside";
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Když hráč aktivně sleduje kamery (otevřená kamera v pohledu na stůl), energie
// jen ubývá. Jinak (dveře/pohled zavřené kamery) se pomalu dobíjí, ale spotřeba
// zavřených dveří / rozsvíceného světla dobíjení dál přebíjí — viz GAME_DESIGN.md.
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
  };

  const conditionsMet = isAtDoorStage(state) && state.doorClosed && state.lightOn;
  if (!conditionsMet) {
    return state.doorLightRepelMs === 0 ? unchanged : { ...unchanged, doorLightRepelMs: 0 };
  }

  const doorLightRepelMs = state.doorLightRepelMs + deltaMs;
  if (doorLightRepelMs < night.enemy.doorLightRepelRequiredMs) {
    return { ...unchanged, doorLightRepelMs };
  }

  // Repel: silný, rychlý ústup — žádné audio tady, jen sekvenční čítač (viz
  // app/play/page.tsx, stejný vzor jako generatorBeepSeq).
  return {
    doorLightRepelMs: 0,
    monsterRetreatRoarSeq: state.monsterRetreatRoarSeq + 1,
    enemyStage: night.enemy.monsterRetreatStage,
    lastEnemyDecision: "light_repelled",
    enemyAtDoorSinceMs: null,
    enemyDoorHoldTargetMs: null,
    enemyDoorHoldProgressMs: 0,
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
// ORIGINÁLNÍM `state`, ne nad už-updatovaným. Definované jen tehdy, když
// výměna tenhle tik skutečně dokončí opravu (a spotřebuje 1 náhradní žárovku).
interface BulbReplacementTickResult {
  bulbReplacement: GameState["bulbReplacement"];
  roomBulbs?: GameState["roomBulbs"];
  bulbsRemaining?: GameState["bulbsRemaining"];
  // Stejný "absent, dokud se nemění" vzor jako roomBulbs/bulbsRemaining výše —
  // přítomné jen na úspěšném dokončení, ať app/play/page.tsx podle změny
  // spustí bulb_replace_success zvuk + DoorView krátkou hlášku (ne při
  // startu/cancelu/smrti, viz CANCEL_BULB_REPLACEMENT a ENEMY_ADVANCE).
  bulbReplaceSuccessSeq?: GameState["bulbReplaceSuccessSeq"];
}

// Progres výměny žárovky roste, jen dokud je `active` — nezávislé na
// updateRoomBulbs výše (ta žárovku nikdy neopraví, jen ji nechá prasknout,
// dokud běží výměna zůstává `broken: true` a `isNearRoomLightActive` tak dál
// vrací `false`, žádný konflikt). Po dosažení BULB_REPLACE_DURATION_MS se
// žárovka opraví na plnou životnost a `bulbReplacement` spadne zpět na
// neaktivní — jednorázově, ne opakovaně (`active` se dál nekontroluje, jen
// se jednou přepne na `false`).
function updateBulbReplacement(state: GameState, deltaMs: number): BulbReplacementTickResult {
  if (!state.bulbReplacement.active) {
    return { bulbReplacement: state.bulbReplacement };
  }

  const progressMs = state.bulbReplacement.progressMs + deltaMs;
  if (progressMs >= BULB_REPLACE_DURATION_MS) {
    return {
      bulbReplacement: { active: false, startedAtMs: null, progressMs: 0 },
      roomBulbs: {
        ...state.roomBulbs,
        nearRoom: { ...state.roomBulbs.nearRoom, remainingMs: state.roomBulbs.nearRoom.maxMs, broken: false },
      },
      // START_BULB_REPLACEMENT nejde spustit s bulbsRemaining <= 0, takže tady
      // nemůže jít pod 0 — žádný clamp navíc.
      bulbsRemaining: state.bulbsRemaining - 1,
      bulbReplaceSuccessSeq: state.bulbReplaceSuccessSeq + 1,
    };
  }

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

    switch (action.type) {
      case "START_LOADING":
        return { ...createInitialGameState(night), audioMuted: state.audioMuted, screen: "loading" };

      case "SHOW_BRIEFING":
        return { ...createInitialGameState(night), audioMuted: state.audioMuted, screen: "briefing" };

      case "START_SHIFT":
        return {
          ...createInitialGameState(night, action.roomBulbs, action.bulbsRemaining, action.nightFeatures),
          audioMuted: state.audioMuted,
          screen: "playing",
          isRunning: true,
        };

      case "RESTART_SHIFT":
        return {
          ...createInitialGameState(night, action.roomBulbs, action.bulbsRemaining, action.nightFeatures),
          audioMuted: state.audioMuted,
          screen: "playing",
          isRunning: true,
        };

      case "GO_TO_MENU":
        return { ...createInitialGameState(night), audioMuted: state.audioMuted, screen: "menu" };

      case "TOGGLE_AUDIO_MUTED":
        return { ...state, audioMuted: !state.audioMuted };

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

      case "TOGGLE_DOOR":
        // Dveře jde přepnout jen v pohledu na dveře — hráč se tam musí nejdřív
        // otočit (LOOK_AT_DOOR). Debug panel simuluje oba kroky najednou.
        // V blackoutu zámek povolil — dveře jsou vždy "otevřené" a nejdou zavřít.
        // Během doorDeathReveal (viz ENEMY_ADVANCE/TICK) je hra fakticky u konce —
        // dveře se nedají přepnout, ať hráč "neuteče" z už rozhodnuté smrti.
        if (
          !state.isRunning ||
          state.playerView !== "door" ||
          state.gameStatus === "blackout" ||
          state.doorDeathRevealUntilMs !== null
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
          bulbReplacement:
            !state.doorClosed && state.bulbReplacement.active ? INACTIVE_BULB_REPLACEMENT : state.bulbReplacement,
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
        };

      case "LOOK_AT_DESK":
        if (!state.isRunning || state.doorDeathRevealUntilMs !== null) return state;
        // Odchod z DoorView zruší rozběhnutou výměnu žárovky (beze změny
        // životnosti/broken) — riziko je "zůstaň u otevřených dveří", ne jen
        // "klikni a schovej se", viz START_BULB_REPLACEMENT.
        return {
          ...state,
          playerView: "desk",
          bulbReplacement: state.bulbReplacement.active ? INACTIVE_BULB_REPLACEMENT : state.bulbReplacement,
        };

      case "LOOK_AT_GENERATOR":
        if (!state.isRunning || state.doorDeathRevealUntilMs !== null) return state;
        return {
          ...state,
          playerView: "generator",
          cameraOpen: false,
          activeCameraId: null,
          cameraViewMode: "overview",
          cameraFocusUntilMs: null,
          bulbReplacement: state.bulbReplacement.active ? INACTIVE_BULB_REPLACEMENT : state.bulbReplacement,
        };

      case "LOOK_AT_LEFT_WALL":
        // Čistě atmosférický pohled bez vlastní herní logiky — stejně jako
        // LOOK_AT_GENERATOR zavře kamery a odchod od stolu, ale nic dalšího
        // (žádný drain, žádný nový mechanický stav).
        if (!state.isRunning || state.doorDeathRevealUntilMs !== null) return state;
        return {
          ...state,
          playerView: "left_wall",
          cameraOpen: false,
          activeCameraId: null,
          cameraViewMode: "overview",
          cameraFocusUntilMs: null,
          bulbReplacement: state.bulbReplacement.active ? INACTIVE_BULB_REPLACEMENT : state.bulbReplacement,
        };

      case "LOOK_AT_MAP":
        // Čistě informativní pohled bez vlastní herní logiky — stejný vzor
        // jako LOOK_AT_LEFT_WALL (zavře kamery, zruší rozběhnutou výměnu
        // žárovky), žádný drain, žádná změna trasy nepřítele.
        if (!state.isRunning || state.doorDeathRevealUntilMs !== null) return state;
        return {
          ...state,
          playerView: "object_map",
          cameraOpen: false,
          activeCameraId: null,
          cameraViewMode: "overview",
          cameraFocusUntilMs: null,
          bulbReplacement: state.bulbReplacement.active ? INACTIVE_BULB_REPLACEMENT : state.bulbReplacement,
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
        return {
          ...state,
          cameraOpen: false,
          activeCameraId: null,
          cameraViewMode: "overview",
          cameraFocusUntilMs: null,
        };

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
            return { ...state, elapsedMs, remainingMs, isRunning: false, screen: "death" };
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

          if (night.blackout.canBeSurvivedIfShiftEnds && remainingMs <= 0) {
            return {
              ...state,
              elapsedMs,
              remainingMs: 0,
              blackoutElapsedMs,
              blackoutPhaseSeq,
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
              isRunning: false,
              screen: "death",
              deathReason: "blackout_timeout",
            };
          }

          return { ...state, elapsedMs, remainingMs, blackoutElapsedMs, blackoutPhaseSeq };
        }

        const generatorUpdate = updateGenerator(state, night, elapsedMs);
        const doorLightRepelUpdate = updateDoorLightRepel(state, night, action.deltaMs);
        // Životnost žárovky se počítá z PŘED-tikového state.lightOn (stejně
        // jako applyPowerDelta níže) — pokud tenhle tik žárovka právě praskne,
        // spotřeba/drain za tenhle tik se ještě počítá, jako by svítila celou
        // dobu; teprve od PŘÍŠTÍHO tiku je lightOn skutečně false.
        const roomBulbsUpdate = updateRoomBulbs(state, action.deltaMs);
        // Nezávislé na roomBulbsUpdate výše (ta žárovku nikdy neopraví, jen
        // nechá prasknout) — dokud běží výměna je žárovka pořád `broken`,
        // takže obě aktualizace roomBulbs se nikdy nepřebíjí protichůdně.
        const bulbReplacementUpdate = updateBulbReplacement(state, action.deltaMs);
        const power = applyPowerDelta({ ...state, ...generatorUpdate }, night, action.deltaMs, nightScaling);

        if (power <= 0) {
          // Baterie na nule -> blackout, ne okamžitá smrt. Zámek povolí (dveře
          // "otevřené"), systémy jdou vypnout — viz TOGGLE_DOOR/TOGGLE_LIGHT/
          // OPEN_CAMERA/RESTART_GENERATOR guardy výše. Rozběhnutá výměna
          // žárovky se zruší beze změny životnosti/broken — blackout přeruší
          // i tohle, stejně jako všechno ostatní.
          return {
            ...state,
            ...generatorUpdate,
            ...doorLightRepelUpdate,
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
          };
        }

        if (remainingMs <= 0) {
          return {
            ...state,
            ...generatorUpdate,
            ...doorLightRepelUpdate,
            ...roomBulbsUpdate,
            ...bulbReplacementUpdate,
            elapsedMs,
            remainingMs: 0,
            power,
            isRunning: false,
            screen: "win",
          };
        }

        return {
          ...state,
          ...generatorUpdate,
          ...doorLightRepelUpdate,
          ...roomBulbsUpdate,
          ...bulbReplacementUpdate,
          elapsedMs,
          remainingMs,
          power,
        };
      }

      case "ENEMY_ADVANCE": {
        // V blackoutu je pozice nepřítele zamrzlá — hrozbu odteď representuje
        // blackoutElapsedMs v TICKu, ne další postup po trase. Během
        // doorDeathReveal je útok už rozhodnutý (viz níže) — žádný další
        // postup/rozhodnutí nepřítele už nemá smysl počítat.
        if (!state.isRunning || state.gameStatus === "blackout" || state.doorDeathRevealUntilMs !== null)
          return state;

        const route = state.enemyRoute;
        const currentIndex = route.indexOf(state.enemyStage);
        const atDoorStage = isAtDoorStage(state);

        if (atDoorStage) {
          if (state.doorClosed) {
            const since = state.enemyAtDoorSinceMs ?? state.elapsedMs;
            const target = state.enemyDoorHoldTargetMs ?? rollDoorHoldTargetMs(night.enemy);
            // Nezávislé na světle — kombinovaný efekt dveří+světla řeší
            // doorLightRepelMs v TICKu (updateDoorLightRepel výše), ne tohle.
            const progress = state.enemyDoorHoldProgressMs + night.enemyTickMs;

            if (progress >= target) {
              const retreatedTo = pickMonsterRetreatLocation(route);
              return {
                ...state,
                enemyStage: retreatedTo,
                lastEnemyDecision: "gave_up",
                enemyAtDoorSinceMs: null,
                enemyDoorHoldTargetMs: null,
                enemyDoorHoldProgressMs: 0,
                monsterRetreatedTo: retreatedTo,
                // Bez požadavku na ověření (easy, nebo vypnuté
                // monsterRetreatVerificationEnabled tuhle noc) rovnou
                // "ověřeno" -> dveře jdou otevřít bez dalšího kroku (viz
                // TOGGLE_DOOR).
                monsterRetreatVerified: !requireMonsterRetreatVerification,
              };
            }
            return {
              ...state,
              lastEnemyDecision: "waiting_at_door",
              enemyAtDoorSinceMs: since,
              enemyDoorHoldTargetMs: target,
              enemyDoorHoldProgressMs: progress,
            };
          }

          // Dveře otevřené a nepřítel je u nich -> útok.
          if (state.playerView === "door") {
            // Hráč se dívá přímo na dveře — smrt se nefinalizuje hned
            // (isRunning/screen zůstávají beze změny), nejdřív krátký
            // doorDeathReveal moment (viz TICK výše), který dokončí přechod
            // na "death" po DOOR_DEATH_REVEAL_DURATION_MS. Viz GAME_DESIGN.md
            // "Smrt u dveří". Ruční výměna žárovky je jediný způsob, jak tu
            // může být bulbReplacement.active === true (jde jen z DoorView,
            // jen s otevřenými dveřmi) — dostane vlastní death reason/text
            // (viz DeathScreen.tsx), zbytek sekvence je stejný.
            return {
              ...state,
              enemyStage: "attack",
              lastEnemyDecision: "attack",
              deathReason: state.bulbReplacement.active ? "bulb_replacement_attack" : "door_open_at_attack",
              doorDeathRevealUntilMs: state.elapsedMs + DOOR_DEATH_REVEAL_DURATION_MS,
            };
          }

          // Hráč sleduje kamery/generátor, ne dveře — záměrně ho na DoorView
          // nepřepínáme (na žádost, viz GAME_DESIGN.md), klasická okamžitá
          // smrt beze změny. Tenhle případ dostane vlastní obrazovku později.
          return {
            ...state,
            enemyStage: "attack",
            lastEnemyDecision: "attack",
            isRunning: false,
            screen: "death",
            deathReason: "door_open_at_attack",
          };
        }

        // Postup/setrvání/ústup — nezávislé pravděpodobnosti, zbytek (1 - advance - retreat)
        // znamená setrvání. Sledování na kameře jen zpomaluje postup, ústup neovlivňuje.
        const watched = isEnemyBeingWatched(state, night);
        const advanceChance = night.enemy.advanceChance * (watched ? night.enemy.watchedAdvanceMultiplier : 1);
        const retreatChance = night.enemy.retreatChance;
        const roll = Math.random();

        let nextIndex = currentIndex;
        let decision: GameState["lastEnemyDecision"] = "stay";

        if (roll < advanceChance) {
          nextIndex = Math.min(currentIndex + 1, route.length - 1);
          decision = "advance";
        } else if (roll < advanceChance + retreatChance) {
          nextIndex = Math.max(currentIndex - 1, 0);
          // Na první pozici (nebo pokud by index nezměnil) nemá ústup kam jít — bere se jako setrvání.
          decision = nextIndex === currentIndex ? "stay" : "retreat";
        }

        if (nextIndex === currentIndex) {
          return { ...state, lastEnemyDecision: decision };
        }

        const nextStage = route[nextIndex];
        const nextIsAtDoor = nextStage === "at_door" || nextStage === "breach";

        return {
          ...state,
          enemyStage: nextStage,
          lastEnemyDecision: decision,
          enemyAtDoorSinceMs: nextIsAtDoor ? state.elapsedMs : null,
          enemyDoorHoldTargetMs: null,
          enemyDoorHoldProgressMs: 0,
        };
      }

      case "RECHARGE_POWER":
        if (action.amount <= 0 || !state.isRunning) return state;
        return { ...state, power: clamp(state.power + action.amount, 0, MAX_POWER) };

      case "EMERGENCY_MINIGAME_DIED":
        // Stejný death flow jako ostatní smrti (viz TICK blackout_timeout /
        // ENEMY_ADVANCE výše) — jen spuštěný zvenčí, ne z herní smyčky.
        if (!state.isRunning) return state;
        return { ...state, isRunning: false, screen: "death", deathReason: "emergency_run" };

      default:
        return state;
    }
  };
}
