import { COPY } from "@/content/copy";
import { getNightConfig } from "@/game/difficulty/nightConfig";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";

interface BriefingScreenProps {
  /** currentNight = survivedNights + 1 (viz game/core/survivedNights.ts) — stejný zdroj jako HUD/ShiftTimer. */
  nightNumber: number;
  onStartShift: () => void;
}

// Krátký vnitřní monolog hlídače před směnou (viz game/difficulty/nightConfig.ts)
// — ne firemní oznámení ani tutorial, jen pár vět, co si sám pro sebe říká.
// Mezikrok po LoadingScreen (nový start) i po smrti/výhře (retry), nikdy se
// nezobrazí uprostřed běžící směny (viz app/play/page.tsx, state.screen === "briefing").
export default function BriefingScreen({ nightNumber, onStartShift }: BriefingScreenProps) {
  const { briefing } = getNightConfig(nightNumber);

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <SceneBackground scene={BACKGROUND_SCENES.loading} />

      <div className="w-full max-w-md text-center pixel-panel p-8 relative z-10">
        <h1 className="text-2xl font-bold mb-4 text-red-500">{briefing.title}</h1>
        <div className="text-sm text-gray-300 mb-8 space-y-2">
          {briefing.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <button className="pixel-button tap-target px-6 py-3 text-sm w-full" onClick={onStartShift}>
          {COPY.menu.startButton}
        </button>
      </div>
    </main>
  );
}
