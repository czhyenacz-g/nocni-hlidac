import { COPY } from "@/content/copy";
import { CameraId, GameState, NightDefinition } from "@/game/core/types";
import { isCameraFocused } from "@/game/core/cameraFocus";
import { isGeneratorArrowUrgent } from "@/game/core/generatorUrgency";
import CameraPanel from "./CameraPanel";
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
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-[10px] text-gray-400 mb-1">{COPY.game.camerasLabel}</div>
        <CameraPanel
          cameras={night.cameras}
          cameraViewMode={state.cameraViewMode}
          activeCameraId={state.activeCameraId}
          enemyStage={state.enemyStage}
          focused={isCameraFocused(state)}
          lightOn={state.lightOn}
          elapsedMs={state.elapsedMs}
          onSelectCamera={onSelectCamera}
          onCloseCameras={onCloseCameras}
        />
      </div>

      <LightControl lightOn={state.lightOn} onToggle={onToggleLight} />

      <div className="grid grid-cols-2 gap-3">
        <ViewSwitchArrow label={COPY.game.lookAtDoorLabel} onClick={onLookAtDoor} align="right" />
        <ViewSwitchArrow
          label={COPY.game.lookAtGeneratorLabel}
          onClick={onLookAtGenerator}
          align="right"
          urgent={isGeneratorArrowUrgent(state, night.generator)}
        />
      </div>
    </div>
  );
}
