import { GhoulCameraAttackAnimationId } from "../core/types";
import { GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS, GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS } from "../core/cameraDamageConfig";
import { CameraAttackAnimationDefinition } from "./cameraAttackAnimation";

/**
 * Pět sekvencí, jedna na kameru (viz zadání) — `left_hallway`/`right_hallway`/
 * `outer_yard` mají vlastní kameru 1:1, `door_hallway` má DVĚ varianty podle
 * toho, jestli v okamžiku SPUŠTĚNÍ útoku svítilo chodbové světlo (viz
 * game/core/cameraDamage.ts#resolveGhoulCameraAttackAnimationId — vybraná
 * varianta se zamrzne do GameState.cameraDamage.activeAttack.animationId a
 * dál se neřídí aktuálním stavem světla, viz zadání "během animace nesmí
 * změna světla přepnout sekvenci"). `outer_yard` sekvence má jen 4 snímky
 * (dodáno dodatečně, viz report) — frameDurationMs se odvozuje z počtu, ať
 * celková délka (GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS) zůstane stejná pro
 * všechny sekvence bez ohledu na počet snímků.
 */

/**
 * Snímky jsou 1-based, dvouciferně zarovnané (`..._01.webp` .. `..._NN.webp`,
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

// Přesné počty/názvy zjištěné z projektu (viz report) — 25 snímků ve čtyřech
// hallway/door složkách, 4 snímky ve outdoor složce (dodáno později).
const LEFT_HALLWAY_FRAMES = buildFrameList("left_hallway/left_hallway_ghoul_attack", "left_hallway", 25);
const RIGHT_HALLWAY_FRAMES = buildFrameList("right_hallway/right_hallway_ghoul_attack", "right_hallway", 25);
const DOOR_HALLWAY_FRAMES = buildFrameList("door_hallway/door_hallway_ghoul_attack", "door_hallway", 25);
// Zdrojové soubory používají "bright" (ne "light") v názvu — viz report.
const DOOR_HALLWAY_LIGHT_FRAMES = buildFrameList("door_hallway_light/door_hallway_light_ghoul_attack", "door_hallway_bright", 25);
const OUTER_YARD_FRAMES = buildFrameList("outdoor/outdoor_ghoul_attack", "outdoor", 4);

export const GHOUL_CAMERA_ATTACK_ANIMATIONS: Record<GhoulCameraAttackAnimationId, CameraAttackAnimationDefinition> = {
  outer_yard: defineAnimation("outer_yard", OUTER_YARD_FRAMES),
  left_hallway: defineAnimation("left_hallway", LEFT_HALLWAY_FRAMES),
  right_hallway: defineAnimation("right_hallway", RIGHT_HALLWAY_FRAMES),
  door_hallway: defineAnimation("door_hallway", DOOR_HALLWAY_FRAMES),
  door_hallway_light: defineAnimation("door_hallway_light", DOOR_HALLWAY_LIGHT_FRAMES),
};

/** `null` = žádná sekvence pro tenhle animationId — volající (CameraDamageOverlay.tsx) spadne na CSS fallback. V praxi dnes všech pět kamer sekvenci má, `null` zůstává jako obecná ochrana (viz game/core/cameraDamage.ts#resolveGhoulCameraAttackAnimationId). */
export function getGhoulCameraAttackAnimation(animationId: GhoulCameraAttackAnimationId | null): CameraAttackAnimationDefinition | null {
  return animationId ? GHOUL_CAMERA_ATTACK_ANIMATIONS[animationId] : null;
}

// Stáhne všech 5 sekvencí do cache prohlížeče na LoadingScreen (stejný vzor
// jako preloadCameraImages/preloadBackgroundImages) — ať animace při vzácném
// spuštění útoku necuká na pomalejším připojení.
export function preloadGhoulCameraAttackAnimations(): void {
  if (typeof window === "undefined") return;
  for (const animation of Object.values(GHOUL_CAMERA_ATTACK_ANIMATIONS)) {
    for (const src of animation.frames) {
      const img = new Image();
      img.src = src;
    }
  }
}
