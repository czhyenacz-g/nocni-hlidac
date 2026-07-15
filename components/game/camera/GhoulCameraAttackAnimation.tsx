import { CameraAttackAnimationDefinition, resolveGhoulCameraAttackFrameState } from "@/game/cameras/cameraAttackAnimation";
import { GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS } from "@/game/core/cameraDamageConfig";

interface GhoulCameraAttackAnimationProps {
  animation: CameraAttackAnimationDefinition;
  startedAtMs: number;
  /** Aktuální elapsedMs (GameState.elapsedMs) — jediný zdroj pravdy pro to, který snímek se má zrovna zobrazit. Žádný lokální JS interval/RAF timer. */
  nowMs: number;
}

/**
 * ČISTĚ prezentační renderer obrázkové sekvence (viz zadání "komponenta
 * nesmí sama rozhodovat, zda útok nastane, sama měnit lokaci Ghoula, sama
 * zapisovat vyřazenou kameru") — index snímku se odvozuje z `nowMs -
 * startedAtMs` přes `resolveGhoulCameraAttackFrameState` (game/cameras/cameraAttackAnimation.ts),
 * stejný "elapsedMs -> který snímek" princip jako
 * game/cameras/cameraAssets.object13.ts#getCameraImageSrc. Nepřehrává se ve
 * smyčce (viz ta funkce — po doběhnutí sekvence drží poslední index
 * napořád, dokud volající nepřepne fázi jinam).
 */
export default function GhoulCameraAttackAnimation({ animation, startedAtMs, nowMs }: GhoulCameraAttackAnimationProps) {
  const { frameIndex } = resolveGhoulCameraAttackFrameState(animation.frames.length, GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS, nowMs - startedAtMs);
  const frameSrc = animation.frames[frameIndex];

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <img src={frameSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}
