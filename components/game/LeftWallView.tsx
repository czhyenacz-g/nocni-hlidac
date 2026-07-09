import { useEffect, useState, type PointerEvent } from "react";
import { COPY } from "@/content/copy";
import { EMERGENCY_RUN_WINDUP_DURATION_MS, THINK_IT_OVER_WINDUP_DURATION_MS } from "@/game/balancing/constants";
import { computeEmergencyRunWindupProgressRatio } from "@/game/core/emergencyRunWindupProgress";
import { computeThinkItOverWindupProgressRatio } from "@/game/core/thinkItOverWindupProgress";
import { SHOTGUN_MAX_AMMO } from "@/game/core/shotgunEquipment";
import ViewSwitchArrow from "./ViewSwitchArrow";
import ConsoleIcon from "./ConsoleIcon";

interface LeftWallViewProps {
  onLookAtDesk: () => void;
  /**
   * Přepne na DoorView (viz zadání "hráč nemá ztrácet čas navigací přes
   * control-room obrazovku po monster_reached_office") — obyčejná
   * navigace, funguje vždy, ne jen v krizi (viz officeBreachActive níže,
   * které mění jen text/zvýraznění, ne dostupnost).
   */
  onLookAtDoor: () => void;
  /**
   * `true`, dokud běží "monster_reached_office" krize (viz
   * game/core/officeBreachAftermath.ts#resolveOfficeBreachPhase !== null,
   * GameScreen.tsx) — přepne text tlačítka "Otočit se ke dveřím" na
   * výraznější "RYCHLE KE DVEŘÍM!" a přidá pulzující zvýraznění.
   */
  officeBreachActive: boolean;
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
  /**
   * Zahájí/zruší držení "Nechat si to projít hlavou" (viz
   * app/play/page.tsx#handleStartThinkItOverWindup, GameState.thinkItOverWindup)
   * — vedlejší tlačítko vidět jen s brokovnicí (hasShotgun), stejný "drž
   * tlačítko" vzor jako emergency run výše, jen bez otevřených dveří a bez
   * minihry na konci.
   */
  onStartThinkItOverWindup: () => void;
  onCancelThinkItOverWindup: () => void;
  thinkItOverWindupActive: boolean;
  thinkItOverWindupProgressMs: number;
  /**
   * `true`, jakmile hráč tuhle noc aspoň jednou zranil monstrum brokovnicí
   * (viz GameState.monsterHitsToday, game/core/monsterEnding.ts) — přepne
   * text tlačítka "Jít ven" z `startEmergencyRunLabel` na
   * `startEmergencyRunHuntingLabel` ("Vyrazit na lov"). Stejné tlačítko/
   * mechanika, jen jiný text.
   */
  hasWoundedMonsterToday: boolean;
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
  onLookAtDoor,
  officeBreachActive,
  onStartEmergencyRunWindup,
  onCancelEmergencyRunWindup,
  doorClosed,
  canStartEmergencyRun,
  emergencyRunWindupActive,
  emergencyRunWindupProgressMs,
  hasShotgun,
  shotgunAmmo,
  onStartThinkItOverWindup,
  onCancelThinkItOverWindup,
  thinkItOverWindupActive,
  thinkItOverWindupProgressMs,
  hasWoundedMonsterToday,
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

