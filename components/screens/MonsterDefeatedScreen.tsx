import { COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";

interface MonsterDefeatedScreenProps {
  onGoToMenu: () => void;
}

// Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — 10
// potvrzených zásahů monstra brokovnicí za jednu noc. Stejný "pixel-panel
// přes SceneBackground" vzor jako DeathScreen.tsx/WinScreen.tsx, žádná nová
// vizuální infrastruktura. Bez bg-* na <main> — viz stejná poznámka v
// MainMenuScreen.tsx (main by jinak vlastním pozadím zakryl SceneBackground
// potomka s -z-10).
export default function MonsterDefeatedScreen({ onGoToMenu }: MonsterDefeatedScreenProps) {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <SceneBackground scene={BACKGROUND_SCENES.monsterDefeated} />

      <div className="w-full max-w-md text-center pixel-panel p-8 relative z-10">
        <h1 className="text-3xl font-bold mb-1 text-red-500">{COPY.monsterDefeated.title}</h1>
        <p className="text-sm text-gray-400 mb-6">{COPY.monsterDefeated.subtitle}</p>
        <p className="text-sm text-gray-200 whitespace-pre-line mb-8">{COPY.monsterDefeated.body}</p>
        <button className="pixel-button tap-target px-6 py-3 text-sm w-full" onClick={onGoToMenu}>
          {COPY.monsterDefeated.backToMenuButton}
        </button>
      </div>
    </main>
  );
}
