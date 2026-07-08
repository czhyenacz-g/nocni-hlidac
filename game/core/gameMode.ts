// Herní režim zvolený na úvodní obrazovce (viz components/screens/MainMenuScreen.tsx).
export type GameMode = "normal" | "hardcore";

export const DEFAULT_GAME_MODE: GameMode = "normal";

export interface GameModeRules {
  /** Kolik životů má hráč na začátku runu (viz GameState.livesRemaining). */
  startingLives: number;
  /** Jestli smí tenhle režim vůbec zapsat výsledek do Síně slávy (viz lib/leaderboard). */
  leaderboardEligible: boolean;
}

/**
 * Jediné místo, které definuje pravidla obou režimů — reducer/UI/server guard
 * čtou odsud, ne rozeseté `if (gameMode === "hardcore")` po kódu (stejná
 * konvence jako game/difficulty/difficultyConfig.ts#DIFFICULTY_RULES).
 */
export const GAME_MODE_CONFIG: Record<GameMode, GameModeRules> = {
  normal: { startingLives: 3, leaderboardEligible: false },
  hardcore: { startingLives: 1, leaderboardEligible: true },
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
