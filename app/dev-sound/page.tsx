"use client";

import { useState } from "react";
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_CONFIG } from "@/game/audio/audioConfig";
import { AudioEventId } from "@/game/audio/audioEvents";
import { DEBUG_PANEL_ENABLED } from "@/game/balancing/constants";
import { pickRandomMonsterRepelMessage } from "@/game/radio/monsterRepelRadioMessages";
import { MonsterRepelRadioResult } from "@/game/core/types";
import { SOUND_REGISTRY } from "./soundRegistry";

const MONSTER_REPEL_PREVIEW_BUTTONS: { result: MonsterRepelRadioResult; label: string }[] = [
  { result: "success", label: "Rádio / Sonické dělo / Náhodný úspěch" },
  { result: "stay", label: "Rádio / Sonické dělo / Náhodné setrvání" },
  { result: "fail", label: "Rádio / Sonické dělo / Náhodné selhání" },
];

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

  // Přehraje NÁHODNĚ vybranou variantu z jedné kategorie (viz zadání "tři
  // náhodné preview položky") — na rozdíl od handlePlay výše nejde o jeden
  // pevný AudioEventId (SOUND_REGISTRY je Record<AudioEventId, ...>, jedna
  // položka = jeden konkrétní soubor), takže je to samostatné tlačítko
  // MIMO hlavní tabulku, ne řádek navíc v ní. Pořád stejný audioManager,
  // žádný druhý dev přehrávač (viz zadání).
  function handlePlayRandomRepel(result: MonsterRepelRadioResult) {
    if (!initialized) {
      audioManager.init();
      setInitialized(true);
    }
    const message = pickRandomMonsterRepelMessage(result);
    if (message) audioManager.play(message.id);
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

      <h2 className="text-lg font-bold text-green-400 mt-8 mb-1">Rádio / Sonické dělo — náhodná varianta</h2>
      <p className="text-xs text-gray-500 mb-4">
        Přehraje jednu náhodně vybranou variantu z dané kategorie (viz{" "}
        <code className="text-gray-400">game/radio/monsterRepelRadioMessages.ts#pickRandomMonsterRepelMessage</code>) —
        stejná funkce, kterou při hraní volá{" "}
        <code className="text-gray-400">game/radio/useMonsterRepelRadioMessage.ts</code>.
      </p>
      <div className="flex gap-3 mb-4">
        {MONSTER_REPEL_PREVIEW_BUTTONS.map((button) => (
          <button
            key={button.result}
            className="pixel-button tap-target px-3 py-2 text-xs"
            onClick={() => handlePlayRandomRepel(button.result)}
          >
            ▶ {button.label}
          </button>
        ))}
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

      <h2 className="text-lg font-bold text-green-400 mt-8 mb-1">Kandidáti — siréna nouzového útěku (Freesound)</h2>
      <p className="text-xs text-gray-500 mb-4">
        Zatím nikam nezapojený kandidát na smyčku, která by nepřetržitě hrála po celou dobu
        nouzového útěku ven (viz{" "}
        <code className="text-gray-400">content/copy.ts</code> —{" "}
        <code className="text-gray-400">startEmergencyRunLabel</code>). Přehrávač níže je jen
        dev náhled, ne herní audio systém — žádné zapojení do{" "}
        <code className="text-gray-400">AUDIO_EVENTS</code>/<code className="text-gray-400">audioConfig.ts</code>{" "}
        zatím neproběhlo.
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
            {SIREN_SOUND_CANDIDATES.map((candidate) => (
              <tr key={candidate.file} className="border-b border-gray-800 align-top">
                <td className="p-2 text-amber-400 whitespace-nowrap">{candidate.label}</td>
                <td className="p-2 text-gray-500">{candidate.source}</td>
                <td className="p-2 text-gray-500 whitespace-nowrap">{candidate.license}</td>
                <td className="p-2 text-gray-500 max-w-xs">{candidate.note}</td>
                <td className="p-2">
                  <audio controls src={`/dev-sound-candidates/${candidate.file}`} className="h-8" />
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

const SIREN_SOUND_CANDIDATES = [
  {
    file: "siren/emergency_wail_loop_whelen.mp3",
    label: "Poplachová siréna — WAIL (11 s smyčka)",
    source: "freesound.org/people/theblockofsound235/sounds/172353/",
    license: "CC0",
    note: "Reálná siréna civilní ochrany (Whelen WPS-3016), WAIL tón (nahoru/dolů, opakovaně) — seamless smyčka, hodí se hrát nepřetržitě po dobu nouzového útěku.",
  },
];

const NEW_MONSTER_SOUND_CANDIDATES = [
  {
    file: "door_pound/door_knocking_angry.mp3",
    label: "Bušení na dveře",
    source: "freesound.org/people/Macif/sounds/194365/",
    license: "CC0",
  },
  // Původní 60s nahrávka rozřezaná (ffmpeg silencedetect) na 12 samostatných
  // řevů/zavrčení, ať jde každý poslechnout/vybrat zvlášť, ne jen jako jeden
  // dlouhý soubor s víc variantami za sebou. Zdroj/licence stejné jako celek.
  { file: "monster_roar/roar_01.mp3", label: "Řev monstra #1", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  { file: "monster_roar/roar_02.mp3", label: "Řev monstra #2", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  { file: "monster_roar/roar_03.mp3", label: "Řev monstra #3", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  { file: "monster_roar/roar_04.mp3", label: "Řev monstra #4", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  { file: "monster_roar/roar_05.mp3", label: "Řev monstra #5", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  { file: "monster_roar/roar_06.mp3", label: "Řev monstra #6", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  { file: "monster_roar/roar_07.mp3", label: "Řev monstra #7", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  { file: "monster_roar/roar_08.mp3", label: "Řev monstra #8", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  { file: "monster_roar/roar_09.mp3", label: "Řev monstra #9", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  {
    file: "monster_roar/roar_10.mp3",
    label: "Řev monstra #10 (delší, 10 s)",
    source: "freesound.org/people/Breviceps/sounds/479380/",
    license: "CC0",
  },
  { file: "monster_roar/roar_11.mp3", label: "Řev monstra #11", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  { file: "monster_roar/roar_12.mp3", label: "Řev monstra #12", source: "freesound.org/people/Breviceps/sounds/479380/", license: "CC0" },
  {
    file: "monster_roar/dragon_roars_growls_snarls.mp3",
    label: "Řev monstra — celá nahrávka (60 s, referenční)",
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
  // Lidské kroky (ne monstrum, ne gigant) — kandidáti pro současného nepřítele.
  {
    file: "footsteps_human/footsteps_concrete_inspectorj.mp3",
    label: "Kroky — člověk, beton (40 s)",
    source: "freesound.org/people/InspectorJ/sounds/336598/",
    license: "CC BY 4.0",
    note: "Vyžaduje atribuci v CREDITS.md, pokud se použije. Tvrdší podpatek na betonu.",
  },
  {
    file: "footsteps_human/footsteps_stone_securesubset.mp3",
    label: "Kroky — člověk, kámen (7 s)",
    source: "freesound.org/people/SecureSubset/sounds/813622/",
    license: "CC0",
  },
];
