import { COPY } from "@/content/copy";

interface ShiftTimerProps {
  remainingMs: number;
  /** Kolikátá noc v řadě aktuálního hlídače (viz game/core/survivedNights.ts) — jen popisek, žádná herní logika na tom nestaví. */
  nightNumber: number;
  /**
   * Skrytý přístup k DEV panelu (viz GameScreen.tsx#debugPanelVisible) —
   * pravý klik na tenhle popisek přepne viditelnost, žádné jiné ovládání.
   * Volitelné, ať ShiftTimer nemusí nikde jinde (kdyby se použil samostatně)
   * context menu potlačovat zbytečně.
   */
  onNightLabelContextMenu?: (e: React.MouseEvent) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ShiftTimer({ remainingMs, nightNumber, onNightLabelContextMenu }: ShiftTimerProps) {
  return (
    <div className="pixel-panel p-2 text-center">
      <div className="text-[10px] text-gray-400" onContextMenu={onNightLabelContextMenu}>
        {COPY.game.nightLabel.replace("{n}", String(nightNumber))} — {COPY.game.timeLabel}
      </div>
      <div className="text-lg tabular-nums">{formatTime(remainingMs)}</div>
    </div>
  );
}
