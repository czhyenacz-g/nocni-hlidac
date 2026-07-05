import { CameraDefinition, CameraId, CameraViewMode, EnemyStage } from "@/game/core/types";
import CameraMonitorGrid from "./CameraMonitorGrid";
import CameraDetailView from "./CameraDetailView";

interface CameraPanelProps {
  cameras: CameraDefinition[];
  cameraViewMode: CameraViewMode;
  activeCameraId: CameraId | null;
  enemyStage: EnemyStage;
  focused: boolean;
  lightOn: boolean;
  elapsedMs: number;
  monsterRetreatedTo: EnemyStage | null;
  monsterRetreatVerified: boolean;
  onSelectCamera: (id: CameraId) => void;
  onCloseCameras: () => void;
}

// Wrapper podle GameState.cameraViewMode: overview = mřížka monitorů
// (CameraMonitorGrid), detail = zvětšená jedna kamera (CameraDetailView).
// Sama žádnou herní logiku nemá, jen vybírá, co vykreslit.
export default function CameraPanel({
  cameras,
  cameraViewMode,
  activeCameraId,
  enemyStage,
  focused,
  lightOn,
  elapsedMs,
  monsterRetreatedTo,
  monsterRetreatVerified,
  onSelectCamera,
  onCloseCameras,
}: CameraPanelProps) {
  if (cameraViewMode === "detail") {
    const activeCamera = cameras.find((c) => c.id === activeCameraId) ?? null;
    return (
      <CameraDetailView
        camera={activeCamera}
        enemyStage={enemyStage}
        focused={focused}
        lightOn={lightOn}
        elapsedMs={elapsedMs}
        monsterRetreatedTo={monsterRetreatedTo}
        monsterRetreatVerified={monsterRetreatVerified}
        onBack={onCloseCameras}
      />
    );
  }

  return <CameraMonitorGrid cameras={cameras} onSelectCamera={onSelectCamera} />;
}
