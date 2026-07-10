"use client";

import { useMemo } from "react";
import { COPY } from "@/content/copy";
import { DeathReason } from "@/game/core/types";
import { GameMode } from "@/game/core/gameMode";
import { PlayerAchievement } from "@/game/core/playerAchievements";
import { resolveDeathScreenStatus } from "@/game/core/deathScreenStatus";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import AchievementResultPanel from "@/components/achievements/AchievementResultPanel";

interface DeathScreenProps {
  reason: DeathReason | null;
  /** Kolik hlídačů už na téhle pozici selhalo — viz game/core/deathCount.ts. */
  deathCount: number;
  /** Režim runu, který právě skončil (viz game/core/gameMode.ts) — řídí, jestli hráč pokračuje, nebo run definitivně končí. */
  gameMode: GameMode;
  /** GameState.livesRemaining PO téhle smrti (už snížené reducerem) — > 0 jen pro Normal, který ještě může pokračovat. */
  livesRemaining: number;
  /** Noc, kterou hráč právě dohrál — pro Normal-continue text "Opakovat noc X.". */
  nightNumber: number;
  /**
   * Achievementy nově odemčené TOUHLE smrtí (viz zadání "Napojit
   * achievementy na výsledkové obrazovky", game/core/achievementResultUnlocks.ts).
   * Sem patří i "Setkání s Hynkem" — zobrazí se tady, ne jako toast během
   * hraní. Chybí/prázdné = nic nového, panel se nevykreslí (viz
   * AchievementResultPanel.tsx).
   */
  newlyUnlockedAchievements?: PlayerAchievement[];
  onRetry: () => void;
}

export default function DeathScreen({
  reason,
  deathCount,
  gameMode,
  livesRemaining,
  nightNumber,
  newlyUnlockedAchievements = [],
  onRetry,
}: DeathScreenProps) {
  // Normal se zbývajícím životem pokračuje stejnou nocí ("POKRAČOVAT"),
  // cokoliv jiné (Normal bez životů, nebo Hardcore — ten vždy, bez ohledu na
  // livesRemaining) run definitivně ukončí ("NOVÁ HRA") — viz
  // game/core/deathScreenStatus.ts, vytažené sem, ať se dá otestovat bez
  // React infra.
  const status = resolveDeathScreenStatus(gameMode, livesRemaining, nightNumber);
  // door_open_at_attack nemá samostatnou "útok probíhá" fázi (reducer
  // přepíná enemyStage na "attack" a screen na "death" ve stejném dispatchi,
  // viz gameReducer.ts ENEMY_ADVANCE) — deathDoorAttack je proto pozadí
  // přímo pro tenhle death screen, ne pro nějaký mezikrok v DoorView.
  // bulb_replacement_attack prochází stejnou sekvencí (hráč je v DoorView,
  // dveře otevřené) — jen jiný text, stejné pozadí.
  const scene =
    reason === "door_open_at_attack" || reason === "bulb_replacement_attack"
      ? BACKGROUND_SCENES.deathDoorAttack
      : BACKGROUND_SCENES.death;

  // DeathScreen se mountuje znovu při každé smrti (podmíněný render podle
  // state.screen v app/play/page.tsx) — prázdné závislosti tedy stačí na to,
  // aby se hláška vybrala jednou při vstupu na obrazovku, ne při každém
  // rerenderu, a při další smrti (nový mount) mohla vyjít jiná.
  const corporateMessage = useMemo(() => {
    const messages = COPY.death.corporateMessages;
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <SceneBackground scene={scene} />

      {/* Stejný "terminál" obal jako MainMenuScreen/BriefingScreen (viz
          zadání "podobným způsobem uprav") — kovový rám + 4 šrouby +
          zapuštěná obrazovka, místo ploché pixel-panel karty. */}
      <div className="w-full max-w-md menu-terminal-frame relative z-10">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        <div className="menu-terminal-screen pixel-screen-static text-center p-8">
          <h1 className="text-2xl font-bold mb-2 text-red-500">{COPY.death.title}</h1>
          <p className="text-sm text-gray-400 mb-4">{reason ? COPY.death.reasons[reason] : ""}</p>
          <p className="text-xs text-gray-300 mb-2 italic">{corporateMessage}</p>
          <p className="text-xs text-gray-400 mb-4">
            {COPY.death.previousGuardsLabel.replace("{count}", String(deathCount))}
          </p>

          {status.kind === "normal_continue" ? (
            <p className="text-sm text-amber-400 mb-6">
              {COPY.death.normalContinueLivesLabel.replace("{lives}", String(status.livesRemaining))}
              <br />
              {COPY.death.normalContinueNightLabel.replace("{night}", String(status.nightNumber))}
            </p>
          ) : (
            <div className="mb-6">
              <p className="text-sm text-red-400">
                {status.kind === "hardcore_game_over" ? COPY.death.hardcoreGameOverLabel : COPY.death.normalGameOverLabel}
              </p>
              {status.kind === "normal_game_over" && (
                <p className="text-[11px] text-gray-500 mt-2">{COPY.death.normalLeaderboardNote}</p>
              )}
            </div>
          )}

          <AchievementResultPanel achievements={newlyUnlockedAchievements} />

          <button
            className="pixel-button console-button console-button--primary tap-target px-6 py-3 text-sm w-full"
            onClick={onRetry}
          >
            {status.kind === "normal_continue"
              ? COPY.death.normalContinueButton
              : status.kind === "hardcore_game_over"
                ? COPY.death.hardcoreGameOverButton
                : COPY.death.normalGameOverButton}
          </button>
        </div>
      </div>
    </main>
  );
}
