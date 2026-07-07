"use client";

import { useState } from "react";
import EmergencyMiniGame from "@/components/minigame/EmergencyMiniGame";
import { DEFAULT_EMERGENCY_MINIGAME_INPUT } from "@/game/minigame/config";
import { EmergencyMiniGameResult } from "@/game/minigame/types";

// Izolovaný prototyp minihry (nouzová obchůzka / boj s monstrem) — NENAPOJENÝ
// na hlavní hru (/play). Žádná herní logika, žádný stav a žádná komponenta
// odsud se s hlavní hrou nesdílí (viz game/minigame/*, components/minigame/*).
// Tahle stránka je jen DEBUG wrapper kolem znovupoužitelné komponenty
// EmergencyMiniGame (input/onComplete kontrakt pro budoucí spuštění z /play,
// viz zadání) — zobrazuje poslední onComplete výsledek, ať jde ručně ověřit,
// že komponenta umí vracet výstupy.
export default function MinihraPage() {
  const [lastResult, setLastResult] = useState<EmergencyMiniGameResult | null>(null);

  return (
    <main
      className="relative min-h-screen p-4 flex flex-col items-center"
      style={{ background: "#020a05", color: "#7cffb2", fontFamily: "'Courier New', monospace" }}
    >
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <div className="text-center">
          <h1
            className="text-xl font-bold tracking-wide"
            style={{ color: "#5dffa0", textShadow: "0 0 8px rgba(93,255,160,0.65)" }}
          >
            Nouzová obchůzka — prototyp
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "#4c8a6a" }}>
            WASD / šipky: pohyb · mezerník: výstřel · E: akce · R: restart
          </p>
        </div>

        <EmergencyMiniGame input={DEFAULT_EMERGENCY_MINIGAME_INPUT} onComplete={setLastResult} />

        <div
          className="p-3 text-xs"
          style={{ background: "rgba(3, 15, 8, 0.9)", border: "1px solid #1f6b45", color: "#6fe3a0" }}
        >
          <div className="mb-1" style={{ color: "#3f7a58" }}>
            Poslední výsledek:
          </div>
          <pre className="whitespace-pre-wrap break-words">
            {lastResult ? JSON.stringify(lastResult, null, 2) : "(zatím žádný — dohraj kolo)"}
          </pre>
        </div>
      </div>
    </main>
  );
}
