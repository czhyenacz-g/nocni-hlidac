import { useEffect, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from "react";
import { COPY } from "@/content/copy";
import {
  EMERGENCY_RUN_WINDUP_DURATION_MS,
  REQUEST_AMMO_NO_WEAPON_MESSAGE_MS,
  THINK_IT_OVER_WINDUP_DURATION_MS,
} from "@/game/balancing/constants";
import { computeEmergencyRunWindupProgressRatio } from "@/game/core/emergencyRunWindupProgress";
import { computeThinkItOverWindupProgressRatio } from "@/game/core/thinkItOverWindupProgress";
import { getShotgunMaxAmmo } from "@/game/core/shotgunEquipment";
import { OFFICE_DOOR_LOCK_MAX_MS, OFFICE_DOOR_LOCK_MIN_MS } from "@/game/minigame/config";
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
  /** Konkrétně dvouhlavňovka (viz GameState.hasDoubleBarrelShotgun, true ending odměna) — přepíná stojan na zlatě zarámovanou trofejní verzi a texty na "Dvouhlavňovka". */
  hasDoubleBarrelShotgun: boolean;
  /** Aktuální munice (0 až SHOTGUN_MAX_AMMO nebo DOUBLE_BARREL_SHOTGUN_MAX_AMMO) — zobrazuje se jen když hasShotgun je true. */
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
  /**
   * Posuvník "za jak dlouho se dveře do kanceláře samy odemknou" (viz
   * GameState.officeDoorLockMs, game/minigame/config.ts#OFFICE_DOOR_LOCK_MIN_MS/MAX_MS,
   * zadání "kompenzovat horší mobilní ovládání") — zobrazí se jen s
   * brokovnicí (hasShotgun), stejná podmínka jako "Nechat si to projít
   * hlavou" výše. EMERGENCY_MONSTER_OFFICE_TARGET_DELAY_MS (5s od odemčení
   * dveří, kdy se monstrum vydá do kanceláře) tímhle posuvníkem NENÍ
   * ovlivněné — jen zkracuje/prodlužuje samotné zamčení.
   */
  officeDoorLockMs: number;
  onChangeOfficeDoorLockMs: (value: number) => void;
  /**
   * Tlačítko "ZAŽÁDAT O MUNICI" (viz zadání "systém brokovnice a
   * přebíjení", game/core/shotgunEquipment.ts#requestSingleAmmo) — na rozdíl
   * od ostatních brokovnicových prvků výše (hasShotgun && ...) se dávkovač
   * zobrazuje VŽDY, i bez brokovnice (jen vizuálně ztlumený, ne HTML
   * disabled — stejný "klik dá zpětnou vazbu, ne ticho" vzor jako emergency
   * run tlačítko se zavřenými dveřmi). O tom, jestli klik skutečně přidá
   * náboj nebo jen zahraje zvuk odmítnutí, rozhoduje
   * app/play/page.tsx#handleRequestAmmo PŘED dispatchem.
   */
  onRequestAmmo: () => void;
}

/** Prázdný stojan na zbraň — beze změny oproti dřívějšku, dokud hráč brokovnici nemá (viz hasShotgun). */
const EMPTY_LEFT_WALL_IMAGE_SRC = "/object_13/views/empty-shotgun.webp";
/** Stejná scéna, ale s brokovnicí na zdi — hráč ji trvale získal (viz game/core/shotgunEquipment.ts). Zatím jen .webp (žádný .png fallback jako u prázdného stojanu), ale stejný imageFailed guard níže hru neshodí, kdyby soubor chyběl. */
const SHOTGUN_LEFT_WALL_IMAGE_SRC = "/object_13/views/shotgun.webp";
/**
 * Trvalá true ending odměna (viz zadání, game/core/monsterDefeatReward.ts) —
 * zlatě zarámovaná trofejní dvouhlavňovka s deskou "Big mamma for big boy!",
 * dodaný asset (`public/object_13/views/reward_shotgun.png`, zkonvertovaný
 * na .webp), NE stejný obrázek jako běžná brokovnice s jiným textem.
 */
