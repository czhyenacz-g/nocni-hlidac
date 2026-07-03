import { COPY } from "@/content/copy";
import { CRITICAL_POWER_THRESHOLD, LOW_POWER_THRESHOLD } from "@/game/balancing/constants";
import { PALETTE } from "@/game/visuals/palette";

interface PowerMeterProps {
  power: number;
}

export default function PowerMeter({ power }: PowerMeterProps) {
  const color =
    power <= CRITICAL_POWER_THRESHOLD
      ? PALETTE.powerCritical
      : power <= LOW_POWER_THRESHOLD
        ? PALETTE.powerLow
        : PALETTE.powerFull;

  return (
    <div className="pixel-panel p-2">
      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
        <span>{COPY.game.powerLabel}</span>
        <span>{Math.round(power)}%</span>
      </div>
      <div className="h-3 bg-gray-800 border border-gray-700">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${power}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
