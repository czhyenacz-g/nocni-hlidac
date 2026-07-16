import { COPY } from "@/content/copy";
import ConsoleIcon from "./ConsoleIcon";

interface LightControlProps {
  lightOn: boolean;
  /** Prasklá žárovka u dveří (viz game/core/roomBulbs.ts) — vypínač zůstává klikatelný (cvakne, ale nic se nestane, viz gameReducer.ts TOGGLE_LIGHT), jen label místo "VYPNUTO" hlásí důvod. */
  bulbBroken: boolean;
  onToggle: () => void;
}

export default function LightControl({ lightOn, bulbBroken, onToggle }: LightControlProps) {
  const label = bulbBroken ? COPY.game.lightBrokenLabel : lightOn ? COPY.game.lightOnLabel : COPY.game.lightOffLabel;
  return (
    // "group relative" + delay-700 hover tooltip — stejný CSS-only vzor jako
    // MainMenuScreen.tsx (gameMode tooltipy), jen se zpožděním, ať se
    // tooltip neobjeví hned při každém přejetí myší (zadání "po chvíli").
    <div className="group relative w-full">
      <button
        className="pixel-button console-button tap-target flex items-center gap-2.5 px-4 py-3 text-sm w-full"
        data-active={lightOn}
        onClick={onToggle}
        aria-label={label}
      >
        <span className="console-icon-block" aria-hidden="true">
          <ConsoleIcon id="light" />
        </span>
        <span className="flex-1 text-left">{label}</span>
      </button>
      <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 w-64 -translate-x-1/2 rounded-none border border-gray-600 bg-gray-900/95 p-2 text-[10px] text-gray-300 opacity-0 shadow-lg transition-opacity delay-700 duration-100 group-hover:opacity-100 group-focus-within:opacity-100 whitespace-pre-line">
        {COPY.game.lightControlTooltip}
      </div>
    </div>
  );
}
