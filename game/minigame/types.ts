// Typy pro izolovaný prototyp minihry (nouzová obchůzka / boj s monstrem,
// viz app/minihra/page.tsx) — NEZÁVISLÉ na hlavní hře (/play). Žádný typ
// odsud se nesdílí s game/core/types.ts.

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 8 směrů (45° kroky) — kardinální + diagonální, ať se hráč při diagonálním
// pohybu (např. W+D) může dívat/střílet i mezi dvě osy, ne jen po jedné z nich.
export type Direction = "up" | "down" | "left" | "right" | "up-left" | "up-right" | "down-left" | "down-right";

export interface Player {
  x: number;
  y: number;
  radius: number;
  direction: Direction;
  speed: number;
  shotsLeft: number;
}

// Jednoduchý AI stav podle vzdálenosti k hráči (viz
// game/minigame/logic.ts#computeEnemyAiState) — "idle" mimo awareness range
// (enemy hráče "neví" a nejde po něm přímo), "chasing" v awareness range
// (normální rychlost), "aggro" v aggro range (shotgunRange, o 50 % rychleji).
export type EnemyAiState = "idle" | "chasing" | "aggro";

export interface Enemy {
  x: number;
  y: number;
  radius: number;
  /** Základní rychlost — "chasing" ji používá beze změny, "aggro" ji násobí ENEMY_AGGRO_SPEED_MULTIPLIER (viz config.ts). */
  speed: number;
  alive: boolean;
  aiState: EnemyAiState;
  /** Úhel (rad) pro pomalé náhodné bloudění v "idle" stavu — perzistentní mezi tiky, ať bloudění nevypadá cukavě. */
  wanderAngle: number;
}

export type MiniGameStatus = "playing" | "won" | "gameOver";
