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

/**
 * `true` PŘESNĚ od okamžiku, kdy Titan vstoupí do nevratné "breach" fáze
 * (viz zadání "Automatické přepnutí na dveře při finálním útoku Titana" —
 * "at_door" ještě NENÍ tenhle stav, tam má hráč poslední reálnou šanci na
 * včas rozběhnutý generátorový overload). Používá se pro dvě věci na
 * STEJNÉM signálu (viz zadání "použij skutečný stav, ne časový odhad"):
 * 1. jednorázové automatické `LOOK_AT_DOOR` v resolveTitanAdvance.ts PŘI
 *    přechodu DO "breach" (proběhne přesně jednou — reducer akci dispatchne
 *    jen na SKUTEČNOU změnu stage, ne opakovaně),
 * 2. zamčení LOOK_AT_DESK/LOOK_AT_GENERATOR/LOOK_AT_LEFT_WALL/LOOK_AT_MAP
 *    v gameReducer.ts po dobu, co tohle vrací `true` — hráč se už nemůže
 *    "utéct" pohledem pryč ze dveří, dokud běží posledních ~1s do útoku.
 *    LOOK_AT_DOOR samo NENÍ zamčené (odchod NA dveře je vždy v pořádku).
 */
export function isTitanBreachIrreversible(state: GameState, night: NightDefinition): boolean {
  return night.enemy.id === "titan" && state.enemyStage === "breach";
}
