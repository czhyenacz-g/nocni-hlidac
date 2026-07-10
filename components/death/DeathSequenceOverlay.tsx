"use client";

import { useEffect, useRef, useState } from "react";
import { DeathSequenceConfig, DeathSequenceVariant } from "@/game/death/deathSequenceConfig";
import {
  DeathSequencePhase,
  isBlackoutActive,
  isDeathImageVisible,
  isGameOverOverlayVisible,
  isRedFlashActive,
  isShakeActive,
  isSignalLostVisible,
  isWhiteFlashActive,
  resolveDeathSequencePhase,
  resolveRedFlashOpacity,
  resolveShakeIntensity,
} from "@/game/death/deathSequenceTiming";
import { getDeathSequenceImageSrc } from "@/game/death/deathSequenceImages";
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_EVENTS, AudioEventId } from "@/game/audio/audioEvents";

/**
 * Nastaví hlasitost podle příslušného posuvníku (viz DeathTestControls.tsx)
 * a přehraje — `volume <= 0` se vůbec nepřehraje, ať posuvník "ztlumeno na
 * nulu" funguje jako skutečné vypnutí, ne jako tiché přehrání. `setVolume`
 * mění hlasitost TRVALE pro tenhle event (viz game/audio/audioEvents.ts
 * proč mají death-sekvenční zvuky vlastní eventy, ne sdílené s
 * jumpscare/monsterFinalDeathRoar/hardcoreSelectRoar) — bezpečné, protože
 * žádný jiný kód v projektu tyhle čtyři eventy zatím nepoužívá.
 */
function playDeathSequenceSound(id: AudioEventId, volume: number): void {
  if (volume <= 0) return;
  audioManager.setVolume(id, volume);
  audioManager.play(id);
}

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
 * Sdílený vizuální (a teď i zvukový) přehrávač death sekvence (viz zadání
 * "6. úkol" + "dodělej zvuky do /death-test") — NENAPOJENÝ na skutečné
 * smrti ve hře, zatím ho používá jen `/death-test` (viz
 * app/death-test/page.tsx). Napojení na `components/screens/DeathScreen.tsx`
 * je samostatný následující úkol — výstup ladění na `/death-test` (config
 * hodnoty) má posloužit jako podklad pro tohle napojení.
 *
 * Vlastní `requestAnimationFrame` smyčka (stejný vzor jako
 * `EmergencyMiniGame.tsx`) počítá `elapsedMs` od okamžiku, kdy `active`
 * naskočí na `true` — `game/death/deathSequenceTiming.ts` z něj čistě
 * odvozuje fázi a jednotlivé vizuální stavy, tahle komponenta je jen
 * vykresluje (a případně přehraje zvuk, viz playDeathSequenceSound výše).
 */
