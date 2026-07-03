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
  return (
    <div className="flex gap-2 flex-wrap">
      {cameras.map((camera) => (
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
