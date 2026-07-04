// Interní obtížnost — zatím žádné UI ani query parametr, jen konfigurace pro
// vývoj (viz app/play/page.tsx, createGameReducer). Herní logika nikde
// nerozeseté podmínky typu `if (difficulty === "hard")` — čte jen konkrétní
// pravidlo z DIFFICULTY_RULES (viz gameReducer.ts).
export type Difficulty = "easy" | "medium" | "hard";

export const DEFAULT_DIFFICULTY: Difficulty = "medium";

export interface DifficultyRules {
  /**
   * Když monstrum od zavřených dveří po čase odejde (viz gameReducer.ts
   * ENEMY_ADVANCE "gave_up"), musí ho hráč nejdřív najít na správné kameře,
   * než je bezpečné dveře otevřít — jinak se monstrum okamžitě vrátí zpět ke
   * dveřím (`GameState.monsterRetreatedTo`/`monsterRetreatVerified`, viz
   * GAME_DESIGN.md "Odchod monstra od dveří").
   */
  monster_check_or_return: boolean;
}

export const DIFFICULTY_RULES: Record<Difficulty, DifficultyRules> = {
  easy: {
    monster_check_or_return: false,
  },
  medium: {
    monster_check_or_return: true,
  },
  hard: {
    monster_check_or_return: true,
  },
};
