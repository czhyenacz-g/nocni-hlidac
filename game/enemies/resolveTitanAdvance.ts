import { EnemyStage, GameState, NightDefinition } from "../core/types";
import { resolveLivesRemainingAfterDeath } from "../core/gameMode";
import { TITAN_DOOR_BREACH_STAGE_STAY_MS, TITAN_STAGE_STAY_MS } from "../balancing/constants";

// Dveřní stage (at_door/breach) mají mnohem kratší dobu setrvání než hlavní
// trasa (viz TITAN_DOOR_BREACH_STAGE_STAY_MS — oprava "příliš dlouhé
// animace prorážení dveří") — dvě rychlé přechodové fáze, ne další plná
// čekací lokace. Explicitní pole (ne jen "poslední N stage"), ať je záměr
// čitelný a odolný vůči budoucí změně trasy.
const DOOR_BREACH_STAGES: readonly EnemyStage[] = ["at_door", "breach"];

/** Kolik ms má Titan zůstat v daném route stage, než postoupí dál — jediné místo, které tohle rozhoduje (viz zadání "nastav délky explicitně podle jednotlivých fází"). */
export function resolveTitanStageStayMs(stage: EnemyStage): number {
  return DOOR_BREACH_STAGES.includes(stage) ? TITAN_DOOR_BREACH_STAGE_STAY_MS : TITAN_STAGE_STAY_MS;
}

// Titanovo rozhodování pro ENEMY_ADVANCE (viz zadání "2. TITAN PRO 15. NOC",
// "6. TITAN TIMER") — záměrně mnohem jednodušší než resolveImpAdvance.ts:
// žádný Math.random hod, žádné couvání, žádné dveřní čekání/standoff, žádná
// reakce na retreat/repel mechaniky (ty žijí buď uvnitř resolveImpAdvance,
// kam se resolveTitanAdvance vůbec nedostane, nebo mají explicitní
// `night.enemy.id === "titan"` guard přímo v gameReducer.ts, viz
// updateDoorLightRepel/updateDoorHallwayUvRepel). Postup je čistě časový:
// každou běžnou stage (mimo "attack"/"graveyard") stráví přesně
// `resolveTitanStageStayMs(stage)` (TITAN_STAGE_STAY_MS mimo dveře,
// TITAN_DOOR_BREACH_STAGE_STAY_MS v at_door/breach, viz výše), pak postoupí
// o JEDNU stage dál po `state.enemyRoute` (stejné pole jako Imp — vylosované
// jednou při startu směny, pro Titana má jen jednu možnou variantu, viz
// monsterDefinitions.ts#TITAN.gameplay.routeVariants).
//
// Deterministický zdroj času je existující `GameState.enemyLocationEnteredAtMs`
// (viz game/core/monsterMinStay.ts pro stejný vzor) — reducer ho automaticky
// aktualizuje při KAŽDÉ změně `enemyStage` (gameReducer.ts#withEnemyStageVisitSeed),
// takže tahle funkce nepotřebuje žádné vlastní/nové časové pole. Víc
// ENEMY_ADVANCE tiků v jednom okamžiku nemůže posunout Titana vícekrát
// chybně — `enemyTickMs` běží na jediném `setInterval` (game/core/gameLoop.ts),
// nikdy dva tiky "najednou", a i kdyby, čerstvě posunutá stage by měla
// `elapsedMs - enemyLocationEnteredAtMs` blízko nule (pod TITAN_STAGE_STAY_MS).

export interface ResolveTitanAdvanceInput {
  state: GameState;
  night: NightDefinition;
}

export type TitanAdvanceResult = Partial<GameState>;

export function resolveTitanAdvance(input: ResolveTitanAdvanceInput): TitanAdvanceResult {
  const { state, night } = input;

  // "attack" je finální stav (spustí/spustil už player-death flow) a
  // "graveyard" je definitivní vyřazení generátorovým přetížením
  // (updateDoorGeneratorOverload, beze změny) — v obou případech už není co
  // rozhodovat, žádný další postup.
  if (state.enemyStage === "attack" || state.enemyStage === "graveyard") {
    return {};
  }

  const route = state.enemyRoute;
  const currentIndex = route.indexOf(state.enemyStage);
  if (currentIndex === -1 || currentIndex >= route.length - 1) {
    return {};
  }

  const stageElapsedMs = state.elapsedMs - state.enemyLocationEnteredAtMs;
  if (stageElapsedMs < resolveTitanStageStayMs(state.enemyStage)) {
    return { lastEnemyDecision: "stay" };
  }

  const nextStage = route[currentIndex + 1];

  if (nextStage === "attack") {
    // Stejná finalizace jako Impovo "hráč se nedívá na dveře" větev
    // (resolveImpAdvance.ts) — okamžitá smrt, žádný mezikrok. `playerView`
    // se tu ZÁMĚRNĚ nenastavuje znovu — pokud hráč sledoval dveře (buď
    // ručně, nebo díky automatickému přepnutí při vstupu do "breach" níže),
    // zůstává tam beze změny. 4s GAME OVER reveal teď žije čistě v
    // DeathScreen.tsx (game/death/gameOverReveal.ts), ne v reduceru/GameState.
    return {
      enemyStage: "attack",
      lastEnemyDecision: "attack",
      isRunning: false,
      screen: "death",
      // VLASTNÍ DeathReason, ne sdílený s Impovým door_open_at_attack (viz
      // zadání "oprav dvojitý Game Over" — sdílená hodnota dřív způsobila
      // zavádějící "otevřené dveře" text/pozadí i u Titana, který dveře
      // prorazí bez ohledu na jejich stav).
      deathReason: "titan_door_breach",
      livesRemaining: resolveLivesRemainingAfterDeath(state.gameMode, state.livesRemaining),
    };
  }

  if (nextStage === "breach") {
    // Poslední nevratný okamžik (viz zadání "Automatické přepnutí na dveře
    // při finálním útoku Titana" — "at_door" ještě NENÍ tenhle stav, tam má
    // hráč poslední reálnou šanci na overload, viz
    // game/core/titanEncounter.ts#isTitanBreachIrreversible). Přesně
    // JEDNOU, PŘI přechodu DO "breach" (ne opakovaně — tahle větev se
    // vyhodnotí jen na skutečnou změnu stage), automaticky přepne pohled na
    // dveře. Nastavení `playerView: "door"`, i když tam hráč UŽ je, je
    // neškodné — stejná hodnota, React na tom nic nepřekreslí navíc, žádné
    // probliknutí (viz zadání "pokud už se hráč na dveře dívá, nesmí dojít
    // k probliknutí"). Zpětné přepnutí pryč ze dveří je od tohohle
    // okamžiku zamčené — viz gameReducer.ts LOOK_AT_DESK/LOOK_AT_GENERATOR/
    // LOOK_AT_LEFT_WALL/LOOK_AT_MAP guardy.
    return {
      enemyStage: nextStage,
      lastEnemyDecision: "advance",
      // Stejná pole jako ruční LOOK_AT_DOOR (gameReducer.ts) — vynucené
      // přepnutí má mít IDENTICKÝ vedlejší efekt jako běžný odchod na dveře,
      // ne jen samotné playerView.
      playerView: "door",
      cameraOpen: false,
      activeCameraId: null,
      cameraViewMode: "overview",
      cameraFocusUntilMs: null,
      generatorOverloadWindup: state.generatorOverloadWindup.active
        ? { active: false, startedAtMs: null, progressMs: 0 }
        : state.generatorOverloadWindup,
    };
  }

  return { enemyStage: nextStage, lastEnemyDecision: "advance" };
}
