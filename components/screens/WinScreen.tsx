import { COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";

interface WinScreenProps {
  survivedNights: number;
  onRetry: () => void;
}

// Skloňování noc/noci/nocí — 1 = "noc", 2-4 = "noci", jinak (0, 5+) = "nocí".
function formatSurvivedNights(count: number): string {
  const forms = COPY.win.survivedNightsLabel;
  const label = count === 1 ? forms.one : count >= 2 && count <= 4 ? forms.few : forms.many;
  return label.replace("{count}", String(count));
}

export default function WinScreen({ survivedNights, onRetry }: WinScreenProps) {
  // Bez bg-* na <main> — viz stejná poznámka v MainMenuScreen.tsx (main by
  // jinak vlastním pozadím zakryl SceneBackground potomka s -z-10).
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <SceneBackground scene={BACKGROUND_SCENES.win} />

      <div className="w-full max-w-md text-center pixel-panel p-8">
        <h1 className="text-2xl font-bold mb-2 text-green-400">{COPY.win.title}</h1>
        <p className="text-sm text-gray-400 mb-2">{COPY.win.subtitle}</p>
        <p className="text-xs text-gray-500 mb-8">{formatSurvivedNights(survivedNights)}</p>
        <button className="pixel-button tap-target px-6 py-3 text-sm w-full" onClick={onRetry}>
          {COPY.win.retryButton}
        </button>
      </div>
    </main>
  );
}
