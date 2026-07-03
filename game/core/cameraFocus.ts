import { GameState } from "./types";

/**
 * Kamera po výběru chvíli "ladí signál" (šum), než ukáže ostrý obraz —
 * čistě odvozený stav z `state.elapsedMs` vs. `state.cameraFocusUntilMs`
 * (nastaveno v gameReducer na OPEN_CAMERA podle night.cameraFocusMs), žádný
 * vlastní TICK navíc. CameraView tenhle výsledek jen zobrazuje, nepočítá ho.
 */
export function isCameraFocused(state: GameState): boolean {
  if (!state.cameraOpen || !state.activeCameraId) return false;
  if (state.cameraFocusUntilMs === null) return true;
  return state.elapsedMs >= state.cameraFocusUntilMs;
}
