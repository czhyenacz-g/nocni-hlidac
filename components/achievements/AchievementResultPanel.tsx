"use client";

import { useEffect, useRef } from "react";
import { useCopy } from "@/game/i18n/useTranslation";
import { PlayerAchievement } from "@/game/core/playerAchievements";
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_EVENTS } from "@/game/audio/audioEvents";

export type AchievementResultPanelProps = {
  achievements: PlayerAchievement[];
};

// Sdílený panel "nová dosažení" pro výsledkové obrazovky (viz zadání
// "Napojit achievementy na výsledkové obrazovky") — DeathScreen.tsx/
// WinScreen.tsx/MonsterDefeatedScreen.tsx ho jen vykreslí s hotovým
// seznamem, veškerá logika "co je nově odemčené" žije v
// game/core/achievementResultUnlocks.ts (volající, app/play/page.tsx).
// Žádný vlastní timer — na rozdíl od AchievementToast.tsx tahle sekce
// nemizí sama, zůstává, dokud hráč neodejde z výsledkové obrazovky.
export default function AchievementResultPanel({ achievements }: AchievementResultPanelProps) {
  const COPY = useCopy();
  // Zvuk hraje NEJVÝŠ jednou za mount, bez ohledu na to, kolik achievementů
  // se zobrazí najednou (viz zadání "nepřehrávej zvuk jednou za každý
  // achievement") — ref místo effect-dependency na `achievements.length`,
  // ať by ani re-render se stejným (nebo jiným) neprázdným polem zvuk
  // nezopakoval.
  const playedRef = useRef(false);

  useEffect(() => {
    if (achievements.length === 0 || playedRef.current) return;
    playedRef.current = true;
    audioManager.play(AUDIO_EVENTS.achievementUnlock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (achievements.length === 0) return null;

  return (
    <section className="pixel-panel p-3 mt-4 text-left" aria-label={COPY.achievements.newResultsHeading}>
      <div className="text-[10px] uppercase tracking-wide text-gray-300 mb-2">{COPY.achievements.newResultsHeading}</div>
      <div className="flex flex-col gap-2">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="flex items-start gap-2">
            <span className="shrink-0 text-gray-300 text-sm font-bold" aria-hidden="true">
              {COPY.profile.achievementUnlockedMark}
            </span>
            <div>
              <div className="text-sm font-bold text-gray-200">{achievement.title}</div>
              <div className="text-xs text-gray-400">{achievement.description}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
