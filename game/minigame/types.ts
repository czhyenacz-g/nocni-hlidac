// Typy pro izolovaný prototyp minihry (nouzová obchůzka / boj s monstrem,
// viz app/minihra/page.tsx) — NEZÁVISLÉ na hlavní hře (/play). Žádný typ
// odsud se nesdílí s game/core/types.ts.

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vec2 {
  x: number;
  y: number;
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

// Chování nepřítele (viz game/minigame/logic.ts#updateEnemyAi):
// "investigating" — jde na přibližný podezřelý bod (investigationTarget),
//   ne přímo na hráče.
// "waiting" — dorazil na podezřelý bod, 2–3 s čeká/hlídá, než zvolí další bod.
// "chasing" — vidí hráče (vision cone + line-of-sight), jde přímo po něm; v
//   blízkém dosahu (shotgunRange) zrychlí o 50 %.
// "wounded" — dočasně omráčený po zásahu brokovnicí (viz stunRemainingMs);
//   přebíjí ostatní tři, nehýbe se, nevyhodnocuje vidění.
export type EnemyMode = "investigating" | "waiting" | "chasing" | "wounded";

export interface Enemy {
  x: number;
  y: number;
  radius: number;
  alive: boolean;
  mode: EnemyMode;
  /** Aktuální cíl "investigating" — přibližný bod poblíž (poslední známé) polohy hráče, NE přesná pozice hráče. */
  investigationTarget: Vec2;
  /** > 0 = zbývá čekat ve "waiting" (viz ENEMY_WAIT_MIN_MS/MAX_MS). */
  waitRemainingMs: number;
  /** > 0 = omráčený po zásahu brokovnicí (viz ENEMY_STUN_DURATION_MS) — nehýbe se, nezpůsobí game over, odpočítává se v ms. */
  stunRemainingMs: number;
  /** Aktuální úhel (rad) výseče vidění nepřítele — navazuje na směr pohybu/cíle/hráče podle módu, viz updateEnemyAi. Libovolný úhel, ne omezený na 8 Direction hodnot (na rozdíl od hráče). */
  visionAngle: number;
}

export type MiniGameStatus = "playing" | "won" | "gameOver";