const DOUBLE_BARREL_LEFT_WALL_IMAGE_SRC = "/object_13/views/reward_shotgun.webp";

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
  hasDoubleBarrelShotgun,
  shotgunAmmo,
  onStartThinkItOverWindup,
  onCancelThinkItOverWindup,
  thinkItOverWindupActive,
  thinkItOverWindupProgressMs,
  hasWoundedMonsterToday,
  officeDoorLockMs,
  onChangeOfficeDoorLockMs,
  onRequestAmmo,
}: LeftWallViewProps) {
  const [imageFailed, setImageFailed] = useState(false);
  // Klik na dávkovač BEZ brokovnice nikdy nic nedispatchuje (viz
  // app/play/page.tsx#handleRequestAmmo, canRequestAmmo) — tahle hláška je
  // proto čistě lokální UI feedback na "prázdný" klik, ne reakce na herní
  // stav/seq z reduceru (na rozdíl od DoorView.tsx#showSuccessMessage).
  const [showNoWeaponMessage, setShowNoWeaponMessage] = useState(false);
  useEffect(() => {
    if (!showNoWeaponMessage) return;
    const timeout = setTimeout(() => setShowNoWeaponMessage(false), REQUEST_AMMO_NO_WEAPON_MESSAGE_MS);
    return () => clearTimeout(timeout);
  }, [showNoWeaponMessage]);
  function handleRequestAmmoClick() {
    if (!hasShotgun) {
      setShowNoWeaponMessage(true);
      return;
    }
    onRequestAmmo();
  }
  const wallImageSrc = !hasShotgun
    ? EMPTY_LEFT_WALL_IMAGE_SRC
    : hasDoubleBarrelShotgun
      ? DOUBLE_BARREL_LEFT_WALL_IMAGE_SRC
      : SHOTGUN_LEFT_WALL_IMAGE_SRC;
  // 0 bez brokovnice (viz zadání "0/0 nebo dávkovač skrytý" — zvolili jsme
  // "viditelný, ale neaktivní" variantu, proto 0/0 tady i v requestAmmoLabel
  // níže), jinak podle typu zbraně — jediné místo, kde tenhle výpočet dělá
  // rozdíl i BEZ hasShotgun (na rozdíl od shotgunMaxAmmo použití níže, které
  // je vždy uvnitř `hasShotgun &&` bloku).
  const shotgunMaxAmmo = getShotgunMaxAmmo({ hasShotgun, hasDoubleBarrelShotgun });
  const canRequestAmmoNow = hasShotgun && shotgunAmmo < shotgunMaxAmmo;
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

  function handleOfficeDoorLockMsChange(event: ChangeEvent<HTMLInputElement>) {
    onChangeOfficeDoorLockMs(Number(event.target.value));
  }

  const windupSeconds = Math.max(0, (EMERGENCY_RUN_WINDUP_DURATION_MS - emergencyRunWindupProgressMs) / 1000).toFixed(1);
  const windupPercent = computeEmergencyRunWindupProgressRatio(emergencyRunWindupProgressMs) * 100;
  const thinkItOverSeconds = Math.max(0, (THINK_IT_OVER_WINDUP_DURATION_MS - thinkItOverWindupProgressMs) / 1000).toFixed(1);
  const thinkItOverPercent = computeThinkItOverWindupProgressRatio(thinkItOverWindupProgressMs) * 100;

  return (
    <div className="flex flex-col gap-3">
      {/* --door-ui-reserved-height (viz styles/pixel.css#.door-scene-frame) —
          výchozích 180px je odladěno na DoorView (jen tlačítko zpět +
          přepnutí dveří). LeftWallView má pod rámem mnohem víc: emergency
          run tlačítko, "otočit se ke dveřím", munice, "Nechat si to projít
          hlavou" (+ progress bar) a posuvník zámku dveří (+ hint) — beze
          zvýšené rezervy je rám na mobilu příliš vysoký a spodek stránky
          (tlačítko/posuvník) zůstane pod viewportem, viditelný jen scrollem. */}
      <div className="door-scene-frame" style={{ "--door-ui-reserved-height": "420px" } as CSSProperties}>
        {!imageFailed ? (
          <img
            src={wallImageSrc}
            alt=""
            aria-hidden="true"
            // `object-cover`, NE `object-contain` (na žádost "ať je obrázek
            // velký aspoň jako dveře") — zdrojové obrázky zdi (1448×1086,
            // poměr 4:3) jsou "hranatější" než pevný 16:9 `.door-scene-frame`
            // (stejný rám jako DoorView, kde ho ale 16:9 obrázky dveří
            // vyplní přesně). S `object-contain` tak zbyly prázdné pruhy po
            // stranách a zbraň působila menší než dveře. `object-cover`
            // zdrojový obrázek ořízne nahoře/dole (brokovnice je na obrázku
            // vertikálně vycentrovaná, takže oříznutí nepřijde o nic
            // podstatného), ale vyplní celý rám stejně jako dveře.
            className="absolute inset-0 h-full w-full object-cover"
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
              ? (hasDoubleBarrelShotgun ? COPY.game.doubleBarrelAmmoReadyLabel : COPY.game.shotgunAmmoReadyLabel)
                  .replace("{ammo}", String(shotgunAmmo))
                  .replace("{max}", String(shotgunMaxAmmo))
              : hasDoubleBarrelShotgun
                ? COPY.game.doubleBarrelAmmoEmptyLabel
                : COPY.game.shotgunAmmoEmptyLabel}
          </div>
        )}

        {/* "ZAŽÁDAT O MUNICI" (viz zadání) — vidět VŽDY, i bez brokovnice
            (jen vizuálně ztlumené), ať hráč ví, že dávkovač existuje, dřív
            než zbraň najde. Přidá přesně jeden náboj na klik, nikdy nad
            kapacitu — druhý klik na plné kapacitě/bez zbraně jen zahraje
            zvuk odmítnutí (viz app/play/page.tsx#handleRequestAmmo). */}
        <button
          type="button"
          className={`pixel-button console-button tap-target flex items-center gap-2 px-3 py-2 text-xs touch-none select-none w-full justify-center ${canRequestAmmoNow ? "" : "opacity-50"}`}
          onClick={handleRequestAmmoClick}
        >
          <span>{COPY.game.requestAmmoLabel.replace("{ammo}", String(shotgunAmmo)).replace("{max}", String(shotgunMaxAmmo))}</span>
        </button>
        {showNoWeaponMessage && (
          <div className="text-[10px] text-amber-300 bg-black/70 px-2 py-1 rounded">{COPY.game.requestAmmoNoWeaponLabel}</div>
        )}

        {/* Posuvník "za jak dlouho se dveře do kanceláře samy odemknou" (viz
            zadání "kompenzovat horší mobilní ovládání") — jen s brokovnicí. */}
        {hasShotgun && (
          <label className="w-full flex flex-col gap-1 text-[10px] text-gray-400">
            <span className="flex justify-between">
              <span>{COPY.game.officeDoorLockSliderLabel.replace("{seconds}", String(Math.round(officeDoorLockMs / 1000)))}</span>
            </span>
            <input
              type="range"
              min={OFFICE_DOOR_LOCK_MIN_MS}
              max={OFFICE_DOOR_LOCK_MAX_MS}
              step={1000}
              value={officeDoorLockMs}
              onChange={handleOfficeDoorLockMsChange}
              className="w-full accent-amber-500"
            />
            <span className="text-gray-600">{COPY.game.officeDoorLockSliderHint}</span>
          </label>
        )}

        {/* "Nechat si to projít hlavou" (viz zadání) — vedlejší tlačítko
            vidět jen s brokovnicí, stejný "drž tlačítko" vzor jako emergency
            run výše, jen delší (THINK_IT_OVER_WINDUP_DURATION_MS) a bez
            spuštění minihry na konci — jen textová hláška (viz
            app/play/page.tsx#thinkItOverReadySeq efekt). Na výslovnou žádost
            (viz zadání "ať je tlačítko úplně dole a roztažené stejně jako
            otočit se ke dveřím") úplně dole, přes celou šířku, stejný
            "console-button--primary w-full" vzor jako turnToDoor tlačítko výše. */}
        {hasShotgun && (
          <button
            type="button"
            className="pixel-button console-button console-button--primary tap-target flex items-center gap-2.5 px-3 py-2.5 text-xs touch-none select-none w-full"
            onPointerDown={handleThinkItOverPointerDown}
            onPointerUp={handleThinkItOverPointerUp}
            onPointerLeave={handleThinkItOverPointerUp}
            onPointerCancel={handleThinkItOverPointerUp}
          >
            <span className="console-icon-block console-icon-block--primary" aria-hidden="true">
              <ConsoleIcon id="skull" />
            </span>
            <span className="flex-1 text-left">
              {thinkItOverWindupActive
                ? COPY.game.thinkItOverHoldingLabel.replace("{seconds}", thinkItOverSeconds)
                : COPY.game.startThinkItOverLabel}
            </span>
          </button>
        )}
        {hasShotgun && thinkItOverWindupActive && (
          <div className="w-full h-1 bg-gray-800 border border-gray-700 rounded overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-150" style={{ width: `${thinkItOverPercent}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
