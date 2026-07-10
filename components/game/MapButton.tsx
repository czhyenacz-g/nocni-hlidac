import { COPY } from "@/content/copy";
import ConsoleIcon from "./ConsoleIcon";

interface MapButtonProps {
  onClick: () => void;
}

// Ikonové tlačítko mapy vedle AudioToggle.tsx (viz zadání "zmenšit spodní
// akční layout, tlačítko mapy nahoru vedle zvuku") — stejná velikost/styl
// (.console-icon-block), nahradilo dřívější velké ViewSwitchArrow tlačítko
// "Podívat se na mapu" na DeskView.tsx. Handler (onLookAtMap) beze změny.
export default function MapButton({ onClick }: MapButtonProps) {
  return (
    <button
      className="pixel-button console-button console-icon-block tap-target"
      onClick={onClick}
      aria-label={COPY.game.lookAtMapLabel}
      title={COPY.game.lookAtMapLabel}
    >
      <ConsoleIcon id="map" />
    </button>
  );
}
