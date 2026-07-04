import { CameraId, GameState, NightDefinition } from "@/game/core/types";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { STRESS_DEV_HUD_ENABLED } from "@/game/balancing/constants";
import SceneBackground from "@/components/SceneBackground";
import DeskView from "../game/DeskView";
import DoorView from "../game/DoorView";
import GeneratorView from "../game/GeneratorView";
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
  onToggleDoor: () => void;
  onToggleLight: () => void;
  onSelectCamera: (id: CameraId) => void;
  onCloseCameras: () => void;
  onToggleAudio: () => void;
  onLookAtDoor: () => void;
  onLookAtDesk: () => void;
  onLookAtGenerator: () => void;
  onRestartGenerator: () => void;
  onDebugToggleDoor: () => void;
  onDebugRestartGenerator: () => void;
}

export default function GameScreen({
  state,
  night,
  tensionLevel,
  heartbeatStress,
  nightNumber,
  onToggleDoor,
  onToggleLight,
  onSelectCamera,
  onCloseCameras,
  onToggleAudio,
  onLookAtDoor,
  onLookAtDesk,
  onLookAtGenerator,
  onRestartGenerator,
  onDebugToggleDoor,
  onDebugRestartGenerator,
}: GameScreenProps) {
  // Pozadí pro desk/generator (BACKGROUND_SCENES.play) — jen mimo blackout,
  // kdy BlackoutView stejně celou obrazovku nahrazuje vlastní atmosférou.
  // DoorView má vlastní lokální řešení (DoorSceneFrame, viz DoorView.tsx) —
  // NErenderuje se tu přes SceneBackground, aby dveřní hotspot nezávisel na
  // viewport bg-cover škálování (viz DoorSceneFrame.tsx pro zdůvodnění).
  const isDoorView = state.playerView === "door";
  const showPlayBackground = state.gameStatus !== "blackout" && !isDoorView;

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
      <div className={`flex flex-col gap-4 ${isDoorView ? "" : "max-w-[33.6rem] mx-auto"}`}>
        {/* V DoorView schválně nerenderujeme čas/zvuk/energii vůbec (ne jen
            skryté přes CSS) — hráč se má soustředit na dveře, ne na obecné
            HUD. Desk/generator zůstávají beze změny. */}
        {!isDoorView && (
          <>
            <div className="flex justify-between items-center">
              <ShiftTimer remainingMs={state.remainingMs} nightNumber={nightNumber} />
              <AudioToggle muted={state.audioMuted} onToggle={onToggleAudio} />
            </div>

            <PowerMeter
              power={state.power}
              stressPercent={STRESS_DEV_HUD_ENABLED ? Math.round(heartbeatStress * 100) : undefined}
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
              />
            )}
            {state.playerView === "door" && (
              <DoorView
                doorClosed={state.doorClosed}
                isDoorDeathReveal={state.doorDeathRevealUntilMs !== null}
                onToggleDoor={onToggleDoor}
                onLookAtDesk={onLookAtDesk}
              />
            )}
            {state.playerView === "generator" && (
              <GeneratorView
                generatorState={state.generatorState}
                beepSeq={state.generatorBeepSeq}
                onRestartGenerator={onRestartGenerator}
                onLookAtDesk={onLookAtDesk}
              />
            )}
          </>
        )}

        <div className={isDoorView ? "w-full max-w-md mx-auto" : ""}>
          <DebugPanel
            state={state}
            night={night}
            tensionLevel={tensionLevel}
            onDebugToggleDoor={onDebugToggleDoor}
            onDebugRestartGenerator={onDebugRestartGenerator}
          />
        </div>
      </div>
    </main>
  );
}
