"use client";

import { useEffect, useState } from "react";
import { Achievement } from "@/content/achievements";
import { COPY } from "@/content/copy";
import { ACHIEVEMENT_TOAST_TRANSITION_MS, ACHIEVEMENT_TOAST_VISIBLE_MS } from "@/game/balancing/constants";

interface AchievementToastProps {
  achievement: Achievement;
  /** Volané po doznění slide-out přechodu — rodič (app/play/page.tsx) na to má odmountovat toast (nastavit aktivní achievement na `null`). */
  onDismiss: () => void;
}

// Malý toast popup při odemčení achievementu (viz content/achievements.ts,
// game/core/achievementStorage.ts) — čistě vizuální vrstva, neblokuje
// klikání (`pointer-events-none`) a nevyžaduje žádnou interakci, sám zmizí.
// Renderuje se JAKO SOUROZENEC `.atmosphere-root` v app/play/page.tsx, ne
// jako jeho potomek — `.atmosphere-root` má trvalý CSS `filter`
// (styles/atmosphere.css) a filter na předkovi dělá z něj containing block
// pro `position: fixed` potomky (stejný gotcha jako u LeftWallView.tsx/
// CinematicScreen.tsx), takže by se toast jinak nepřichytil ke skutečnému
// rohu viewportu.
export default function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  // `visible` řídí jen inline transform/opacity — start na `false` (mimo
  // obrazovku vpravo), efekt ho hned po mountu přepne na `true` (slide-in),
  // pak zpátky na `false` (slide-out) těsně před odmountováním.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Dvojitý rAF, ne jen "requestAnimationFrame jednou" — první rAF ještě
    // stihne proběhnout ve stejném "před-paint" okně jako počáteční render
    // (visible: false by se nikdy reálně nevykreslil), takže by CSS
    // transition neměl odkud "najet" a toast by se jen objevil bez animace.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf2);
    });

    const hideTimer = setTimeout(() => setVisible(false), ACHIEVEMENT_TOAST_VISIBLE_MS);
    const removeTimer = setTimeout(
      () => onDismiss(),
      ACHIEVEMENT_TOAST_VISIBLE_MS + ACHIEVEMENT_TOAST_TRANSITION_MS,
    );

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed top-4 right-4 z-[100] pointer-events-none w-[calc(100%-2rem)] max-w-xs sm:w-80"
      style={{
        transition: `transform ${ACHIEVEMENT_TOAST_TRANSITION_MS}ms ease, opacity ${ACHIEVEMENT_TOAST_TRANSITION_MS}ms ease`,
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="pixel-panel p-3">
        <div className="text-[10px] text-gray-300 mb-1">{COPY.achievements.unlockedLabel}</div>
        <div className="text-sm font-bold mb-1">{achievement.title}</div>
        <div className="text-xs text-gray-400">{achievement.description}</div>
      </div>
    </div>
  );
}
