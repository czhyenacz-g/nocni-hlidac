import { COPY } from "@/content/copy";
import Footer from "@/components/Footer";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";

interface MainMenuScreenProps {
  onStart: () => void;
}

export default function MainMenuScreen({ onStart }: MainMenuScreenProps) {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900">
      <SceneBackground scene={BACKGROUND_SCENES.menu} />

      <div className="w-full max-w-md text-center pixel-panel p-8">
        <h1 className="text-3xl font-bold mb-1 text-red-500">{COPY.menu.title}</h1>
        <p className="text-gray-400 mb-6">{COPY.menu.subtitle}</p>
        <p className="text-sm text-gray-500 mb-8">{COPY.menu.intro}</p>
        <button className="pixel-button tap-target px-6 py-3 text-sm w-full" onClick={onStart}>
          {COPY.menu.startButton}
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <Footer />
      </div>
    </main>
  );
}
