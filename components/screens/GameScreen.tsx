import { useState } from "react";
import { CameraId, GameState, NightDefinition } from "@/game/core/types";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { STRESS_DEV_HUD_ENABLED } from "@/game/balancing/constants";
import { COPY } from "@/content/copy";
import { computeNearRoomBulbWearRatio } from "@/game/core/roomBulbs";
import { canReplaceBulb } from "@/game/core/gameReducer";
import { canStartBatteryEmergencyRun, canStartShotgunEmergencyRun } from "@/game/core/emergencyMiniGameIntegration";
import SceneBackground from "@/components/SceneBackground";
import DeskView from "../game/DeskView";
import DoorView from "../game/DoorView";
import GeneratorView from "../game/GeneratorView";
import LeftWallView from "../game/LeftWallView";
import ObjectMapView from "../game/ObjectMapView";
import BlackoutView from "../game/BlackoutView";
import PowerMeter from "../game/PowerMeter";
import ShiftTimer from "../game/ShiftTimer";
import AudioToggle from "../game/AudioToggle";
import DebugPanel from "../game/DebugPanel";

interface GameScreenProps {
  state: GameState;
  night: NightDefinition;
  tensionLevel: number;
  /** Plynulá stress hodnota (0..1) z game/audio/useHeartbeatStress.ts — jen pro dev HUD (PowerMeter), viz STRESS_DEV_HUD_ENABLED. */
  heartbeatStress: number;
  /** Kolikátá noc v řadě aktuálního hlídače (viz game/core/survivedNights.ts) — jen popisek pro ShiftTimer. */
  nightNumber: number;
  /** Serverový currentRun přihlášeného hráče (viz app/api/auth/me/route.ts) — jen pro DebugPanel "Run source", `null` = nepřihlášený/hub API nedostupné. */
  serverCurrentRun: number | null;
  /** Lokální localStorage counter (viz game/core/survivedNights.ts) — jen pro DebugPanel "Run source". */
  localSurvivedNights: number;
  /** Campaign hodnota z GameState.bulbsRemaining (viz game/core/bulbInventory.ts pro persistenci) — snižuje se v reduceru při dokončené ruční výměně. */
  bulbsRemaining: number;
  onToggleDoor: () => void;
  onToggleLight: () => void;
  onSelectCamera: (id: CameraId) => void;
  onCloseCameras: () => void;
  onToggleAudio: () => void;
  onLookAtDoor: () => void;
  onLookAtDesk: () => void;
  onLookAtGenerator: () => void;
  onLookAtLeftWall: () => void;
  onLookAtMap: () => void;
  /** Zahájí/zruší držení "Nouzově opustit místnost" (viz app/play/page.tsx#handleStartEmergencyRunWindup/handleCancelEmergencyRunWindup, GameState.emergencyRunWindup) — jen na left_wall pohledu, viz LeftWallView.tsx. */
  onStartEmergencyRunWindup: () => void;
  onCancelEmergencyRunWindup: () => void;
  /** Zahájí/zruší držení "Nechat si to projít hlavou" (viz app/play/page.tsx#handleStartThinkItOverWindup/handleCancelThinkItOverWindup, GameState.thinkItOverWindup) — jen na left_wall pohledu, jen s brokovnicí. */
  onStartThinkItOverWindup: () => void;
  onCancelThinkItOverWindup: () => void;
  onRestartGenerator: () => void;
  onDebugToggleDoor: () => void;
  onDebugRestartGenerator: () => void;
  onStartBulbReplacement: () => void;
  onCancelBulbReplacement: () => void;
}

