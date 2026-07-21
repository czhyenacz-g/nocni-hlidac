"use client";

import { useEffect, useMemo, useState } from "react";
import { COPY } from "@/content/copy";
import { DeathReason } from "@/game/core/types";
import { GameMode } from "@/game/core/gameMode";
import { PlayerAchievement } from "@/game/core/playerAchievements";
import { resolveDeathScreenStatus } from "@/game/core/deathScreenStatus";
import SceneBackground from "@/components/SceneBackground";
import { BACKGROUND_SCENES, getPlayOnceLastFrameDelayMs } from "@/game/visuals/backgroundImages";
import AchievementResultPanel from "@/components/achievements/AchievementResultPanel";
import { DEATH_SCREEN_REVEAL_DELAY_MS, GAME_OVER_REVEAL_DURATION_MS } from "@/game/balancing/constants";
import { useShakeOffset } from "@/game/death/useShakeOffset";
import { resolveGameOverImageSrc } from "@/game/death/gameOverReveal";
import { resolveDeathScreenScene } from "@/game/death/deathScreenScene";

/**
 * Krátký "doznívající" shake NA odhalení ghoula (viz zadání "zkus ten shake
 * i na tu animaci ghoula") — `DeathSequenceOverlay.tsx`'s shake doběhne
 * PŘESNĚ v okamžiku, kdy se DeathScreen mountuje (viz
 * game/death/liveDeathSequenceConfig.ts komentář u shakeAtMs/gameOverAtMs),
 * tenhle hook úder prodlouží ještě chvíli do samotného odhalení. Kratší a
 * jemnější (300ms/18px) než overlay's shake (350ms/28px) — tam se třásla
 * jen černá plocha, tady už skutečný obrázek, silnější intenzita by
 * působila rušivě/lacině.
 */
const GHOUL_REVEAL_SHAKE_DURATION_MS = 300;
const GHOUL_REVEAL_SHAKE_INTENSITY_PX = 18;

interface DeathScreenProps {
  reason: DeathReason | null;
  /** Kolik hlídačů už na téhle pozici selhalo — viz game/core/deathCount.ts. */
  deathCount: number;
  /** Režim runu, který právě skončil (viz game/core/gameMode.ts) — řídí, jestli hráč pokračuje, nebo run definitivně končí. */
  gameMode: GameMode;
  /** GameState.livesRemaining PO téhle smrti (už snížené reducerem) — > 0 jen pro Normal, který ještě může pokračovat. */
  livesRemaining: number;
  /** Noc, kterou hráč právě dohrál — pro Normal-continue text "Opakovat noc X.". */
  nightNumber: number;
  /**
   * Achievementy nově odemčené TOUHLE smrtí (viz zadání "Napojit
   * achievementy na výsledkové obrazovky", game/core/achievementResultUnlocks.ts).
   * Sem patří i "Setkání s Hynkem" — zobrazí se tady, ne jako toast během
   * hraní. Chybí/prázdné = nic nového, panel se nevykreslí (viz
   * AchievementResultPanel.tsx).
   */
  newlyUnlockedAchievements?: PlayerAchievement[];
  /** `night.enemy.id` aktivní směny (viz zadání "GAME OVER reveal" — vybere Impův/Titanův obrázek, game/death/gameOverReveal.ts). */
  activeMonsterId: string;
  onRetry: () => void;
}

