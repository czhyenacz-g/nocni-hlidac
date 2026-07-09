import { COPY } from "@/content/copy";
import { CRITICAL_POWER_THRESHOLD, LOW_POWER_THRESHOLD } from "@/game/balancing/constants";
import { PALETTE } from "@/game/visuals/palette";
import ConsoleIcon from "./ConsoleIcon";

interface PowerMeterProps {
  power: number;
  /** Dev-only "Stres: X" vedle energie (viz STRESS_DEV_HUD_ENABLED) — undefined = nezobrazovat. */
  stressPercent?: number;
  /** Zatím jen zobrazení (viz game/core/bulbInventory.ts) — undefined = nezobrazovat. */
  bulbsRemaining?: number;
  /**
   * Předformátovaný stav žárovky u dveří, např. "23 s" nebo "prasklá" (viz
   * game/core/roomBulbs.ts) — PowerMeter sama nepočítá sekundy/stav, jen
   * zobrazí, co dostane. `undefined` = nezobrazovat.
   */
  nearRoomBulbLabel?: string;
}

export default function PowerMeter({ power, stressPercent, bulbsRemaining, nearRoomBulbLabel }: PowerMeterProps) {
  const color =
    power <= CRITICAL_POWER_THRESHOLD
      ? PALETTE.powerCritical
      : power <= LOW_POWER_THRESHOLD
        ? PALETTE.powerLow
        : PALETTE.powerFull;

  return (
    <div className="console-panel p-2 flex items-center gap-2.5">
      <span className="console-icon-block console-icon-block--sm" style={{ color }} aria-hidden="true">
        <ConsoleIcon id="battery" />
      </span>
      <div className="flex-1">
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
        {nearRoomBulbLabel !== undefined && (
          <div className="text-[10px] text-gray-500 mt-1">
            {COPY.game.nearRoomBulbLabel}: {nearRoomBulbLabel}
          </div>
        )}
      </div>
    </div>
  );
}
