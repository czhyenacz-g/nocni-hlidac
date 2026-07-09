"use client";

import { useEffect, useRef, useState } from "react";
import { DeathSequenceConfig, DeathSequenceVariant } from "@/game/death/deathSequenceConfig";
import {
  DeathSequencePhase,
  isRedFlashActive,
  isShakeActive,
  isWhiteFlashActive,
  resolveDeathSequencePhase,
  resolveRedFlashOpacity,
  resolveShakeIntensity,
} from "@/game/death/deathSequenceTiming";

export type DeathSequenceOverlayProps = {
  active: boolean;
  config: DeathSequenceConfig;
  variant: DeathSequenceVariant;
  onComplete?: () => void;
  onPhaseChange?: (phase: DeathSequencePhase) => void;
};

const DEATH_FRAME_LABEL = "SIGNÁL ZTRACEN";
const GAME_OVER_LABEL = "GAME OVER";

/**
 * Sdílený vizuální přehrávač death sekvence (viz zadání "6. úkol") —
 * NENAPOJENÝ na skutečné smrti ve hře, zatím ho používá jen `/death-test`
 * (viz app/death-test/page.tsx). Napojení na `components/screens/DeathScreen.tsx`
 * je samostatný následující úkol.
 *
 * Vlastní `requestAnimationFrame` smyčka (stejný vzor jako
 * `EmergencyMiniGame.tsx`) počítá `elapsedMs` od okamžiku, kdy `active`
 * naskočí na `true` — `game/death/deathSequenceTiming.ts` z něj čistě
 * odvozuje fázi a jednotlivé vizuální stavy, tahle komponenta je jen
 * vykresluje.
 */
export default function DeathSequenceOverlay({ active, config, variant, onComplete, onPhaseChange }: DeathSequenceOverlayProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const phaseRef = useRef<DeathSequencePhase | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startedAtRef.current = null;
      phaseRef.current = null;
      completedRef.current = false;
      setElapsedMs(0);
      setShakeOffset({ x: 0, y: 0 });
      return;
    }

    startedAtRef.current = performance.now();

    // TODO (audio, viz task 7 "napojení DeathSequenceOverlay na skutečné
    // smrti"): sem patří tvrdé ztlumení ambientu/hudby, pokud
    // config.cutAmbientInstantly (audioManager.setMuted/fadeOutLoop) — pro
    // /death-test záměrně beze zvuku (viz zadání "stačí vizuální preview +
    // připravené místo pro audio"), ať tenhle úkol nezasahuje do globálního
    // audio manageru.

    function tick(now: number) {
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;
      const elapsed = now - startedAt;
      setElapsedMs(elapsed);

      if (isShakeActive(elapsed, config)) {
        const intensity = resolveShakeIntensity(config);
        setShakeOffset({
          x: (Math.random() * 2 - 1) * intensity,
          y: (Math.random() * 2 - 1) * intensity,
        });
      } else {
        setShakeOffset({ x: 0, y: 0 });
      }

      const phase = resolveDeathSequencePhase(elapsed, config);
      if (phase !== phaseRef.current) {
        phaseRef.current = phase;
        onPhaseChange?.(phase);
        // TODO (audio): tady by šlo napojit jednorázové zvuky per fázi
        // (impact -> config.impactVolume, death_frame -> config.roarVolume
        // přes AUDIO_EVENTS.monsterFinalDeathRoar, viz game/audio/audioEvents.ts)
        // — zatím záměrně beze zvuku, žádný event pro deathVolume/glitchVolume
        // v projektu ještě neexistuje.
      }

      if (phase === "complete") {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
        // Nepokračuj v RAF smyčce dál — poslední snímek (game over frame)
        // zůstane zobrazený, dokud volající (viz /death-test) nenastaví
        // active zpátky na false.
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  const phase = resolveDeathSequencePhase(elapsedMs, config);
  const sequenceStarted = phase !== "waiting";
  const showWhiteFlash = isWhiteFlashActive(elapsedMs, config);
  const showRedFlash = isRedFlashActive(elapsedMs, config);
  const redFlashOpacity = resolveRedFlashOpacity(config);
  const showDeathFrame = phase === "death_frame";
  const showGameOver = phase === "game_over" || phase === "complete";

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 9999, transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)` }}
      data-death-sequence-variant={variant}
      data-death-sequence-phase={phase}
    >
      {sequenceStarted && <div className="absolute inset-0 bg-black" style={{ opacity: config.darknessOpacity }} aria-hidden="true" />}
      {sequenceStarted && (
        <div className="absolute inset-0 pixel-screen-static" style={{ opacity: config.noiseOpacity }} aria-hidden="true" />
      )}
      {showWhiteFlash && <div className="absolute inset-0 bg-white" style={{ opacity: config.whiteFlashOpacity }} aria-hidden="true" />}
      {showRedFlash && redFlashOpacity > 0 && (
        <div className="absolute inset-0 bg-red-600" style={{ opacity: redFlashOpacity }} aria-hidden="true" />
      )}
      {showDeathFrame && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-red-500 text-2xl font-bold tracking-widest uppercase text-center px-4">{DEATH_FRAME_LABEL}</p>
        </div>
      )}
      {showGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <p className="text-gray-200 text-3xl font-bold tracking-widest uppercase">{GAME_OVER_LABEL}</p>
        </div>
      )}
      {config.showPhaseDebug && (
        <div className="absolute bottom-2 left-2 text-xs text-amber-400 font-mono bg-black/70 px-2 py-1">
          fáze: {phase} · t: {Math.round(elapsedMs)}ms
        </div>
      )}
    </div>
  );
}
