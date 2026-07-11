// DEPRECATED — nahrazeno obecnějším game/core/night30Ending.ts (viz zadání
// "Night 30 warrior ending", "vytvoř obecnější helper resolveNight30Ending",
// který vrací "none" | "no_kill" | "warrior" místo jednoho booleanu).
// Produkční kód (app/play/page.tsx) už volá resolveNight30Ending přímo —
// tenhle soubor zůstává jen jako tenký kompatibilní re-export, ať nemusí
// zmizet beze změny existující sady testů (game/core/noKillEnding.test.ts).
import { Night30EndingInput, resolveNight30Ending } from "./night30Ending";

export const NO_KILL_ENDING_NIGHT = 30;

export type NoKillNight30EndingInput = Night30EndingInput;

export function shouldShowNoKillNight30Ending(input: NoKillNight30EndingInput): boolean {
  return resolveNight30Ending(input) === "no_kill";
}