export default function DeathSequenceOverlay({ active, config, variant, onComplete, onPhaseChange }: DeathSequenceOverlayProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const phaseRef = useRef<DeathSequencePhase | null>(null);
  const completedRef = useRef(false);
  // Ztlumení ambientu má proběhnout PŘESNĚ jednou, hned jak sekvence
  // opustí "waiting" (viz níže) — samostatný ref místo odvozování z
  // phaseRef, ať funguje spolehlivě i v edge-case `preDeathDelayMs: 0`
  // (kdy sekvence "waiting" fázi vůbec neprojde a rovnou začne v "silence").
  const ambientCutRef = useRef(false);

  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startedAtRef.current = null;
      phaseRef.current = null;
      completedRef.current = false;
      ambientCutRef.current = false;
      setElapsedMs(0);
      setShakeOffset({ x: 0, y: 0 });
      return;
    }

    startedAtRef.current = performance.now();

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

      // Tvrdé ztlumení ambientu I heartbeatu (viz zadání "cutAmbientInstantly",
      // "co nejvíce jako reálná hra") — hned jak sekvence skutečně začne
      // (opustí "waiting"), ne dřív. stopLoop je OKAMŽITÉ zastavení (ne
      // fade), přesně "cut", ne "fade out". Heartbeat loopy tady patří
      // vedle ambientu, ne jen ambient samotný — v reálné hře by jinak
      // "před smrtí" tlukot srdce dál doznívalo přes celou death sekvenci.
      if (!ambientCutRef.current && phase !== "waiting" && config.cutAmbientInstantly) {
        ambientCutRef.current = true;
        // TODO(audio): cut ambient immediately
        audioManager.stopLoop(AUDIO_EVENTS.ambienceLoop);
        // TODO(audio): cut heartbeat immediately
        audioManager.stopLoop(AUDIO_EVENTS.heartbeatStressSlow);
        audioManager.stopLoop(AUDIO_EVENTS.heartbeatStressFast);
        // TODO(audio): wait during blackout/silence — zatím žádný zvuk mezi
        // cutem ambientu/heartbeatu a white flashem, viz zadání "1.5 s
        // absolutní ticho".
      }

      if (phase !== phaseRef.current) {
        phaseRef.current = phase;
        onPhaseChange?.(phase);

        // Jednorázové zvuky podle fáze (viz DeathTestControls.tsx posuvníky
        // roarVolume/impactVolume/glitchVolume/deathVolume) — vlastní
        // eventy, ne sdílené s jumpscare/monsterFinalDeathRoar (viz
        // game/audio/audioEvents.ts).
        // TODO(audio): play death impact sound at deathImageAtMs
        // TODO(audio): play monster/death sound at deathImageAtMs
        // Zatím zůstávají navázané na `phase` (viz starší sub-úkol) — s
        // defaultním configem `shakeAtMs`/`deathFrameAtMs`/`gameOverAtMs`
        // splývají do 1600ms, takže fáze "impact"/"death_frame" nemusí být
        // vždy dosažené (viz deathSequenceTiming.ts). Budoucí napojení má
        // tyhle zvuky spouštět přímo z `isDeathImageVisible`/`deathImageAtMs`
        // hranice, ne z `phase` stringu.
        if (phase === "impact") {
          playDeathSequenceSound(AUDIO_EVENTS.deathSequenceRoar, config.roarVolume);
          playDeathSequenceSound(AUDIO_EVENTS.deathSequenceImpact, config.impactVolume);
        } else if (phase === "death_frame") {
          playDeathSequenceSound(AUDIO_EVENTS.deathSequenceGlitch, config.glitchVolume);
        } else if (phase === "game_over") {
          // deathVolume hraje deathSequenceFinal — vlastní event mapovaný na
          // stejný soubor jako hardcoreSelectRoar ("řev monstra #3", viz
          // game/audio/audioConfig.ts), ne sdílený event samotný.
          playDeathSequenceSound(AUDIO_EVENTS.deathSequenceFinal, config.deathVolume);
        }
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
  const showBlackout = isBlackoutActive(elapsedMs, config);
  const showDeathImage = isDeathImageVisible(elapsedMs, config);
  const deathImageSrc = showDeathImage ? getDeathSequenceImageSrc(config.deathImageId) : null;
  const showSignalLost = isSignalLostVisible(elapsedMs, config);
  const showGameOver = isGameOverOverlayVisible(elapsedMs, config);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 9999, transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)` }}
      data-death-sequence-variant={variant}
      data-death-sequence-phase={phase}
    >
      {/* Trvalý tmavý podklad po celou sekvenci (POD death image) — ne totéž
          co blackout níže, viz deathSequenceConfig.ts komentář u
          blackoutDurationMs/blackoutOpacity. */}
      {sequenceStarted && <div className="absolute inset-0 bg-black" style={{ opacity: config.darknessOpacity }} aria-hidden="true" />}

      {/* Death image (viz game/death/deathSequenceImages.ts) — stejná
          technika jako SceneBackground.tsx (CSS background-image), ne
          next/image ani <img>, ať odpovídá zavedené konvenci projektu a
          cover/contain se řeší jedinou CSS vlastností. */}
      {deathImageSrc && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${deathImageSrc})`,
            backgroundSize: config.deathImageFit,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "#000",
            opacity: config.deathImageOpacity,
          }}
          aria-hidden="true"
        />
      )}

      {sequenceStarted && (
        <div className="absolute inset-0 pixel-screen-static" style={{ opacity: config.noiseOpacity }} aria-hidden="true" />
      )}

      {/* Časově omezená černá vrstva NAD death image — kryje ho, dokud
          blackout neskončí, i kdyby deathImageAtMs bylo dřív než
          blackoutDurationMs (viz komentář u isBlackoutActive). */}
      {showBlackout && <div className="absolute inset-0 bg-black" style={{ opacity: config.blackoutOpacity }} aria-hidden="true" />}

      {showWhiteFlash && <div className="absolute inset-0 bg-white" style={{ opacity: config.whiteFlashOpacity }} aria-hidden="true" />}
      {showRedFlash && redFlashOpacity > 0 && (
        <div className="absolute inset-0 bg-red-600" style={{ opacity: redFlashOpacity }} aria-hidden="true" />
      )}

      {showSignalLost && (
        <div className="absolute inset-x-0 top-6 flex items-center justify-center">
          <p className="text-red-500 text-sm font-bold tracking-widest uppercase text-center px-4">{DEATH_FRAME_LABEL}</p>
        </div>
      )}

      {/* GAME OVER je overlay NAD death image, ne náhrada za černou plochu —
          proto žádné vlastní bg-black tady, jen jemný scrim za textem kvůli čitelnosti. */}
      {showGameOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-100 text-3xl font-bold tracking-widest uppercase px-6 py-2 bg-black/40">{GAME_OVER_LABEL}</p>
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
