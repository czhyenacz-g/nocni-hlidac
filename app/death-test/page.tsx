"use client";

import { useEffect, useRef, useState } from "react";
import DeathSequenceOverlay from "@/components/death/DeathSequenceOverlay";
import DeathScreen from "@/components/screens/DeathScreen";
import { getLiveDeathSequenceConfig, isDoorAttackDeath } from "@/game/death/liveDeathSequenceConfig";
import { DeathReason } from "@/game/core/types";
import { preloadBackgroundImages } from "@/game/visuals/backgroundImages";
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_EVENTS } from "@/game/audio/audioEvents";
import { AUDIO_CONFIG } from "@/game/audio/audioConfig";
import { computeAmbientStressMultiplier, computeHeartbeatVolumes } from "@/game/audio/heartbeatStress";

// Napětí (0..100) simulované PŘED spuštěním death sekvence (viz zadání
// "co nejvíce jako reálná hra... tlukot srdce na 80 %, stejný ambient") —
// stejná hodnota, na jaké skutečná hra drží heartbeat, když hráč sleduje
// monstrum ve dveřích se zavřenými dveřmi.
const PRE_DEATH_STRESS_PERCENT = 80;
const BASE_AMBIENT_VOLUME = AUDIO_CONFIG[AUDIO_EVENTS.ambienceLoop].volume;

const DEATH_REASON_OPTIONS: { reason: DeathReason; label: string }[] = [
  { reason: "door_open_at_attack", label: "Útok u dveří (otevřené dveře)" },
  { reason: "bulb_replacement_attack", label: "Útok při výměně žárovky" },
  { reason: "blackout_timeout", label: "Blackout — baterie došla" },
  { reason: "emergency_run", label: "Nouzová minihra (bez animace/hold, viz DeathScreen.tsx)" },
];

