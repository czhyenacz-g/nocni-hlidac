import { GameMode } from "./gameMode";

// Speciální meziscéna před DeathScreenem pro Hardcore smrt "uprostřed" dlouhé
// šňůry (viz content/cinematics.ts#valhala_ending, app/play/page.tsx) —
// zaplňuje slib z MonsterDefeatedScreen cinematicu ("Potkáme se až nastane
// 30. den... nebo ve Valhale."). Pouze meziscéna: NENAHRAZUJE
// recordDeath/recordHardcoreDeathOnNight/achievementy ani DeathScreen —
// ty se v app/play/page.tsx spouští úplně stejně jako dřív, tenhle helper
// jen rozhoduje, jestli se PŘED nimi (vizuálně) vloží cinematic navíc.
export const VALHALA_ENDING_MIN_NIGHT = 20;
export const VALHALA_ENDING_MAX_NIGHT = 30;

export interface ValhalaEndingCinematicInput {
  gameMode: GameMode;
  /** Noc, ve které smrt nastala (viz app/play/page.tsx `nightThatEnded`) — ne currentNight PO případném resetu. */
  nightNumber: number;
  /** True jen pro první smrtelnou chybu v Noci 1 (viz game/core/firstNightWarning.ts) — ta není skutečná smrt, Valhala se pro ni nikdy nemá spustit. */
  isFirstNightNearMiss: boolean;
  /** True jen pro skutečnou smrt (screen "death", ne "win"/"monsterDefeated"/pokračující run) — volající si tohle musí sám ověřit, helper nezná GameState. */
  isRealDeath: boolean;
}

/**
 * Čistá rozhodovací funkce — žádný React/localStorage/side effect. Platí
 * jen pro Hardcore, jen pro skutečnou smrt (ne near-miss), jen v rozsahu
 * nocí 20–30 VČETNĚ (viz zadání).
 */
export function shouldShowValhalaEndingCinematic(input: ValhalaEndingCinematicInput): boolean {
  if (input.gameMode !== "hardcore") return false;
  if (input.isFirstNightNearMiss) return false;
  if (!input.isRealDeath) return false;
  return input.nightNumber >= VALHALA_ENDING_MIN_NIGHT && input.nightNumber <= VALHALA_ENDING_MAX_NIGHT;
}
