import { EnemyDefinition, GameState, MonsterRepelRadioResult, NightDefinition } from "../core/types";
import { isDoorAttackBlockedByClosedDoor, isDoorAttackGraceActive, isMonsterAtDoor } from "../core/doorEncounter";
import { isMonsterMinStayBlocking } from "../core/monsterMinStay";
import { isSonicCannonAffectingEnemy } from "../core/sonicCannon";
import { isNearRoomLightActive } from "../core/roomBulbs";
import { attemptGhoulCameraAttack } from "../core/cameraDamage";
import { GHOUL_CAMERA_ATTACK_RETREAT_PAUSE_MS } from "../core/cameraDamageConfig";
import { resolveLivesRemainingAfterDeath } from "../core/gameMode";
import { stepBackOneStage } from "../core/enemyRoute";
import {
  DOOR_DEATH_REVEAL_DURATION_MS,
  SONIC_CANNON_ADVANCE_CHANCE,
  SONIC_CANNON_RETREAT_CHANCE,
  SONIC_CANNON_RETREAT_REVEAL_MS,
} from "../balancing/constants";

// Impovo rozhodování pro ENEMY_ADVANCE (viz zadání "vyčleň současnou
// rozhodovací logiku hlavního monstra z reduceru do samostatné testovatelné
// vrstvy pro Impa") — jde o MECHANICKOU extrakci: každá větev tu je stejná
// jako byla dřív přímo v gameReducer.ts, jen bez `...state,` na začátku
// (reducer si `{...state, ...resolveImpAdvance(...)}` skládá sám). Žádná
// změna pořadí, žádná změna podmínek, žádná změna pravděpodobností, žádná
// změna počtu/pořadí volání náhody. Obecné "má vůbec smysl dnes cokoliv
// počítat" guardy (isRunning/blackout/doorDeathReveal/monsterDefeated/
// sonicCannonPendingRetreat) zůstávají v reduceru — nejsou o rozhodování
// KONKRÉTNÍHO monstra, ale o tom, jestli se má monster resolver vůbec volat.

/**
 * Vstup resolveru — explicitní, ne univerzální "kontext" (viz zadání).
 * `state`/`night` jsou stejné typy, jaké už dnes berou sousední čisté funkce
 * (isMonsterAtDoor(state), isSonicCannonAffectingEnemy(state, night),
 * attemptGhoulCameraAttack(state, night, ...)) — kopírovat jen POUŽÍVANÉ
 * dílčí pole by vytvořilo delší a křehčí signaturu, ne jednodušší.
 */
export interface ResolveImpAdvanceInput {
  state: GameState;
  night: NightDefinition;
  /** Viz cameraDamageConfig.ts#MAX_DISABLED_CAMERAS_BY_NIGHT — limit vyřazených kamer podle čísla noci. */
  currentNightNumber: number;
  /** `rules.monster_check_or_return && state.nightFeatures.monsterRetreatVerificationEnabled` — počítá se jednou na akci v gameReducer.ts, sem přichází jako hotová hodnota (viz zadání "neduplikuj obecnou mechaniku"). */
  requireMonsterRetreatVerification: boolean;
  /**
   * Injektovaný zdroj náhody (viz zadání "randomizace je citlivá") —
   * výchozí `Math.random` v produkci, testy předají deterministickou
   * funkci. Volá se PŘESNĚ jednou za vyhodnocení (stejně jako dřív
   * `Math.random()` přímo v gameReducer.ts).
   */
  random?: () => number;
}

/**
 * Výsledek je částečný update `GameState` (přesně to, co jednotlivé větve
 * dřív vracely jako `{...state, X, Y, Z}`, jen bez `...state`) — ne nový
 * celý stav, ne umělý "decision" typ s poli, která dnes nejsou potřeba (viz
 * zadání "nejmenší bezpečná varianta"). Reducer aplikuje přes
 * `{...state, ...resolveImpAdvance(input)}`.
 */
export type ImpAdvanceResult = Partial<GameState>;

/** Vylosuje (jednou na standoff u zavřených dveří) cíl efektivního čekání, než se Imp vzdá — viz doorHoldRangeMs (imp.ts, přes MonsterDefinition.gameplay) a použití níže. */
function rollDoorHoldTargetMs(enemy: EnemyDefinition, random: () => number): number {
  const { min, max } = enemy.doorHoldRangeMs;
  return min + random() * (max - min);
}

