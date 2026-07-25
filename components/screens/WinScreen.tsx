import { useCopy } from "@/game/i18n/useTranslation";
import type { CopyShape } from "@/content/copy";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { PlayerAchievement } from "@/game/core/playerAchievements";
import AchievementResultPanel from "@/components/achievements/AchievementResultPanel";
import { resolveShiftRating } from "@/game/core/shiftRating";

interface WinScreenProps {
  survivedNights: number;
  /**
   * Součet doby zavřených dveří za PRÁVĚ dokončenou noc (viz zadání
   * "jednoduché hodnocení podle doby zavřených dveří", GameState.totalDoorClosedMs) —
   * čistě prezentační, nikam se neukládá, resetuje se na 0 každou novou noc.
   */
  totalDoorClosedMs: number;
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
function resolveSurvivedNightsUnit(count: number, COPY: CopyShape): string {
  const forms = COPY.win.survivedNightsLabel;
  return count === 1 ? forms.one : count >= 2 && count <= 4 ? forms.few : forms.many;
}

export default function WinScreen({
  survivedNights,
  totalDoorClosedMs,
  newlyUnlockedAchievements = [],
  onRetry,
  onGoToMenu,
}: WinScreenProps) {
  const COPY = useCopy();
  // Zobrazené celé sekundy vs. přesné hodnocení (viz zadání "zaokrouhlení
  // nesmí ovlivnit hranice") — resolveShiftRating dostává SUROVÉ ms, ne
  // zaokrouhlenou hodnotu níže.
  const shiftRating = resolveShiftRating(totalDoorClosedMs);
  const doorClosedSeconds = Math.round(totalDoorClosedMs / 1000);
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
          {/* Číslo odsazené jako velký červený údaj mezi prefixem a
              skloňovaným slovem noc/noci/nocí (viz zadání), místo jedné
              věty na jednom řádku. */}
          <p className="text-xs text-gray-500">{COPY.win.survivedNightsLabel.prefix}</p>
          <p className="text-4xl font-bold text-red-500 leading-tight my-1">{survivedNights}</p>
          <p className="text-xs text-gray-500 mb-8">{resolveSurvivedNightsUnit(survivedNights, COPY)}</p>

          {/* Hodnocení směny podle doby zavřených dveří (viz zadání) —
              "razítkový" blok: mírně natočený rám, tlumené barvy (žádný
              veselý arkádový design), stejná pixel-panel/monospace estetika
              jako zbytek Objektu 13. Vlastní blok v normálním layoutu (ne
              position: absolute), ať nikdy nepřekryje tlačítko níže a
              funguje stejně na mobilu i desktopu. */}
          <div
            className="pixel-panel mb-6 inline-block px-6 py-3 text-center"
            style={{ transform: "rotate(-2deg)", borderColor: "#7a2f2f" }}
          >
            <div className="text-[10px] tracking-[0.2em] text-gray-400">{COPY.win.shiftRatingLabel}</div>
            <div
              className="text-6xl font-bold leading-none my-1"
              style={{ color: "#c65b5b", textShadow: "0 0 10px rgba(198,91,91,0.35)" }}
            >
              {shiftRating}
            </div>
            <div className="text-[11px] text-gray-400 whitespace-nowrap">
              {COPY.win.doorClosedTimeLabel.replace("{seconds}", String(doorClosedSeconds))}
            </div>
          </div>

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
