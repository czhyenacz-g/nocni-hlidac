import { CameraDefinition, CameraId } from "@/game/core/types";

interface CameraPanelProps {
  cameras: CameraDefinition[];
  activeCameraId: CameraId | null;
  cameraOpen: boolean;
  onSelectCamera: (id: CameraId) => void;
  onCloseCameras: () => void;
}

// "left"/"right" sedí vedle sebe ve stejné řadě 2sloupcové mřížky, "center"
// (i kamery bez position) zabere celou šířku řady — viz CameraDefinition.position.
function positionClassName(position: CameraDefinition["position"]): string {
  if (position === "left") return "col-start-1";
  if (position === "right") return "col-start-2";
  return "col-span-2";
}

export default function CameraPanel({
  cameras,
  activeCameraId,
  cameraOpen,
  onSelectCamera,
  onCloseCameras,
}: CameraPanelProps) {
  // Pořadí v panelu podle order (kamery bez order jdou za těmi s order, jinak
  // v pořadí, ve kterém přišly z konfigurace směny). Uvnitř mřížky o tom, kdo
  // sedí vlevo/vpravo, rozhoduje position — pořadí v poli řeší jen tie-breaky.
  const sortedCameras = [...cameras].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

  return (
    <div className="grid grid-cols-2 gap-3">
      {sortedCameras.map((camera) => (
        <button
          key={camera.id}
          className={`pixel-button tap-target px-3 py-2 text-xs ${positionClassName(camera.position)}`}
          data-active={cameraOpen && activeCameraId === camera.id}
          onClick={() => onSelectCamera(camera.id)}
          aria-label={camera.label}
        >
          {camera.label}
        </button>
      ))}
      <button className="pixel-button tap-target col-span-2 px-3 py-2 text-xs" onClick={onCloseCameras}>
        Zavřít kamery
      </button>
    </div>
  );
}