  function handleThinkItOverPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    onStartThinkItOverWindup();
  }

  function handleThinkItOverPointerUp() {
    onCancelThinkItOverWindup();
  }

  const windupSeconds = Math.max(0, (EMERGENCY_RUN_WINDUP_DURATION_MS - emergencyRunWindupProgressMs) / 1000).toFixed(1);
  const windupPercent = computeEmergencyRunWindupProgressRatio(emergencyRunWindupProgressMs) * 100;
  const thinkItOverSeconds = Math.max(0, (THINK_IT_OVER_WINDUP_DURATION_MS - thinkItOverWindupProgressMs) / 1000).toFixed(1);
  const thinkItOverPercent = computeThinkItOverWindupProgressRatio(thinkItOverWindupProgressMs) * 100;

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
              className={`pixel-button console-button tap-target flex items-center gap-2 px-3 py-2 text-xs touch-none select-none ${doorClosed ? "opacity-50" : ""}`}
              // Žluté blikání po dobu držení (viz zadání) — stejná
              // `pixel-blink` animace jako GeneratorView.tsx "restarting"
              // indikátor (styles/pixel.css), jen aplikovaná přímo na
              // tlačítko přes inline style, ať nemusí vznikat nová CSS
              // třída jen pro tenhle jeden podmíněný případ. Siréna (viz
              // app/play/page.tsx efekt na state.emergencyRunWindup.active)
              // jede nezávisle na tomhle — vizuál a zvuk oba řídí stejný
              // zdroj pravdy (emergencyRunWindupActive), ale samostatně.
              style={
                emergencyRunWindupActive
                  ? { animation: "pixel-blink 0.35s steps(2) infinite", backgroundColor: "#facc15", color: "#1a1a1a" }
                  : undefined
              }
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <span className="console-icon-block" aria-hidden="true">
                <ConsoleIcon id="warn" />
              </span>
              <span>
                {emergencyRunWindupActive
                  ? COPY.game.emergencyRunHoldingLabel.replace("{seconds}", windupSeconds)
                  : hasWoundedMonsterToday
                    ? COPY.game.startEmergencyRunHuntingLabel
                    : COPY.game.startEmergencyRunLabel}
              </span>
            </button>
          )}
        </div>
        {canStartEmergencyRun && emergencyRunWindupActive && (
          <div className="w-32 h-1 bg-gray-800 border border-gray-700 rounded overflow-hidden">
            <div className="h-full bg-red-500 transition-all duration-150" style={{ width: `${windupPercent}%` }} />
          </div>
        )}

        {/* "Otočit se ke dveřím" (viz zadání) — obyčejná navigační zkratka na
            DoorView, funguje vždy (nezávislá na canStartEmergencyRun/dveřích),
            ať hráč nemusí přes ViewSwitchArrow zpátky na DeskView a odtud
            znovu na dveře. V krizi (officeBreachActive, viz
            game/core/officeBreachAftermath.ts) dostane výraznější text a
            stejné pulzující zvýraznění jako emergency-run tlačítko výše. */}
        <button
          type="button"
          className="pixel-button console-button console-button--primary tap-target flex items-center gap-2.5 px-3 py-2.5 text-xs touch-none select-none w-full"
          style={
            officeBreachActive
              ? { animation: "pixel-blink 0.6s steps(2) infinite", backgroundColor: "#ef4444", color: "#fff" }
              : undefined
          }
          onClick={onLookAtDoor}
        >
          <span className="console-icon-block console-icon-block--primary" aria-hidden="true">
            <ConsoleIcon id="door" />
          </span>
          <span className="flex-1 text-left">{officeBreachActive ? COPY.game.turnToDoorUrgentLabel : COPY.game.turnToDoorLabel}</span>
        </button>
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

        {/* "Nechat si to projít hlavou" (viz zadání) — vedlejší tlačítko
            vidět jen s brokovnicí, stejný "drž tlačítko" vzor jako emergency
            run výše, jen delší (THINK_IT_OVER_WINDUP_DURATION_MS) a bez
            spuštění minihry na konci — jen textová hláška (viz
            app/play/page.tsx#thinkItOverReadySeq efekt). */}
        {hasShotgun && (
          <div className="w-full flex items-center justify-end gap-3">
            <button
              type="button"
              className="pixel-button console-button tap-target flex items-center gap-2 px-3 py-2 text-xs touch-none select-none"
              onPointerDown={handleThinkItOverPointerDown}
              onPointerUp={handleThinkItOverPointerUp}
              onPointerLeave={handleThinkItOverPointerUp}
              onPointerCancel={handleThinkItOverPointerUp}
            >
              <span className="console-icon-block" aria-hidden="true">
                <ConsoleIcon id="warn" />
              </span>
              <span>
                {thinkItOverWindupActive
                  ? COPY.game.thinkItOverHoldingLabel.replace("{seconds}", thinkItOverSeconds)
                  : COPY.game.startThinkItOverLabel}
              </span>
            </button>
          </div>
        )}
        {hasShotgun && thinkItOverWindupActive && (
          <div className="w-32 h-1 bg-gray-800 border border-gray-700 rounded overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-150" style={{ width: `${thinkItOverPercent}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
