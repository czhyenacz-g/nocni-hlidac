import { GameState, GeneratorState } from "./types";

// "monster_reached_office" aftermath (viz zadání, gameReducer.ts
// APPLY_MONSTER_REACHED_OFFICE_AFTERMATH, GameState.officeBreachAftermathActive) —
// monstrum FYZICKY doběhlo do kanceláře v EmergencyMiniGame (ne jen "bylo
// poblíž" jako officeThreatOnReturn), hráč po návratu musí vyřešit tři kroky
// v tomhle pořadí: zavřít dveře, restartovat generátor, vyměnit žárovku.
// Čistá odvozená fáze z existujícího GameState (doorClosed/generatorState/
// roomBulbs) — ŽÁDNÝ vlastní "current step" state navíc. `officeBreachAftermathActive`
// je jediné nové pole a slouží JEN k odlišení tyhle konkrétní krize od
// náhodné shody běžné poruchy generátoru/prasklé žárovky mimo tenhle scénář
// (viz isOfficeBreachResolved níže, které ho zpátky vypne).

export type OfficeBreachPhase = "close_door" | "restart_generator" | "replace_bulb";

/**
 * `null`, když krize neběží VŮBEC (`officeBreachAftermathActive` false) NEBO
 * je už kompletně vyřešená (dveře zavřené, generátor v pořádku, žárovka
 * opravená) — komponenta v obou případech nezobrazí žádný krizový text.
 * Pořadí kontrol JE pořadí, ve kterém to hráč musí řešit (viz zadání
 * "1. dveře, 2. generátor, 3. žárovka") — funkce vrátí vždy jen JEDNU,
 * aktuálně relevantní fázi, ne seznam nesplněných kroků.
 */
export function resolveOfficeBreachPhase(
  state: Pick<GameState, "officeBreachAftermathActive" | "doorClosed" | "generatorState" | "roomBulbs">,
): OfficeBreachPhase | null {
  if (!state.officeBreachAftermathActive) return null;
  if (!state.doorClosed) return "close_door";
  if (state.generatorState !== "normal") return "restart_generator";
  if (state.roomBulbs.nearRoom.broken) return "replace_bulb";
  return null;
}

/**
 * Jestli jsou všechny tři kroky vyřešené — TICK (gameReducer.ts) tohle volá
 * každý tik, dokud `officeBreachAftermathActive` je `true`, a jakmile vrátí
 * `true`, vypne ho zpátky na `false`. Bez tohohle vypnutí by libovolná
 * POZDĚJŠÍ, s krizí už nesouvisející porucha generátoru nebo přirozeně
 * prasklá žárovka omylem znovu ukázala krizové texty (viz
 * resolveOfficeBreachPhase výše, který jinak čte stejná pole).
 */
export function isOfficeBreachResolved(input: { doorClosed: boolean; generatorState: GeneratorState; bulbBroken: boolean }): boolean {
  return input.doorClosed && input.generatorState === "normal" && !input.bulbBroken;
}
