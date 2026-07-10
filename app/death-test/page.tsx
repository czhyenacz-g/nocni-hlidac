"use client";

import { useRef, useState } from "react";
import DeathSequenceOverlay from "@/components/death/DeathSequenceOverlay";
import DeathTestControls from "@/components/death/DeathTestControls";
import { DEATH_SEQUENCE_DEFAULT_CONFIG, DeathSequenceConfig } from "@/game/death/deathSequenceConfig";
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_EVENTS } from "@/game/audio/audioEvents";
import { AUDIO_CONFIG } from "@/game/audio/audioConfig";
import { computeAmbientStressMultiplier, computeHeartbeatVolumes } from "@/game/audio/heartbeatStress";

// Napětí (0..100) simulované PŘED spuštěním death sekvence (viz zadání
// "co nejvíce jako reálná hra... tlukot srdce na 80 %, stejný ambient") —
// stejná hodnota, na jaké skutečná hra drží heartbeat, když hráč sleduje
// monstrum ve dveřích se zavřenými dveřmi (viz
// game/audio/heartbeatStress.ts#computeHeartbeatTargetStress,
// enemyStage "door_hallway" + doorClosed). Cíl týhle stránky je vyladit
// LEPŠÍ death sekvenci pro reálnou hru — testovat střih z tichého/napjatého
// stavu do smrti má smysl jen s realistickým "před" stavem, ne v tichu.
const PRE_DEATH_STRESS_PERCENT = 80;
const BASE_AMBIENT_VOLUME = AUDIO_CONFIG[AUDIO_EVENTS.ambienceLoop].volume;

// Veřejná ladicí stránka pro DeathSequenceOverlay (viz zadání "6. úkol") —
// NENAPOJENÁ na skutečnou hru: nevyžaduje login, nezapisuje statistiky,
// nevolá server, nespouští /play. Preview vlevo je jen statický "kontrolní
// místnost" panel (žádný GameScreen/tick z hlavní hry), vpravo posuvníky
// měnící DeathSequenceConfig (viz DeathTestControls.tsx). Audio PŘED
// spuštěním smrti (ambient + heartbeat na PRE_DEATH_STRESS_PERCENT) žije
// jen tady, ne v DeathSequenceOverlay.tsx — v reálné hře už tohle hraje
// samo z normálního provozu (viz useHeartbeatStress.ts), overlay tam bude
// jen napojený na existující loopy, ne je sám spouštět.
export default function DeathTestPage() {
  const [config, setConfig] = useState<DeathSequenceConfig>(DEATH_SEQUENCE_DEFAULT_CONFIG);
  const [active, setActive] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  /** Natvrdo zastaví všechny "před smrtí" loopy — volá se při dokončení sekvence i defenzivně před každým novým přehráním. */
  function stopPreDeathAudio() {
    audioManager.stopLoop(AUDIO_EVENTS.ambienceLoop);
    audioManager.stopLoop(AUDIO_EVENTS.heartbeatStressSlow);
    audioManager.stopLoop(AUDIO_EVENTS.heartbeatStressFast);
  }

  async function handlePlay(fullscreen: boolean) {
    // audioManager.init() musí proběhnout po uživatelském gestu (autoplay
    // policy prohlížečů, viz app/dev-sound/page.tsx#handlePlay stejný vzor)
    // — klik na "Přehrát" je samo o sobě gesto, bezpečné volat opakovaně
    // (no-op po prvním init, viz audioManager.ts).
    audioManager.init();
    if (fullscreen && previewRef.current) {
      try {
        await previewRef.current.requestFullscreen();
      } catch {
        // requestFullscreen může selhat (chybějící gesto, blokováno
        // prohlížečem apod., viz zadání) — death preview se i tak spustí
        // normálně, jen bez fullscreen.
      }
    }

    // Realistický "před smrtí" zvukový podklad — stejný výpočet hlasitosti
    // jako skutečná hra (viz game/audio/heartbeatStress.ts), jen s pevnou
    // hodnotou napětí místo odvozené z GameState. DeathSequenceOverlay pak
    // tohle (viz cutAmbientInstantly) buď tvrdě přeruší, nebo nechá doznít,
    // podle aktuálního configu — přesně to, co má tahle stránka pomoct vyladit.
    stopPreDeathAudio();
    audioManager.setVolume(AUDIO_EVENTS.ambienceLoop, BASE_AMBIENT_VOLUME * computeAmbientStressMultiplier(PRE_DEATH_STRESS_PERCENT / 100));
    audioManager.startLoop(AUDIO_EVENTS.ambienceLoop);
    const { slowVolume, fastVolume } = computeHeartbeatVolumes(PRE_DEATH_STRESS_PERCENT);
    audioManager.setVolume(AUDIO_EVENTS.heartbeatStressSlow, slowVolume);
    audioManager.setVolume(AUDIO_EVENTS.heartbeatStressFast, fastVolume);
    audioManager.startLoop(AUDIO_EVENTS.heartbeatStressSlow);
    audioManager.startLoop(AUDIO_EVENTS.heartbeatStressFast);

    setActive(true);
  }

  function handleComplete() {
    setActive(false);
    // Ať cutAmbientInstantly bylo zapnuté nebo ne, po dokončení sekvence už
    // nemá co dál hrát na pozadí zamrzlé "GAME OVER" obrazovky.
    stopPreDeathAudio();
    // Necháváme hráče na /death-test (viz zadání "nepřesměrovávej") — jen
    // se vrátíme z fullscreenu, pokud jsme v něm byli.
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 flex flex-col lg:flex-row gap-4">
      <div ref={previewRef} className="relative flex-1 min-h-[360px] menu-terminal-frame">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        {/* Statický control-room preview — schválně NE skutečný GameScreen
            (viz zadání "raději statický preview než riskovat zásah do
            hry"), jen vizuální pozadí pro death sekvenci. */}
        <div className="menu-terminal-screen relative h-full min-h-[340px] flex flex-col items-center justify-center gap-4 p-8 pixel-screen-static">
          <p className="text-[10px] tracking-widest text-gray-500 uppercase">Objekt 13 — Noční služba</p>
          <h1 className="text-xl font-bold text-amber-400 uppercase tracking-wide">Kontrolní místnost</h1>
          <div className="w-full max-w-xs aspect-video camera-static border border-gray-700 flex items-center justify-center">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Kamera 01 — bez signálu</span>
          </div>
          <p className="text-xs text-gray-400">Dveře: zavřeno</p>
        </div>

        <DeathSequenceOverlay active={active} config={config} variant="default" onComplete={handleComplete} />
      </div>

      <div className="lg:w-96 w-full">
        <DeathTestControls
          config={config}
          onChange={setConfig}
          onPlayFullscreen={() => handlePlay(true)}
          onPlayInline={() => handlePlay(false)}
          onReset={() => setConfig(DEATH_SEQUENCE_DEFAULT_CONFIG)}
        />
      </div>
    </main>
  );
}
