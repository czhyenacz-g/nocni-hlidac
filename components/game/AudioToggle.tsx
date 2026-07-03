import { COPY } from "@/content/copy";

interface AudioToggleProps {
  muted: boolean;
  onToggle: () => void;
}

export default function AudioToggle({ muted, onToggle }: AudioToggleProps) {
  return (
    <button className="pixel-button px-3 py-2 text-xs" onClick={onToggle}>
      {muted ? COPY.game.audioOffLabel : COPY.game.audioOnLabel}
    </button>
  );
}
