"use client";

import { useEffect, useMemo, useState } from "react";
import { COPY } from "@/content/copy";
import { selectLoadingHints } from "@/content/loadingHints";
import { LOADING_SCREEN_DURATION_MS, LOADING_SCREEN_HINT_COUNT } from "@/game/balancing/constants";
import { preloadBackgroundImages, BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { preloadCameraImages } from "@/game/cameras/cameraAssets.object13";
import SceneBackground from "@/components/SceneBackground";

// Rozdělí hint na věty (podle .!? následovaného mezerou/koncem) — LoadingScreen
// ukazuje vždy jen JEDEN hint, ne víc různých najednou, ale pokud má dvě věty,
// odhalí je postupně (nejdřív první, pak druhou), stejným tempem jako dřív
// jednotlivé hinty.
function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+(?:\s+|$)/g);
  return matches ? matches.map((sentence) => sentence.trim()) : [text];
}

// Falešný briefing screen mezi hlavním menu a startem směny — žádné skutečné
// technické načítání navenek, ale skutečně stáhne pozadí obrazovek i kamerové
// snímky do cache prohlížeče (viz preloadBackgroundImages, preloadCameraImages),
// ať se pak zobrazí okamžitě i při zhoršeném připojení později ve směně.
// Atmosférický servisní terminál Objektu 13 zatím nejde přeskočit (viz TODO.md).
export default function LoadingScreen() {
  const [hint] = useState(() => selectLoadingHints(LOADING_SCREEN_HINT_COUNT)[0]);
  const sentences = useMemo(() => (hint ? splitSentences(hint.text) : []), [hint]);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    preloadBackgroundImages();
    preloadCameraImages();
  }, []);

  useEffect(() => {
    if (sentences.length === 0) return;
    const stepMs = LOADING_SCREEN_DURATION_MS / sentences.length;
    const interval = setInterval(() => {
      setVisibleCount((count) => Math.min(count + 1, sentences.length));
    }, stepMs);
    return () => clearInterval(interval);
  }, [sentences]);

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4">
      <SceneBackground scene={BACKGROUND_SCENES.loading} />

      <div className="w-full max-w-md pixel-panel pixel-screen-static p-6">
        <h1 className="text-sm font-bold text-green-400 mb-1">{COPY.loading.title}</h1>
        <p className="text-[10px] text-gray-500 mb-4">{COPY.loading.subtitle}</p>

        <div className="flex flex-col gap-1.5 text-xs text-gray-400 min-h-32">
          <p>
            <span className="text-green-500">{"> "}</span>
            {sentences.slice(0, visibleCount).join(" ")}
            {visibleCount < sentences.length && <span className="text-green-500 animate-pulse"> _</span>}
          </p>
        </div>
      </div>
    </main>
  );
}
