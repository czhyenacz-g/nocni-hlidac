import { COPY } from "@/content/copy";
import ConsoleIcon from "./ConsoleIcon";

interface AudioToggleProps {
  muted: boolean;
  onToggle: () => void;
}

// Ikonové tlačítko (reproduktor / přeškrtnutý reproduktor, viz zadání), ne
// textový popisek — samotné tlačítko JE konzolový ikonový blok
// (.console-icon-block), aria-label nese informaci pro čtečky.
export default function AudioToggle({ muted, onToggle }: AudioToggleProps) {
  return (
    <button
      className="pixel-button console-button console-icon-block tap-target"
      data-active={muted}
      onClick={onToggle}
      aria-label={muted ? COPY.game.audioOffLabel : COPY.game.audioOnLabel}
      aria-pressed={muted}
    >
      <ConsoleIcon id={muted ? "speaker-muted" : "speaker"} />
    </button>
  );
}