// Veřejná ladicí stránka pro skutečnou death sekvenci (viz zadání "chci mít
// zorbazené aktuální chování smrti") — NENAPOJENÁ na skutečnou hru (nevyžaduje
// login, nezapisuje statistiky, nevolá server, nespouští /play), ale
// přehrává PŘESNĚ stejnou komponentní dvojici jako app/play/page.tsx:
// DeathSequenceOverlay (efekty) -> DeathScreen (ghoul_death animace + dialog
// se zpožděním). Žádné posuvníky pro ladění timingů — ten je teď pevně daný
// (viz game/death/liveDeathSequenceConfig.ts, components/screens/DeathScreen.tsx),
// tahle stránka slouží jen k tomu, aby šlo reálné chování kdykoliv vyvolat a
// zkontrolovat, ne k jeho přeladění.
export default function DeathTestPage() {
  const [reason, setReason] = useState<DeathReason>(DEATH_REASON_OPTIONS[0].reason);
  const [deathSequenceActive, setDeathSequenceActive] = useState(false);
  const [showDeathScreen, setShowDeathScreen] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  // Na skutečné /play tuhle práci odvede LoadingScreen.tsx při každém
  // startu/restartu směny, PŘEDTÍM než hráč vůbec může umřít — /death-test
  // ale žádný LoadingScreen nemá, takže bez tohohle by prohlížeč stahoval
  // ghoul_death_0/1/2.webp (viz game/visuals/backgroundImages.ts scéna
  // "death"/"deathDoorAttack") až v okamžiku, kdy je poprvé potřeba
  // vykreslit, tedy PO doběhnutí DeathSequenceOverlay — krátký viditelný
  // blesk pozadí stránky (`body`), než se snímek stihne stáhnout.
  useEffect(() => {
    preloadBackgroundImages();
  }, []);

  /** Natvrdo zastaví všechny "před smrtí" loopy — volá se při dokončení sekvence i defenzivně před každým novým přehráním. */
  function stopPreDeathAudio() {
    audioManager.stopLoop(AUDIO_EVENTS.ambienceLoop);
    audioManager.stopLoop(AUDIO_EVENTS.heartbeatStressSlow);
    audioManager.stopLoop(AUDIO_EVENTS.heartbeatStressFast);
  }

  async function handlePlay(fullscreen: boolean) {
    // audioManager.init() musí proběhnout po uživatelském gestu (autoplay
    // policy prohlížečů) — klik na "Přehrát" je samo o sobě gesto, bezpečné
    // volat opakovaně (no-op po prvním init, viz audioManager.ts).
    audioManager.init();
    if (fullscreen && previewRef.current) {
      try {
        await previewRef.current.requestFullscreen();
      } catch {
        // requestFullscreen může selhat (chybějící gesto, blokováno
        // prohlížečem apod.) — death preview se i tak spustí normálně, jen
        // bez fullscreen.
      }
    }

    // Realistický "před smrtí" zvukový podklad — stejný výpočet hlasitosti
    // jako skutečná hra (viz game/audio/heartbeatStress.ts), jen s pevnou
    // hodnotou napětí místo odvozené z GameState.
    stopPreDeathAudio();
    audioManager.setVolume(AUDIO_EVENTS.ambienceLoop, BASE_AMBIENT_VOLUME * computeAmbientStressMultiplier(PRE_DEATH_STRESS_PERCENT / 100));
    audioManager.startLoop(AUDIO_EVENTS.ambienceLoop);
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(PRE_DEATH_STRESS_PERCENT);
    audioManager.setVolume(AUDIO_EVENTS.heartbeatStressSlow, slowVolume);
    audioManager.setVolume(AUDIO_EVENTS.heartbeatStressFast, fastVolume);
    audioManager.startLoop(AUDIO_EVENTS.heartbeatStressSlow);
    audioManager.startLoop(AUDIO_EVENTS.heartbeatStressFast);

    setShowDeathScreen(false);
    setDeathSequenceActive(true);
  }

  function handleSequenceComplete() {
    setDeathSequenceActive(false);
    // Ať cutAmbientInstantly bylo zapnuté nebo ne, po dokončení efektové
    // sekvence už nemá co dál hrát na pozadí ghoul_death animace.
    stopPreDeathAudio();
    setShowDeathScreen(true);
  }

  function handleRetry() {
    setShowDeathScreen(false);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 flex flex-col lg:flex-row gap-4">
      {/* `isolate` (CSS `isolation: isolate`) je tu nutné — DeathScreen.tsx
          drží svůj SceneBackground na `-z-10` vůči nejbližšímu positioned
          předkovi (viz SceneBackground.tsx). Ve skutečné hře ho "chytí" CSS
          filter na `.atmosphere-root` (ten sám o sobě vytváří nový stacking
          context, viz app/play/page.tsx komentáře u AchievementToast), tady
          žádný takový předek není — bez `isolate` by `-z-10` vrstva propadla
          až za neprůhledné pozadí `.menu-terminal-frame`/`.menu-terminal-screen`
          níže a ghoul_death animace by nebyla vůbec vidět. */}
      <div ref={previewRef} className="relative isolate flex-1 min-h-[360px] menu-terminal-frame">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        {!showDeathScreen && (
          // Statický control-room preview — schválně NE skutečný GameScreen,
          // jen vizuální pozadí pro death sekvenci.
          <div className="menu-terminal-screen relative h-full min-h-[340px] flex flex-col items-center justify-center gap-4 p-8 pixel-screen-static">
            <p className="text-[10px] tracking-widest text-gray-500 uppercase">Objekt 13 — Noční služba</p>
            <h1 className="text-xl font-bold text-amber-400 uppercase tracking-wide">Kontrolní místnost</h1>
            <div className="w-full max-w-xs aspect-video camera-static border border-gray-700 flex items-center justify-center">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Kamera 01 — bez signálu</span>
            </div>
            <p className="text-xs text-gray-400">Dveře: zavřeno</p>
          </div>
        )}

        {showDeathScreen && (
          <DeathScreen
            reason={reason}
            deathCount={3}
            gameMode="normal"
            livesRemaining={2}
            nightNumber={2}
            onRetry={handleRetry}
          />
        )}

        <DeathSequenceOverlay
          active={deathSequenceActive}
          config={getLiveDeathSequenceConfig(reason)}
          variant={isDoorAttackDeath(reason) ? "door" : "default"}
          onComplete={handleSequenceComplete}
        />
      </div>

      <div className="lg:w-80 w-full flex flex-col gap-4">
        <div className="pixel-panel p-4 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wide">Skutečná death sekvence</h2>
          <p className="text-xs text-gray-400">
            Přehraje přesně to, co uvidí hráč po smrti ve hře: efekty (ticho, bílý záblesk, shake, zvuk) → ghoul_death
            animace → dialog. Žádné ladicí posuvníky — timing je pevně daný.
          </p>

          <label className="flex flex-col gap-1 text-xs text-gray-300">
            Důvod smrti
            <select
              className="pixel-input bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs"
              value={reason}
              onChange={(event) => setReason(event.target.value as DeathReason)}
              disabled={deathSequenceActive}
            >
              {DEATH_REASON_OPTIONS.map((option) => (
                <option key={option.reason} value={option.reason}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="pixel-button console-button console-button--primary tap-target px-4 py-2 text-sm"
            onClick={() => handlePlay(false)}
            disabled={deathSequenceActive}
          >
            Přehrát
          </button>
          <button
            className="pixel-button console-button tap-target px-4 py-2 text-sm"
            onClick={() => handlePlay(true)}
            disabled={deathSequenceActive}
          >
            Přehrát na celou obrazovku
          </button>
        </div>
      </div>
    </main>
  );
}
