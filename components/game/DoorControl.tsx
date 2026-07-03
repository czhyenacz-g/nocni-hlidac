import { COPY } from "@/content/copy";

interface DoorControlProps {
  doorClosed: boolean;
  onToggle: () => void;
}

// DEV-ONLY: přímé přepnutí dveří bez otočení hráče. Normální hra dveře
// ovládá jen přes DoorView.tsx (viz LOOK_AT_DOOR / TOGGLE_DOOR v gameReducer.ts).
// Používá ho jen DebugPanel.tsx.
export default function DoorControl({ doorClosed, onToggle }: DoorControlProps) {
  return (
    <button className="pixel-button px-4 py-3 text-sm w-full" data-active={doorClosed} onClick={onToggle}>
      DEV: {doorClosed ? COPY.game.doorClosedLabel : COPY.game.doorOpenLabel}
    </button>
  );
}
