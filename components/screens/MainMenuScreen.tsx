"use client";

import { useState } from "react";
import Link from "next/link";
import { COPY } from "@/content/copy";
import Footer from "@/components/Footer";
import SceneBackground from "@/components/SceneBackground";
import AuthStatus from "@/components/auth/AuthStatus";
import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { DEFAULT_GAME_MODE, GameMode } from "@/game/core/gameMode";

interface MainMenuScreenProps {
  /** Dostane zvolený režim (viz gameMode state níže) — zatím jen UI příprava, žádná death/leaderboard logika se pro "hardcore" ještě neliší (viz game/core/gameMode.ts). */
  onStart: (gameMode: GameMode) => void;
}

export default function MainMenuScreen({ onStart }: MainMenuScreenProps) {
  const [gameMode, setGameMode] = useState<GameMode>(DEFAULT_GAME_MODE);
  // Zobrazí se jen po kliknutí na HARDCORE bez Discord přihlášení (viz
  // handleSelectHardcore) — dokud hráč nezvolí "Zůstat v Normal" nebo se
  // nepřihlásí (a klikne znovu), gameMode zůstává "normal".
  const [showHardcoreLoginPrompt, setShowHardcoreLoginPrompt] = useState(false);
  const authStatus = useAuthStatus();

  function handleSelectNormal() {
    setGameMode("normal");
    setShowHardcoreLoginPrompt(false);
  }

  function handleSelectHardcore() {
    if (authStatus.status === "authenticated") {
      setGameMode("hardcore");
      setShowHardcoreLoginPrompt(false);
      return;
    }
    // Nepřihlášený hráč — NEvybírat hardcore potichu, jen zobrazit výzvu.
    // gameMode zůstává "normal" (nebo cokoliv bylo zvolené předtím).
    setShowHardcoreLoginPrompt(true);
  }

  // Bez bg-* třídy na <main> záměrně — main nezakládá vlastní stacking context
  // (žádný z-index/opacity/transform), takže vlastní background-color by se
  // vykreslil PŘED (nad) SceneBackground potomkem s -z-10 a úplně by ho
  // zakryl. <body> má bg-gray-900 jako fallback, což stačí.
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <SceneBackground scene={BACKGROUND_SCENES.menu} />

      {/* Menu jako fyzický "terminál" (viz zadání "control-room konzole, ne
          plakát") — kovový rám (.menu-terminal-frame) se 4 rohovými šrouby
          (reuse .camera-monitor-screw z kamerového redesignu), uvnitř
          zapuštěná "obrazovka" (.menu-terminal-screen) s hlavičkovým
          proužkem (LED + label) a scanline nádechem (.pixel-screen-static).
          Samotný obsah/copy/logika beze změny, jen nový obal. */}
      <div className="w-full max-w-md menu-terminal-frame">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        <div className="menu-terminal-screen pixel-screen-static">
          <div className="menu-terminal-header">
            <span>Objekt 13 · Terminál směny</span>
            <span className="menu-terminal-led" aria-hidden="true" />
          </div>

          <div className="text-center p-6 md:p-8">
            <h1 className="text-3xl font-bold mb-1 text-red-500">{COPY.menu.title}</h1>
            <p className="text-gray-400 mb-6">{COPY.menu.subtitle}</p>
            <p className="text-sm text-gray-500 mb-8">{COPY.menu.intro}</p>

            <button className="pixel-button tap-target px-6 py-3 text-sm w-full" onClick={() => onStart(gameMode)}>
              {COPY.menu.startButton}
            </button>

            {/* Výběr režimu — výraznější než spodní odkazy, ale menší než
                hlavní tlačítko (viz zadání). Vybraný režim čte existující
                .pixel-button data-active stav (stejný "červený zvýrazněný"
                vzor jako jinde v projektu, žádný nový styl navíc). */}
            <div className="flex gap-2 mt-4">
              <div className="group relative flex-1">
                <button
                  className="pixel-button tap-target px-3 py-1.5 text-xs w-full"
                  data-active={gameMode === "normal"}
                  onClick={handleSelectNormal}
                >
                  {COPY.gameMode.normalLabel}
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 w-56 -translate-x-1/2 rounded-none border border-gray-600 bg-gray-900/95 p-2 text-[10px] text-gray-300 opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100">
                  {COPY.gameMode.normalTooltip}
                </div>
              </div>
              <div className="group relative flex-1">
                <button
                  className="pixel-button tap-target px-3 py-1.5 text-xs w-full"
                  data-active={gameMode === "hardcore"}
                  onClick={handleSelectHardcore}
                >
                  {COPY.gameMode.hardcoreLabel}
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 w-56 -translate-x-1/2 rounded-none border border-gray-600 bg-gray-900/95 p-2 text-[10px] text-gray-300 opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100">
                  {COPY.gameMode.hardcoreTooltip}
                </div>
              </div>
            </div>

            {showHardcoreLoginPrompt && (
              <div className="mt-3 border border-gray-600 bg-gray-900/80 p-3 text-left text-[11px] text-gray-300">
                <p className="mb-2">{COPY.gameMode.hardcoreLoginPromptText}</p>
                <div className="flex gap-2">
                  <a href="/api/auth/login" className="pixel-button tap-target flex-1 px-2 py-1.5 text-center text-[10px]">
                    {COPY.auth.discordLoginLabel}
                  </a>
                  <button
                    className="pixel-button tap-target flex-1 px-2 py-1.5 text-[10px]"
                    onClick={() => setShowHardcoreLoginPrompt(false)}
                  >
                    {COPY.gameMode.hardcoreLoginPromptStayNormalLabel}
                  </button>
                </div>
              </div>
            )}

            {/* Jemný oddělovač mezi volbou režimu a informačními odkazy níže. */}
            <div className="my-4 border-t border-gray-700" />

            <Link href="/terms" className="block text-center text-[11px] text-gray-400 hover:text-gray-200">
              {COPY.menu.termsLinkLabel}
            </Link>

            <Link href="/leaderboard" className="block mt-1.5 text-center text-[11px] text-gray-400 hover:text-gray-200">
              {COPY.menu.leaderboardLinkLabel}
            </Link>

            <AuthStatus />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <Footer />
      </div>
    </main>
  );
}
