import { COPY } from "@/content/copy";
import { CameraDefinition, CameraId } from "@/game/core/types";
import CameraMonitorTile from "./CameraMonitorTile";

interface CameraMonitorGridProps {
  cameras: CameraDefinition[];
  onSelectCamera: (id: CameraId) => void;
}

// Přehled všech kamer dané směny jako mřížka malých monitorů — vždy 2 sloupce
// (na 4 kamerách vyjde čistá 2×2, ale funguje i pro jiný počet, viz
// CLAUDE.md "seznam kamer je vždy konfigurační"). Klik na monitor otevře
// detail dané kamery (OPEN_CAMERA -> cameraViewMode: "detail").
export default function CameraMonitorGrid({ cameras, onSelectCamera }: CameraMonitorGridProps) {
  // Pořadí podle order (kamery bez order jdou na konec) — stejné řazení jako
  // dřív u tlačítek, teď jen bez levo/pravo zarovnání podle position (mřížka
  // monitorů je jednotná 2×2, ne diagram fyzického rozložení chodeb).
  const sortedCameras = [...cameras].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2">
        {sortedCameras.map((camera) => (
          <CameraMonitorTile key={camera.id} camera={camera} onClick={() => onSelectCamera(camera.id)} />
        ))}
      </div>
      <div className="text-[9px] text-gray-600 text-center">{COPY.game.cameraOverviewHint}</div>
    </div>
  );
}
