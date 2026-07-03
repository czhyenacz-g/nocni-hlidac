import { CameraId, GameState, NightDefinition } from "@/game/core/types";
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
  return (
    <main className="min-h-screen p-4 flex flex-col gap-4 max-w-md mx-auto">
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
    </main>
  );
}
