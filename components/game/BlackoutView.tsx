import { COPY } from "@/content/copy";
import { BlackoutDefinition } from "@/game/core/types";
import { getBlackoutPhaseIndex } from "@/game/visuals/blackoutPhase";

interface BlackoutViewProps {
  blackoutElapsedMs: number;
  blackout: BlackoutDefinition;
}

// Přebírá celou obrazovku místo DeskView/DoorView/GeneratorView, dokud trvá
// blackout — všechny systémy jsou mrtvé, není co ovládat. Ukazuje jen
// postupující atmosférický text podle fáze (viz game/visuals/blackoutPhase.ts).
export default function BlackoutView({ blackoutElapsedMs, blackout }: BlackoutViewProps) {
  const phaseIndex = getBlackoutPhaseIndex(blackoutElapsedMs, blackout);
  const visiblePhases = COPY.blackout.phaseTexts.slice(0, phaseIndex + 1);

  return (
    <div className="pixel-panel h-64 flex flex-col items-center justify-center gap-3 p-4 text-center">
      <h2 className="text-red-500 text-sm font-bold uppercase tracking-widest">{COPY.blackout.subtitle}</h2>
      <div className="flex flex-col gap-1.5 text-xs text-gray-400">
        {visiblePhases.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
    </div>
  );
}
