import { COPY } from "@/content/copy";
import { CameraDefinition, EnemyStage } from "@/game/core/types";

interface CameraViewProps {
  camera: CameraDefinition | null;
  enemyStage: EnemyStage;
  /** Když false, kamera ještě "ladí signál" (šum) — viz game/core/cameraFocus.ts. */
  focused: boolean;
}

export default function CameraView({ camera, enemyStage, focused }: CameraViewProps) {
  if (!camera) {
    return (
      <div className="pixel-panel pixel-screen-static h-40 flex items-center justify-center text-gray-500 text-sm">
        Žádná kamera vybrána
      </div>
    );
  }

  if (!focused) {
    return (
      <div className="pixel-panel pixel-screen-static camera-static h-40 flex flex-col items-center justify-center relative overflow-hidden">
        <span className="absolute top-1 left-2 text-[10px] text-gray-500">{camera.label}</span>
        <span className="text-gray-500 text-xs animate-pulse">{COPY.game.cameraFocusingLabel}</span>
      </div>
    );
  }

  const enemyVisible = camera.enemyVisibleAtStage === enemyStage;

  return (
    <div className="pixel-panel pixel-screen-static h-40 flex flex-col items-center justify-center relative overflow-hidden">
      <span className="absolute top-1 left-2 text-[10px] text-gray-500">
        {camera.label}
        {camera.description && <span className="block text-gray-600">{camera.description}</span>}
      </span>
      <span className="absolute top-1 right-2 text-[10px] text-red-500 animate-pulse">● REC</span>
      {enemyVisible ? (
        <span className="text-red-500 text-sm font-bold">POSTAVA V DOSAHU</span>
      ) : (
        <span className="text-gray-600 text-xs">— žádný pohyb —</span>
      )}
    </div>
  );
}
