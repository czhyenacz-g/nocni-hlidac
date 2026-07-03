import { COPY } from "@/content/copy";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface DoorViewProps {
  doorClosed: boolean;
  onToggleDoor: () => void;
  onLookAtDesk: () => void;
}

// Pohled na dveře: jediné místo, odkud jde dveře zavřít/otevřít. Hráč se sem
// musí nejdřív otočit z DeskView (viz gameActions.ts LOOK_AT_DOOR).
export default function DoorView({ doorClosed, onToggleDoor, onLookAtDesk }: DoorViewProps) {
  return (
    <div className="flex flex-col gap-3">
      <ViewSwitchArrow label={COPY.game.lookAtDeskLabel} onClick={onLookAtDesk} align="left" />

      <button
        className="pixel-button pixel-screen-static h-48 w-full flex flex-col items-center justify-center gap-2 text-sm"
        data-active={doorClosed}
        onClick={onToggleDoor}
      >
        <span>{doorClosed ? COPY.game.doorClosedLabel : COPY.game.doorOpenLabel}</span>
        <span className="text-[10px] text-gray-400">{COPY.game.doorViewHint}</span>
      </button>
    </div>
  );
}
