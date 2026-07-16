"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COPY } from "@/content/copy";
import Footer from "@/components/Footer";
import SceneBackground from "@/components/SceneBackground";
import AuthStatus from "@/components/auth/AuthStatus";
import { useAuthStatus } from "@/components/auth/useAuthStatus";
import { useObject13PlayerProfile } from "@/components/playerProfile/Object13PlayerProfileProvider";
import { BACKGROUND_SCENES, SceneBackgroundConfig } from "@/game/visuals/backgroundImages";
import { DEFAULT_GAME_MODE, GameMode } from "@/game/core/gameMode";
import ConsoleIcon from "@/components/game/ConsoleIcon";
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_EVENTS } from "@/game/audio/audioEvents";
import { getMonsterDefeatReward } from "@/game/core/monsterDefeatReward";
import { MainMenuBackgroundKind, resolveMainMenuBackground } from "@/game/visuals/mainMenuBackground";

// Mapování čistého výsledku resolveMainMenuBackground na skutečnou scénu
// (viz game/visuals/backgroundImages.ts) — samo o sobě žádná rozhodovací
// logika, ta je celá v resolveMainMenuBackground.
const MAIN_MENU_BACKGROUND_SCENE: Record<MainMenuBackgroundKind, SceneBackgroundConfig> = {
  default: BACKGROUND_SCENES.menu,
  login: BACKGROUND_SCENES.menuLogin,
  post_monster: BACKGROUND_SCENES.menuFirstWin,
};

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
  // Zobrazí se, když je hráč přihlášený, ale jeho Object13PlayerProfile
  // není `ready` (VPS výpadek/ještě se načítá) — Hardcore run je server-
  // authoritative pro inventář, proto se v tomhle stavu vůbec nesmí spustit
  // (viz zadání "profilový kontrakt V1 + inventář žárovek", "15. Výpadek
  // VPS během Hardcore"). Training a anonymní hra zůstávají dostupné beze
  // změny.
  const [showHardcoreProfileUnavailablePrompt, setShowHardcoreProfileUnavailablePrompt] = useState(false);
  const authStatus = useAuthStatus();
  const object13Profile = useObject13PlayerProfile();
  // Rozehraná Hardcore šňůra (viz zadání "poznat rozehranou hru... hardcore
  // hráč přežije 4 noci, zavře PC, druhý den chce pokračovat") — `currentRun`
  // je počet po sobě dokončených nocí ze serveru (viz useAuthStatus.ts,
  // lib/leaderboard/types.ts#GuardRunState), `0` znamená "naposledy umřel /
  // ještě nezačal", ne "rozehráno". `null` (hub API nedostupné) se počítá
  // jako "žádná rozehraná hra", ne jako falešné uzamčení Normal.
  const currentHardcoreRun = authStatus.status === "authenticated" ? authStatus.player.currentRun : null;
  const hasActiveHardcoreRun = typeof currentHardcoreRun === "number" && currentHardcoreRun > 0;
  const upcomingHardcoreNight = typeof currentHardcoreRun === "number" && currentHardcoreRun > 0 ? currentHardcoreRun + 1 : null;

  // Jakmile se potvrdí rozehraná Hardcore šňůra, mód se sám přepne na
  // Hardcore (viz zadání "hardcore tlačítko/mod nastaven jako aktivní") —
  // Normal je v tu chvíli stejně uzamčený (viz handleSelectNormal/JSX níže),
  // takže se tenhle efekt nemá s čím prát o uživatelovu volbu.
  useEffect(() => {
    if (hasActiveHardcoreRun) setGameMode("hardcore");
  }, [hasActiveHardcoreRun]);
  // True ending odměna (viz zadání, game/core/monsterDefeatReward.ts) — čte se
  // jednou při mountu, stejný vzor jako survivedNights/deathCount v
  // app/play/page.tsx. MainMenuScreen se znovu mountuje pokaždé, když
  // state.screen přejde na "menu" (viz app/play/page.tsx), takže hodnota je
  // vždy čerstvá po "ZPĚT DO MENU" z MonsterDefeatedScreen.
  const [reward] = useState(() => getMonsterDefeatReward());
  // Viz game/visuals/mainMenuBackground.ts — priorita post_monster > login >
  // default, "přihlášený přes Discord" == authStatus.status === "authenticated"
  // (stejná podmínka jako všude jinde v týhle komponentě).
  const menuBackground = resolveMainMenuBackground({
    isDiscordLoggedIn: authStatus.status === "authenticated",
    hasDefeatedMonster: reward.hasDefeatedMonster,
    doubleBarrelUnlocked: reward.doubleBarrelUnlocked,
  });
  // "Zlatý hlídač" (viz zadání) — stejné pravidlo jako post_monster pozadí
  // výše (hasDefeatedMonster NEBO doubleBarrelUnlocked), znovupoužité místo
  // duplicitní podmínky — nahrazuje úvodní větu, dřívější samostatný
  // veteranStatus panel (Status hlídače/Odměna/Bestie byla poražena) se pro
  // tyhle hráče už nezobrazuje vůbec.
  const isGoldenGuard = menuBackground === "post_monster";

  // Hardcore je vybraný, ale profil není `ready` (viz zadání "15. Výpadek
  // VPS během Hardcore") — může nastat i BEZ ručního kliknutí na HARDCORE
  // (viz hasActiveHardcoreRun efekt výše, který gameMode nastaví na
  // "hardcore" automaticky), takže se kontroluje na aktuálním `gameMode`,
  // ne jen uvnitř handleSelectHardcore.
  const hardcoreBlockedByProfile = gameMode === "hardcore" && object13Profile.loadState.status !== "ready";

  // NORMAL/HARDCORE i "Zůstat v Normal" jsou čistě lokální stav (žádný
  // dispatch do app/play/page.tsx, kde normálně žije audio pro ostatní
  // tlačítka) — proto tady volají audioManager přímo, přesně jak to
  // CLAUDE.md dovoluje ("komponenty volají jen audioManager.play(...)").
  // audioManager.init() je bezpečné volat opakovaně (no-op po prvním
  // spuštění), potřeba tu je, protože klik na NORMAL/HARDCORE může být
  // úplně první interakce hráče se stránkou, ještě před "NASTOUPIT NA
  // SMĚNU" (ten init() volá taky, viz handleStart v app/play/page.tsx).
  function handleSelectNormal() {
    // Uzamčeno, dokud běží Hardcore šňůra (viz hasActiveHardcoreRun výše,
    // zadání "na normal nepůjde kliknout") — žádný zvuk ani změna gameMode,
    // jen tooltip (viz JSX níže) vysvětlí proč.
    if (hasActiveHardcoreRun) return;
    audioManager.init();
    audioManager.play(AUDIO_EVENTS.uiClick);
    setGameMode("normal");
    setShowHardcoreLoginPrompt(false);
    setShowHardcoreProfileUnavailablePrompt(false);
  }

  function handleSelectHardcore() {
    audioManager.init();
    // Vlastní zvuk místo obyčejného uiClick (viz zadání "Řev monstra #8") —
    // volba nejtěžšího režimu má mít výraznější odezvu, hraje i když se
    // nakonec jen zobrazí login/profile prompt (viz stavy níže).
    audioManager.play(AUDIO_EVENTS.hardcoreSelectRoar);
    if (authStatus.status === "authenticated") {
      if (object13Profile.loadState.status !== "ready") {
        // Profil se ještě načítá nebo je VPS nedostupné — Hardcore se
        // nesmí spustit v nejasném offline režimu (server-authoritative
        // inventář). gameMode zůstává, co bylo předtím.
        setShowHardcoreProfileUnavailablePrompt(true);
        setShowHardcoreLoginPrompt(false);
        return;
      }
      setGameMode("hardcore");
      setShowHardcoreLoginPrompt(false);
      setShowHardcoreProfileUnavailablePrompt(false);
      return;
    }
    // Nepřihlášený hráč — NEvybírat hardcore potichu, jen zobrazit výzvu.
    // gameMode zůstává "normal" (nebo cokoliv bylo zvolené předtím).
    setShowHardcoreLoginPrompt(true);
    setShowHardcoreProfileUnavailablePrompt(false);
  }

  // Bez bg-* třídy na <main> záměrně — main nezakládá vlastní stacking context
  // (žádný z-index/opacity/transform), takže vlastní background-color by se
  // vykreslil PŘED (nad) SceneBackground potomkem s -z-10 a úplně by ho
  // zakryl. <body> má bg-gray-900 jako fallback, což stačí.
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <SceneBackground scene={MAIN_MENU_BACKGROUND_SCENE[menuBackground]} />

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
            {/* Zlatý hlídač (viz isGoldenGuard výše) dostává jinou úvodní
                větu místo dřívějšího samostatného status panelu — žádný
                zvláštní blok navíc, jen jiný text na stejném místě. */}
            <p className="text-sm text-gray-500 mb-8">{isGoldenGuard ? COPY.menu.goldenGuardIntro : COPY.menu.intro}</p>

            {/* Dokud visí hardcoreLoginPrompt (nepřihlášený hráč klikl na
                HARDCORE), nejde nastoupit na směnu vůbec — ani do Normal
                (ten jde zvolit jen explicitním kliknutím na NORMAL tlačítko
                níže, které prompt samo zavře). Skutečné `disabled`, ne jen
                ztlumený vzhled — dokud hráč neřekne, který mód chce, není co
                spouštět. Stejně tak `hardcoreBlockedByProfile` (viz výše) —
                Hardcore je vybraný, ale profil není `ready`. */}
            <button
              className={`pixel-button console-button console-button--primary tap-target px-6 py-3 text-sm w-full ${
                showHardcoreLoginPrompt || hardcoreBlockedByProfile ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={showHardcoreLoginPrompt || hardcoreBlockedByProfile}
              onClick={() => onStart(gameMode)}
            >
              {reward.doubleBarrelUnlocked ? COPY.menu.startButtonVeteran : COPY.menu.startButton}
              {upcomingHardcoreNight !== null &&
                ` ${COPY.menu.startButtonNightSuffix.replace("{night}", String(upcomingHardcoreNight))}`}
            </button>

            {/* Výběr režimu — výraznější než spodní odkazy, ale menší než
                hlavní tlačítko (viz zadání). Vybraný režim čte existující
                .pixel-button data-active stav (stejný "červený zvýrazněný"
                vzor jako jinde v projektu — ikonový blok ho teď taky
                odráží, viz styles/pixel.css #console-icon-block[data-active]).
                Normal je uzamčený, dokud běží Hardcore šňůra (viz
                hasActiveHardcoreRun) — aria-disabled + ztlumený vzhled, ale
                POŘÁD skutečné tlačítko (ne `disabled` atribut), ať tooltip i
                tap-to-focus fungují stejně jako u ostatních (group-focus-within
                níže pokrývá i dotykové zařízení bez hoveru). */}
            <div className="flex gap-2 mt-4">
              <div className="group relative flex-1">
                <button
                  className={`pixel-button console-button tap-target px-3 py-1.5 text-xs w-full ${
                    hasActiveHardcoreRun ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  data-active={gameMode === "normal"}
                  aria-disabled={hasActiveHardcoreRun}
                  onClick={handleSelectNormal}
                >
                  {COPY.gameMode.normalLabel}
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 w-56 -translate-x-1/2 rounded-none border border-gray-600 bg-gray-900/95 p-2 text-[10px] text-gray-300 opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100 whitespace-pre-line">
                  {hasActiveHardcoreRun ? COPY.gameMode.normalLockedTooltip : COPY.gameMode.normalTooltip}
                </div>
              </div>
              <div className="group relative flex-1">
                <button
                  className="pixel-button console-button tap-target flex items-center justify-center gap-2 px-3 py-1.5 text-xs w-full"
                  data-active={gameMode === "hardcore"}
                  onClick={handleSelectHardcore}
                >
                  <span className="console-icon-block console-icon-block--sm" aria-hidden="true">
                    <ConsoleIcon id="skull" />
                  </span>
                  <span>{COPY.gameMode.hardcoreLabel}</span>
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 w-56 -translate-x-1/2 rounded-none border border-gray-600 bg-gray-900/95 p-2 text-[10px] text-gray-300 opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100 whitespace-pre-line">
                  {COPY.gameMode.hardcoreTooltip}
                </div>
              </div>
            </div>

            {showHardcoreLoginPrompt && (
              <div className="mt-3 border border-gray-600 bg-gray-900/80 p-3 text-left text-[11px] text-gray-300">
                <p className="mb-2">{COPY.gameMode.hardcoreLoginPromptText}</p>
                <a
                  href="/api/auth/login"
                  className="pixel-button console-button tap-target flex items-center justify-center gap-2 px-2 py-1.5 text-[10px]"
                >
                  <span className="console-icon-block console-icon-block--sm" aria-hidden="true">
                    <ConsoleIcon id="discord" />
                  </span>
                  {COPY.auth.discordLoginLabel}
                </a>
              </div>
            )}

            {showHardcoreProfileUnavailablePrompt && (
              <div className="mt-3 border border-gray-600 bg-gray-900/80 p-3 text-left text-[11px] text-gray-300">
                <p>{COPY.gameMode.hardcoreProfileUnavailableText}</p>
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

            <Link href="/profile" className="block mt-1.5 text-center text-[11px] text-gray-400 hover:text-gray-200">
              {COPY.menu.profileLinkLabel}
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
