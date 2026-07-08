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

      <h2 className="text-lg font-bold text-green-400 mt-8 mb-1">Kandidáti — heartbeat (OpenGameArt, CC0)</h2>
      <p className="text-xs text-gray-500 mb-4">
        Zatím nikam nezapojené varianty ke zvážení jako náhrada za syntetizovaný `heartbeat`
        fallback (viz <code className="text-gray-400">assets/audio/downloads/opengameart/heartbeat/</code>
        pro originální soubory a licenci). Přehrávač níže je jen dev náhled, ne herní audio systém.
      </p>
      <div className="overflow-x-auto pixel-panel">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="p-2">Varianta</th>
              <th className="p-2">Zdroj</th>
              <th className="p-2">Přehrát</th>
            </tr>
          </thead>
          <tbody>
            {HEARTBEAT_CANDIDATES.map((candidate) => (
              <tr key={candidate.file} className="border-b border-gray-800 align-top">
                <td className="p-2 text-amber-400 whitespace-nowrap">{candidate.label}</td>
                <td className="p-2 text-gray-500">{candidate.source}</td>
                <td className="p-2">
                  <audio controls src={`/dev-sound-candidates/heartbeat/${candidate.file}`} className="h-8" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-bold text-green-400 mt-8 mb-1">Kandidáti — bušení na dveře / řev monstra / kroky (Freesound)</h2>
      <p className="text-xs text-gray-500 mb-4">
        Zatím nikam nezapojené kandidáti pro budoucí zvukové eventy (bušení na dveře, řev
        monstra, kroky při přiblížení) — viz{" "}
        <code className="text-gray-400">assets/audio/downloads/freesound/</code> pro originální
        soubory a licence. Přehrávač níže je jen dev náhled, ne herní audio systém.
      </p>
      <div className="overflow-x-auto pixel-panel">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="p-2">Varianta</th>
              <th className="p-2">Zdroj</th>
              <th className="p-2">Licence</th>
              <th className="p-2">Poznámka</th>
              <th className="p-2">Přehrát</th>
            </tr>
          </thead>
          <tbody>
            {NEW_MONSTER_SOUND_CANDIDATES.map((candidate) => (
              <tr key={candidate.file} className="border-b border-gray-800 align-top">
                <td className="p-2 text-amber-400 whitespace-nowrap">{candidate.label}</td>
                <td className="p-2 text-gray-500">{candidate.source}</td>
                <td className="p-2 text-gray-500 whitespace-nowrap">{candidate.license}</td>
                <td className="p-2 text-gray-500 max-w-xs">{"note" in candidate ? candidate.note : ""}</td>
                <td className="p-2">
                  <audio controls src={`/dev-sound-candidates/${candidate.file}`} className="h-8" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const HEARTBEAT_CANDIDATES = [
  {
    file: "heartbeat_slow_0.mp3",
    label: "Slow",
    source: "opengameart.org/content/heartbeat-sounds",
  },
  {
    file: "heartbeat_fast_0.mp3",
    label: "Fast",
    source: "opengameart.org/content/heartbeat-sounds",
  },
  {
    file: "heartbeat_slow_reverb.mp3",
    label: "Slow (reverb)",
    source: "opengameart.org/content/heartbeat-sounds",
  },
  {
    file: "heartbeat_fast_reverb.mp3",
    label: "Fast (reverb)",
    source: "opengameart.org/content/heartbeat-sounds",
  },
  {
    file: "heartbeat_single.mp3",
    label: "Single beat",
    source: "opengameart.org/content/heartbeat-single-sound",
  },
];

const NEW_MONSTER_SOUND_CANDIDATES = [
  {
    file: "door_pound/door_knocking_angry.mp3",
    label: "Bušení na dveře",
    source: "freesound.org/people/Macif/sounds/194365/",
    license: "CC0",
  },
  {
    file: "monster_roar/dragon_roars_growls_snarls.mp3",
    label: "Řev monstra (60 s, víc variant)",
    source: "freesound.org/people/Breviceps/sounds/479380/",
    license: "CC0",
  },
  // Obě "Kroky" varianty níže znějí jako TĚŽKÉ, dunivé monstrum — pro
  // současného nepřítele (viz game/enemies/) jsou moc masivní/pomalé.
  // Zatím nikam nezapojujeme, schované na později pro budoucí druhý typ
  // nepřítele ("gigant") s vlastním, těžším zvukovým profilem.
  {
    file: "footsteps/monster_stomp_footsteps_sequence.mp3",
    label: "Kroky — stomp sekvence",
    source: "freesound.org/people/Vilkas_Sound/sounds/753178/",
    license: "CC BY 4.0",
    note: "Těžké monstrum — použít až pro budoucí typ nepřítele „gigant“.",
  },
  {
    file: "footsteps/monster_footsteps_gravel.mp3",
    label: "Kroky — štěrk (22 s, opakující se)",
    source: "freesound.org/people/AudioPapkin/sounds/712066/",
    license: "CC0",
    note: "Těžké monstrum — použít až pro budoucí typ nepřítele „gigant“.",
  },
];
