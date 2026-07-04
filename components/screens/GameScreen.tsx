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
  // Pozadí pro všechny tři herní pohledy (control_room/desk, doors,
  // generator) — jen mimo blackout, kdy BlackoutView stejně celou obrazovku
  // nahrazuje vlastní atmosférou. desk/generator sdílejí BACKGROUND_SCENES.play;
  // door má vlastní scénu se 2 snímky (otevřené/zavřené), jejichž aktivní
  // index řídíme podle state.doorClosed, ne časovačem (viz SceneBackground.tsx
  // activeIndexOverride) — obrázky se tak plynule prohodí přesně v okamžiku
  // přepnutí dveří, ne nahodile.
  const showPlayBackground = state.gameStatus !== "blackout";
  const isDoorView = state.playerView === "door";
  const playBackgroundScene = isDoorView ? BACKGROUND_SCENES.door : BACKGROUND_SCENES.play;

  return (
    // <main> je bez bg-* třídy a bez max-w-md — SceneBackground (potomek s
    // -z-10) musí sedět přímo v <main>, jinak by ho buď zakrylo vlastní
    // pozadí <main>u (viz MainMenuScreen.tsx), nebo by byl omezený na užší
    // sloupec (viz max-w-md níže) a zbytek širší obrazovky by zůstal holý
    // <body> background. Herní obsah je proto v samostatném vnitřním divu.
    <main className="relative min-h-screen p-4">
      {showPlayBackground && (
        <SceneBackground
          scene={playBackgroundScene}
          activeIndexOverride={isDoorView ? (state.doorClosed ? 1 : 0) : undefined}
        />
      )}

      <div className="flex flex-col gap-4 max-w-md mx-auto">
        <div className="flex justify-between items-center">
          <ShiftTimer remainingMs={state.remainingMs} />
          <AudioToggle muted={state.audioMuted} onToggle={onToggleAudio} />
        </div>

        <PowerMeter power={state.power} />

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
              <DoorView doorClosed={state.doorClosed} onToggleDoor={onToggleDoor} onLookAtDesk={onLookAtDesk} />
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

        <DebugPanel
          state={state}
          night={night}
          tensionLevel={tensionLevel}
          onDebugToggleDoor={onDebugToggleDoor}
          onDebugRestartGenerator={onDebugRestartGenerator}
        />
      </div>
    </main>
  );
}
