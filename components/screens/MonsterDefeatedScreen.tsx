"use client";

import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/game/i18n/useTranslation";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { audioManager } from "@/game/audio/audioManager";
import { PlayerAchievement } from "@/game/core/playerAchievements";
import AchievementResultPanel from "@/components/achievements/AchievementResultPanel";
import {
  MONSTER_DEFEATED_CINEMATIC_AUDIO_SRC,
  MONSTER_DEFEATED_CINEMATIC_CAPTIONS,
  MONSTER_DEFEATED_CINEMATIC_DURATION_MS,
  resolveActiveCaptionIndex,
} from "@/content/monsterDefeatedCinematic";

interface MonsterDefeatedScreenProps {
  onGoToMenu: () => void;
  /**
   * Zavolá se PŘESNĚ jednou, hned jak cinematic doběhne (nebo ho hráč
   * přeskočí) — app/play/page.tsx na to naváže `recordMonsterDefeat()`
   * (viz game/core/monsterDefeatReward.ts). Odměna se ukládá TADY, ne při
   * pouhém vstupu na tuhle obrazovku, ať se true ending reward počítá až
   * po skutečně dokončeném/potvrzeném zážitku.
   */
  onCinematicComplete?: () => void;
  /**
   * Achievementy nově odemčené touhle výhrou (viz zadání "Napojit
   * achievementy na výsledkové obrazovky", game/core/achievementResultUnlocks.ts)
   * — vyhodnocené app/play/page.tsx#handleMonsterDefeatedCinematicComplete
   * PŘED prvním renderem téhle obrazovky, takže tenhle prop je od začátku
   * hotový. Zobrazí se AŽ VE VÝSLEDKOVÉ ČÁSTI (po `cinematicDone`), nikdy
   * přes timed captions cinematicu.
   */
  newlyUnlockedAchievements?: PlayerAchievement[];
}

// Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — 10
// potvrzených zásahů monstra brokovnicí za jednu noc. Dvě fáze: nejdřív
// timed-caption cinematic (dead_monster_1.m4a + content/monsterDefeatedCinematic.ts),
// pak (po dokončení/přeskočení) stejný "pixel-panel přes SceneBackground"
// obsah jako dřív (title/subtitle/body/backToMenuButton). Bez bg-* na
// <main> — viz stejná poznámka v MainMenuScreen.tsx (main by jinak vlastním
// pozadím zakryl SceneBackground potomka s -z-10).
//
// Důležitá designová volba (viz zadání "po tom skončí cinematic, tak se má
// dojet klasicky den" — vyjasněno v reportu): tahle obrazovka je KONEC
// směny, ne mezikrok před pokračováním běžné hry. `gameReducer.ts#CONFIRM_MONSTER_HIT`
// na 10. zásahu nastaví `isRunning: false` a `screen: "monsterDefeated"`
// přímo — hlavní herní smyčka (TICK/ENEMY_ADVANCE) se tak už nikdy
// nevyhodnotí znovu, dokud hráč nezvolí "ZPĚT DO MENU" a nezačne novou
// směnu. Bezpečnější a architektonicky čistší než nechat den doběhnout na
// pozadí (žádné riziko, že by "vypnutý" monster loop omylem zůstal
// vyhodnocovaný a hráče po vítězství zabil).
export default function MonsterDefeatedScreen({
  onGoToMenu,
  onCinematicComplete,
  newlyUnlockedAchievements = [],
}: MonsterDefeatedScreenProps) {
  const COPY = useCopy();
  const [cinematicDone, setCinematicDone] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const doneRef = useRef(false);

  function finishCinematic() {
    if (doneRef.current) return;
    doneRef.current = true;
    setCinematicDone(true);
    onCinematicComplete?.();
  }

  // Přehrání dead_monster_1.m4a — stejný "best effort" vzor jako
  // CinematicScreen.tsx (mimo sdílený AudioManager/AUDIO_EVENTS, respektuje
  // globální mute, chybějící soubor/zakázané přehrání scénu nikdy nezasekne
  // — timeupdate/ended jen aktualizují titulky/dokončení, samotné
  // dokončení má navíc nezávislý setTimeout fallback níže).
  useEffect(() => {
    if (audioManager.isMuted()) return;
    let audio: HTMLAudioElement;
    try {
      audio = new Audio(MONSTER_DEFEATED_CINEMATIC_AUDIO_SRC);
    } catch (err) {
      console.warn("[MonsterDefeatedScreen] cinematic audio failed to load", err);
      return;
    }
    audioRef.current = audio;

    function handleTimeUpdate() {
      setElapsedMs(audio.currentTime * 1000);
    }
    function handleEnded() {
      finishCinematic();
    }

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    void audio.play().catch((err) => {
      console.warn("[MonsterDefeatedScreen] cinematic audio failed to play", err);
    });

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bezpečnostní fallback nezávislý na audio elementu — pokud se zvuk
  // nepodaří přehrát vůbec (mute, chybějící soubor, autoplay blokovaný
  // prohlížečem), titulky se dál posouvají čistě podle "wall clock" časovače
  // a cinematic se stejně dokončí po MONSTER_DEFEATED_CINEMATIC_DURATION_MS,
  // ať hráč nikdy nezůstane zaseknutý na téhle obrazovce.
  useEffect(() => {
    if (audioManager.isMuted()) {
      const start = Date.now();
      const interval = setInterval(() => setElapsedMs(Date.now() - start), 200);
      const timeout = setTimeout(finishCinematic, MONSTER_DEFEATED_CINEMATIC_DURATION_MS);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
    const timeout = setTimeout(finishCinematic, MONSTER_DEFEATED_CINEMATIC_DURATION_MS + 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSkip() {
    audioRef.current?.pause();
    finishCinematic();
  }

  const activeCaptionIndex = resolveActiveCaptionIndex(MONSTER_DEFEATED_CINEMATIC_CAPTIONS, elapsedMs);
  const activeCaption =
    activeCaptionIndex !== null
      ? COPY.monsterDefeatedCinematicCaptions[
          MONSTER_DEFEATED_CINEMATIC_CAPTIONS[activeCaptionIndex].id as keyof typeof COPY.monsterDefeatedCinematicCaptions
        ]
      : "";

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <SceneBackground scene={BACKGROUND_SCENES.monsterDefeated} />

      {!cinematicDone ? (
        <div className="w-full max-w-md text-center pixel-panel p-8 relative z-10">
          <p className="text-sm text-gray-200 min-h-[4.5rem] flex items-center justify-center">{activeCaption}</p>
          <button className="pixel-button tap-target px-6 py-3 text-sm w-full mt-8" onClick={handleSkip}>
            {COPY.monsterDefeated.skipCinematicLabel}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md text-center pixel-panel p-8 relative z-10">
          <h1 className="text-3xl font-bold mb-1 text-red-500">{COPY.monsterDefeated.title}</h1>
          <p className="text-sm text-gray-400 mb-6">{COPY.monsterDefeated.subtitle}</p>
          <p className="text-sm text-gray-200 whitespace-pre-line mb-8">{COPY.monsterDefeated.body}</p>
          <AchievementResultPanel achievements={newlyUnlockedAchievements} />
          <button className="pixel-button tap-target px-6 py-3 text-sm w-full mt-6" onClick={onGoToMenu}>
            {COPY.monsterDefeated.backToMenuButton}
          </button>
        </div>
      )}
    </main>
  );
}
