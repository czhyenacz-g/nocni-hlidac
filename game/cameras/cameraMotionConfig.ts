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
  zoom: 1.03,
  panXPercent: 1.5,
  panYPercent: 0.5,
  durationMs: 18000,
  easing: "ease-in-out",
};

// Volitelné přepsání pro konkrétní kamery (zatím žádné) — např. venkovní
// kamera by časem mohla mít výraznější drift než úzká chodba.
export const CAMERA_MOTION_OVERRIDES: Partial<Record<CameraId, Partial<CameraMotionConfig>>> = {};

export function resolveCameraMotionConfig(cameraId: CameraId): CameraMotionConfig {
  return { ...CAMERA_MOTION_CONFIG, ...CAMERA_MOTION_OVERRIDES[cameraId] };
}
