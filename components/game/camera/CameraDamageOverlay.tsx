import { COPY } from "@/content/copy";
import { CameraAttackVisualPhase, GhoulCameraAttackAnimationId } from "@/game/core/types";
import { getGhoulCameraAttackAnimation } from "@/game/cameras/cameraAttackAnimation.object13";
import GhoulCameraAttackAnimation from "./GhoulCameraAttackAnimation";

interface CameraDamageOverlayProps {
  phase: CameraAttackVisualPhase;
  /** GameState.cameraDamage.activeAttack.animationId — `null` (chybějící/prázdná sekvence) spadne na CSS fallback (viz zadání "Fallback"). */
  animationId: GhoulCameraAttackAnimationId | null;
  /** GameState.cameraDamage.activeAttack.startedAtMs — React `key` na CSS větvi (viz níže) i vstup pro odvození aktuálního snímku. */
  attackStartedAtMs: number | null;
  /** GameState.elapsedMs — jediný zdroj pravdy pro index snímku (viz GhoulCameraAttackAnimation.tsx), žádný lokální timer. */
  nowMs: number;
}

/**
 * Vizuální prezentace útoku Ghoula na kameru — ODDĚLENÁ od rozhodovací
 * logiky (viz zadání "renderer nesmí sama rozhodovat, zda útok nastane, sama
 * měnit lokaci Ghoula, sama zapisovat vyřazenou kameru"). `"idle"` nevykresluje
 * nic (volající — CameraDetailView.tsx — tuhle komponentu vůbec nevolá mimo
 * aktivní útok/offline).
 *
 * `"approaching-camera"`: skutečná obrázková sekvence (viz
 * GhoulCameraAttackAnimation.tsx), pokud `getGhoulCameraAttackAnimation`
 * vrátí neprázdnou sadu snímků pro `animationId` — jinak (chybějící/prázdná
 * sekvence, viz zadání "Fallback") stejný CSS ztmavovací/zrnící efekt jako
 * `"signal-failing"` níže, ať produkční hra nikdy nespadne na chybějící asset.
 *
 * `"signal-failing"`: krátký závěrečný CSS ztmavovací/zrnící ohon (viz
 * styles/pixel.css#.camera-attack-*) PO doběhnutí sekvence+hold, těsně před
 * `"offline"`.
 *
 * `"offline"`: PLNĚ neprůhledná vrstva (žádná průhlednost k živému obrazu
 * pod sebou — viz zadání "obraz monstra není vidět") se zrněním, textem o
 * ztrátě signálu A potvrzením, že mikrofon zůstává aktivní (viz zadání
 * "vyřazení kamery znamená pouze ztrátu obrazu, ne zvuku").
 */
export default function CameraDamageOverlay({ phase, animationId, attackStartedAtMs, nowMs }: CameraDamageOverlayProps) {
  if (phase === "idle") return null;

  if (phase === "offline") {
    return (
      <div className="camera-offline-screen absolute inset-0 flex flex-col items-center justify-center gap-1 text-center" aria-hidden="true">
        <div className="camera-offline-grain absolute inset-0" />
        <div className="relative text-red-500 text-xs tracking-widest animate-pulse">{COPY.game.cameraOfflineSignalLostLabel}</div>
        <div className="relative text-gray-400 text-[10px] tracking-wide">{COPY.game.cameraOfflineOutOfServiceLabel}</div>
        <div className="relative text-gray-500 text-[9px] tracking-wide">{COPY.game.cameraOfflineServiceAtLabel}</div>
        <div className="relative text-gray-400 text-[9px] tracking-wide mt-1">{COPY.game.cameraOfflineMicActiveLabel}</div>
      </div>
    );
  }

  const animation = phase === "approaching-camera" ? getGhoulCameraAttackAnimation(animationId) : null;
  if (animation && animation.frames.length > 0 && attackStartedAtMs !== null) {
    return <GhoulCameraAttackAnimation animation={animation} startedAtMs={attackStartedAtMs} nowMs={nowMs} />;
  }

  return (
    <div key={attackStartedAtMs} className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="camera-attack-darken absolute inset-0" />
      <div className="camera-attack-grain absolute inset-0" />
      <div className="camera-attack-blink absolute inset-0" />
    </div>
  );
}
