import { useEffect, useState, type PointerEvent } from "react";
import { COPY } from "@/content/copy";
import { EMERGENCY_RUN_WINDUP_DURATION_MS } from "@/game/balancing/constants";
import { computeEmergencyRunWindupProgressRatio } from "@/game/core/emergencyRunWindupProgress";
import { SHOTGUN_MAX_AMMO } from "@/game/core/shotgunEquipment";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface LeftWallViewProps {
  onLookAtDesk: () => void;
  /**
   * Zahájí držení "Nouzově opustit místnost" (viz
   * app/play/page.tsx#handleStartEmergencyRunWindup, GameState.emergencyRunWindup)
   * — stejný "drž a riskuj" vzor jako ruční výměna žárovky v DoorView.tsx.
   * Klik/pointerDown funguje vždy (i se zavřenými dveřmi) — handler sám
   * rozhodne, jestli držení skutečně spustí, nebo jen ukáže hint "musíš
   * nejdřív otevřít dveře" (viz doorClosed níže), ať tlačítko dá feedback
   * místo aby bylo tiše needisabled/neklikatelné.
   */
  onStartEmergencyRunWindup: () => void;
  /** Puštění tlačítka / pointer leave / cancel před dokončením — viz onCancelBulbReplacement v DoorView.tsx pro stejný vzor. No-op, pokud žádné držení zrovna neběží. */
  onCancelEmergencyRunWindup: () => void;
  /** Tlačítko je vizuálně aktivní jen s otevřenými dveřmi (viz GameScreen.tsx, state.doorClosed) — hráč nemůže vyběhnout ven zavřenými dveřmi. */
  doorClosed: boolean;
  /**
   * Jestli tuhle noc vůbec existuje "Jít ven pro baterii" (viz
   * game/core/emergencyMiniGameIntegration.ts#canStartBatteryEmergencyRun,
   * NightFeatureFlags.emergencyRunsEnabled/batteryRunEnabled) — `false`
   * tlačítko vůbec NEZOBRAZÍ (MVP preference ze zadání: rané noci nemají být
   * matoucí viditelným, ale nefunkčním tlačítkem).
   */
  canStartEmergencyRun: boolean;
  /** viz GameState.emergencyRunWindup — probíhající držení tlačítka. */
  emergencyRunWindupActive: boolean;
  emergencyRunWindupProgressMs: number;
  /** Trvalé vlastnictví brokovnice (viz GameState.hasShotgun, game/core/shotgunEquipment.ts) — přepíná zeď z prázdného stojanu na stojan s brokovnicí. */
  hasShotgun: boolean;
  /** Aktuální munice (0 nebo SHOTGUN_MAX_AMMO) — zobrazuje se jen když hasShotgun je true. */
  shotgunAmmo: number;
}

/** Prázdný stojan na zbraň — beze změny oproti dřívějšku, dokud hráč brokovnici nemá (viz hasShotgun). */
const EMPTY_LEFT_WALL_IMAGE_SRC = "/object_13/views/empty-shotgun.webp";
/** Stejná scéna, ale s brokovnicí na zdi — hráč ji trvale získal (viz game/core/shotgunEquipment.ts). Zatím jen .webp (žádný .png fallback jako u prázdného stojanu), ale stejný imageFailed guard níže hru neshodí, kdyby soubor chyběl. */
const SHOTGUN_LEFT_WALL_IMAGE_SRC = "/object_13/views/shotgun.webp";

