import { COPY } from "@/content/copy";

interface DoorControlProps {
  doorClosed: boolean;
  onToggle: () => void;
}

export default function DoorControl({ doorClosed, onToggle }: DoorControlProps) {
  return (
    <button className="pixel-button px-4 py-3 text-sm w-full" data-active={doorClosed} onClick={onToggle}>
      {doorClosed ? COPY.game.doorClosedLabel : COPY.game.doorOpenLabel}
    </button>
  );
}
