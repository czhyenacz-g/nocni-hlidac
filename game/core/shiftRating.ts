// Jednoduché "školní" hodnocení dokončené noci podle celkové doby zavřených
// dveří (viz zadání, GameState.totalDoorClosedMs, WinScreen.tsx) — čistě
// prezentační, nic se neukládá (ani DB, ani localStorage), platí jen pro
// právě dokončenou noc. Žádný obecný bodový/achievement systém — jen tahle
// jedna čistá funkce.

export type ShiftRating = "S" | "A" | "B" | "C" | "D" | "E";

/**
 * Hranice jsou přesně podle zadání, počítané z PŘESNÝCH milisekund (ne ze
 * zaokrouhlených sekund zobrazených hráči, viz WinScreen.tsx) — S je
 * VÝHRADNĚ přesně 0 ms, každá další hranice je "více než X do Y sekund
 * VČETNĚ" (tedy `<=`, ne `<`).
 */
export function resolveShiftRating(totalDoorClosedMs: number): ShiftRating {
  if (totalDoorClosedMs <= 0) return "S";
  if (totalDoorClosedMs <= 10_000) return "A";
  if (totalDoorClosedMs <= 20_000) return "B";
  if (totalDoorClosedMs <= 30_000) return "C";
  if (totalDoorClosedMs <= 40_000) return "D";
  return "E";
}
