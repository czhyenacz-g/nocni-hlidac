import { GameMode } from "./gameMode";

// Čistá rozhodovací logika pro DeathScreen.tsx (viz zadání "oprava regrese —
// Hardcore death screen nesmí zobrazovat text o zbývajících životech") —
// vytažená sem, ať se dá otestovat bez React infra. Komponenta jen vybírá
// text/tlačítko podle `kind`, žádné vlastní rozhodování.
//
// `hardcore_game_over` je návratová hodnota VŽDY, když `gameMode ===
// "hardcore"` — bez ohledu na `livesRemaining` (i kdyby state nějakým
// bugem obsahoval kladnou hodnotu, Hardcore nikdy nesmí ukázat "Zbývající
// životy"). Normal se zbývajícím životem pokračuje stejnou nocí, Normal bez
// životů je definitivní konec runu.
export type DeathScreenStatus =
  | { kind: "normal_continue"; livesRemaining: number; nightNumber: number }
  | { kind: "normal_game_over" }
  | { kind: "hardcore_game_over" };

export function resolveDeathScreenStatus(gameMode: GameMode, livesRemaining: number, nightNumber: number): DeathScreenStatus {
  if (gameMode === "hardcore") return { kind: "hardcore_game_over" };
  if (livesRemaining > 0) return { kind: "normal_continue", livesRemaining, nightNumber };
  return { kind: "normal_game_over" };
}

/** Tlačítko na DeathScreen.tsx je "POKRAČOVAT" jen pro normal_continue, jinak vždy "NOVÁ HRA" (stejný text pro normal_game_over i hardcore_game_over, viz content/copy.ts). */
export function isDeathScreenContinuing(status: DeathScreenStatus): status is Extract<DeathScreenStatus, { kind: "normal_continue" }> {
  return status.kind === "normal_continue";
}
