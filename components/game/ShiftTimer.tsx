import { COPY } from "@/content/copy";

interface ShiftTimerProps {
  remainingMs: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ShiftTimer({ remainingMs }: ShiftTimerProps) {
  return (
    <div className="pixel-panel p-2 text-center">
      <div className="text-[10px] text-gray-400">{COPY.game.timeLabel}</div>
      <div className="text-lg tabular-nums">{formatTime(remainingMs)}</div>
    </div>
  );
}
