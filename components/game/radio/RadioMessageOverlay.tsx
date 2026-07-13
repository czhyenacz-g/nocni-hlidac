"use client";

import { EnemyStage } from "@/game/core/types";
import { useRadioMessage } from "@/game/radio/useRadioMessage";
import RadioWaveform from "./RadioWaveform";

interface RadioMessageOverlayProps {
  /** Aktuální stage monstra (viz GameState.enemyStage) — jediné, co komponenta o herním stavu potřebuje ví, zbytek (detekce přechodu/text/přehrání) řeší useRadioMessage.ts. */
  monsterStage: EnemyStage;
  nightNumber: number;
}

/**
 * Pasivní informační vrstva (viz zadání "rádio je pouze pasivní informační
 * vrstva") — vlevo nahoře, `absolute` (NE `fixed`: `app/play/page.tsx` obaluje
 * hru do `.atmosphere-root` s CSS `filter`, což by fixed potomka odtrhlo od
 * viewportu, stejný důvod jako u CinematicScreen.tsx/LeftWallView.tsx).
 * Vyžaduje `position: relative` na rodiči — GameScreen.tsx `<main>` už ho má.
 * `pointer-events-none` na celém bloku (viz zadání), ať nikdy neblokuje
 * klikání na herní prvky pod/kolem sebe.
 */
export default function RadioMessageOverlay({ monsterStage, nightNumber }: RadioMessageOverlayProps) {
  const { visible, text } = useRadioMessage(monsterStage, nightNumber);

  if (!visible || !text) return null;

  return (
    <div
      className="absolute top-4 left-4 z-40 pixel-panel pixel-screen-static px-3 py-2 max-w-[16rem] pointer-events-none"
      aria-hidden="true"
    >
      <div className="text-[10px] font-bold tracking-wide text-amber-400 animate-pulse mb-1">ZACHYCENÝ PŘENOS</div>
      <RadioWaveform />
      <div className="text-xs text-gray-200 mt-1">{text}</div>
    </div>
  );
}
