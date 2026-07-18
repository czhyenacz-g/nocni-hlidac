"use client";

import { useEffect, useMemo, useState } from "react";
import { COPY } from "@/content/copy";
import { selectLoadingHints } from "@/content/loadingHints";
import { LOADING_SCREEN_DURATION_MS, LOADING_SCREEN_HINT_COUNT } from "@/game/balancing/constants";
import { preloadBackgroundImages, BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { preloadCameraImages } from "@/game/cameras/cameraAssets.object13";
import { preloadGhoulCameraAttackAnimations } from "@/game/cameras/cameraAttackAnimation.object13";
import { getMonsterDefinition } from "@/game/enemies/monsterDefinitions";
import { NIGHT_01 } from "@/game/nights/night01";
import SceneBackground from "@/components/SceneBackground";
import { GameMode } from "@/game/core/gameMode";

interface LoadingScreenProps {
  /**
   * Zvolený režim (viz app/play/page.tsx#selectedGameModeRef — NE
   * state.gameMode, ten se zapisuje až v START_SHIFT, po loading obrazovce).
   * Jen pro "normal" se vypíše první řádek "Obtížnost NORMAL" (viz zadání) —
   * Hardcore zatím žádnou obdobu nemá.
   */
  gameMode: GameMode;
}

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
export default function LoadingScreen({ gameMode }: LoadingScreenProps) {
  const [hint] = useState(() => selectLoadingHints(LOADING_SCREEN_HINT_COUNT)[0]);
  const sentences = useMemo(() => (hint ? splitSentences(hint.text) : []), [hint]);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    preloadBackgroundImages();
    // Aktivní monstrum téhle směny (viz NightDefinition.enemy.id) — preload
    // je čistě výkonnostní věc (chybějící/neznámá prezentace jen znamená
    // pár chybějících obrázků v cache, ne rozbitý rendering), takže se tu
    // (na rozdíl od CameraView.tsx) nepadá, jen se preload pro kamery
    // přeskočí.
    const monster = getMonsterDefinition(NIGHT_01.enemy.id);
    if (monster) {
      preloadCameraImages(monster.presentation.camera, monster.presentation.cameraByEnemyStage);
    }
    preloadGhoulCameraAttackAnimations();
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

      {/* Stejný "terminál" obal jako MainMenuScreen.tsx (viz zadání "podobným
          způsobem uprav") — kovový rám + 4 šrouby + zapuštěná obrazovka.
          Tenhle screen už měl vlastní servisní titulek ("OBJEKT 13 —
          SERVISNÍ TERMINÁL"), takže dostane jen malou LED vedle něj, ne
          duplicitní hlavičkový proužek jako Briefing/MainMenu. */}
      <div className="w-full max-w-md menu-terminal-frame">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        <div className="menu-terminal-screen pixel-screen-static p-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-sm font-bold text-green-400">{COPY.loading.title}</h1>
            <span className="menu-terminal-led" aria-hidden="true" />
          </div>
          <p className="text-[10px] text-gray-500 mb-4">{COPY.loading.subtitle}</p>

          <div className="flex flex-col gap-1.5 text-xs text-gray-400 min-h-32">
            {gameMode === "normal" && (
              <p>
                <span className="text-green-500">{"> "}</span>
                {COPY.loading.difficultyNormalLabel}
              </p>
            )}
            <p>
              <span className="text-green-500">{"> "}</span>
              {sentences.slice(0, visibleCount).join(" ")}
              {visibleCount < sentences.length && <span className="text-green-500 animate-pulse"> _</span>}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
