import { CameraDefinition, CameraId } from "@/game/core/types";

interface CameraPanelProps {
  cameras: CameraDefinition[];
  activeCameraId: CameraId | null;
  cameraOpen: boolean;
  onSelectCamera: (id: CameraId) => void;
  onCloseCameras: () => void;
}

export default function CameraPanel({
  cameras,
  activeCameraId,
  cameraOpen,
  onSelectCamera,
  onCloseCameras,
}: CameraPanelProps) {
  // Pořadí v panelu podle order (kamery bez order jdou za těmi s order, jinak
  // v pořadí, ve kterém přišly z konfigurace směny).
  const sortedCameras = [...cameras].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

  return (
    <div className="flex gap-2 flex-wrap">
      {sortedCameras.map((camera) => (
        <button
          key={camera.id}
          className="pixel-button px-3 py-2 text-xs"
          data-active={cameraOpen && activeCameraId === camera.id}
          onClick={() => onSelectCamera(camera.id)}
        >
          {camera.label}
        </button>
      ))}
      <button className="pixel-button px-3 py-2 text-xs" onClick={onCloseCameras}>
        Zavřít kamery
      </button>
    </div>
  );
}
