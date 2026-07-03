import { COPY } from "@/content/copy";
import { CameraId, GameState, NightDefinition } from "@/game/core/types";
import CameraPanel from "../game/CameraPanel";
import CameraView from "../game/CameraView";
import DoorControl from "../game/DoorControl";
import LightControl from "../game/LightControl";
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
}: GameScreenProps) {
  const activeCamera = night.cameras.find((c) => c.id === state.activeCameraId) ?? null;

  return (
    <main className="min-h-screen p-4 flex flex-col gap-4 max-w-md mx-auto">
      <div className="flex justify-between items-center">
        <ShiftTimer remainingMs={state.remainingMs} />
        <AudioToggle muted={state.audioMuted} onToggle={onToggleAudio} />
      </div>

      <PowerMeter power={state.power} />

      <div>
        <div className="text-[10px] text-gray-400 mb-1">{COPY.game.camerasLabel}</div>
        {state.cameraOpen ? (
          <CameraView camera={activeCamera} enemyStage={state.enemyStage} />
        ) : (
          <div className="pixel-panel h-40 flex items-center justify-center text-gray-500 text-sm">
            {COPY.game.noCameraSelected}
          </div>
        )}
        <div className="mt-2">
          <CameraPanel
            cameras={night.cameras}
            activeCameraId={state.activeCameraId}
            cameraOpen={state.cameraOpen}
            onSelectCamera={onSelectCamera}
            onCloseCameras={onCloseCameras}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DoorControl doorClosed={state.doorClosed} onToggle={onToggleDoor} />
        <LightControl lightOn={state.lightOn} onToggle={onToggleLight} />
      </div>

      <DebugPanel state={state} tensionLevel={tensionLevel} />
    </main>
  );
}
