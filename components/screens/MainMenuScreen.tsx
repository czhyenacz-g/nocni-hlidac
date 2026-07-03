import { COPY } from "@/content/copy";
import { GAME_VERSION } from "@/game/balancing/constants";

interface MainMenuScreenProps {
  onStart: () => void;
}

export default function MainMenuScreen({ onStart }: MainMenuScreenProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center pixel-panel p-8">
        <h1 className="text-3xl font-bold mb-1 text-red-500">{COPY.menu.title}</h1>
        <p className="text-gray-400 mb-6">{COPY.menu.subtitle}</p>
        <p className="text-sm text-gray-500 mb-8">{COPY.menu.intro}</p>
        <button className="pixel-button px-6 py-3 text-sm w-full" onClick={onStart}>
          {COPY.menu.startButton}
        </button>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 py-2 text-center text-[10px] text-gray-600">
        {GAME_VERSION} ·{" "}
        <a href={`mailto:${COPY.menu.authorEmail}`} className="hover:text-gray-400">
          {COPY.menu.authorEmail}
        </a>
      </footer>
    </main>
  );
}