/**
 * Impovo rozhodnutí pro jeden ENEMY_ADVANCE tik — volá se JEN když reducer
 * už ověřil obecné podmínky (běží, není blackout, neběží doorDeathReveal/
 * sonicCannonPendingRetreat, monstrum není poražené). Pořadí větví, hodnoty
 * pravděpodobností a časování jsou beze změny oproti dřívější přímé
 * implementaci v gameReducer.ts#ENEMY_ADVANCE.
 */
export function resolveImpAdvance(input: ResolveImpAdvanceInput): ImpAdvanceResult {
  const { state, night, currentNightNumber, requireMonsterRetreatVerification } = input;
  const random = input.random ?? Math.random;

  const route = state.enemyRoute;
  const currentIndex = route.indexOf(state.enemyStage);
  const atDoorStage = isMonsterAtDoor(state);

  if (atDoorStage) {
    // Útok NASTANE (monstrum je u dveří), ale zavřené dveře ho zablokují —
    // přesně a jedině tahle podmínka smí spustit bušení do dveří (viz
    // doorEncounter.ts#isDoorAttackBlockedByClosedDoor, GameState.doorBangSeq).
    if (isDoorAttackBlockedByClosedDoor(state)) {
      const since = state.enemyAtDoorSinceMs ?? state.elapsedMs;
      const target = state.enemyDoorHoldTargetMs ?? rollDoorHoldTargetMs(night.enemy, random);
      // Nezávislé na světle — kombinovaný efekt dveří+světla řeší
      // doorLightRepelMs v TICKu (gameReducer.ts#updateDoorLightRepel), ne tohle.
      const progress = state.enemyDoorHoldProgressMs + night.enemyTickMs;

      if (progress >= target) {
        // O jeden krok zpět (ne teleport na náhodný bod jako dřív) +
        // dočasné okno nejslabší ze tří zvýšené šance na ústup.
        const retreatedTo = stepBackOneStage(route, state.enemyStage);
        return {
          enemyStage: retreatedTo,
          lastEnemyDecision: "gave_up",
          enemyAtDoorSinceMs: null,
          enemyDoorHoldTargetMs: null,
          enemyDoorHoldProgressMs: 0,
          monsterRetreatedTo: retreatedTo,
          // Bez požadavku na ověření rovnou "ověřeno" -> dveře jdou otevřít
          // bez dalšího kroku (viz TOGGLE_DOOR v gameReducer.ts).
          monsterRetreatVerified: !requireMonsterRetreatVerification,
          // I tenhle poslední, "vzdávající se" tik byl pořád zablokovaný
          // útok (dveře ho zachránily naposledy, než se monstrum stáhlo).
          doorBangSeq: state.doorBangSeq + 1,
          enemyForcedRetreatUntilMs: state.elapsedMs + night.enemy.forcedRetreatAfterGaveUp.durationMs,
          enemyForcedRetreatChance: night.enemy.forcedRetreatAfterGaveUp.chance,
          enemyForcedRetreatNextStepAtMs: state.elapsedMs + night.enemyTickMs,
        };
      }
      return {
        lastEnemyDecision: "waiting_at_door",
        enemyAtDoorSinceMs: since,
        enemyDoorHoldTargetMs: target,
        enemyDoorHoldProgressMs: progress,
        doorBangSeq: state.doorBangSeq + 1,
      };
    }

    // Dveře otevřené a Imp je u nich -> útok BY nastal, POKUD neběží grace
    // period po návratu z minihry (viz GameState.enemyDoorAttackGraceUntilMs,
    // doorEncounter.ts#isDoorAttackGraceActive).
    if (isDoorAttackGraceActive(state)) {
      return { lastEnemyDecision: "office_threat_grace" };
    }

    if (state.playerView === "door") {
      // Hráč se dívá přímo na dveře — smrt se nefinalizuje hned, nejdřív
      // krátký doorDeathReveal moment (viz TICK v gameReducer.ts). Ruční
      // výměna žárovky dostane vlastní death reason/text.
      return {
        enemyStage: "attack",
        lastEnemyDecision: "attack",
        deathReason: state.bulbReplacement.active ? "bulb_replacement_attack" : "door_open_at_attack",
        doorDeathRevealUntilMs: state.elapsedMs + DOOR_DEATH_REVEAL_DURATION_MS,
      };
    }

    // Hráč sleduje kamery/generátor, ne dveře — záměrně ho na DoorView
    // nepřepínáme, klasická okamžitá smrt beze změny.
    return {
      enemyStage: "attack",
      lastEnemyDecision: "attack",
      isRunning: false,
      screen: "death",
      deathReason: "door_open_at_attack",
      livesRemaining: resolveLivesRemainingAfterDeath(state.gameMode, state.livesRemaining),
    };
  }

  // Viditelný útěk po odražení (viz GameState.enemyForcedRetreatUntilMs) —
  // dokud okno běží, Imp se nemůže přiblížit (advanceChance 0) a má
  // vynucenou/zvýšenou šanci na další ústup místo běžných hodnot noci.
  const forcedRetreatActive = state.enemyForcedRetreatUntilMs !== null && state.elapsedMs < state.enemyForcedRetreatUntilMs;
  // ENEMY_ADVANCE běží na vlastním intervalu nezávislém na tom, kdy repel
  // doopravdy proběhl — bez tohohle gate by první krok po repelu mohl přijít
  // skoro okamžitě. Dokud další krok "není due", jen čeká — žádný roll.
  const forcedRetreatStepDue =
    !forcedRetreatActive || state.enemyForcedRetreatNextStepAtMs === null || state.elapsedMs >= state.enemyForcedRetreatNextStepAtMs;

  if (forcedRetreatActive && !forcedRetreatStepDue) {
    return { lastEnemyDecision: "stay" };
  }

  const forcedRetreatFieldsUpdate: Pick<
    GameState,
    "enemyForcedRetreatUntilMs" | "enemyForcedRetreatChance" | "enemyForcedRetreatNextStepAtMs"
  > = forcedRetreatActive
    ? {
        enemyForcedRetreatUntilMs: state.enemyForcedRetreatUntilMs,
        enemyForcedRetreatChance: state.enemyForcedRetreatChance,
        // Tenhle krok se právě "spotřebovává" — další smí přijít nejdřív za
        // další celou enemyTickMs periodu.
        enemyForcedRetreatNextStepAtMs: state.elapsedMs + night.enemyTickMs,
      }
    : { enemyForcedRetreatUntilMs: null, enemyForcedRetreatChance: null, enemyForcedRetreatNextStepAtMs: null };

  // Minimální pobyt v lokaci (viz game/core/monsterMinStay.ts) — platí JEN
  // pro tenhle běžný pravděpodobnostní hod, nikdy pro forcedRetreat okno
  // výše. Blokovaný tik neprovede žádný roll.
  if (!forcedRetreatActive && isMonsterMinStayBlocking(state)) {
    return { ...forcedRetreatFieldsUpdate, lastEnemyDecision: "stay" };
  }

  // Postup/setrvání/ústup — nezávislé pravděpodobnosti, zbytek (1 - advance
  // - retreat) znamená setrvání. Jedině aktivní sonické dělo mířící na
  // kameru, kde se Imp skutečně nachází, dočasně nahradí výchozí
  // pravděpodobnosti za SONIC_CANNON_*_CHANCE, PŘESNĚ pro tenhle jeden hod.
  const sonicEffective = !forcedRetreatActive && isSonicCannonAffectingEnemy(state, night);
  const advanceChance = forcedRetreatActive ? 0 : sonicEffective ? SONIC_CANNON_ADVANCE_CHANCE : night.enemy.advanceChance;
  const retreatChance = forcedRetreatActive
    ? (state.enemyForcedRetreatChance ?? night.enemy.retreatChance)
    : sonicEffective
      ? SONIC_CANNON_RETREAT_CHANCE
      : night.enemy.retreatChance;
  const roll = random();

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

  // Sonický rádiový výsledek — VÝHRADNĚ pro tenhle jeden hod, kdy
  // `sonicEffective` bylo true. "retreat" -> "success", "stay" -> "stay",
  // "advance" -> "fail" (z pohledu hráče dělo selhalo).
  const sonicResult: MonsterRepelRadioResult | null = sonicEffective
    ? decision === "retreat"
      ? "success"
      : decision === "advance"
        ? "fail"
        : "stay"
    : null;
  // Auto-off — PŘESNĚ ve stejném update objektu jako sonicResult, ať výsledek
  // a vypnutí dorazí do UI ATOMICKY spolu. Platí pro VŠECHNY tři výsledky stejně.
  const sonicResultUpdate: Pick<
    GameState,
    "sonicCannonResultSeq" | "lastSonicCannonResult" | "sonicCannonActive" | "sonicCannonToggleSeq" | "lastSonicCannonToggleReason"
  > =
    sonicResult !== null
      ? {
          sonicCannonResultSeq: state.sonicCannonResultSeq + 1,
          lastSonicCannonResult: sonicResult,
          sonicCannonActive: false,
          sonicCannonToggleSeq: state.sonicCannonToggleSeq + 1,
          lastSonicCannonToggleReason: "result_auto_off",
        }
      : {
          sonicCannonResultSeq: state.sonicCannonResultSeq,
          lastSonicCannonResult: state.lastSonicCannonResult,
          sonicCannonActive: state.sonicCannonActive,
          sonicCannonToggleSeq: state.sonicCannonToggleSeq,
          lastSonicCannonToggleReason: state.lastSonicCannonToggleReason,
        };

  // Vzácná reakce Ghoula na sonické dělo — hod proběhne PŘI KAŽDÉM použití
  // sonického děla na Impa (sonicEffective), BEZ OHLEDU na sonicResult.
  // Ghoulova schopnost (summon_ghoul_camera_attack) zůstává Impova — trigger
  // je součástí tohohle rozhodování, samotné PROVEDENÍ eventu (animace,
  // poškození kamery, zvuky) žije dál v game/core/cameraDamage.ts, beze změny.
  const cameraDamage = sonicEffective
    ? attemptGhoulCameraAttack(state, night, currentNightNumber, isNearRoomLightActive(state), state.debugGhoulCameraAttackChanceOverride)
    : state.cameraDamage;
  const cameraAttackTriggered = cameraDamage !== state.cameraDamage;
  const cameraAttackUpdate: Pick<GameState, "cameraDamage" | "cameraAttackStartedSeq"> = {
    cameraDamage,
    cameraAttackStartedSeq: cameraAttackTriggered ? state.cameraAttackStartedSeq + 1 : state.cameraAttackStartedSeq,
  };

  // Útok na kameru PŘEBÍRÁ kontrolu nad výsledným pohybem tohohle hodu —
  // normální nextIndex/decision/forcedRetreatFieldsUpdate spočítané výše se
  // v tomhle případě ZAHODÍ, ať k pohybu dojde jen JEDNOU. Imp ustoupí
  // přesně o jeden krok směrem ven, pak dostane krátkou pauzu.
  if (cameraAttackTriggered) {
    const retreatedTo = stepBackOneStage(route, state.enemyStage);
    const cameraAttackMovementUpdate: Pick<
      GameState,
      "enemyForcedRetreatUntilMs" | "enemyForcedRetreatChance" | "enemyForcedRetreatNextStepAtMs"
    > = {
      enemyForcedRetreatUntilMs: state.elapsedMs + GHOUL_CAMERA_ATTACK_RETREAT_PAUSE_MS,
      enemyForcedRetreatChance: 0,
      enemyForcedRetreatNextStepAtMs: state.elapsedMs + night.enemyTickMs,
    };
    return {
      ...sonicResultUpdate,
      ...cameraAttackUpdate,
      ...cameraAttackMovementUpdate,
      enemyStage: retreatedTo,
      lastEnemyDecision: "ghoul_camera_attack",
      enemyAtDoorSinceMs: null,
      enemyDoorHoldTargetMs: null,
      enemyDoorHoldProgressMs: 0,
    };
  }

  // Sonické odražení musí být VIDĚT — na rozdíl od gave_up/light/UV repelů
  // (ty přesouvají Impa NA kamerou viditelnou stage) sonický ústup posouvá
  // Impa PRYČ ze sledované kamery, takže okamžitá změna stage by nikdy
  // nebyla vidět. `enemyStage` proto zůstává beze změny až do konce revealu.
  if (sonicEffective && decision === "retreat") {
    return {
      ...sonicResultUpdate,
      ...cameraAttackUpdate,
      lastEnemyDecision: "retreat",
      monsterRetreatRoarSeq: state.monsterRetreatRoarSeq + 1,
      sonicCannonPendingRetreat: {
        targetStage: route[nextIndex],
        revealUntilMs: state.elapsedMs + SONIC_CANNON_RETREAT_REVEAL_MS,
      },
    };
  }

  if (nextIndex === currentIndex) {
    return { ...forcedRetreatFieldsUpdate, ...sonicResultUpdate, ...cameraAttackUpdate, lastEnemyDecision: decision };
  }

  const nextStage = route[nextIndex];
  const nextIsAtDoor = nextStage === "at_door" || nextStage === "breach";

  return {
    ...forcedRetreatFieldsUpdate,
    ...sonicResultUpdate,
    ...cameraAttackUpdate,
    enemyStage: nextStage,
    lastEnemyDecision: decision,
    enemyAtDoorSinceMs: nextIsAtDoor ? state.elapsedMs : null,
    enemyDoorHoldTargetMs: null,
    enemyDoorHoldProgressMs: 0,
  };
}
