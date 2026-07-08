import { useState } from "react";
import { COPY } from "@/content/copy";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface LeftWallViewProps {
  onLookAtDesk: () => void;
  /**
   * Spustí nouzovou minihru (viz app/play/page.tsx#handleStartEmergencyRun) —
   * první tenké napojení EmergencyMiniGame do /play, zatím vývojářské
   * tlačítko bez finálního artu. Klik funguje vždy (i se zavřenými dveřmi) —
   * handler sám rozhodne, jestli minihru spustí, nebo jen ukáže hint "musíš
   * nejdřív otevřít dveře" (viz doorClosed níže), ať tlačítko dá feedback
   * místo aby bylo tiše needisabled/neklikatelné.
   */
  onStartEmergencyRun: () => void;
  /** Tlačítko "Jít ven" je vizuálně aktivní jen s otevřenými dveřmi (viz GameScreen.tsx, state.doorClosed) — hráč nemůže vyběhnout ven zavřenými dveřmi. */
  doorClosed: boolean;
  /**
   * Jestli tuhle noc vůbec existuje "Jít ven pro baterii" (viz
   * game/core/emergencyMiniGameIntegration.ts#canStartBatteryEmergencyRun,
   * NightFeatureFlags.emergencyRunsEnabled/batteryRunEnabled) — `false`
   * tlačítko vůbec NEZOBRAZÍ (MVP preference ze zadání: rané noci nemají být
   * matoucí viditelným, ale nefunkčním tlačítkem).
   */
  canStartEmergencyRun: boolean;
}

const LEFT_WALL_IMAGE_SRC = "/object_13/views/empty-shotgun.webp";

// Čistě atmosférický pohled bez herní mechaniky (viz gameReducer.ts
// LOOK_AT_LEFT_WALL) — stejné rámované okno na scénu jako DoorView
// (`.door-scene-frame`, styles/pixel.css: letterboxovaný 16:9 rám, ne
// full-viewport bg-cover pozadí), jen s jedním statickým obrázkem místo
// dveřních snímků a bez hotspotu. Tlačítko zpět je pod rámem ve vlastním
// max-w-md, stejně jako u DoorView — viz GameScreen.tsx, kde je left_wall
// (spolu s door) mimo běžný HUD/max-w wrapper.
export default function LeftWallView({ onLookAtDesk, onStartEmergencyRun, doorClosed, canStartEmergencyRun }: LeftWallViewProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="door-scene-frame">
        {!imageFailed ? (
          <img
            src={LEFT_WALL_IMAGE_SRC}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-sm text-gray-400">
            Chybí obrázek stěny.
          </div>
        )}
      </div>

      <div className="w-full max-w-md mx-auto flex items-center justify-between gap-3">
        <ViewSwitchArrow label={COPY.game.leftWallBackLabel} onClick={onLookAtDesk} align="left" />
        {/* Vývojářsky dostupné tlačítko pro první napojení EmergencyMiniGame
            (viz app/play/page.tsx#handleStartEmergencyRun) — nenápadné, bez
            finálního artu, jen aby šla nouzová výprava pro baterii ručně
            spustit a otestovat. Se zavřenými dveřmi je jen vizuálně ztlumené
            (ne HTML disabled) — klik pořád projde, ať handler může ukázat
            hint "nejdřív otevři dveře" místo tichého nic-se-nestane. Bez
            canStartEmergencyRun (night feature flag) se tlačítko vůbec
            nevykreslí — rané noci nemají mít viditelné, ale nefunkční
            tlačítko. */}
        {canStartEmergencyRun && (
          <button
            type="button"
            className={`pixel-button tap-target px-3 py-2 text-xs ${doorClosed ? "opacity-50" : ""}`}
            onClick={onStartEmergencyRun}
          >
            {COPY.game.startEmergencyRunLabel}
          </button>
        )}
      </div>
    </div>
  );
}
