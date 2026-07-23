import { useState } from "react";
import { useCopy } from "@/game/i18n/useTranslation";
import { CameraDamageState, CameraDefinition, EnemyMoveDecision, EnemyStage } from "@/game/core/types";
import { resolveCameraAttackVisualPhase } from "@/game/core/cameraDamage";
import CameraView from "./CameraView";
import CameraDamageOverlay from "./camera/CameraDamageOverlay";
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
  /** Viz GameState.cameraDamage — vzácný útok Ghoula (game/core/cameraDamage.ts), vykreslený přes CameraDamageOverlay.tsx jen když se týká PRÁVĚ TÉHLE kamery. */
  cameraDamage: CameraDamageState;
  /** `NightDefinition.enemy.id` — jen předává dál do CameraView.tsx (viz zadání "první jednoduchá verze assetové definice"). */
  monsterId: string;
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
  cameraDamage,
  monsterId,
}: CameraDetailViewProps) {
  const COPY = useCopy();
  // Vizuální fáze PRO PRÁVĚ TUHLE kameru (viz
  // game/core/cameraDamage.ts#resolveCameraAttackVisualPhase) — čistě
  // odvozená z cameraDamage + elapsedMs, může se týkat víc kamer za noc
  // (limit podle čísla noci), ale nejvýš JEDNA smí být zrovna "attacking".
  const attackPhase = camera !== null ? resolveCameraAttackVisualPhase(cameraDamage, camera.id, elapsedMs) : "idle";
  const isFullyOffline = attackPhase === "offline";

  // Klik na obraz ho zvětší 2.5x (viz zadání) — čistě lokální UI stav, žádný
  // GameState — netýká se herní logiky, jen zvětšeného náhledu. Druhý klik
  // zase zmenší zpátky.
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="camera-detail-zoom-in flex flex-col gap-2">
      {/* `relative` obal jen kvůli sonic-cannon/camera-damage overlayům níže
          — CameraView samo o sobě zůstává beze změny (žádný nový prop pro
          obrázek/motion pan, ten zůstává čistě uvnitř CameraView.tsx).
          `camera-detail-zoomed` (styles/pixel.css) škáluje CELÝ obal
          (obraz + overlaye společně), ne jen <img> — ať se sonic-cannon/
          damage overlay zvětší spolu s obrazem, ne zůstane v původní
          velikosti přes zvětšený obraz. */}
      <div
        className={`relative cursor-pointer camera-detail-zoom-toggle ${zoomed ? "camera-detail-zoomed" : ""}`}
        onClick={() => setZoomed((prev) => !prev)}
      >
        <CameraView
          camera={camera}
          enemyStage={enemyStage}
          focused={focused}
          lightOn={lightOn}
          elapsedMs={elapsedMs}
          lastEnemyDecision={lastEnemyDecision}
          enemyStageVisitSeq={enemyStageVisitSeq}
          monsterId={monsterId}
        />
        {/* Lehký modrý filtr (viz zadání "vysoká průhlednost, nesmí výrazně
            zhoršit čitelnost monstra") — samostatná `pointer-events-none`
            vrstva NAD obrázkem, nezasahuje do CameraView/manual pan motion
            animace pod sebou. `sonic-cannon-overlay` (styles/pixel.css) drží
            jemné vlnění/rušení — žádný fullscreen flash, žádné silné
            blikání (viz zadání). Vypnuto na plně offline kameře (viz
            TOGGLE_SONIC_CANNON guard v gameReducer.ts — dělo tam beztak
            nejde zapnout, overlay by tak zůstal navždy vidět zbytečně). */}
        {sonicCannonActive && !isFullyOffline && (
          <div className="absolute inset-0 pointer-events-none sonic-cannon-overlay" aria-hidden="true">
            <span className="absolute bottom-1 right-2 text-[9px] tracking-widest text-gray-300">
              {COPY.game.sonicCannonOnLabel}
            </span>
          </div>
        )}
        {/* Útok Ghoula na kameru (viz zadání) — `"offline"` je PLNĚ
            neprůhledná (viz CameraDamageOverlay.tsx), takže "nesmí být
            vidět aktuální pozice monstra" platí i s CameraView pod ní
            pořád vykresleným. */}
        <CameraDamageOverlay
          phase={attackPhase}
          animationId={camera !== null && cameraDamage.activeAttack?.cameraId === camera.id ? cameraDamage.activeAttack.animationId : null}
          attackStartedAtMs={camera !== null && cameraDamage.activeAttack?.cameraId === camera.id ? cameraDamage.activeAttack.startedAtMs : null}
          nowMs={elapsedMs}
        />
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
