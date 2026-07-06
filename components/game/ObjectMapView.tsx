import { COPY } from "@/content/copy";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface ObjectMapViewProps {
  onLookAtDesk: () => void;
}

function MapRoom({ label, small }: { label: string; small?: boolean }) {
  return (
    <div className={`pixel-panel text-center leading-tight ${small ? "px-2 py-1 text-[9px]" : "px-3 py-2 text-[10px]"}`}>
      {label}
    </div>
  );
}

function MapConnector() {
  return <div className="w-0.5 h-3 bg-gray-500" aria-hidden="true" />;
}

// Čistě informativní pohled bez interaktivity — statický orientační plánek
// objektu, žádné klikání na místnosti (viz gameReducer.ts LOOK_AT_MAP).
export default function ObjectMapView({ onLookAtDesk }: ObjectMapViewProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="pixel-panel p-3">
        <div className="text-sm font-bold mb-1">{COPY.game.mapTitle}</div>
        <div className="text-[10px] text-gray-400 mb-3">{COPY.game.mapSubtitle}</div>

        <div className="flex flex-col items-center gap-0">
          <MapRoom label={COPY.game.mapRoomOutside} />
          <MapConnector />

          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="flex flex-col items-center gap-0">
              <MapRoom label={COPY.game.mapRoomLeftHallway} />
              <MapConnector />
              <MapRoom label={COPY.game.mapRoomSupplyStorage} small />
            </div>
            <div className="flex flex-col items-center">
              <MapRoom label={COPY.game.mapRoomRightHallway} />
            </div>
          </div>

          <MapConnector />
          <MapRoom label={COPY.game.mapRoomControlRoom} />
          <MapConnector />
          <MapRoom label={COPY.game.mapRoomDoorHallway} small />
        </div>
      </div>

      <ViewSwitchArrow label={COPY.game.mapBackLabel} onClick={onLookAtDesk} align="left" />
    </div>
  );
}
