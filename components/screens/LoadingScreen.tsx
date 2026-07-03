"use client";

import { useEffect, useState } from "react";
import { COPY } from "@/content/copy";
import { selectLoadingHints } from "@/content/loadingHints";
import { LOADING_SCREEN_DURATION_MS, LOADING_SCREEN_HINT_COUNT } from "@/game/balancing/constants";
import { preloadBackgroundImages } from "@/game/visuals/backgroundImages";

// Falešný briefing screen mezi hlavním menu a startem směny — žádné skutečné
// technické načítání navenek, ale skutečně stáhne pozadí obrazovek do cache
// prohlížeče (viz preloadBackgroundImages), ať se pak zobrazí okamžitě i při
// zhoršeném připojení později ve směně. Atmosférický servisní terminál
// Objektu 13 zatím nejde přeskočit (viz TODO.md).
export default function LoadingScreen() {
  const [hints] = useState(() => selectLoadingHints(LOADING_SCREEN_HINT_COUNT));
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    preloadBackgroundImages();
  }, []);

  useEffect(() => {
    if (hints.length === 0) return;
    const stepMs = LOADING_SCREEN_DURATION_MS / hints.length;
    const interval = setInterval(() => {
      setVisibleCount((count) => Math.min(count + 1, hints.length));
    }, stepMs);
    return () => clearInterval(interval);
  }, [hints]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md pixel-panel pixel-screen-static p-6">
        <h1 className="text-sm font-bold text-green-400 mb-1">{COPY.loading.title}</h1>
        <p className="text-[10px] text-gray-500 mb-4">{COPY.loading.subtitle}</p>

        <div className="flex flex-col gap-1.5 text-xs text-gray-400 min-h-32">
          {hints.slice(0, visibleCount).map((hint) => (
            <p key={hint.id}>
              <span className="text-green-500">{"> "}</span>
              {hint.text}
            </p>
          ))}
          {visibleCount < hints.length && <span className="text-green-500 animate-pulse">{"> _"}</span>}
        </div>
      </div>
    </main>
  );
}
