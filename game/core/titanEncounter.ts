import { GameState, NightDefinition } from "./types";

/**
 * JEDINÝ zdroj pravdy pro "je Titanovo setkání právě aktivní" (viz zadání
 * "6. Kdy je Titan považovaný za aktivního... jeden centrální zdroj pravdy,
 * ne rozházené `titanStage !== null` podmínky"). Aktivní od okamžiku, kdy
 * noc s Titanem začne, až do:
 * - úspěšného zabití (`enemyStage === "graveyard"`, jediný způsob smrti
 *   Titana — viz gameReducer.ts#updateDoorGeneratorOverload),
 * - Game Overu (`screen !== "playing"` — smrt i jakékoliv jiné opuštění
 *   "playing" obrazovky správně ukončí encounter),
 * - resetu noci (nová noc = nový `state`, jiná otázka "je titan?" podle
 *   `night.enemy.id` znovu).
 *
 * Používá se VŠUDE, kde je potřeba vědět "reaguje teď hráč na Titana":
 * blokování minihry (gameReducer.ts#START_EMERGENCY_RUN_WINDUP) i spuštění
 * jednorázové "escape" hlášky (game/radio/useTitanEscapeMessage.ts).
 */
export function isTitanEncounterActive(state: GameState, night: NightDefinition): boolean {
  return night.enemy.id === "titan" && state.screen === "playing" && state.enemyStage !== "graveyard";
}
