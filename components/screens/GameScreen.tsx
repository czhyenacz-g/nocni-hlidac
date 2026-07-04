import { CameraId, GameState, NightDefinition } from "@/game/core/types";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
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

      {/* DoorView schválně NENÍ v max-w-md — dveřní scéna (DoorSceneFrame)
          má využít co nejvíc dostupné plochy viewportu (viz .door-scene-frame,
          styles/pixel.css), ne být omezená na stejný úzký sloupec jako
          desk/generator. DoorView si samo zabaluje tlačítko zpět do vlastního
          max-w-md, ať nezůstane přes celou šířku (viz DoorView.tsx). Desk/
          generator/blackout layout je beze změny. */}
      <div className={`flex flex-col gap-4 ${isDoorView ? "" : "max-w-md mx-auto"}`}>
        {/* V DoorView schválně nerenderujeme čas/zvuk/energii vůbec (ne jen
            skryté přes CSS) — hráč se má soustředit na dveře, ne na obecné
            HUD. Desk/generator zůstávají beze změny. */}
        {!isDoorView && (
          <>
            <div className="flex justify-between items-center">
              <ShiftTimer remainingMs={state.remainingMs} nightNumber={nightNumber} />
              <AudioToggle muted={state.audioMuted} onToggle={onToggleAudio} />
            </div>

            <PowerMeter power={state.power} />
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
