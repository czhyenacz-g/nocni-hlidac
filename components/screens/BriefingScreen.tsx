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

      {/* Stejný "terminál" obal jako MainMenuScreen.tsx (viz zadání "podobným
          způsobem uprav") — kovový rám + 4 šrouby + zapuštěná obrazovka s
          hlavičkovým proužkem (LED + label), místo ploché pixel-panel karty. */}
      <div className="w-full max-w-md menu-terminal-frame relative z-10">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        <div className="menu-terminal-screen pixel-screen-static">
          <div className="menu-terminal-header">
            <span>Objekt 13 · Terminál směny</span>
            <span className="menu-terminal-led" aria-hidden="true" />
          </div>

          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4 text-red-500">{briefing.title}</h1>
            <div className="text-sm text-gray-300 mb-8 space-y-2">
              {briefing.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <button
              className="pixel-button console-button console-button--primary tap-target px-6 py-3 text-sm w-full"
              onClick={onStartShift}
            >
              {COPY.menu.startButton}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
