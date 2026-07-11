import { COPY } from "@/content/copy";
import { CameraId, GameState, NightDefinition } from "@/game/core/types";
import { isCameraFocused } from "@/game/core/cameraFocus";
import { isGeneratorArrowUrgent } from "@/game/core/generatorUrgency";
import { isNearRoomLightActive } from "@/game/core/roomBulbs";
import CameraPanel from "./CameraPanel";
import LightControl from "./LightControl";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface DeskViewProps {
  state: GameState;
  night: NightDefinition;
  /** Admin-only rychlá testovací pomůcka (viz zadání "rychlejší testování") — rozsvítí LED kamerového monitoru v overview, viz CameraPanel.tsx/CameraMonitorGrid.tsx. */
  isAdmin: boolean;
  onToggleLight: () => void;
  onSelectCamera: (id: CameraId) => void;
  onCloseCameras: () => void;
  onLookAtDoor: () => void;
  onLookAtGenerator: () => void;
  onLookAtLeftWall: () => void;
}

// Základní pohled hráče: kamerový/stolní panel. Dveře a generátor odsud
// nejdou ovládat přímo — jen šipky k otočení na ně (viz DoorView.tsx, GeneratorView.tsx).
export default function DeskView({
  state,
  night,
  isAdmin,
  onToggleLight,
  onSelectCamera,
  onCloseCameras,
  onLookAtDoor,
  onLookAtGenerator,
  onLookAtLeftWall,
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
          // Kamera musí ukazovat reálný stav světla, ne jen polohu vypínače
          // (viz game/core/roomBulbs.ts#isNearRoomLightActive) — prasklá
          // žárovka nesmí dál ukazovat osvětlenou variantu.
          lightOn={isNearRoomLightActive(state)}
          elapsedMs={state.elapsedMs}
          lastEnemyDecision={state.lastEnemyDecision}
          showAdminDoorAlerts={isAdmin}
          onSelectCamera={onSelectCamera}
          onCloseCameras={onCloseCameras}
        />
      </div>

      <LightControl lightOn={state.lightOn} bulbBroken={state.roomBulbs.nearRoom.broken} onToggle={onToggleLight} />

      {/* Spodní navigace jako prostorová orientace v místnosti, ne 2×2 grid
          stejných boxů: vlevo/vpravo boční pohledy (stěna/generátor), úplně
          dole dominantní otočení ke dveřím — ten je vizuálně nejvýraznější
          (ViewSwitchArrow variant="primary"), protože je to hlavní směr
          pohledu control roomu. Mapa se odsud přesunula nahoru vedle
          AudioToggle (viz GameScreen.tsx, MapButton.tsx, zadání "zmenšit
          spodní akční layout") — handler (onLookAtMap) beze změny, jen
          jiné tlačítko. */}
      <div className="grid grid-cols-2 gap-3">
        <ViewSwitchArrow label={COPY.game.lookAtLeftWallLabel} onClick={onLookAtLeftWall} align="left" />
        <ViewSwitchArrow
          label={COPY.game.lookAtGeneratorLabel}
          onClick={onLookAtGenerator}
          align="right"
          icon="power"
          urgent={isGeneratorArrowUrgent(state, night.generator)}
        />
      </div>

      <ViewSwitchArrow
        label={COPY.game.lookAtDoorLabel}
        onClick={onLookAtDoor}
        align="center"
        variant="primary"
        icon="door"
      />
    </div>
  );
}