export default function GameScreen({
  state,
  night,
  tensionLevel,
  heartbeatStress,
  nightNumber,
  serverCurrentRun,
  localSurvivedNights,
  bulbsRemaining,
  onToggleDoor,
  onToggleLight,
  onSelectCamera,
  onCloseCameras,
  onToggleAudio,
  onLookAtDoor,
  onLookAtDesk,
  onLookAtGenerator,
  onLookAtLeftWall,
  onLookAtMap,
  onStartEmergencyRunWindup,
  onCancelEmergencyRunWindup,
  onStartThinkItOverWindup,
  onCancelThinkItOverWindup,
  onRestartGenerator,
  onDebugToggleDoor,
  onDebugRestartGenerator,
  onStartBulbReplacement,
  onCancelBulbReplacement,
}: GameScreenProps) {
  // Pozadí pro desk/generator (BACKGROUND_SCENES.play) — jen mimo blackout,
  // kdy BlackoutView stejně celou obrazovku nahrazuje vlastní atmosférou.
  // DoorView i LeftWallView mají vlastní lokální řešení (sdílená
  // .door-scene-frame, viz DoorSceneFrame.tsx/LeftWallView.tsx) —
  // NErenderují se tu přes SceneBackground, aby scéna nezávisela na viewport
  // bg-cover škálování (viz DoorSceneFrame.tsx pro zdůvodnění). Stejný důvod,
  // proč obě nejsou v max-w-[33.6rem] wrapperu a nemají běžný HUD (čas/zvuk/
  // energie) — jen svoje rámované okno na scénu + tlačítko zpět.
  const isWideSceneView = state.playerView === "door" || state.playerView === "left_wall";
  const showPlayBackground = state.gameStatus !== "blackout" && !isWideSceneView;
  // Jestli je "Jít ven pro baterii" tuhle noc vůbec dostupné (viz
  // game/core/emergencyMiniGameIntegration.ts#canStartBatteryEmergencyRun,
  // NightFeatureFlags.emergencyRunsEnabled/batteryRunEnabled) — jediné místo
  // v komponentách, které to dopočítá; LeftWallView dostane jen hotový
  // boolean, ne celou nightFeatures strukturu.
  const canStartBatteryRun = canStartBatteryEmergencyRun(state.nightFeatures);
  // "Jít ven" tlačítko se zobrazí, dokud je dostupná ASPOŇ jedna výprava
  // (battery run, nebo od noci 10 shotgun run, viz
  // game/core/emergencyMiniGameIntegration.ts#canStartShotgunEmergencyRun) —
  // KTEROU z nich app/play/page.tsx skutečně spustí, se rozhoduje samostatně
  // (stejná priorita) až při skutečném doběhnutí držení, ne tady.
  const canStartEmergencyRun = canStartBatteryRun || canStartShotgunEmergencyRun(state.nightFeatures, state.hasShotgun);
  // DEV panel je schválně skrytý ve výchozím stavu (ne jen collapsed <details>
  // jako dřív) — objeví se jen po pravém kliku na popisek "Noc {n}" v
  // ShiftTimeru (viz onNightLabelContextMenu níže). Čistě UI viditelnost dev
  // nástroje, ne herní stav — nepatří do GameState/reduceru.
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);
  function handleToggleDebugPanel(e: React.MouseEvent) {
    e.preventDefault();
    setDebugPanelVisible((visible) => !visible);
  }
  // Dev debug text pro PowerMeter — přesný údaj v sekundách, ne finální
  // atmosférický text (viz game/core/roomBulbs.ts, content/copy.ts).
  const nearRoomBulb = state.roomBulbs.nearRoom;
  const nearRoomBulbLabel = nearRoomBulb.broken
    ? COPY.game.bulbBrokenLabel
    : `${Math.ceil(nearRoomBulb.remainingMs / 1000)} s`;

  return (
    // <main> je bez bg-* třídy a bez max-w-md — SceneBackground (potomek s
    // -z-10) musí sedět přímo v <main>, jinak by ho buď zakrylo vlastní
    // pozadí <main>u (viz MainMenuScreen.tsx), nebo by byl omezený na užší
    // sloupec (viz max-w-md níže) a zbytek širší obrazovky by zůstal holý
    // <body> background. Herní obsah je proto v samostatném vnitřním divu.
    <main className="relative min-h-screen p-4">
      {showPlayBackground && <SceneBackground scene={BACKGROUND_SCENES.play} />}

      {/* DoorView schválně NENÍ v max-w-[33.6rem] — dveřní scéna (DoorSceneFrame)
          má využít co nejvíc dostupné plochy viewportu (viz .door-scene-frame,
          styles/pixel.css), ne být omezená na stejný sloupec jako desk/generator.
          DoorView si samo zabaluje tlačítko zpět do vlastního max-w-md (užší,
          beze změny), ať nezůstane přes celou šířku (viz DoorView.tsx).
          Desk/generator/blackout sloupec je o 20 % širší než dřívější max-w-md
          (28rem -> 33.6rem) — hlavně kvůli kamerovému detailu (CameraView),
          který díky tomu může být po "ladění signálu" větší. */}
      <div className={`flex flex-col gap-4 ${isWideSceneView ? "" : "max-w-[33.6rem] mx-auto"}`}>
        {/* V DoorView/LeftWallView schválně nerenderujeme čas/zvuk/energii
            vůbec (ne jen skryté přes CSS) — hráč se má soustředit na scénu,
            ne na obecné HUD. Desk/generator zůstávají beze změny. */}
        {!isWideSceneView && (
          <>
            <div className="flex justify-between items-center">
              <ShiftTimer
                remainingMs={state.remainingMs}
                nightNumber={nightNumber}
                onNightLabelContextMenu={handleToggleDebugPanel}
              />
              <AudioToggle muted={state.audioMuted} onToggle={onToggleAudio} />
            </div>

            <PowerMeter
              power={state.power}
              stressPercent={STRESS_DEV_HUD_ENABLED ? Math.round(heartbeatStress * 100) : undefined}
              bulbsRemaining={bulbsRemaining}
              nearRoomBulbLabel={nearRoomBulbLabel}
            />
          </>
        )}

        {state.gameStatus === "blackout" ? (
          <BlackoutView blackoutElapsedMs={state.blackoutElapsedMs} blackout={night.blackout} />
        ) : (
          <>
            {state.playerView === "desk" && (
              <DeskView
                state={state}
                night={night}
                onToggleLight={onToggleLight}
                onSelectCamera={onSelectCamera}
                onCloseCameras={onCloseCameras}
                onLookAtDoor={onLookAtDoor}
                onLookAtGenerator={onLookAtGenerator}
                onLookAtLeftWall={onLookAtLeftWall}
                onLookAtMap={onLookAtMap}
              />
            )}
            {state.playerView === "door" && (
              <DoorView
                doorClosed={state.doorClosed}
                isDoorDeathReveal={state.doorDeathRevealUntilMs !== null}
                bulbBroken={state.roomBulbs.nearRoom.broken}
                bulbWearRatio={computeNearRoomBulbWearRatio(state)}
                canReplaceBulb={canReplaceBulb(state)}
                bulbReplacementActive={state.bulbReplacement.active}
                bulbReplacementProgressMs={state.bulbReplacement.progressMs}
                bulbReplaceSuccessSeq={state.bulbReplaceSuccessSeq}
                onToggleDoor={onToggleDoor}
                onLookAtDesk={onLookAtDesk}
                onStartBulbReplacement={onStartBulbReplacement}
                onCancelBulbReplacement={onCancelBulbReplacement}
              />
            )}
            {state.playerView === "generator" && (
              <GeneratorView
                generatorState={state.generatorState}
                beepSeq={state.generatorBeepSeq}
                accidentalRestartSeq={state.generatorAccidentalRestartSeq}
                onRestartGenerator={onRestartGenerator}
                onLookAtDesk={onLookAtDesk}
              />
            )}
            {state.playerView === "left_wall" && (
              <LeftWallView
                onLookAtDesk={onLookAtDesk}
                onStartEmergencyRunWindup={onStartEmergencyRunWindup}
                onCancelEmergencyRunWindup={onCancelEmergencyRunWindup}
                doorClosed={state.doorClosed}
                canStartEmergencyRun={canStartEmergencyRun}
                emergencyRunWindupActive={state.emergencyRunWindup.active}
                emergencyRunWindupProgressMs={state.emergencyRunWindup.progressMs}
                hasShotgun={state.hasShotgun}
                shotgunAmmo={state.shotgunAmmo}
                onStartThinkItOverWindup={onStartThinkItOverWindup}
                onCancelThinkItOverWindup={onCancelThinkItOverWindup}
                thinkItOverWindupActive={state.thinkItOverWindup.active}
                thinkItOverWindupProgressMs={state.thinkItOverWindup.progressMs}
              />
            )}
            {state.playerView === "object_map" && <ObjectMapView onLookAtDesk={onLookAtDesk} />}
          </>
        )}

        {debugPanelVisible && (
          <div className={isWideSceneView ? "w-full max-w-md mx-auto" : ""}>
            <DebugPanel
              state={state}
              night={night}
              tensionLevel={tensionLevel}
              nightNumber={nightNumber}
              serverCurrentRun={serverCurrentRun}
              localSurvivedNights={localSurvivedNights}
              onDebugToggleDoor={onDebugToggleDoor}
              onDebugRestartGenerator={onDebugRestartGenerator}
            />
          </div>
        )}
      </div>
    </main>
  );
}
