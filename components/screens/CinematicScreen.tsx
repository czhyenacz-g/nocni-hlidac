"use client";

import { useEffect, useState } from "react";
import { CinematicSceneId, getCinematicScene } from "@/content/cinematics";
import { audioManager } from "@/game/audio/audioManager";
import { useCopy } from "@/game/i18n/useTranslation";

interface CinematicScreenProps {
  sceneId: CinematicSceneId;
  onComplete: () => void;
}

// Obecná story/cinematic obrazovka (viz content/cinematics.ts) — velký
// zarámovaný obrázek + titulkový panel pod ním, klikání na responseLabel
// posouvá segmenty. `relative min-h-screen` (NE `fixed inset-0`) — stejný
// důvod jako u LeftWallView.tsx: app/play/page.tsx obaluje strom do
// `.atmosphere-root`, které má CSS `filter` (styles/atmosphere.css), a
// filter na předkovi dělá z něj containing block pro `position: fixed`
// potomky, takže by se fixed prvek nepřichytil k viewportu.
export default function CinematicScreen({ sceneId, onComplete }: CinematicScreenProps) {
  const COPY = useCopy();
  const scene = getCinematicScene(sceneId);
  const sceneText = COPY.cinematics[sceneId] as {
    title: string | null;
    segments: Record<string, { text: string; responseLabel: string }>;
  };
  const [segmentIndex, setSegmentIndex] = useState(0);
  const segment = scene?.segments[segmentIndex] ?? null;
  const segmentText = segment ? sceneText.segments[segment.id] : null;

  // Bezpečný fallback — neexistující/prázdná scéna nesmí zaseknout hru,
  // rovnou pokračuj dál (viz app/play/page.tsx, DeathScreen flow).
  useEffect(() => {
    if (!scene || scene.segments.length === 0) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // Volitelný doprovodný zvuk segmentu — čistě "best effort", mimo sdílený
  // AudioManager (ten je vázaný na registrované AUDIO_EVENTS, ne libovolné
  // per-segment cesty). Respektuje globální mute; chybějící soubor,
  // zakázané přehrání prohlížečem nebo jakákoliv jiná chyba se jen zaloguje
  // jako warning a scéna pokračuje dál beze změny.
  //
  // Cleanup (viz zadání "bug: doznívají předchozí dialogy, mluví přes
  // sebe") — bez tohohle by starý <audio> instance dál hrála nezávisle na
  // pozadí, i když hráč mezitím odkliknul další (nebo i několik dalších)
  // segmentů. React zavolá tenhle cleanup PŘED spuštěním efektu pro nový
  // segment (nebo při unmountu), takže staré přehrávání se vždy zastaví
  // dřív, než začne nové.
  useEffect(() => {
    if (!segment?.audioSrc || audioManager.isMuted()) return;
    let audio: HTMLAudioElement | null = null;
    try {
      audio = new Audio(segment.audioSrc);
      void audio.play().catch((err) => {
        console.warn("[CinematicScreen] segment audio failed to play", err);
      });
    } catch (err) {
      console.warn("[CinematicScreen] segment audio failed to play", err);
    }
    return () => {
      audio?.pause();
    };
  }, [segment?.audioSrc]);

  if (!scene || !segment || !segmentText) return null;

  function handleResponseClick() {
    if (!scene) return;
    if (segmentIndex + 1 < scene.segments.length) {
      setSegmentIndex((index) => index + 1);
    } else {
      onComplete();
    }
  }

  return (
    <main className="relative min-h-screen w-full bg-black flex flex-col items-center justify-center p-4 gap-4">
      <div className="relative w-full max-w-2xl aspect-video pixel-panel overflow-hidden bg-black">
        <img src={scene.imageSrc} alt="" className="absolute inset-0 h-full w-full object-contain" />
      </div>

      <div className="w-full max-w-2xl pixel-panel p-4">
        {sceneText.title && <div className="text-sm font-bold mb-2 text-red-500">{sceneText.title}</div>}
        <p className="text-sm text-gray-200 mb-4 min-h-[1.5rem]">{segmentText.text}</p>
        <button className="pixel-button tap-target px-4 py-2 text-xs w-full" onClick={handleResponseClick}>
          {segmentText.responseLabel}
        </button>
      </div>
    </main>
  );
}
