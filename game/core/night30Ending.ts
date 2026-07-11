import { GameMode } from "./gameMode";

// Hardcore Noc 30 má DVĚ alternativní ending větve (viz zadání,
// content/copy.ts#night30Ending, components/screens/Night30EndingScreen.tsx)
// — obě nahrazují WinScreen jen pro tenhle jeden přechod, obě dělají
// STEJNÉ uložení (recordNightSurvived/achievementy/server sync), viz
// app/play/page.tsx (efekt na state.screen === "win"). Rozhoduje jen
// GameState.monsterKilledThisRun (aktuální run), nikdy celoživotní
// game/core/monsterDefeatReward.ts#monsterDefeatsCount.
export const NIGHT_30_ENDING_NIGHT = 30;

export type Night30EndingKind = "none" | "no_kill" | "warrior";

export interface Night30EndingInput {
  gameMode: GameMode;
  /** Noc, kterou hráč právě přežil (viz app/play/page.tsx `currentNight` v momentě přechodu na "win"). */
  nightNumber: number;
  /** `false` pro cokoliv jiného, než skutečné přežití noci (win) — helper sám GameState nezná. */
  survivedNight: boolean;
  /** Viz GameState.monsterKilledThisRun — `true`, pokud hráč v tomhle runu KDYKOLIV potvrdil porážku monstra (i opakovanou), bez ohledu na dřívější runy. */
  hasKilledMonsterThisRun: boolean;
}

/**
 * Čistá rozhodovací funkce — žádný React/localStorage/side effect.
 * "no_kill" (PRVNÍ VÝPLATA) / "warrior" (POSLEDNÍ SMĚNA) / "none" (běžný
 * WinScreen) — přesně jedna z těchhle tří, nikdy víc.
 */
export function resolveNight30Ending(input: Night30EndingInput): Night30EndingKind {
  if (input.gameMode !== "hardcore") return "none";
  if (!input.survivedNight) return "none";
  if (input.nightNumber !== NIGHT_30_ENDING_NIGHT) return "none";
  return input.hasKilledMonsterThisRun ? "warrior" : "no_kill";
}
