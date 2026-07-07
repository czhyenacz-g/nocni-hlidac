import { Enemy, Player, Wall } from "./types";

// Konfigurace izolovaného prototypu minihry — žádná hodnota odsud neovlivňuje
// balancing hlavní hry (game/balancing/constants.ts zůstává nedotčené).

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 520;

export const PLAYER_RADIUS = 14;
export const ENEMY_RADIUS = 14;
export const PLAYER_SPEED = 3.2;
export const ENEMY_SPEED = 1.6;

/** Dosah výseče (px) — kam zasáhne brokovnice i kam hráč "vidí". */
export const CONE_RANGE = 150;
/** Celkový úhel výseče (stupně) — polovina na každou stranu od směru pohledu. */
export const CONE_ANGLE_DEG = 70;
export const CONE_ANGLE_RAD = (CONE_ANGLE_DEG * Math.PI) / 180;

// Pár vnitřních překážek/chodeb + krátké výběžky od obvodových zdí — obvod
// mapy řeší clamp na hranice canvasu (viz moveWithWallSliding), ne samostatné
// zdi, ať nevznikají zbytečně duplicitní kolizní obdélníky podél celého okraje.
export const WALLS: Wall[] = [
  { x: 260, y: 0, width: 24, height: 230 },
  { x: 260, y: 300, width: 24, height: 220 },
  { x: 520, y: 140, width: 200, height: 24 },
  { x: 120, y: 380, width: 160, height: 24 },
  { x: 600, y: 320, width: 24, height: 160 },
];

// Hráč startuje dole (u "kontrolní místnosti"), nepřítel nahoře — stejná
// prostorová logika jako v hlavní hře (viz game/map/objectMap.ts), ale
// úplně nezávislá data.
export function createInitialPlayer(): Player {
  return {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 60,
    radius: PLAYER_RADIUS,
    direction: "up",
    speed: PLAYER_SPEED,
    shotsLeft: 1,
  };
}

export function createInitialEnemy(): Enemy {
  return {
    x: CANVAS_WIDTH / 2,
    y: 60,
    radius: ENEMY_RADIUS,
    speed: ENEMY_SPEED,
    alive: true,
  };
}
