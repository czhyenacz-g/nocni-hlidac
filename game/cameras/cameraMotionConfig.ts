import { CameraId } from "../core/types";

export interface CameraMotionConfig {
  enabled: boolean;
  /** Mírný zoom nad 1 dává panu rezervu, ať translate nikdy neodkryje okraj obrázku (viz CameraView.tsx). */
  zoom: number;
  panXPercent: number;
  panYPercent: number;
  durationMs: number;
  easing: string;
}

// Velmi jemný "kamera není úplně statická" drift v detailu kamery
// (CameraView.tsx) — pomalý pohyb zleva doprava/nahoru dolů a zpátky, žádné
// rychlé třesení ani glitch. Bezpečné jen díky kombinaci `zoom > 1` +
// `overflow: hidden` na wrapperu (viz TECH_DESIGN.md "Kamerový drift") —
// bez zoom rezervy by pan hned odkryl reálný okraj obrázku. Jedno místo pro
// vypnutí/doladění, ne rozeseté konstanty po komponentě.
export const CAMERA_MOTION_CONFIG: CameraMotionConfig = {
  enabled: true,
  // Zoom zvýšený spolu s panXPercent níže — bezpečná max hranice pro pan je
  // zhruba (zoom - 1) * 100 / 2 %, jinak by translate odkryl okraj obrázku
  // (viz TECH_DESIGN.md "Kamerový drift").
  zoom: 1.05,
  // O trochu větší horizontální posun na žádost po playtestu (1.5 -> 2.2).
  panXPercent: 2.2,
  panYPercent: 0.5,
  // O 30 % rychlejší na žádost po playtestu (18000 -> 12600 ms na jeden směr).
  durationMs: 12600,
  easing: "ease-in-out",
};

// Volitelné přepsání pro konkrétní kamery (zatím žádné) — např. venkovní
// kamera by časem mohla mít výraznější drift než úzká chodba.
export const CAMERA_MOTION_OVERRIDES: Partial<Record<CameraId, Partial<CameraMotionConfig>>> = {};

export function resolveCameraMotionConfig(cameraId: CameraId): CameraMotionConfig {
  return { ...CAMERA_MOTION_CONFIG, ...CAMERA_MOTION_OVERRIDES[cameraId] };
}
