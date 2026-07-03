import { COPY } from "@/content/copy";

interface LightControlProps {
  lightOn: boolean;
  onToggle: () => void;
}

export default function LightControl({ lightOn, onToggle }: LightControlProps) {
  return (
    <button
      className="pixel-button tap-target px-4 py-3 text-sm w-full"
      data-active={lightOn}
      onClick={onToggle}
      aria-label={lightOn ? COPY.game.lightOnLabel : COPY.game.lightOffLabel}
    >
      {lightOn ? COPY.game.lightOnLabel : COPY.game.lightOffLabel}
    </button>
  );
}
