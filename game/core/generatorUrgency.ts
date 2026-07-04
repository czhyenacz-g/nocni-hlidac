import { GameState, GeneratorDefinition } from "./types";
import { GENERATOR_URGENT_BLINK_DELAY_MS } from "../balancing/constants";

/**
 * Jestli má blikat šipka "Zkontrolovat generátor →" v DeskView.tsx — čistě
 * odvozený stav, žádný vlastní TICK. `silentFault` bliká okamžitě (tichý
 * generátor je jediný náznak, že se něco děje, dokud nevyprší reakční čas).
 * `criticalBeeping` (rychlé pípání + rychlý pokles energie) blikat začne až
 * po `GENERATOR_URGENT_BLINK_DELAY_MS` — hráč má nejdřív zaregistrovat pípání
 * a klesající energii, ne hned i blikající tlačítko (viz GAME_DESIGN.md
 * "Generátor"). `restarting` (tichý trest za zbytečný restart) nebliká vůbec.
 */
export function isGeneratorArrowUrgent(state: GameState, generator: GeneratorDefinition): boolean {
  if (state.generatorState === "silentFault") return true;
  if (state.generatorState !== "criticalBeeping") return false;
  if (state.generatorSilentSinceMs === null) return true;

  const criticalBeepingStartMs = state.generatorSilentSinceMs + generator.silentGraceMs;
  return state.elapsedMs - criticalBeepingStartMs >= GENERATOR_URGENT_BLINK_DELAY_MS;
}
