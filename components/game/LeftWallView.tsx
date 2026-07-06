import { COPY } from "@/content/copy";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface LeftWallViewProps {
  onLookAtDesk: () => void;
}

// Čistě atmosférický pohled bez herní mechaniky — jen obrázek přes herní
// plochu a návrat ke stolu (viz gameReducer.ts LOOK_AT_LEFT_WALL).
export default function LeftWallView({ onLookAtDesk }: LeftWallViewProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="pixel-panel h-48 w-full overflow-hidden relative">
        <img src="/object_13/views/empty-shotgun.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>

      <ViewSwitchArrow label={COPY.game.leftWallBackLabel} onClick={onLookAtDesk} align="left" />
    </div>
  );
}
