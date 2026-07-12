import { CameraDefinition, CameraId, CameraViewMode, EnemyMoveDecision, EnemyStage } from "@/game/core/types";
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
  lastEnemyDecision: EnemyMoveDecision;
  enemyStageVisitSeq: number;
  /** Admin-only rychlá testovací pomůcka (viz zadání "rychlejší testování", game/cameras/cameraDoorAlert.ts) — jen v overview (CameraMonitorGrid), detail už skutečný obsah ukazuje sám. */
  showAdminDoorAlerts: boolean;
  /** Admin/debug přepínač "Experimentální ruční kamera" (viz zadání, game/visuals/cameraManualPan.ts) — jen v detailu (CameraDetailView), overview žádný živý obraz nemá. */
  manualCameraExperimentEnabled: boolean;
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
  lastEnemyDecision,
  enemyStageVisitSeq,
  showAdminDoorAlerts,
  manualCameraExperimentEnabled,
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
        lastEnemyDecision={lastEnemyDecision}
        enemyStageVisitSeq={enemyStageVisitSeq}
        manualCameraExperimentEnabled={manualCameraExperimentEnabled}
        onBack={onCloseCameras}
      />
    );
  }

  return (
    <CameraMonitorGrid
      cameras={cameras}
      enemyStage={enemyStage}
      showAdminDoorAlerts={showAdminDoorAlerts}
      onSelectCamera={onSelectCamera}
    />
  );
}
