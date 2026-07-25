import { useCopy } from "@/game/i18n/useTranslation";
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
  const COPY = useCopy();
  const phaseIndex = getBlackoutPhaseIndex(blackoutElapsedMs, blackout);
  const visiblePhases = COPY.blackout.phaseTexts.slice(0, phaseIndex + 1);

  // `fixed inset-0` (NE jen `pixel-panel h-64` v úzkém sloupci) — blackout má
  // nahradit CELOU obrazovku vlastní tmou (viz komentář v GameScreen.tsx "BlackoutView
  // stejně celou obrazovku nahrazuje vlastní atmosférou"), ne jen ukázat malý
  // ohraničený panel uprostřed zbytku běžného layoutu. `fixed` funguje bez
  // ohledu na to, že je komponenta zanořená v užším `max-w-[33.6rem]` sloupci
  // (pozice se počítá vůči viewportu, ne vůči rodiči, dokud žádný předek
  // nenastavuje `transform`, což tady neplatí).
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 p-4 text-center bg-black/95">
      <h2 className="text-red-500 text-sm font-bold uppercase tracking-widest">{COPY.blackout.subtitle}</h2>
      <div className="flex flex-col gap-1.5 text-xs text-gray-400">
        {visiblePhases.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
    </div>
  );
}
