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
  /** Viz GameState.sonicCannonActive — tlačítko/přepínač i modrý overlay se řídí přímo tímhle, žádný lokální komponentní stav. */
  sonicCannonActive: boolean;
  onToggleSonicCannon: () => void;
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
  sonicCannonActive,
  onToggleSonicCannon,
  onBack,
}: CameraDetailViewProps) {
  return (
    <div className="camera-detail-zoom-in flex flex-col gap-2">
      {/* `relative` obal jen kvůli sonic-cannon overlayi níže — CameraView
          samo o sobě zůstává beze změny (žádný nový prop pro obrázek/motion
          pan, ten zůstává čistě uvnitř CameraView.tsx). */}
      <div className="relative">
        <CameraView
          camera={camera}
          enemyStage={enemyStage}
          focused={focused}
          lightOn={lightOn}
          elapsedMs={elapsedMs}
          lastEnemyDecision={lastEnemyDecision}
          enemyStageVisitSeq={enemyStageVisitSeq}
        />
        {/* Lehký modrý filtr (viz zadání "vysoká průhlednost, nesmí výrazně
            zhoršit čitelnost monstra") — samostatná `pointer-events-none`
            vrstva NAD obrázkem, nezasahuje do CameraView/manual pan motion
            animace pod sebou. `sonic-cannon-overlay` (styles/pixel.css) drží
            jemné vlnění/rušení — žádný fullscreen flash, žádné silné
            blikání (viz zadání). */}
        {sonicCannonActive && (
          <div className="absolute inset-0 pointer-events-none sonic-cannon-overlay" aria-hidden="true">
            <span className="absolute bottom-1 right-2 text-[9px] tracking-widest text-cyan-300">
              {COPY.game.sonicCannonOnLabel}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        className={`pixel-button tap-target px-3 py-2 text-xs ${sonicCannonActive ? "console-button--primary" : ""}`}
        onClick={onToggleSonicCannon}
      >
        {sonicCannonActive ? COPY.game.sonicCannonOnLabel : COPY.game.sonicCannonOffLabel}
      </button>

      <ViewSwitchArrow label={COPY.game.backToOverviewLabel} onClick={onBack} align="left" />
    </div>
  );
}
