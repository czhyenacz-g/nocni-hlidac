import { GameState, NightDefinition } from "../core/types";
import { resolveLivesRemainingAfterDeath } from "../core/gameMode";
import { TITAN_STAGE_STAY_MS } from "../balancing/constants";

// Titanovo rozhodování pro ENEMY_ADVANCE (viz zadání "2. TITAN PRO 15. NOC",
// "6. TITAN TIMER") — záměrně mnohem jednodušší než resolveImpAdvance.ts:
// žádný Math.random hod, žádné couvání, žádné dveřní čekání/standoff, žádná
// reakce na retreat/repel mechaniky (ty žijí buď uvnitř resolveImpAdvance,
// kam se resolveTitanAdvance vůbec nedostane, nebo mají explicitní
// `night.enemy.id === "titan"` guard přímo v gameReducer.ts, viz
// updateDoorLightRepel/updateDoorHallwayUvRepel). Postup je čistě časový:
// každou běžnou stage (mimo "attack"/"graveyard") stráví přesně
// TITAN_STAGE_STAY_MS, pak postoupí o JEDNU stage dál po `state.enemyRoute`
// (stejné pole jako Imp — vylosované jednou při startu směny, pro Titana má
// jen jednu možnou variantu, viz monsterDefinitions.ts#TITAN.gameplay.routeVariants).
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
  if (stageElapsedMs < TITAN_STAGE_STAY_MS) {
    return { lastEnemyDecision: "stay" };
  }

  const nextStage = route[currentIndex + 1];

  if (nextStage === "attack") {
    // Stejná finalizace jako Impovo "hráč se nedívá na dveře" větev
    // (resolveImpAdvance.ts) — okamžitá smrt, žádný mezikrok. Titan
    // ignoruje `playerView`/dveřní reveal úplně (viz zadání "unstoppable
    // hrozba") — 4s GAME OVER reveal teď žije čistě v DeathScreen.tsx
    // (game/death/gameOverReveal.ts), ne v reduceru/GameState.
    return {
      enemyStage: "attack",
      lastEnemyDecision: "attack",
      isRunning: false,
      screen: "death",
      // Titan prolomil dveře stejně jako Impův door_open_at_attack — sdílí
      // stejný DeathReason (stejná kategorie smrti, žádný nový text potřeba).
      deathReason: "door_open_at_attack",
      livesRemaining: resolveLivesRemainingAfterDeath(state.gameMode, state.livesRemaining),
    };
  }

  return { enemyStage: nextStage, lastEnemyDecision: "advance" };
}
