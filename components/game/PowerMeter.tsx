import { COPY } from "@/content/copy";
import { CRITICAL_POWER_THRESHOLD, LOW_POWER_THRESHOLD } from "@/game/balancing/constants";
import { PALETTE } from "@/game/visuals/palette";

interface PowerMeterProps {
  power: number;
  /** Dev-only "Stres: X" vedle energie (viz STRESS_DEV_HUD_ENABLED) — undefined = nezobrazovat. */
  stressPercent?: number;
  /** Zatím jen zobrazení (viz game/core/bulbInventory.ts) — undefined = nezobrazovat. */
  bulbsRemaining?: number;
}

export default function PowerMeter({ power, stressPercent, bulbsRemaining }: PowerMeterProps) {
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
        <span>
          {Math.round(power)}%
          {stressPercent !== undefined && (
            <span className="text-gray-500"> · {COPY.game.stressLabel}: {stressPercent}</span>
          )}
          {bulbsRemaining !== undefined && (
            <span className="text-gray-500"> · {COPY.game.bulbsLabel}: {bulbsRemaining}</span>
          )}
        </span>
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
