// Herní režim zvolený na úvodní obrazovce (viz components/screens/MainMenuScreen.tsx).
// Zatím jen UI příprava — kompletní logika životů/death flow/leaderboard
// zápisu pro "hardcore" JEŠTĚ NENÍ implementovaná (viz TODO.md). Tenhle typ
// jen nese zvolenou hodnotu dál (MainMenuScreen -> handleStart), ať ji další
// krok může použít, beze změny současného GameState/death flow/leaderboard.
export type GameMode = "normal" | "hardcore";

export const DEFAULT_GAME_MODE: GameMode = "normal";
