import { CameraDefinition } from "@/game/core/types";

interface CameraMonitorTileProps {
  camera: CameraDefinition;
  onClick: () => void;
}

// Jeden monitor v overview mřížce (viz CameraMonitorGrid.tsx). Ukazuje jen
// štítek + statický šum, ŽÁDNÝ živý obraz — jinak by šlo sledovat všechny
// kamery najednou zdarma, viz GameState.cameraViewMode. Skutečný obraz je
// jen v detailu (CameraDetailView.tsx) po kliknutí sem.
export default function CameraMonitorTile({ camera, onClick }: CameraMonitorTileProps) {
  return (
    <button
      className="pixel-button pixel-screen-static camera-monitor-tile tap-target h-20 lg:h-28 w-full flex flex-col items-center justify-center gap-1 px-2 text-center"
      onClick={onClick}
      aria-label={`${camera.label} — zvětšit`}
    >
      <span className="text-[9px] lg:text-[10px] text-gray-400 leading-tight">{camera.label}</span>
      <span className="text-[8px] lg:text-[9px] text-gray-600">⤢</span>
    </button>
  );
}
