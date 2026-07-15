/**
 * Rozhraní pro obrázkovou sekvenci útoku Ghoula na kameru (viz zadání
 * "rozšířit o skutečnou obrázkovou animaci") — obecný tvar, nezávislý na
 * konkrétní mapě/objektu. Skutečná data (frames, mapování kamera+světlo ->
 * sekvence) žijí v `game/cameras/cameraAttackAnimation.object13.ts`, stejné
 * dělení jako `CameraDefinition` (obecný typ, `cameras.object13.ts`
 * konkrétní data).
 */
export interface CameraAttackAnimationDefinition {
  id: string;
  /** Seřazené numericky (ne lexikograficky), viz scripts/convert-ghoul-camera-attack-assets.py. */
  frames: string[];
  /** Odvozeno jako GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS / frames.length — nemusí být celé číslo. */
  frameDurationMs: number;
  /** Jak dlouho zůstane poslední snímek vidět, než (fáze "signal-failing") přejde ke krátkému CSS ztmavnutí/zrnění před offline stavem. */
  holdLastFrameMs: number;
}

/** Index aktuálního snímku + informace, jestli právě probíhá "hold" poslední snímku — čistě odvozené z elapsedMs, nikdy uložené. */
export interface GhoulCameraAttackFrameState {
  frameIndex: number;
  isHoldingLastFrame: boolean;
}

/**
 * Čistá funkce (viz zadání "Z aktuálního času odvozuj index snímku") — žádný
 * JS interval/timer, žádný lokální React stav jako zdroj pravdy. `frameCount`
 * <= 0 (chybějící/prázdná sekvence) vrací bezpečný "drž snímek 0" stav, ať
 * volající (CameraDamageOverlay.tsx) nikdy nepřistoupí mimo pole — skutečné
 * rozhodnutí "použij fallback CSS efekt místo animace" dělá volající podle
 * toho, jestli `frames.length === 0`, ne tahle funkce.
 */
export function resolveGhoulCameraAttackFrameState(
  frameCount: number,
  framesDurationMs: number,
  elapsedSinceAttackMs: number,
): GhoulCameraAttackFrameState {
  if (frameCount <= 0) return { frameIndex: 0, isHoldingLastFrame: true };
  if (elapsedSinceAttackMs >= framesDurationMs) {
    return { frameIndex: frameCount - 1, isHoldingLastFrame: true };
  }
  const frameDurationMs = framesDurationMs / frameCount;
  const frameIndex = Math.min(frameCount - 1, Math.floor(elapsedSinceAttackMs / frameDurationMs));
  return { frameIndex, isHoldingLastFrame: false };
}
