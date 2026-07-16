// Herní režim zvolený na úvodní obrazovce (viz components/screens/MainMenuScreen.tsx).
export type GameMode = "normal" | "hardcore";

export const DEFAULT_GAME_MODE: GameMode = "normal";

export interface GameModeRules {
  /** Kolik životů má hráč na začátku runu (viz GameState.livesRemaining). */
  startingLives: number;
  /** Jestli smí tenhle režim vůbec zapsat výsledek do Síně slávy (viz lib/leaderboard) — odpovídá `submitLeaderboard` ze zadání "10. Training vs Hardcore". */
  leaderboardEligible: boolean;
  /**
   * Jestli se změny inventáře (náhradní žárovky, viz
   * Object13PlayerProfileProvider.tsx#addBulbs/consumeBulbs) během tohohle
   * režimu ukládají na VPS — Training pracuje jen s lokální pracovní kopií
   * (viz app/play/page.tsx), Hardcore je server-authoritative. Jediné místo,
   * které tohle rozhoduje — volající se ptají `GAME_MODE_CONFIG[gameMode].persistInventory`,
   * ne `if (gameMode === "hardcore")` rozeseté po kódu.
   */
  persistInventory: boolean;
  /** Jestli se statistiky runu (přežité noci, smrti, ...) ukládají — dnes shodné s `leaderboardEligible`, samostatné pole pro budoucí rozjetí (statistiky bez leaderboardu). */
  persistRunStats: boolean;
}

/**
 * Jediné místo, které definuje pravidla obou režimů — reducer/UI/server guard
 * čtou odsud, ne rozeseté `if (gameMode === "hardcore")` po kódu (stejná
 * konvence jako game/difficulty/difficultyConfig.ts#DIFFICULTY_RULES).
 */
export const GAME_MODE_CONFIG: Record<GameMode, GameModeRules> = {
  normal: { startingLives: 3, leaderboardEligible: false, persistInventory: false, persistRunStats: false },
  hardcore: { startingLives: 1, leaderboardEligible: true, persistInventory: true, persistRunStats: true },
};

/**
 * Bezpečný fallback na "normal" pro cokoliv jiného než přesně "hardcore" —
 * ochrana proti neznámé/poškozené hodnotě (viz zadání "pokud by se nějak
 * stalo, že je gameMode neznámý, fallback na normal"), používá se jak na
 * klientu (app/play/page.tsx#handleStart), tak na serveru (guardRunRequestHandlers.ts).
 */
export function resolveGameMode(value: unknown): GameMode {
  return value === "hardcore" ? "hardcore" : "normal";
}

/**
 * Kolik životů zbývá PO smrti — Hardcore nemá žádnou rezervu (run vždy
 * skončí, viz zadání "žádné životy navíc"), Normal odečte jeden život, nikdy
 * pod 0. Volající (gameReducer.ts) z výsledku pozná, jestli run pokračuje
 * (>0, jen Normal) nebo skutečně končí (0).
 */
export function resolveLivesRemainingAfterDeath(gameMode: GameMode, livesRemaining: number): number {
  if (gameMode !== "normal") return 0;
  return Math.max(0, livesRemaining - 1);
}
