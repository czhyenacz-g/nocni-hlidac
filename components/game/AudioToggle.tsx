import { COPY } from "@/content/copy";

interface AudioToggleProps {
  muted: boolean;
  onToggle: () => void;
}

export default function AudioToggle({ muted, onToggle }: AudioToggleProps) {
  return (
    <button
      className="pixel-button tap-target px-3 py-2 text-xs"
      onClick={onToggle}
      aria-label={muted ? COPY.game.audioOffLabel : COPY.game.audioOnLabel}
    >
      {muted ? COPY.game.audioOffLabel : COPY.game.audioOnLabel}
    </button>
  );
}
