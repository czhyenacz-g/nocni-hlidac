import { GhoulCameraAttackAnimationId } from "../core/types";
import { GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS, GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS } from "../core/cameraDamageConfig";
import { CameraAttackAnimationDefinition } from "./cameraAttackAnimation";

/**
 * Čtyři sekvence (viz zadání) — `left_hallway`/`right_hallway` mají vlastní
 * kameru 1:1, `door_hallway` má DVĚ varianty podle toho, jestli v okamžiku
 * SPUŠTĚNÍ útoku svítilo chodbové světlo (viz
 * game/core/cameraDamage.ts#resolveGhoulCameraAttackAnimationId — vybraná
 * varianta se zamrzne do GameState.cameraDamage.activeAttack.animationId a
 * dál se neřídí aktuálním stavem světla, viz zadání "během animace nesmí
 * změna světla přepnout sekvenci"). `outer_yard` žádnou sekvenci nemá —
 * getGhoulCameraAttackAnimation pro ni vrátí `null`, CameraDamageOverlay.tsx
 * spadne zpět na CSS ztmavnutí/zrnění (viz zadání "Fallback").
 */

/**
 * Snímky jsou 1-based, dvouciferně zarovnané (`..._01.webp` .. `..._25.webp`,
 * viz scripts/convert-ghoul-camera-attack-assets.py) — vygenerováno, ne
 * opsáno ručně (viz zadání "nevytvářej ručně seznam snímků").
 */
function buildFrameList(folder: string, filePrefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `/object_13/camera/${folder}/${filePrefix}_${String(index + 1).padStart(2, "0")}.webp`);
}

function defineAnimation(id: GhoulCameraAttackAnimationId, frames: string[]): CameraAttackAnimationDefinition {
  return {
    id,
    frames,
    frameDurationMs: GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS / frames.length,
    holdLastFrameMs: GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS,
  };
}

// Přesné počty/názvy zjištěné z projektu (viz report) — 25 snímků v každé
// ze čtyř zdrojových složek (public/object_13/camera/<kamera>/<kamera>_ghoul_attack/).
const LEFT_HALLWAY_FRAMES = buildFrameList("left_hallway/left_hallway_ghoul_attack", "left_hallway", 25);
const RIGHT_HALLWAY_FRAMES = buildFrameList("right_hallway/right_hallway_ghoul_attack", "right_hallway", 25);
const DOOR_HALLWAY_FRAMES = buildFrameList("door_hallway/door_hallway_ghoul_attack", "door_hallway", 25);
// Zdrojové soubory používají "bright" (ne "light") v názvu — viz report.
const DOOR_HALLWAY_LIGHT_FRAMES = buildFrameList("door_hallway_light/door_hallway_light_ghoul_attack", "door_hallway_bright", 25);

export const GHOUL_CAMERA_ATTACK_ANIMATIONS: Record<GhoulCameraAttackAnimationId, CameraAttackAnimationDefinition> = {
  left_hallway: defineAnimation("left_hallway", LEFT_HALLWAY_FRAMES),
  right_hallway: defineAnimation("right_hallway", RIGHT_HALLWAY_FRAMES),
  door_hallway: defineAnimation("door_hallway", DOOR_HALLWAY_FRAMES),
  door_hallway_light: defineAnimation("door_hallway_light", DOOR_HALLWAY_LIGHT_FRAMES),
};

/** `null` = žádná sekvence pro tenhle animationId (jen `outer_yard` v praxi, viz game/core/cameraDamage.ts#resolveGhoulCameraAttackAnimationId) — volající spadne na CSS fallback. */
export function getGhoulCameraAttackAnimation(animationId: GhoulCameraAttackAnimationId | null): CameraAttackAnimationDefinition | null {
  return animationId ? GHOUL_CAMERA_ATTACK_ANIMATIONS[animationId] : null;
}

// Stáhne všechny 4 sekvence (100 snímků, ~1,2 MB celkem — viz report,
// dostatečně malé na eager preload celku) do cache prohlížeče na
// LoadingScreen (stejný vzor jako preloadCameraImages/preloadBackgroundImages)
// — ať animace při vzácném spuštění útoku necuká na pomalejším připojení.
export function preloadGhoulCameraAttackAnimations(): void {
  if (typeof window === "undefined") return;
  for (const animation of Object.values(GHOUL_CAMERA_ATTACK_ANIMATIONS)) {
    for (const src of animation.frames) {
      const img = new Image();
      img.src = src;
    }
  }
}