// Čistě atmosférický pohled bez herní mechaniky (viz gameReducer.ts
// LOOK_AT_LEFT_WALL) — stejné rámované okno na scénu jako DoorView
// (`.door-scene-frame`, styles/pixel.css: letterboxovaný 16:9 rám, ne
// full-viewport bg-cover pozadí), jen s jedním statickým obrázkem místo
// dveřních snímků a bez hotspotu. Tlačítko zpět je pod rámem ve vlastním
// max-w-md, stejně jako u DoorView — viz GameScreen.tsx, kde je left_wall
// (spolu s door) mimo běžný HUD/max-w wrapper.
export default function LeftWallView({
  onLookAtDesk,
  onStartEmergencyRunWindup,
  onCancelEmergencyRunWindup,
  doorClosed,
  canStartEmergencyRun,
  emergencyRunWindupActive,
  emergencyRunWindupProgressMs,
  hasShotgun,
  shotgunAmmo,
}: LeftWallViewProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const wallImageSrc = hasShotgun ? SHOTGUN_LEFT_WALL_IMAGE_SRC : EMPTY_LEFT_WALL_IMAGE_SRC;
  // hasShotgun mění, KTERÝ soubor se má načíst — dřívější selhání jednoho z
  // nich (imageFailed) nesmí trvale skrýt i ten druhý, jakmile hráč
  // brokovnici získá (nebo v dev/testu naopak).
  useEffect(() => {
    setImageFailed(false);
  }, [wallImageSrc]);

  // Držení tlačítka řídí progres v reduceru (TICK + START/CANCEL_EMERGENCY_RUN_WINDUP),
  // ne lokální React state — pointerUp/Leave/Cancel všechny mapují na stejné
  // zrušení, ať držení nikdy neběží bez toho, aby hráč tlačítko fyzicky
  // držel. Stejný vzor jako handlePointerDown/Up v DoorView.tsx.
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    onStartEmergencyRunWindup();
  }

  function handlePointerUp() {
    onCancelEmergencyRunWindup();
  }

  const windupSeconds = Math.max(0, (EMERGENCY_RUN_WINDUP_DURATION_MS - emergencyRunWindupProgressMs) / 1000).toFixed(1);
  const windupPercent = computeEmergencyRunWindupProgressRatio(emergencyRunWindupProgressMs) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="door-scene-frame">
        {!imageFailed ? (
          <img
            src={wallImageSrc}
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

      <div className="w-full max-w-md mx-auto flex flex-col items-end gap-2">
        <div className="w-full flex items-center justify-between gap-3">
          <ViewSwitchArrow label={COPY.game.leftWallBackLabel} onClick={onLookAtDesk} align="left" />
          {/* Vývojářsky dostupné tlačítko pro první napojení EmergencyMiniGame
              (viz app/play/page.tsx#handleStartEmergencyRunWindup) — nenápadné,
              bez finálního artu. Musí se držet EMERGENCY_RUN_WINDUP_DURATION_MS,
              ne jen kliknout (stejný "drž a riskuj" vzor jako výměna žárovky) —
              po tu dobu dál běží normální herní smyčka, hráč je reálně v
              ohrožení. Se zavřenými dveřmi je jen vizuálně ztlumené (ne HTML
              disabled) — pointerDown pořád projde, ať handler může ukázat hint
              "nejdřív otevři dveře". Bez canStartEmergencyRun (night feature
              flag) se tlačítko vůbec nevykreslí. */}
          {canStartEmergencyRun && (
            <button
              type="button"
              className={`pixel-button tap-target px-3 py-2 text-xs touch-none select-none ${doorClosed ? "opacity-50" : ""}`}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {emergencyRunWindupActive
                ? COPY.game.emergencyRunHoldingLabel.replace("{seconds}", windupSeconds)
                : COPY.game.startEmergencyRunLabel}
            </button>
          )}
        </div>
        {canStartEmergencyRun && emergencyRunWindupActive && (
          <div className="w-32 h-1 bg-gray-800 border border-gray-700 rounded overflow-hidden">
            <div className="h-full bg-red-500 transition-all duration-150" style={{ width: `${windupPercent}%` }} />
          </div>
        )}
        {/* Nenápadná informace o munici (viz zadání) — jen když má hráč
            brokovnici vůbec (bez ní nedává tenhle text smysl a jen by
            prozrazoval mechaniku předem). */}
        {hasShotgun && (
          <div className="text-[10px] text-gray-400">
            {shotgunAmmo > 0
              ? COPY.game.shotgunAmmoReadyLabel.replace("{ammo}", String(shotgunAmmo)).replace("{max}", String(SHOTGUN_MAX_AMMO))
              : COPY.game.shotgunAmmoEmptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}
