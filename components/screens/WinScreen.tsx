import { COPY } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { PlayerAchievement } from "@/game/core/playerAchievements";
import AchievementResultPanel from "@/components/achievements/AchievementResultPanel";

interface WinScreenProps {
  survivedNights: number;
  /**
   * Achievementy nově odemčené touhle přežitou nocí (viz zadání "Napojit
   * achievementy na výsledkové obrazovky", game/core/achievementResultUnlocks.ts).
   * Chybí/prázdné = nic nového, panel se nevykreslí.
   */
  newlyUnlockedAchievements?: PlayerAchievement[];
  onRetry: () => void;
  onGoToMenu: () => void;
}

// Skloňování noc/noci/nocí — 1 = "noc", 2-4 = "noci", jinak (0, 5+) = "nocí".
function formatSurvivedNights(count: number): string {
  const forms = COPY.win.survivedNightsLabel;
  const label = count === 1 ? forms.one : count >= 2 && count <= 4 ? forms.few : forms.many;
  return label.replace("{count}", String(count));
}

export default function WinScreen({ survivedNights, newlyUnlockedAchievements = [], onRetry, onGoToMenu }: WinScreenProps) {
  // Bez bg-* na <main> — viz stejná poznámka v MainMenuScreen.tsx (main by
  // jinak vlastním pozadím zakryl SceneBackground potomka s -z-10).
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <SceneBackground scene={BACKGROUND_SCENES.win} />

      {/* Stejný "terminál" obal jako MainMenuScreen/BriefingScreen/DeathScreen
          (viz zadání "podobným způsobem uprav") — kovový rám + 4 šrouby +
          zapuštěná obrazovka, místo ploché pixel-panel karty. */}
      <div className="w-full max-w-md menu-terminal-frame relative z-10">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        <div className="menu-terminal-screen pixel-screen-static text-center p-8">
          <h1 className="text-2xl font-bold mb-2 text-gray-100">{COPY.win.title}</h1>
          <p className="text-sm text-gray-400 mb-2">{COPY.win.subtitle}</p>
          <p className="text-xs text-gray-500 mb-8">{formatSurvivedNights(survivedNights)}</p>

          <AchievementResultPanel achievements={newlyUnlockedAchievements} />

          <button
            className="pixel-button console-button console-button--primary tap-target px-6 py-3 text-sm w-full mt-6"
            onClick={onRetry}
          >
            {COPY.win.retryButton}
          </button>
          <button
            className="block mt-4 mx-auto text-center text-xs text-gray-500 hover:text-gray-300"
            onClick={onGoToMenu}
          >
            {COPY.win.backToMenuLabel}
          </button>
        </div>
      </div>
    </main>
  );
}
