import { COPY } from "@/content/copy";

interface LightControlProps {
  lightOn: boolean;
  /** Prasklá žárovka u dveří (viz game/core/roomBulbs.ts) — vypínač zůstává klikatelný (cvakne, ale nic se nestane, viz gameReducer.ts TOGGLE_LIGHT), jen label místo "VYPNUTO" hlásí důvod. */
  bulbBroken: boolean;
  onToggle: () => void;
}

export default function LightControl({ lightOn, bulbBroken, onToggle }: LightControlProps) {
  const label = bulbBroken ? COPY.game.lightBrokenLabel : lightOn ? COPY.game.lightOnLabel : COPY.game.lightOffLabel;
  return (
    <button
      className="pixel-button tap-target px-4 py-3 text-sm w-full"
      data-active={lightOn}
      onClick={onToggle}
      aria-label={label}
    >
      {label}
    </button>
  );
}
