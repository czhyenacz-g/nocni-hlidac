"use client";

import { useMemo } from "react";
import { COPY } from "@/content/copy";
import { DeathReason } from "@/game/core/types";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";

interface DeathScreenProps {
  reason: DeathReason | null;
  /** Kolik hlídačů už na téhle pozici selhalo — viz game/core/deathCount.ts. */
  deathCount: number;
  onRetry: () => void;
}

export default function DeathScreen({ reason, deathCount, onRetry }: DeathScreenProps) {
  // door_open_at_attack nemá samostatnou "útok probíhá" fázi (reducer
  // přepíná enemyStage na "attack" a screen na "death" ve stejném dispatchi,
  // viz gameReducer.ts ENEMY_ADVANCE) — deathDoorAttack je proto pozadí
  // přímo pro tenhle death screen, ne pro nějaký mezikrok v DoorView.
  const scene = reason === "door_open_at_attack" ? BACKGROUND_SCENES.deathDoorAttack : BACKGROUND_SCENES.death;

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
      <div className="jumpscare-overlay" />
      <div className="w-full max-w-md text-center pixel-panel p-8 relative z-10">
        <h1 className="text-2xl font-bold mb-2 text-red-500">{COPY.death.title}</h1>
        <p className="text-sm text-gray-400 mb-4">{reason ? COPY.death.reasons[reason] : ""}</p>
        <p className="text-xs text-gray-500 mb-2 italic">{corporateMessage}</p>
        <p className="text-xs text-gray-600 mb-8">
          {COPY.death.previousGuardsLabel.replace("{count}", String(deathCount))}
        </p>
        <button className="pixel-button tap-target px-6 py-3 text-sm w-full" onClick={onRetry}>
          {COPY.death.retryButton}
        </button>
      </div>
    </main>
  );
}
