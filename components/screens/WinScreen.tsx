import { COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";

interface WinScreenProps {
  onRetry: () => void;
}

export default function WinScreen({ onRetry }: WinScreenProps) {
  // Bez bg-* na <main> — viz stejná poznámka v MainMenuScreen.tsx (main by
  // jinak vlastním pozadím zakryl SceneBackground potomka s -z-10).
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <SceneBackground scene={BACKGROUND_SCENES.win} />

      <div className="w-full max-w-md text-center pixel-panel p-8">
        <h1 className="text-2xl font-bold mb-2 text-green-400">{COPY.win.title}</h1>
        <p className="text-sm text-gray-400 mb-8">{COPY.win.subtitle}</p>
        <button className="pixel-button tap-target px-6 py-3 text-sm w-full" onClick={onRetry}>
          {COPY.win.retryButton}
        </button>
      </div>
    </main>
  );
}
