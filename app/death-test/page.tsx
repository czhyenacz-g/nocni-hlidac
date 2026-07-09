"use client";

import { useRef, useState } from "react";
import DeathSequenceOverlay from "@/components/death/DeathSequenceOverlay";
import DeathTestControls from "@/components/death/DeathTestControls";
import { DEATH_SEQUENCE_DEFAULT_CONFIG, DeathSequenceConfig } from "@/game/death/deathSequenceConfig";

// Veřejná ladicí stránka pro DeathSequenceOverlay (viz zadání "6. úkol") —
// NENAPOJENÁ na skutečnou hru: nevyžaduje login, nezapisuje statistiky,
// nevolá server, nespouští /play. Preview vlevo je jen statický "kontrolní
// místnost" panel (žádný GameScreen/tick/audio z hlavní hry), vpravo
// posuvníky měnící DeathSequenceConfig (viz DeathTestControls.tsx).
export default function DeathTestPage() {
  const [config, setConfig] = useState<DeathSequenceConfig>(DEATH_SEQUENCE_DEFAULT_CONFIG);
  const [active, setActive] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  async function handlePlay(fullscreen: boolean) {
    if (fullscreen && previewRef.current) {
      try {
        await previewRef.current.requestFullscreen();
      } catch {
        // requestFullscreen může selhat (chybějící gesto, blokováno
        // prohlížečem apod., viz zadání) — death preview se i tak spustí
        // normálně, jen bez fullscreen.
      }
    }
    setActive(true);
  }

  function handleComplete() {
    setActive(false);
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
