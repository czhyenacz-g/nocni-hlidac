import { GameState, GeneratorDefinition } from "./types";
import { GENERATOR_URGENT_BLINK_DELAY_MS } from "../balancing/constants";

/**
 * Jestli má blikat šipka "Zkontrolovat generátor →" v DeskView.tsx — čistě
 * odvozený stav, žádný vlastní TICK. Pořadí signálů je záměrně tohle: (1)
 * `silentFault` (ticho) NEbliká vůbec — ticho samo je jediný náznak, dokud
 * nevyprší reakční čas; (2) `criticalBeeping` (rychlé pípání + rychlý pokles
 * energie) je první skutečná signalizace, hned jak nastane; (3) šipka začne
 * blikat až s odstupem `GENERATOR_URGENT_BLINK_DELAY_MS` po jejím startu —
 * trest za to, že hráč pípání i klesající energii přeslechl/přehlédl (typicky
 * vypnutý zvuk), ne zdroj informace navíc pro každého. Viz GAME_DESIGN.md
 * "Generátor". `restarting` (tichý trest za zbytečný restart) nebliká vůbec.
 */
export function isGeneratorArrowUrgent(state: GameState, generator: GeneratorDefinition): boolean {
  if (state.generatorState !== "criticalBeeping") return false;
  if (state.generatorSilentSinceMs === null) return true;

  const criticalBeepingStartMs = state.generatorSilentSinceMs + generator.silentGraceMs;
  return state.elapsedMs - criticalBeepingStartMs >= GENERATOR_URGENT_BLINK_DELAY_MS;
}
