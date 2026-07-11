"use client";

import { useEffect, useState } from "react";
import { CinematicSceneId, getCinematicScene } from "@/content/cinematics";
import { audioManager } from "@/game/audio/audioManager";
import { PlayerAchievement } from "@/game/core/playerAchievements";
import AchievementResultPanel from "@/components/achievements/AchievementResultPanel";

interface CinematicScreenProps {
  sceneId: CinematicSceneId;
  onComplete: () => void;
  /**
   * Achievementy nově odemčené událostí, kterou tenhle cinematic uvádí (viz
   * zadání "Valhala cinematic je finální obrazovka, DeathScreen se po ní už
   * nezobrazí") — volitelné, zobrazí se přes existující AchievementResultPanel
   * jen u POSLEDNÍHO segmentu, ať nepřekáží dřív, než hráč scénu dočte.
   * Vyhodnocení samotné (evaluateResultAchievements) proběhlo dřív a jen
   * jednou v app/play/page.tsx — tenhle prop ho jen zobrazuje, nevyhodnocuje.
   */
  newlyUnlockedAchievements?: PlayerAchievement[];
}

// Obecná story/cinematic obrazovka (viz content/cinematics.ts) — velký
// zarámovaný obrázek + titulkový panel pod ním, klikání na responseLabel
// posouvá segmenty. `relative min-h-screen` (NE `fixed inset-0`) — stejný
// důvod jako u LeftWallView.tsx: app/play/page.tsx obaluje strom do
// `.atmosphere-root`, které má CSS `filter` (styles/atmosphere.css), a
// filter na předkovi dělá z něj containing block pro `position: fixed`
// potomky, takže by se fixed prvek nepřichytil k viewportu.
export default function CinematicScreen({ sceneId, onComplete, newlyUnlockedAchievements = [] }: CinematicScreenProps) {
  const scene = getCinematicScene(sceneId);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const segment = scene?.segments[segmentIndex] ?? null;

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
  useEffect(() => {
    if (!segment?.audioSrc || audioManager.isMuted()) return;
    try {
      const audio = new Audio(segment.audioSrc);
      void audio.play().catch((err) => {
        console.warn("[CinematicScreen] segment audio failed to play", err);
      });
    } catch (err) {
      console.warn("[CinematicScreen] segment audio failed to play", err);
    }
  }, [segment?.audioSrc]);

  if (!scene || !segment) return null;

  const isLastSegment = segmentIndex === scene.segments.length - 1;

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
        {scene.title && <div className="text-sm font-bold mb-2 text-red-500">{scene.title}</div>}
        <p className="text-sm text-gray-200 mb-4 min-h-[1.5rem]">{segment.text}</p>
        {isLastSegment && newlyUnlockedAchievements.length > 0 && (
          <div className="mb-4">
            <AchievementResultPanel achievements={newlyUnlockedAchievements} />
          </div>
        )}
        {segment.responseLabel && (
          <button className="pixel-button tap-target px-4 py-2 text-xs w-full" onClick={handleResponseClick}>
            {segment.responseLabel}
          </button>
        )}
      </div>
    </main>
  );
}
