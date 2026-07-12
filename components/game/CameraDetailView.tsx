import { COPY } from "@/content/copy";
import { CameraDefinition, EnemyMoveDecision, EnemyStage } from "@/game/core/types";
import CameraView from "./CameraView";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface CameraDetailViewProps {
  camera: CameraDefinition | null;
  enemyStage: EnemyStage;
  focused: boolean;
  lightOn: boolean;
  elapsedMs: number;
  lastEnemyDecision: EnemyMoveDecision;
  enemyStageVisitSeq: number;
  manualCameraExperimentEnabled: boolean;
  onBack: () => void;
}

// Zvětšený detail jedné kamery (viz GameState.cameraViewMode === "detail").
// Jediné místo, kde CameraView reálně ukazuje živý obraz — hráč se sem musí
// aktivně proklikat z CameraMonitorGrid a stejně tak aktivně vrátit zpět.
export default function CameraDetailView({
  camera,
  enemyStage,
  focused,
  lightOn,
  elapsedMs,
  lastEnemyDecision,
  enemyStageVisitSeq,
  manualCameraExperimentEnabled,
  onBack,
}: CameraDetailViewProps) {
  return (
    <div className="camera-detail-zoom-in flex flex-col gap-2">
      <CameraView
        camera={camera}
        enemyStage={enemyStage}
        focused={focused}
        lightOn={lightOn}
        elapsedMs={elapsedMs}
        lastEnemyDecision={lastEnemyDecision}
        enemyStageVisitSeq={enemyStageVisitSeq}
        manualCameraExperimentEnabled={manualCameraExperimentEnabled}
      />
      <ViewSwitchArrow label={COPY.game.backToOverviewLabel} onClick={onBack} align="left" />
    </div>
  );
}
