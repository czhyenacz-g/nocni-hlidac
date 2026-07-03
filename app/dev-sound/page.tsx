"use client";

import { useState } from "react";
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_CONFIG } from "@/game/audio/audioConfig";
import { AudioEventId } from "@/game/audio/audioEvents";
import { DEBUG_PANEL_ENABLED } from "@/game/balancing/constants";
import { SOUND_REGISTRY } from "./soundRegistry";

// Dev nástroj, ne herní obrazovka — přehled všech zvukových eventů z
// game/audio/ (viz soundRegistry.ts) s tlačítkem na přehrání. Gatované stejnou
// DEBUG_PANEL_ENABLED konstantou jako DebugPanel.tsx.
export default function DevSoundPage() {
  const [initialized, setInitialized] = useState(false);

  if (!DEBUG_PANEL_ENABLED) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 text-gray-500 text-sm">
        /dev-sound je vypnuté (DEBUG_PANEL_ENABLED = false).
      </main>
    );
  }

  function handlePlay(id: AudioEventId) {
    // audioManager.init() musí proběhnout po uživatelském gestu (autoplay
    // policy prohlížečů) — klik na "Přehrát" je samo o sobě gesto, takže
    // stačí inicializovat líně při prvním kliknutí, ne na mount.
    if (!initialized) {
      audioManager.init();
      setInitialized(true);
    }
    audioManager.play(id);
  }

  const entries = Object.values(SOUND_REGISTRY);

  return (
    <main className="min-h-screen p-6 bg-gray-900 text-gray-200 font-mono">
      <h1 className="text-lg font-bold text-green-400 mb-1">/dev-sound — zvukový registr</h1>
      <p className="text-xs text-gray-500 mb-4">
        Dev nástroj, ne herní obrazovka. Zdroj pravdy je{" "}
        <code className="text-gray-400">game/audio/audioEvents.ts</code> +{" "}
        <code className="text-gray-400">audioConfig.ts</code> — tahle stránka je jen čitelný přehled nad tím.
        Sloupec &bdquo;Co asi dělá&ldquo; je subjektivní odhad, ne autoritativní popis skutečného zvuku.
      </p>

      <div className="overflow-x-auto pixel-panel">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="p-2">Název</th>
              <th className="p-2">Popis</th>
              <th className="p-2">Co asi dělá</th>
              <th className="p-2">Soubor / fallback</th>
              <th className="p-2">Kde se používá</th>
              <th className="p-2">Přehrát</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((sound) => {
              const config = AUDIO_CONFIG[sound.id];
              return (
                <tr key={sound.id} className="border-b border-gray-800 align-top">
                  <td className="p-2 text-amber-400 whitespace-nowrap">{sound.label}</td>
                  <td className="p-2 max-w-xs">{sound.description}</td>
                  <td className="p-2 max-w-xs text-gray-500">{sound.guess}</td>
                  <td className="p-2 text-gray-500 max-w-[14rem]">
                    <span className="block break-all">{config.src}</span>
                    {config.fallbackSynth && (
                      <span className="block text-gray-600">+ fallback synth ({config.fallbackSynth.waveform ?? "sine"})</span>
                    )}
                  </td>
                  <td className="p-2 max-w-sm text-gray-500">{sound.usedIn}</td>
                  <td className="p-2">
                    <button
                      className="pixel-button tap-target px-3 py-1 text-xs whitespace-nowrap"
                      onClick={() => handlePlay(sound.id)}
                    >
                      ▶ Přehrát
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
