import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MOBILE_CAMERA_SCALE,
  MOBILE_CAMERA_WINDOW_HEIGHT,
  MOBILE_CAMERA_WINDOW_WIDTH,
  MOBILE_CANVAS_HEIGHT,
  MOBILE_CANVAS_WIDTH,
} from "./config";
import { Vec2 } from "./types";

// Mobilní kamera pro EmergencyMiniGame (viz components/minigame/EmergencyMiniGame.tsx#draw,
// zadání "roztáhnout arénu na výšku na mobilu, hráč vidí jen výřez kolem
// sebe") — tři malé čisté funkce vytažené sem, ať se dají testovat bez
// React/canvas infra. Desktop (isTouchDevice === false) zůstává beze změny
// (celá mapa najednou, žádná kamera).

/** Fyzická velikost <canvas> (backing store) — portrétní na mobilu, jinak beze změny. */
export function resolveActiveCanvasSize(isTouchDevice: boolean): { width: number; height: number } {
  return isTouchDevice ? { width: MOBILE_CANVAS_WIDTH, height: MOBILE_CANVAS_HEIGHT } : { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
}

/** `desktopScale` = předpočítané computeMiniGameWorldScale(worldWidth, worldHeight) pro tenhle layout — na mobilu se ignoruje, kamera má vlastní pevné přiblížení (MOBILE_CAMERA_SCALE). */
export function resolveActiveScale(isTouchDevice: boolean, desktopScale: number): number {
  return isTouchDevice ? MOBILE_CAMERA_SCALE : desktopScale;
}

/**
 * Posun kamery (v herních jednotkách) — na desktopu vždy (0,0) (žádná
 * kamera, celá mapa vidět najednou). Na mobilu kamera prostě kopíruje
 * pozici hráče (bez plynulého "dojíždění") a NEOŘEZÁVÁ se na okraje mapy
 * (viz zadání "zjednodušit ještě víc") — u okraje se tak zobrazí kousek
 * prázdného tmavého pozadí navíc, což pro horor aréna spíš sedí, než aby
 * působilo jako chyba.
 */
export function resolveCameraOffset(isTouchDevice: boolean, playerX: number, playerY: number): Vec2 {
  if (!isTouchDevice) return { x: 0, y: 0 };
  return { x: playerX - MOBILE_CAMERA_WINDOW_WIDTH / 2, y: playerY - MOBILE_CAMERA_WINDOW_HEIGHT / 2 };
}
