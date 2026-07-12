// Čistá matematika pro experimentální ruční ovládání kamerového detailu myší
// (viz zadání "Experimentální ruční kamera", components/game/CameraManualPanImage.tsx).
// Jedno místo pro konstanty i výpočty — komponenta sama žádnou z těchto
// hodnot nezná natvrdo, jen volá exporty odsud. Nemá žádný vliv na
// gameplay/GameState — je to čistě vizuální vrstva nad už zobrazeným
// kamerovým obrázkem (viz CameraView.tsx).

export interface CameraManualPanConfig {
  /** Zvětšení obrazu v ručním režimu (přes zoom automatického driftu, viz cameraMotionConfig.ts). */
  scale: number;
  /** Maximální horizontální posun výřezu v px (od středu na každou stranu). */
  maxPanX: number;
  /** Maximální vertikální posun výřezu v px (od středu na každou stranu). */
  maxPanY: number;
  /** Lerp faktor na snímek (0-1) — kolik ze zbývající vzdálenosti k cíli se dorovná za jeden frame. Nižší = těžší/setrvačnější kamera. */
  lerpFactor: number;
  /** Kolik ms bez pohybu myši, než se ruční režim začne vracet zpět k automatickému driftu. */
  autoResumeDelayMs: number;
  /** Maximální náklon kolem svislé osy (stupně) — reaguje na horizontální pozici myši. */
  maxTiltYDeg: number;
  /** Maximální náklon kolem vodorovné osy (stupně) — reaguje na vertikální pozici myši. */
  maxTiltXDeg: number;
  /** CSS perspective (px) pro jemný pseudo-3D dojem. */
  perspectivePx: number;
}

// Doladěno po prvním playtest reportu (viz zadání): slabší zoom (1.20 ->
// 1.15, ať nepůsobí jako moc silný digitální zoom), víc horizontální než
// vertikální pan (maxPanY 24 -> 10, ať se nikdy neodhalí okraj obrázku a
// pohyb je hlavně "otáčení hlavy do stran") a delší setrvání v ručním
// režimu (autoResumeDelayMs 1600 -> 2400, ať se auto drift nevrací hned po
// krátké pauze myši). lerpFactor/maxTiltYDeg/maxTiltXDeg/perspectivePx
// záměrně beze změny.
export const CAMERA_MANUAL_PAN_CONFIG: CameraManualPanConfig = {
  scale: 1.15,
  maxPanX: 40,
  maxPanY: 10,
  lerpFactor: 0.1,
  autoResumeDelayMs: 2400,
  maxTiltYDeg: 1.2,
  maxTiltXDeg: 0.7,
  perspectivePx: 1000,
};

export interface CameraPanPoint {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalizuje pozici kurzoru uvnitř obdélníku (viewportu) na -1..1 na obou
 * osách (střed = 0, viz zadání). Rozbitý/nulový rozměr (`width`/`height`
 * <= 0 — např. viewport ještě není rozměřený, nebo layout je momentálně
 * skrytý) bezpečně vrátí střed místo `NaN`/`Infinity`, ať to nikdy nepošle
 * kameru mimo platný rozsah.
 */
export function normalizePointerPosition(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): CameraPanPoint {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const mouseY = ((clientY - rect.top) / rect.height) * 2 - 1;
  return { x: clamp(mouseX, -1, 1), y: clamp(mouseY, -1, 1) };
}

/** Zaclampuje libovolný (x, y) pan do config.maxPanX/maxPanY rozsahu. */
export function clampCameraPan(pan: CameraPanPoint, config: CameraManualPanConfig): CameraPanPoint {
  return {
    x: clamp(pan.x, -config.maxPanX, config.maxPanX),
    y: clamp(pan.y, -config.maxPanY, config.maxPanY),
  };
}

/**
 * Spočítá cílový posun v px z normalizované pozice myši (-1..1 na obou
 * osách, viz normalizePointerPosition) — `mouseX`/`mouseY` mimo -1..1 (např.
 * budoucí volající, co normalizaci přeskočí) se přesto bezpečně zaclampují
 * přes clampCameraPan.
 */
export function resolveCameraPanTarget(mouseX: number, mouseY: number, config: CameraManualPanConfig): CameraPanPoint {
  return clampCameraPan({ x: mouseX * config.maxPanX, y: mouseY * config.maxPanY }, config);
}

/** Jeden krok plynulého přibližování aktuální hodnoty k cíli (viz zadání "lerp faktor 0.08-0.12"). */
export function lerpCameraPan(current: CameraPanPoint, target: CameraPanPoint, factor: number): CameraPanPoint {
  return {
    x: current.x + (target.x - current.x) * factor,
    y: current.y + (target.y - current.y) * factor,
  };
}

export interface ShouldUseManualCameraModeInput {
  /** Admin/debug přepínač (viz zadání) — default vypnutý, běžný hráč ho nikdy nevidí. */
  experimentEnabled: boolean;
  /** Dotyková zařízení ruční myší ovládání nikdy nepoužijí (viz zadání "nerozšiřuj o touch drag"). */
  isTouchDevice: boolean;
  /** `prefers-reduced-motion: reduce` vypíná ruční tilt/setrvačnost úplně (viz zadání). */
  prefersReducedMotion: boolean;
  /** `null` = myš se nad kamerou ještě nikdy nepohnula (v tomhle "sezení" detailu). */
  msSinceLastPointerMove: number | null;
  autoResumeDelayMs: number;
}

/**
 * `true`, jen když experiment běží, zařízení je myš (ne touch), hráč
 * nepreferuje omezený pohyb A myš se nad kamerou hnula během posledních
 * `autoResumeDelayMs` (viz zadání "Po 1600 ms bez pohybu myši se vrátí auto
 * mode"). Cokoliv jiné = `false` (auto drift).
 */
export function shouldUseManualCameraMode(input: ShouldUseManualCameraModeInput): boolean {
  if (!input.experimentEnabled || input.isTouchDevice || input.prefersReducedMotion) return false;
  if (input.msSinceLastPointerMove === null) return false;
  return input.msSinceLastPointerMove < input.autoResumeDelayMs;
}
