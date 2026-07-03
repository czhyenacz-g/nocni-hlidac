import { COPY } from "@/content/copy";
import { CameraId, GameState, NightDefinition } from "@/game/core/types";
import CameraPanel from "./CameraPanel";
import CameraView from "./CameraView";
import LightControl from "./LightControl";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface DeskViewProps {
  state: GameState;
  night: NightDefinition;
  onToggleLight: () => void;
  onSelectCamera: (id: CameraId) => void;
  onCloseCameras: () => void;
  onLookAtDoor: () => void;
  onLookAtGenerator: () => void;
}

// Základní pohled hráče: kamerový/stolní panel. Dveře a generátor odsud
// nejdou ovládat přímo — jen šipky k otočení na ně (viz DoorView.tsx, GeneratorView.tsx).
export default function DeskView({
  state,
  night,
  onToggleLight,
  onSelectCamera,
  onCloseCameras,
  onLookAtDoor,
  onLookAtGenerator,
}: DeskViewProps) {
  const activeCamera = night.cameras.find((c) => c.id === state.activeCameraId) ?? null;

  return (
    <div className="flex flex-col gap-3">
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

      <LightControl lightOn={state.lightOn} onToggle={onToggleLight} />

      <div className="grid grid-cols-2 gap-3">
        <ViewSwitchArrow label={COPY.game.lookAtDoorLabel} onClick={onLookAtDoor} align="right" />
        <ViewSwitchArrow
          label={COPY.game.lookAtGeneratorLabel}
          onClick={onLookAtGenerator}
          align="right"
          urgent={state.generatorState !== "normal"}
        />
      </div>
    </div>
  );
}