export default function DeathScreen({
  reason,
  deathCount,
  gameMode,
  livesRemaining,
  nightNumber,
  newlyUnlockedAchievements = [],
  activeMonsterId,
  onRetry,
}: DeathScreenProps) {
  // Normal se zbývajícím životem pokračuje stejnou nocí ("POKRAČOVAT"),
  // cokoliv jiné (Normal bez životů, nebo Hardcore — ten vždy, bez ohledu na
  // livesRemaining) run definitivně ukončí ("NOVÁ HRA") — viz
  // game/core/deathScreenStatus.ts, vytažené sem, ať se dá otestovat bez
  // React infra.
  const status = resolveDeathScreenStatus(gameMode, livesRemaining, nightNumber);
  // door_open_at_attack nemá samostatnou "útok probíhá" fázi (reducer
  // přepíná enemyStage na "attack" a screen na "death" ve stejném dispatchi,
  // viz gameReducer.ts ENEMY_ADVANCE) — deathDoorAttack je proto pozadí
  // přímo pro tenhle death screen, ne pro nějaký mezikrok v DoorView.
  // bulb_replacement_attack prochází stejnou sekvencí (hráč je v DoorView,
  // dveře otevřené) — jen jiný text, stejné pozadí.
  //
  // titan_door_breach (viz zadání "oprav dvojitý Game Over") má VLASTNÍ
  // statické pozadí (BACKGROUND_SCENES.titanDeath — stejný obrázek jako 4s
  // GAME OVER reveal níže) — bez téhle větve by spadl do generické
  // deathDoorAttack Ghoul animace, což byla přesně nahlášená chyba
  // ("hezký Titan obrázek problikne a nahradí ho Ghoul").
  //
  // emergency_run (smrt v nouzové minihře) a blackout_timeout (smrt vybitím
  // energie) NEJSOU útokem žádného konkrétního monstra (viz zadání "Death
  // flow pro minihru a vybitou energii") — dostávají stejné VLASTNÍ statické
  // pozadí (BACKGROUND_SCENES.genericDeath, `death_bg_0.webp`) jako 4s GAME
  // OVER reveal (game/death/gameOverReveal.ts), ne Ghoulovu `death`
  // animaci ani Impovu `deathDoorAttack`. Výběr je čistá funkce
  // (game/death/deathScreenScene.ts), ať jde nezávisle otestovat.
  const scene = BACKGROUND_SCENES[resolveDeathScreenScene(reason)];

  // DeathScreen se mountuje znovu při každé smrti (podmíněný render podle
  // state.screen v app/play/page.tsx) — prázdné závislosti tedy stačí na to,
  // aby se hláška vybrala jednou při vstupu na obrazovku, ne při každém
  // rerenderu, a při další smrti (nový mount) mohla vyjít jiná.
  const corporateMessage = useMemo(() => {
    const messages = COPY.death.corporateMessages;
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  // Dialog "Předčasný konec směny" se má objevit AŽ POTÉ, co ghoul_death
  // animace na pozadí (`scene` výše) doběhne na poslední snímek a chvíli se
  // na něm zastaví (viz zadání "poslední obrázek byl pár sekund vidět a
  // teprve pak se přes to zobrazil dialog") — ne zároveň s namountováním
  // téhle obrazovky, jak fungovalo dřív. `emergency_run` (smrt v nouzové
  // minihře) je výjimka na výslovnou žádost — ta dál dialog zobrazuje rovnou,
  // beze změny. `titan_door_breach`/`blackout_timeout` jsou další výjimky:
  // `scene` je v obou případech statický jediný snímek (žádná ghoul_death
  // animace na doběhnutí) a hráč navíc už viděl 4s GAME OVER reveal se
  // STEJNÝM obrázkem (viz gameOverPhaseActive níže, game/death/gameOverReveal.ts)
  // — čekat dalších ~2s (DEATH_SCREEN_REVEAL_DELAY_MS) na stejném nehybném
  // obrázku by jen zbytečně prodlužovalo obrazovku bez důvodu.
  const skipReveal = reason === "emergency_run" || reason === "titan_door_breach" || reason === "blackout_timeout";
  const [dialogRevealed, setDialogRevealed] = useState(skipReveal);

  useEffect(() => {
    if (skipReveal) return;
    const revealDelayMs = getPlayOnceLastFrameDelayMs(scene) + DEATH_SCREEN_REVEAL_DELAY_MS;
    const timeout = setTimeout(() => setDialogRevealed(true), revealDelayMs);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipReveal, scene]);

  // `emergency_run` nemá žádnou předcházející DeathSequenceOverlay shake
  // fázi na navázání (viz skipReveal výše) — bez ní by tenhle shake působil
  // nemotivovaně, ne jako pokračování úderu.
  const shakeOffset = useShakeOffset(!skipReveal, GHOUL_REVEAL_SHAKE_DURATION_MS, GHOUL_REVEAL_SHAKE_INTENSITY_PX);

  // GAME OVER reveal (viz zadání "vrátit krátký GAME OVER reveal před
  // zobrazením restart dialogu") — celoobrazovkový poslední attack/death
  // obrázek aktivního monstra + nápis "GAME OVER" po PŘESNĚ
  // GAME_OVER_REVEAL_DURATION_MS (4 s), PŘED vším ostatním na týhle
  // obrazovce (ghoul_death animace na pozadí i `dialogRevealed` dialog výše
  // zůstávají beze změny, jen začnou počítat AŽ potom, protože se vůbec
  // nevykreslí, dokud je tahle fáze aktivní). TICK v tuhle chvíli už neběží
  // (isRunning je false od stejného dispatche, který nastavil screen na
  // "death" — beze změny pro VŠECHNY death cesty, viz zadání "nezměň logiku
  // samotné smrti hráče"), takže na rozdíl od doorDeathRevealUntilMs/
  // titanOverloadDeathRevealUntilMs (ty TICK/reducer pole vyžadují) se
  // časuje STEJNÝM vzorem, jaký tahle obrazovka už používá pro
  // `dialogRevealed` o pár řádků výš — setTimeout v komponentě, ne nové pole
  // v GameState. Mountuje/resetuje se automaticky při KAŽDÉ smrti (celá
  // DeathScreen se v app/play/page.tsx renderuje jen podmíněně podle
  // `state.screen === "death"`, takže restart = nový mount = čerstvý stav
  // znovu `true`, viz zadání "reveal stav se správně resetuje při restartu").
  const [gameOverPhaseActive, setGameOverPhaseActive] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setGameOverPhaseActive(false), GAME_OVER_REVEAL_DURATION_MS);
    return () => clearTimeout(timeout);
  }, []);

  if (gameOverPhaseActive) {
    return (
      <main className="relative min-h-screen flex items-center justify-center p-4 bg-black overflow-hidden">
        <img
          src={resolveGameOverImageSrc(reason, activeMonsterId)}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        <p className="relative z-10 text-4xl sm:text-6xl font-bold tracking-widest uppercase text-red-500 text-center px-4 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          {COPY.death.gameOverLabel}
        </p>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center p-4"
      style={{ transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)` }}
    >
      <SceneBackground scene={scene} />

      {dialogRevealed && (
        /* Stejný "terminál" obal jako MainMenuScreen/BriefingScreen (viz
            zadání "podobným způsobem uprav") — kovový rám + 4 šrouby +
            zapuštěná obrazovka, místo ploché pixel-panel karty. */
        <div className="w-full max-w-md menu-terminal-frame relative z-10">
          <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
          <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
          <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
          <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

          <div className="menu-terminal-screen pixel-screen-static text-center p-8">
            <h1 className="text-2xl font-bold mb-2 text-red-500">{COPY.death.title}</h1>
            <p className="text-sm text-gray-400 mb-4">{reason ? COPY.death.reasons[reason] : ""}</p>
            <p className="text-xs text-gray-300 mb-2 italic">{corporateMessage}</p>
            <p className="text-xs text-gray-400 mb-4">
              {COPY.death.previousGuardsLabel.replace("{count}", String(deathCount))}
            </p>

            {status.kind === "normal_continue" ? (
              <p className="text-sm text-amber-400 mb-6">
                {COPY.death.normalContinueLivesLabel.replace("{lives}", String(status.livesRemaining))}
                <br />
                {COPY.death.normalContinueNightLabel.replace("{night}", String(status.nightNumber))}
              </p>
            ) : (
              <div className="mb-6">
                <p className="text-sm text-red-400">
                  {status.kind === "hardcore_game_over" ? COPY.death.hardcoreGameOverLabel : COPY.death.normalGameOverLabel}
                </p>
                {status.kind === "normal_game_over" && (
                  <p className="text-[11px] text-gray-500 mt-2">{COPY.death.normalLeaderboardNote}</p>
                )}
              </div>
            )}

            <AchievementResultPanel achievements={newlyUnlockedAchievements} />

            <button
              className="pixel-button console-button console-button--primary tap-target px-6 py-3 text-sm w-full"
              onClick={onRetry}
            >
              {status.kind === "normal_continue"
                ? COPY.death.normalContinueButton
                : status.kind === "hardcore_game_over"
                  ? COPY.death.hardcoreGameOverButton
                  : COPY.death.normalGameOverButton}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
