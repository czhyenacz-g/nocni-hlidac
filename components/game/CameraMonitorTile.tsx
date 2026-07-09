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
      className="pixel-button pixel-screen-static camera-monitor-tile tap-target group relative h-20 lg:h-28 w-full flex flex-col items-center justify-center gap-1 px-2 text-center"
      onClick={onClick}
      aria-label={`${camera.label} — zvětšit`}
    >
      <span className="text-[9px] lg:text-[10px] text-gray-400 leading-tight">{camera.label}</span>
      <span className="text-[8px] lg:text-[9px] text-gray-600">⤢</span>
      {/* Popis kamery (viz CameraDefinition.description, stejné jako v
          detailu — CameraView.tsx) — schovaný, dokud hráč nenajede myší na
          monitor, ať nezaplácá malý štítek, ale poradí před kliknutím. */}
      {camera.description && (
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-36 -translate-x-1/2 rounded border border-gray-700 bg-black/90 px-2 py-1 text-[9px] leading-tight text-gray-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {camera.description}
        </span>
      )}
    </button>
  );
}
