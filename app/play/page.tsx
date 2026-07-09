"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import MainMenuScreen from "@/components/screens/MainMenuScreen";
import LoadingScreen from "@/components/screens/LoadingScreen";
import BriefingScreen from "@/components/screens/BriefingScreen";
import GameScreen from "@/components/screens/GameScreen";
import DeathScreen from "@/components/screens/DeathScreen";
import WinScreen from "@/components/screens/WinScreen";
import MonsterDefeatedScreen from "@/components/screens/MonsterDefeatedScreen";
import { NIGHT_01 } from "@/game/nights/night01";
import { createInitialGameState } from "@/game/core/gameState";
import { canStartThinkItOverWindup, createGameReducer, willGeneratorRestartSucceed } from "@/game/core/gameReducer";
import { useGameLoop } from "@/game/core/gameLoop";
import { CameraId } from "@/game/core/types";
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_EVENTS } from "@/game/audio/audioEvents";
import { computeTensionLevel } from "@/game/visuals/atmosphereState";
import { atmosphereStyleToCssVars, tensionToAtmosphereStyle } from "@/game/visuals/visualEffects";
import { getBlackoutPhaseIndex } from "@/game/visuals/blackoutPhase";
import {
  AMBIENCE_DEATH_FADE_MS,
  BLACKOUT_FINAL_AMBIENCE_FADE_MS,
  CINEMATIC_PRE_DELAY_MS,
  JUMPSCARE_SILENT_GAP_MS,
  LOADING_SCREEN_DURATION_MS,
  MONSTER_DOOR_BANG_COOLDOWN_MS,
  MONSTER_RETREAT_STEPS_DELAY_MS,
} from "@/game/balancing/constants";
import { chooseDoorBangPlaybackPlan } from "@/game/audio/doorBangPlayback";
import CinematicScreen from "@/components/screens/CinematicScreen";
import { CinematicSceneId } from "@/content/cinematics";
import AchievementToast from "@/components/game/AchievementToast";
import AdminBadge from "@/components/game/AdminBadge";
import { Achievement, getAchievement } from "@/content/achievements";
import { unlockAchievement } from "@/game/core/achievementStorage";
import { getDeathCount, incrementDeathCount } from "@/game/core/deathCount";
import { getMonsterDefeatReward, recordMonsterDefeat } from "@/game/core/monsterDefeatReward";
import {
  getPlayerProfileStats,
  recordBulbReplaced,
  recordDeath,
  recordExpeditionReturned,
  recordExpeditionStarted,
  recordGeneratorRestarted,
  recordMonsterHitsConfirmed,
  recordMonsterKill,
  recordNightSurvived,
  recordRunStarted,
} from "@/game/core/playerProfileStats";
import {
  createHardcoreProfileSnapshotFromLocalState,
  recordLocalHardcoreMonsterDefeat,
} from "@/game/core/hardcorePlayerProfileSnapshot";
import { hasUsedFirstNightTechnicianWarning, markFirstNightTechnicianWarningUsed } from "@/game/core/firstNightWarning";
import { getSurvivedNights, incrementSurvivedNights, resetSurvivedNights } from "@/game/core/survivedNights";
import { getBulbsRemaining, setBulbsRemaining } from "@/game/core/bulbInventory";
import { applyDailyBulbService, getRoomBulbs, setRoomBulbs } from "@/game/core/roomBulbs";
import { useHeartbeatStress } from "@/game/audio/useHeartbeatStress";
import { getNightConfig } from "@/game/difficulty/nightConfig";
import {
  applyEmergencyWorldEffects,
  canStartBatteryEmergencyRun,
  canStartShotgunEmergencyRun,
  createBatteryEmergencyInput,
  createShotgunEmergencyInput,
  resolveBulbsGainedFromWorldEffects,
  resolveExtraLootItems,
  resolveOfficeThreatTriggeredFromWorldEffects,
  shouldLaunchEmergencyMiniGame,
} from "@/game/core/emergencyMiniGameIntegration";
import {
  applyShotgunEmergencyReturn,
  createFreshRunShotgunEquipment,
  getRechargedShotgunAmmo,
} from "@/game/core/shotgunEquipment";
import EmergencyMiniGame from "@/components/minigame/EmergencyMiniGame";
import { EmergencyMiniGameInput, EmergencyMiniGameResult } from "@/game/minigame/types";
import { COPY } from "@/content/copy";
import type { AuthenticatedPlayer } from "@/lib/auth/types";
import { isAdminUsername } from "@/lib/auth/adminUsers";
import type { GuardRunState } from "@/lib/leaderboard/types";
import type { GuardRunResponse } from "@/lib/leaderboard/guardRunRequestHandlers";
import { DEFAULT_GAME_MODE, GAME_MODE_CONFIG, GameMode, resolveGameMode } from "@/game/core/gameMode";

const night = NIGHT_01;
const gameReducer = createGameReducer(night);

// Kamera nejblíž hráči (nejvyšší order) — používá se pro podmíněný heartbeat
// při výběru kamery, viz handleSelectCamera níže.
const nearestCamera = [...night.cameras].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];

export default function PlayPage() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialGameState(night));
  // Kolik hlídačů už na týhle pozici selhalo — čistě lokální localStorage
  // counter (viz game/core/deathCount.ts), nezávislý na herním stavu/reduceru.
  // Lazy initializer čte aktuální hodnotu jen jednou při prvním mountu.
  const [deathCount, setDeathCount] = useState(() => getDeathCount());
  // Kolik nocí v řadě aktuální hlídač přežil bez smrti (viz
  // game/core/survivedNights.ts) — na rozdíl od deathCount se smrtí vynuluje.
  // Tohle je jen FALLBACK pro nepřihlášeného hráče (nebo dokud se ještě
  // nenačetl serverový stav) — přihlášený hráč má přednostně navazovat na
  // serverRunState níže, ne na tenhle lokální localStorage counter.
  const [survivedNights, setSurvivedNights] = useState(() => getSurvivedNights());
  // Serverový run stav (bestRun/currentRun) přihlášeného hráče — `null`, dokud
  // se nenačte (nebo hráč není přihlášený/hub API nedostupné). Nastavuje se
  // (1) při mountu z /api/auth/me, (2) po úspěšném /api/player/survive-night,
  // (3) po úspěšném /api/player/death — NIKDY při pouhém startu/rozehrání
  // směny, ať zavření prohlížeče uprostřed noci currentRun nezmění (viz
  // handleBeginShift níže — ten jen ČTE, nikdy nezapisuje serverRunState).
  const [serverRunState, setServerRunState] = useState<GuardRunState | null>(null);
  // Jestli je hráč přihlášený přes Discord (viz /api/auth/me efekt níže) —
  // jediný zdroj pravdy pro handleStart#hardcore safety fallback (viz zadání
  // "i start handler by měl být bezpečný"), ať se nemusí volat druhý
  // (duplicitní) /api/auth/me fetch jen pro tenhle jeden check.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Admin účet (viz lib/auth/adminUsers.ts, zadání "výjimky ve hře a lepší
  // debug") — vypočtené z přihlášeného Discord username, ne z vlastního
  // API/session pole. Zatím jediná herní výjimka: canSpawnShotgun (viz
  // nightFeatures níže), plus trvalý badge (AdminBadge) vidět na všech
  // obrazovkách.
  const [isAdmin, setIsAdmin] = useState(false);
  // Režim zvolený na MainMenuScreen (viz game/core/gameMode.ts) — čte se v
  // handleBeginShift (START_SHIFT gameMode/livesRemaining) i v `currentNight`
  // níže. Deklarováno tady (ne u ostatních refů, viz pendingShiftKindRef níže)
  // jen proto, že `currentNight` na něj musí odkazovat hned za deklarací.
  const selectedGameModeRef = useRef<GameMode>(DEFAULT_GAME_MODE);
  // Jediný zdroj "kolikátá noc" — používá ho HUD (ShiftTimer přes nightNumber
  // prop níže), night scaling (game/difficulty/nightScaling.ts) i briefing
  // (getNightConfig). Serverový currentRun má přednost, ale JEN pro Hardcore
  // (viz zadání "Normal progress může být dočasně lokální, server currentRun
  // zůstává jen Hardcore") — Normal vždy počítá z lokálního survivedNights, i
  // když je hráč přihlášený a serverRunState je k dispozici z dřívějšího
  // Hardcore runu ve stejné session. `selectedGameModeRef` (ne `state.gameMode`)
  // je tu záměrně — musí platit i v krátkém okně menu -> loading -> briefing,
  // PŘED tím, než START_SHIFT skutečně zapíše gameMode do GameState.
  const currentNight =
    selectedGameModeRef.current === "hardcore" && serverRunState ? serverRunState.currentRun + 1 : survivedNights + 1;
  // Aktivní nouzová minihra (viz components/minigame/EmergencyMiniGame.tsx,
  // handleStartEmergencyRun/handleEmergencyMiniGameComplete níže) — sourozenec
  // GameState, ne jeho pole (stejný vzor jako cinematicPending níže): dokud je
  // nastavená, GameScreen se vůbec nerenderuje (viz JSX), místo něj
  // EmergencyMiniGame, a hlavní herní smyčka (useGameLoop níže) se zastaví.
  // `id` je zatím vždy "battery_run" (jediný scénář), ale pole je tu
  // připravené pro budoucí další emergency scénáře. Deklarováno tady (ne
  // blíž ostatním sourozeneckým useState) jen proto, aby ho useGameLoop níže
  // mohl použít v `isRunning`.
  const [activeMiniGame, setActiveMiniGame] = useState<{ id: "battery_run" | "shotgun_run"; input: EmergencyMiniGameInput } | null>(
    null,
  );

  // Jednorázově při mountu zjisti přihlášeného hráče a jeho serverový run
  // stav (viz app/api/auth/me/route.ts) — pokud je hráč přihlášený a hub API
  // vrátilo bestRun/currentRun, `currentNight` výše se od teď počítá z nich,
  // ne z lokálního localStorage counteru.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { player: AuthenticatedPlayer | null }) => {
        if (cancelled || !data.player) return;
        setIsAuthenticated(true);
        setIsAdmin(isAdminUsername(data.player.username));
        if (data.player.currentRun !== null && data.player.bestRun !== null) {
          setServerRunState({ currentRun: data.player.currentRun, bestRun: data.player.bestRun });
        }
      })
      .catch(() => {
        // Tichý fallback — currentNight zůstane spočítané z lokálního
        // survivedNights, stejně jako u nepřihlášeného hráče.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // "Nejnovější hodnota" ref pro stress (viz stressTimeScale.ts přes TICK) —
  // gameLoop.ts jím jen čte .current uvnitř setInterval, ať se interval
  // nemusí kvůli rychle se měnícímu stresu (~10×/s) pořád rušit a zakládat
  // znovu. Aktualizuje se níže po useHeartbeatStress, obyčejné přiřazení při
  // renderu (ne efekt) — stejný "latest ref" vzor jako jinde v Reactu.
  const stressLevelRef = useRef(0);
  useGameLoop({
    // Dokud běží nouzová minihra (activeMiniGame), hlavní herní smyčka
    // (TICK/ENEMY_ADVANCE) musí stát — jinak by čas/energie/nepřítel běžely
    // dál na pozadí, zatímco hráč je "mimo kancelář" v EmergencyMiniGame.
    isRunning: state.isRunning && !activeMiniGame,
    enemyTickMs: night.enemyTickMs,
    dispatch,
    stressLevelRef,
    currentNight,
  });
  const heartbeatStress = useHeartbeatStress(state, night);
  stressLevelRef.current = heartbeatStress;

  const prevScreenRef = useRef(state.screen);
  const prevDoorRef = useRef(state.doorClosed);
  const prevLightRef = useRef(state.lightOn);
  const prevPowerRef = useRef(state.power);
  const prevGeneratorBeepSeqRef = useRef(state.generatorBeepSeq);
  const prevMonsterRetreatRoarSeqRef = useRef(state.monsterRetreatRoarSeq);
  const prevDoorBangSeqRef = useRef(state.doorBangSeq);
  // Cooldown proti audio spamu, když doorBangSeq roste tik za tikem
  // (monstrum tlačí na zavřené dveře) — reálný čas (performance.now()), ne
  // herní elapsedMs, protože jde čistě o to, aby zvuk nezněl jako kulomet,
  // ne o herní pravidlo. `doorBangSeq` samotné se dál zvyšuje beze změny,
  // tohle jen omezuje PŘEHRÁVÁNÍ.
  const doorBangCooldownUntilRef = useRef(0);
  // Naplánovaný druhý úder (viz chooseDoorBangPlaybackPlan) — žije v ref, ne
  // jen v uzávěře efektu, ať ho nezruší cleanup NÁSLEDUJÍCÍHO re-runu efektu
  // (další doorBangSeq v cooldownu by jinak zrušil ještě nedohraný druhý
  // úder z předchozího bušení). Skutečně zrušen jen na unmount.
  const doorBangRepeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevGameStatusRef = useRef(state.gameStatus);
  const prevBlackoutPhaseSeqRef = useRef(state.blackoutPhaseSeq);
  const prevBlackoutRoarSeqRef = useRef(state.blackoutRoarSeq);
  const prevBulbBreakSeqRef = useRef(state.bulbBreakSeq);
  const prevBulbReplaceSuccessSeqRef = useRef(state.bulbReplaceSuccessSeq);
  const prevEmergencyRunReadySeqRef = useRef(state.emergencyRunReadySeq);
  const prevThinkItOverReadySeqRef = useRef(state.thinkItOverReadySeq);
  // Zvuk překvapení na nejbližší kameře smí zaznít jen jednou za "návštěvu" —
  // dokud tam nepřítel je, další kliknutí na kameru (ani na jinou a zpátky) ho
  // znovu nespustí. Resetuje se, až nepřítel z téhle stage odejde (uteče/postoupí).
  const hasPlayedNearCameraSurpriseRef = useRef(false);
  // Briefing panel (viz components/screens/BriefingScreen.tsx) je mezikrok
  // před START_SHIFT i před RESTART_SHIFT — tenhle ref si pamatuje, kterou
  // z těch dvou akcí má "Nastoupit na směnu" po skončení briefingu spustit.
  const pendingShiftKindRef = useRef<"start" | "restart">("start");
  // První smrt v Noci 1 NENÍ smrt (viz isFirstNightNearMiss níže) — reducer to
  // ale neví a livesRemaining sníží stejně jako u každé jiné smrti (stejná
  // "screen/deathReason se mění unconditionally, jen bookkeeping v page.tsx
  // rozhoduje, co se počítá" konvence jako survivedNights/API volání níže).
  // Tenhle ref řekne handleBeginShift, aby ten jeden život vrátil zpátky, ať
  // scriptovaný "near miss" hráče nikdy nestojí život.
  const restoreNearMissLifeRef = useRef(false);
  // Cinematic scéna při smrti v Noci 1 (viz content/cinematics.ts,
  // components/screens/CinematicScreen.tsx) — `cinematicPending` je krátká
  // tichá pauza PŘED zobrazením scény (CINEMATIC_PRE_DELAY_MS), `activeCinematicSceneId`
  // je scéna samotná. Dokud je jedno z nich pravdivé, DeathScreen se
  // nerenderuje (viz JSX níže) — po dokončení scény (onComplete) se
  // `activeCinematicSceneId` vrátí na `null` a normální DeathScreen se
  // zobrazí, přesně jako dnes.
  const [cinematicPending, setCinematicPending] = useState(false);
  const [activeCinematicSceneId, setActiveCinematicSceneId] = useState<CinematicSceneId | null>(null);
  // Achievement toast (viz components/game/AchievementToast.tsx) — čistě
  // vizuální, nezávislý na screen flow. `null` = žádný toast aktivní.
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  // Krátká textová zpráva po návratu z nouzové minihry (viz
  // handleEmergencyMiniGameComplete) — záměrně bez nového toast systému,
  // jen jednoduchý auto-mizející text (stejný "sourozenec .atmosphere-root"
  // důvod jako AchievementToast, viz JSX níže).
  const [emergencyRunMessage, setEmergencyRunMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!emergencyRunMessage) return;
    const timeout = setTimeout(() => setEmergencyRunMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [emergencyRunMessage]);

  // Zpracuje odpověď /api/player/death nebo /api/player/survive-night —
  // na úspěch (ok+stored) aktualizuje serverRunState (viz výše), jinak jen
  // zaloguje warning. Nikdy nepřepisuje serverRunState lokální hodnotou.
  function applyGuardRunResponse(body: GuardRunResponse["body"], context: "death" | "survive-night") {
    if (body.ok && body.stored) {
      setServerRunState(body.player);
      return;
    }
    console.warn(
      `[nocni-hlidac] ${context} was not recorded on the server — currentRun may be stale until the next successful call`,
      body,
    );
  }

  useEffect(() => {
    audioManager.setMuted(state.audioMuted);
  }, [state.audioMuted]);

  useEffect(() => {
    if (prevScreenRef.current === state.screen) return;

    let jumpscareTimeout: ReturnType<typeof setTimeout> | undefined;
    let cinematicTimeout: ReturnType<typeof setTimeout> | undefined;

    if (state.screen === "playing") {
      audioManager.startLoop(AUDIO_EVENTS.ambienceLoop);
    }
    if (state.screen === "death") {
      // Zachyceno PŘED jakýmkoliv resetem níže (setSurvivedNights/serverRunState) —
      // currentNight tady pořád odráží noc, kterou hráč právě dohrál, ne
      // hodnotu PO resetu na 0.
      const nightThatEnded = currentNight;
      // První smrtelná chyba v Noci 1 je "near-miss" — technikův zásah, ne
      // skutečná smrt (viz content/cinematics.ts#old_guard_first_death_warning,
      // game/core/firstNightWarning.ts). Jednorázové: jakmile je varování
      // jednou spotřebované, každá další chyba v Noci 1 (i po restartu
      // směny) už jde normálním death flow stejně jako Noc 2+.
      const isFirstNightNearMiss = nightThatEnded === 1 && !hasUsedFirstNightTechnicianWarning();

      // Útok/smrt má vlastní tříbeatovou sekvenci, ne okamžité zastavení
      // ambience + hned jumpscare: (1) ambience plynule ztiší přes
      // AMBIENCE_DEATH_FADE_MS, (2) JUMPSCARE_SILENT_GAP_MS naprostého ticha,
      // (3) teprve pak jumpscare — ticho těsně před lekačkou je součást
      // efektu (viz AUDIO_DESIGN.md "Ticho před lekačkou"). Stejné pro
      // near-miss i skutečnou smrt — jen zvukové "leknutí", ne herní stav.
      audioManager.fadeOutLoop(AUDIO_EVENTS.ambienceLoop, AMBIENCE_DEATH_FADE_MS);

      if (isFirstNightNearMiss) {
        // Tohle NENÍ smrt: žádný deathCount, žádný reset survivedNights,
        // žádná perzistence roomBulbs/bulbsRemaining k "death" okamžiku,
        // a hlavně žádné volání /api/player/death — server currentRun se
        // pro tuhle událost vůbec nesmí dotknout (viz zadání).
        markFirstNightTechnicianWarningUsed();
        // Reducer už livesRemaining snížil (viz gameReducer.ts
        // resolveLivesRemainingAfterDeath, volá se unconditionally u každé
        // smrti) — tenhle náhodný technikův zásah ale život stát nesmí, viz
        // zadání/komentář u restoreNearMissLifeRef výše.
        restoreNearMissLifeRef.current = true;
        // Čistě vizuální achievement toast (viz content/achievements.ts,
        // game/core/achievementStorage.ts) — unlockAchievement vrací `true`
        // jen při skutečně PRVNÍM odemčení (vlastní localStorage seznam,
        // nezávislý na hasUsedFirstNightTechnicianWarning výše), takže se
        // toast nikdy nezobrazí podruhé, ani kdyby se tahle podmínka někdy
        // vyhodnotila vícekrát. Nijak neovlivňuje death/near-miss/cinematic
        // flow ani server currentRun.
        if (unlockAchievement("meet_hynek")) {
          const achievement = getAchievement("meet_hynek");
          if (achievement) setActiveAchievement(achievement);
        }
      } else {
        // Counter se zvyšuje přesně tady — při přechodu hry do "death" stavu,
        // ne při kliknutí na tlačítko restartu (handleRestart) a ne při výhře.
        // Tenhle efekt už díky prevScreenRef diffingu (viz podmínka nahoře)
        // firuje jen jednou za skutečný přechod, ne při každém rerenderu.
        setDeathCount(incrementDeathCount());
        // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) — stejné
        // místo/podmínka jako deathCount výše (skutečná smrt, ne near-miss).
        // V Normal s více životy se počítá KAŽDÁ smrt, ne jen konec runu —
        // tahle větev je přesně "jedna skutečná smrt", žádný extra guard
        // navíc potřeba.
        recordDeath();
        // Žárovka je vlastnost OBJEKTU, ne hlídače — smrt ji jen uloží tak, jak
        // byla (žádný denní servis, ten běží jen po přežité směně, viz "win"
        // níže), ať další hlídač pokračuje přesně odtud, kde předchozí skončil.
        // Beze změny podle gameMode — bulby patří objektu, ne konkrétnímu runu.
        setRoomBulbs(state.roomBulbs);
        // Náhradní žárovky patří do campaignu stejně jako roomBulbs — pokud
        // hráč spotřeboval kus dřív v týhle směně (dokončená ruční výměna),
        // musí to přežít i smrt z jiného důvodu, ne se ztratit.
        setBulbsRemaining(state.bulbsRemaining);

        // Normal se zbývajícím životem "opakuje noc" — run nekončí, takže
        // survivedNights se NErestuje a server API se vůbec nevolá (viz
        // zadání "neresetuj currentRun", "nezapisuj leaderboard"). Cokoliv
        // jiné (Normal bez životů, nebo Hardcore — ten vždy) je skutečný
        // konec runu, viz gameMode.ts.
        const isNormalContinuing = state.gameMode === "normal" && state.livesRemaining > 0;

        if (!isNormalContinuing) {
          // Aktuální hlídač skončil — survival streak jde na 0 (viz
          // game/core/survivedNights.ts), death counter nahoře tím není dotčený.
          setSurvivedNights(resetSurvivedNights());
        }

        if (state.gameMode === "hardcore") {
          // Hardcore je nové jméno pro původní soutěžní chování (viz zadání)
          // — jediný gameMode, který smí zapisovat na server. Best-effort
          // online stav (viz TECH_DESIGN.md "VPS API specifikace") — server
          // si identitu vezme ze session, ne odsud (klient nikdy neposílá
          // discordUserId). Nepřihlášený hráč dostane 401, nedostupné VPS API
          // 202 — v obou případech hra pokračuje beze změny, jen zaloguje
          // warning (viz applyGuardRunResponse). gameMode se posílá v těle
          // requestu jako DRUHÁ (server-side) pojistka nad rámec toho, že
          // Normal tenhle fetch vůbec nevolá (viz app/api/player/death/route.ts).
          // TODO (true ending odměna, viz TODO u survive-night níže v tomhle
          // souboru pro plné zdůvodnění): stejné "veteránský run neoddělený
          // od čistého Hardcore" omezení platí i tady.
          fetch("/api/player/death", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameMode: "hardcore" }),
          })
            .then((res) => res.json())
            .then((body: GuardRunResponse["body"]) => applyGuardRunResponse(body, "death"))
            .catch((err) => {
              console.warn("[nocni-hlidac] death request failed — server currentRun may not have been reset to 0", err);
            });
        }
        // Normal (ať už pokračuje, nebo mu došly životy) na server nikdy
        // nesahá — nesmí ovlivnit Hardcore currentRun/bestRun (viz zadání).
      }

      if (state.deathReason === "door_open_at_attack") {
        // Poslední krok těsně u dveří hraje hned (stihne doznít dávno před
        // jumpscare, viz gap níže) — zřetelně odděleně, ne zamíchaně přes sebe.
        audioManager.play(AUDIO_EVENTS.enemyStep);
      }
      jumpscareTimeout = setTimeout(
        () => audioManager.play(AUDIO_EVENTS.jumpscare),
        AMBIENCE_DEATH_FADE_MS + JUMPSCARE_SILENT_GAP_MS,
      );

      // Cinematic scéna jen pro first-night near-miss (viz výše) — ambience
      // se ztlumuje už nahoře (fadeOutLoop), tahle pauza je navíc krátká
      // tichá prodleva PŘED zobrazením CinematicScreen (viz JSX níže), ať
      // přechod nepůsobí okamžitě. Druhá+ chyba v Noci 1 i Noc 2+ tenhle
      // blok vůbec nespustí — DeathScreen se zobrazí rovnou jako dnes.
      if (isFirstNightNearMiss) {
        setCinematicPending(true);
        cinematicTimeout = setTimeout(() => {
          setCinematicPending(false);
          setActiveCinematicSceneId("old_guard_first_death_warning");
        }, CINEMATIC_PRE_DELAY_MS);
      }
    }
    if (state.screen === "win") {
      audioManager.stopLoop(AUDIO_EVENTS.ambienceLoop);
      audioManager.play(AUDIO_EVENTS.shiftWin);
      // Stejný "zvyš přesně jednou při přechodu" vzor jako deathCount výše —
      // ne při kliknutí na tlačítko, ne opakovaně při rerenderu.
      setSurvivedNights(incrementSurvivedNights());
      // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) —
      // currentNight je noc, kterou hráč PRÁVĚ přežil (stejná hodnota jako
      // nightThatEnded v "death" větvi výše), ne noc PO přechodu. hardcoreBestNight
      // se aktualizuje jen pro gameMode "hardcore", jen směrem nahoru (viz
      // recordNightSurvived).
      recordNightSurvived(state.gameMode, currentNight);
      // Denní servis: jen SKUTEČNĚ prasklé žárovky se vymění za náhradní kus
      // ze skladu (viz game/core/roomBulbs.ts#applyDailyBulbService) — slabá,
      // ale neprasklá žárovka se nedotkne. Běží jen tady (přežitá směna),
      // nikdy na smrt (viz "death" výše).
      // state.bulbsRemaining (živá hodnota z GameState), ne stará
      // getBulbsRemaining() z localStorage — jinak by denní servis přebil
      // spotřebu z ruční výměny dokončené dřív v týhle směně.
      const serviced = applyDailyBulbService(state.roomBulbs, state.bulbsRemaining);
      setRoomBulbs(serviced.roomBulbs);
      setBulbsRemaining(serviced.bulbsRemaining);
      // Jen Hardcore je leaderboard eligible (viz GAME_MODE_CONFIG) — Normal
      // přežití noci posune jen lokální survivedNights výše, nikdy nevolá
      // server API, ať nemůže Normal run vylepšit Hardcore bestRun/currentRun
      // (viz zadání). Stejná pravidla jako u "death" výše (identita ze
      // session, žádné opakované volání, jen jednou za skutečný přechod na
      // "win"); gameMode v těle requestu je server-side pojistka navíc.
      //
      // TODO (true ending odměna, viz zadání část I "bezpečnost vůči
      // leaderboardu"): tenhle Hardcore survive-night zápis NEROZLIŠUJE, jestli
      // run běžel s odemčenou dvouhlavňovkou (viz
      // shotgunEquipment.ts#isDoubleBarrelShotgun(state)) — hráč s výhodou
      // navíc (2 náboje místo 1) tak zatím soutěží ve stejném
      // bestRun/currentRun žebříčku jako čistý Hardcore run bez odměny.
      // Server API/schéma se v tomhle kroku záměrně NEMĚNÍ. Až přijde na
      // řadu: přidat `veteranRun`/`runUsedDoubleBarrel: boolean` do request
      // body (počítáno tady z `isDoubleBarrelShotgun(state)`, ne nový
      // GameState field), a na serveru/leaderboardu vést čistý Hardcore a
      // veteránský Hardcore jako oddělené žebříčky (nebo aspoň sloupec navíc).
      if (state.gameMode === "hardcore") {
        fetch("/api/player/survive-night", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameMode: "hardcore" }),
        })
          .then((res) => res.json())
          .then((body: GuardRunResponse["body"]) => applyGuardRunResponse(body, "survive-night"))
          .catch((err) => {
            console.warn("[nocni-hlidac] survive-night request failed — server currentRun may not have advanced", err);
          });
      }
    }
    prevScreenRef.current = state.screen;

    return () => {
      if (jumpscareTimeout) clearTimeout(jumpscareTimeout);
      if (cinematicTimeout) clearTimeout(cinematicTimeout);
    };
  }, [state.screen, state.deathReason]);

  useEffect(() => {
    if (prevDoorRef.current !== state.doorClosed) {
      audioManager.play(state.doorClosed ? AUDIO_EVENTS.doorClose : AUDIO_EVENTS.doorOpen);
      prevDoorRef.current = state.doorClosed;
    }
  }, [state.doorClosed]);

  useEffect(() => {
    if (prevLightRef.current !== state.lightOn) {
      audioManager.play(AUDIO_EVENTS.lightClick);
      prevLightRef.current = state.lightOn;
    }
  }, [state.lightOn]);

  useEffect(() => {
    const crossedLowThreshold = prevPowerRef.current > 25 && state.power <= 25;
    if (crossedLowThreshold) {
      audioManager.play(AUDIO_EVENTS.powerLow);
    }
    prevPowerRef.current = state.power;
  }, [state.power]);

  // Siréna po dobu držení "Nouzově opustit místnost" (viz zadání,
  // LeftWallView.tsx#handlePointerDown/Up) — startLoop/stopLoop jsou
  // idempotentní (opakované volání stejného stavu nic nerozbije), takže
  // stačí přímo sledovat state.emergencyRunWindup.active, žádný prevRef
  // diffing navíc jako u ostatních efektů výše.
  useEffect(() => {
    if (state.emergencyRunWindup.active) {
      audioManager.startLoop(AUDIO_EVENTS.emergencyRunSiren);
    } else {
      audioManager.stopLoop(AUDIO_EVENTS.emergencyRunSiren);
    }
  }, [state.emergencyRunWindup.active]);

  useEffect(() => {
    // Stejné pípnutí jako normální provoz, i v criticalBeeping — jen rychlejší
    // tempo (viz night.generator.criticalBeepIntervalMs). Jediná signalizace
    // rychlého úbytku energie kromě samotného poklesu na PowerMeter, viz
    // game/core/generatorUrgency.ts pro zpožděné blikání šipky na generátor.
    if (prevGeneratorBeepSeqRef.current !== state.generatorBeepSeq) {
      audioManager.play(AUDIO_EVENTS.generatorBeep);
      prevGeneratorBeepSeqRef.current = state.generatorBeepSeq;
    }
  }, [state.generatorBeepSeq]);

  useEffect(() => {
    // "attack" má vlastní zvukovou sekvenci (krok -> jumpscare, viz efekt na
    // state.screen výše) — tady by přehrání enemyNear souběžně s jumpscare
    // jen zamíchalo oba zvuky přes sebe.
    if (state.enemyStage === "at_door") {
      audioManager.play(AUDIO_EVENTS.enemyNear);
    } else if (state.enemyStage !== "outside" && state.enemyStage !== "attack") {
      audioManager.play(AUDIO_EVENTS.enemyStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.enemyStage]);

  useEffect(() => {
    // Nepřítel odešel z kamery nejblíž hráči — příští příchod tam bude zase překvapení.
    if (state.enemyStage !== nearestCamera.enemyVisibleAtStage) {
      hasPlayedNearCameraSurpriseRef.current = false;
    }
  }, [state.enemyStage]);

  useEffect(() => {
    if (prevMonsterRetreatRoarSeqRef.current === state.monsterRetreatRoarSeq) return;
    prevMonsterRetreatRoarSeqRef.current = state.monsterRetreatRoarSeq;
    audioManager.play(AUDIO_EVENTS.monsterRetreatRoar);
    // Kroky ústupu hrají krátce PO řevu, ne současně (viz
    // MONSTER_RETREAT_STEPS_DELAY_MS) — stejný trigger (door-light repel,
    // viz gameReducer.ts#updateDoorLightRepel), jen posunuté v čase, ať to
    // zní jako "zařvalo, pak odešlo", ne dva zvuky přes sebe.
    const stepsTimeout = setTimeout(() => audioManager.play(AUDIO_EVENTS.monsterRetreatSteps), MONSTER_RETREAT_STEPS_DELAY_MS);
    return () => clearTimeout(stepsTimeout);
  }, [state.monsterRetreatRoarSeq]);

  // Zruší naplánovaný druhý úder bušení jen při SKUTEČNÉM odmountování
  // stránky — viz doorBangRepeatTimeoutRef výše (žádná jiná definice tady,
  // ať to nejde omylem zrušit re-runem jiného efektu).
  useEffect(() => {
    return () => {
      if (doorBangRepeatTimeoutRef.current) clearTimeout(doorBangRepeatTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    // Bušení do dveří — zablokovaný útok (viz game/core/doorEncounter.ts,
    // GameState.doorBangSeq). Nezávislé na death/jumpscare sekvenci výše
    // (ta se vůbec nespustí, dveře zůstaly zavřené, hráč neumřel).
    if (prevDoorBangSeqRef.current === state.doorBangSeq) return;
    prevDoorBangSeqRef.current = state.doorBangSeq;

    // Cooldown proti spamu — pokud další zablokovaný útok přijde moc brzy po
    // předchozím přehrání, tenhle bang se prostě tiše přeskočí (doorBangSeq
    // se v GameState přesto zvýšil, jen se pro něj nic nepřehraje).
    const now = performance.now();
    if (now < doorBangCooldownUntilRef.current) return;
    doorBangCooldownUntilRef.current = now + MONSTER_DOOR_BANG_COOLDOWN_MS;

    const plan = chooseDoorBangPlaybackPlan();
    audioManager.play(AUDIO_EVENTS.monsterDoorBang);

    if (plan.count === 2 && plan.repeatDelayMs !== undefined) {
      if (doorBangRepeatTimeoutRef.current) clearTimeout(doorBangRepeatTimeoutRef.current);
      doorBangRepeatTimeoutRef.current = setTimeout(() => {
        audioManager.play(AUDIO_EVENTS.monsterDoorBang);
        doorBangRepeatTimeoutRef.current = null;
      }, plan.repeatDelayMs);
    }
  }, [state.doorBangSeq]);

  useEffect(() => {
    if (prevBulbBreakSeqRef.current !== state.bulbBreakSeq) {
      audioManager.play(AUDIO_EVENTS.bulbBreak);
      prevBulbBreakSeqRef.current = state.bulbBreakSeq;
    }
  }, [state.bulbBreakSeq]);

  useEffect(() => {
    if (prevBulbReplaceSuccessSeqRef.current !== state.bulbReplaceSuccessSeq) {
      audioManager.play(AUDIO_EVENTS.bulbReplaceSuccess);
      prevBulbReplaceSuccessSeqRef.current = state.bulbReplaceSuccessSeq;
      // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) — stejný
      // seq-diff signál jako zvuk výše, jen SKUTEČNĚ dokončená výměna
      // (bulbReplaceSuccessSeq se zvyšuje jen po BULB_REPLACE_DURATION_MS
      // úspěšně doběhlé výměně, ne po pokusu bez žárovky na skladě).
      recordBulbReplaced();
    }
  }, [state.bulbReplaceSuccessSeq]);

  // Držení "Nouzově opustit místnost" doběhlo celé (viz gameReducer.ts
  // START_EMERGENCY_RUN_WINDUP/TICK) — emergencyRunReadySeq je jediný signál
  // z reduceru, že se má EmergencyMiniGame skutečně spustit. NA ROZDÍL od
  // ostatních seq-diff efektů (bulbReplaceSuccessSeq apod.) tenhle musí
  // reagovat jen na SKUTEČNÝ nárůst (>), ne na jakoukoliv změnu — nová
  // směna (START_SHIFT/RESTART_SHIFT) resetuje `emergencyRunReadySeq` zpět
  // na 0 (viz createInitialGameState), což je taky "změna" oproti dřívější
  // nenulové hodnotě z předchozí směny. Prostý `!==` diff by tenhle reset
  // omylem vyhodnotil jako "windup zrovna doběhl" a znovu otevřel
  // EmergencyMiniGame hned po nové hře (viz bug: smrt v minihře -> nová
  // směna -> minihra se otevře znovu místo kanceláře).
  useEffect(() => {
    if (shouldLaunchEmergencyMiniGame(prevEmergencyRunReadySeqRef.current, state.emergencyRunReadySeq)) {
      // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) —
      // skutečné spuštění EmergencyMiniGame, bez ohledu na to, jestli je to
      // battery nebo shotgun run.
      recordExpeditionStarted();
      // Od noci 10, dokud hráč brokovnici ještě nemá, nabídne "Jít ven"
      // přednostně shotgun run místo battery runu (viz zadání "první krok k
      // true endingu", canStartShotgunEmergencyRun) — equipment vždy podle
      // aktuálního GameState, ne natvrdo prázdné (viz
      // game/core/emergencyMiniGameIntegration.ts).
      const equipment = { hasShotgun: state.hasShotgun, ammo: state.shotgunAmmo };
      // Hidden true ending (viz zadání, game/core/monsterEnding.ts) — pošle se
      // jen SUROVÝ stav (kolik zásahů má hráč PŘED výpravou, kolik jich noc
      // vyžaduje), ne předem spočítaný "je první zásah finální" boolean.
      // EmergencyMiniGame.tsx si finální zásah vyhodnocuje kumulativně PO
      // KAŽDÉM zásahu zvlášť (viz game/minigame/logic.ts#isMonsterHitFinal) —
      // nutné pro dvouhlavňovku, kde finální může být až druhý zásah výpravy.
      // Platí pro OBĚ výpravy (battery i shotgun run) — hráč může mít
      // brokovnici už z dřívějška, zásah proto není vázaný jen na "Jít ven
      // pro brokovnici". Práh (state.nightFeatures.monsterTrueEndingRequiredHits)
      // je admin-zkrácený (viz getNightConfig), ne natvrdo 10.
      // Sandbox výprava (viz zadání) — mapa VŽDY obsahuje i doplňkový loot
      // navíc k hlavnímu objective (battery/bulb garantované, shotgun
      // podmíněně), viz resolveExtraLootItems.
      if (canStartShotgunEmergencyRun(state.nightFeatures, state.hasShotgun)) {
        const extraLootItems = resolveExtraLootItems({
          primaryItemId: "shotgun",
          nightFeatures: state.nightFeatures,
          hasShotgun: state.hasShotgun,
        });
        setActiveMiniGame({
          id: "shotgun_run",
          input: createShotgunEmergencyInput(
            equipment,
            extraLootItems,
            state.monsterHitsToday,
            state.nightFeatures.monsterTrueEndingRequiredHits,
          ),
        });
      } else {
        const extraLootItems = resolveExtraLootItems({
          primaryItemId: "battery",
          nightFeatures: state.nightFeatures,
          hasShotgun: state.hasShotgun,
        });
        setActiveMiniGame({
          id: "battery_run",
          input: createBatteryEmergencyInput(
            equipment,
            extraLootItems,
            state.monsterHitsToday,
            state.nightFeatures.monsterTrueEndingRequiredHits,
          ),
        });
      }
    }
    prevEmergencyRunReadySeqRef.current = state.emergencyRunReadySeq;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.emergencyRunReadySeq]);

  // Držení "Nechat si to projít hlavou" doběhlo celé (viz gameReducer.ts
  // START_THINK_IT_OVER_WINDUP/TICK) — na rozdíl od emergencyRunReadySeq
  // výše tady nic nespouštíme, jen zobrazíme hlášku. Stejný `>` (ne `!==`)
  // diff jako emergencyRunReadySeq — nová směna resetuje thinkItOverReadySeq
  // zpět na 0, což by prostý `!==` diff mylně vzal za "windup zrovna doběhl".
  useEffect(() => {
    if (state.thinkItOverReadySeq > prevThinkItOverReadySeqRef.current) {
      setEmergencyRunMessage(COPY.game.thinkItOverResultLabel);
    }
    prevThinkItOverReadySeqRef.current = state.thinkItOverReadySeq;
  }, [state.thinkItOverReadySeq]);

  useEffect(() => {
    if (prevGameStatusRef.current !== "blackout" && state.gameStatus === "blackout") {
      audioManager.play(AUDIO_EVENTS.blackoutHowl);
    }
    prevGameStatusRef.current = state.gameStatus;
  }, [state.gameStatus]);

  // Fáze 1/2 blackoutu (viz getBlackoutPhaseIndex) mají svůj zvuk — vzdálený
  // krok, blížící se krok (vlastní blackoutSteps* eventy, ne enemyStep/
  // enemyNear normálního provozu — v blackoutu má "něco" znít jako těžká
  // přítomnost, ne jako běžný přiblížení nepřítele). Fázi 0 (start) pokrývá
  // blackoutHowl výše. Poslední fáze (3, těsně před koncem) NEhraje vlastní
  // krokový zvuk — místo toho ambient plynule doztichne úplně (viz
  // BLACKOUT_FINAL_AMBIENCE_FADE_MS), ať hráč čeká ve tichu. Roar těsně před
  // smrtí i finální jumpscare řeší samostatné efekty níže/na screen === "death".
  useEffect(() => {
    if (prevBlackoutPhaseSeqRef.current !== state.blackoutPhaseSeq) {
      const phase = getBlackoutPhaseIndex(state.blackoutElapsedMs, night.blackout);
      if (phase === 1) audioManager.play(AUDIO_EVENTS.blackoutStepsFar);
      else if (phase === 2) audioManager.play(AUDIO_EVENTS.blackoutStepsNear);
      else if (phase === 3) audioManager.fadeOutLoop(AUDIO_EVENTS.ambienceLoop, BLACKOUT_FINAL_AMBIENCE_FADE_MS);
      prevBlackoutPhaseSeqRef.current = state.blackoutPhaseSeq;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.blackoutPhaseSeq]);

  // Roar krátce PŘED smrtí v blackoutu (viz BlackoutDefinition.roarLeadMs,
  // GameState.blackoutRoarSeq) — čistý seq diff jako ostatní blackout efekty
  // výše, žádný vlastní setTimeout: časování už řeší reducer/TICK, tenhle
  // efekt jen přehraje zvuk v tiku, kdy seq vzroste.
  useEffect(() => {
    if (prevBlackoutRoarSeqRef.current !== state.blackoutRoarSeq) {
      audioManager.play(AUDIO_EVENTS.blackoutMonsterRoar);
      prevBlackoutRoarSeqRef.current = state.blackoutRoarSeq;
    }
  }, [state.blackoutRoarSeq]);

  // Falešný loading screen — po LOADING_SCREEN_DURATION_MS automaticky
  // přejde na briefing (viz components/screens/BriefingScreen.tsx), ne rovnou
  // na START_SHIFT — směna samotná start čeká na "Nastoupit na směnu".
  // Zatím nejde přeskočit, viz TODO.md.
  useEffect(() => {
    if (state.screen !== "loading") return;
    const timeout = setTimeout(() => {
      pendingShiftKindRef.current = "start";
      dispatch({ type: "SHOW_BRIEFING" });
    }, LOADING_SCREEN_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [state.screen]);

  function handleStart(gameMode: GameMode) {
    // Bezpečnostní pojistka navíc (MainMenuScreen už Hardcore bez přihlášení
    // blokuje/nabídne login prompt, viz zadání "i start handler by měl být
    // bezpečný") — kdyby sem přesto nějak prošlo "hardcore" bez session,
    // spadne na Normal, nikdy na hru s neplatným kombinovaným stavem.
    // resolveGameMode navíc chrání proti jakékoliv jiné neplatné hodnotě.
    const safeGameMode = resolveGameMode(gameMode === "hardcore" && !isAuthenticated ? "normal" : gameMode);
    selectedGameModeRef.current = safeGameMode;
    audioManager.init();
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "START_LOADING" });
  }

  // Briefing panel "Nastoupit na směnu" — spustí buď START_SHIFT (nový start
  // z menu/loading) nebo RESTART_SHIFT (retry po smrti/výhře), podle toho,
  // odkud hráč na briefing přišel (viz pendingShiftKindRef). Oba dostávají
  // stejná data: persistovaný stav žárovek + čerstvě rozřešený night config
  // pro aktuální noc (getNightConfig(currentNight).features) + gameMode/
  // livesRemaining (viz game/core/gameMode.ts).
  //
  // livesRemaining pravidlo: `state.livesRemaining > 0` znamená "Normal run
  // ještě pokračuje" (životy zůstaly ze smrti, viz gameReducer.ts
  // resolveLivesRemainingAfterDeath) — v tom případě se zachová BEZE ZMĚNY
  // (opakuje se stejná noc). Cokoliv jiné (0 = run skutečně skončil, ať už
  // Normal bez životů nebo Hardcore) znamená čerstvý start s plným počtem
  // životů pro aktuálně zvolený režim. Tahle jedna podmínka pokrývá i
  // "POKRAČOVAT" (win retry — lives nikdy neklesly, > 0 platí) i "NOVÁ HRA".
  function handleBeginShift() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    // Druhá pojistka proti bugu popsanému výše (viz emergencyRunReadySeq
    // efekt) — i kdyby se activeMiniGame z nějakého jiného důvodu nevynulovalo
    // (např. hráč zavře/odejde z minihry jinak než přes onComplete), nová
    // směna ho vždy explicitně vyčistí, ať /minihra nikdy nepřežije do
    // dalšího života hlídače.
    setActiveMiniGame(null);
    const nightFeatures = getNightConfig(currentNight, isAdmin).features;
    if (pendingShiftKindRef.current === "restart") {
      const gameMode = state.gameMode;
      // restoreNearMissLifeRef: viz komentář u deklarace výše — scriptovaný
      // "near miss" v Noci 1 nesmí stát život, i když ho reducer unconditionally
      // odečetl. Spotřebuje se přesně jednou (další restart už je normální).
      const rawLivesRemaining = restoreNearMissLifeRef.current ? state.livesRemaining + 1 : state.livesRemaining;
      restoreNearMissLifeRef.current = false;
      // rawLivesRemaining <= 0 znamená skutečný konec runu (Normal došly
      // životy, nebo Hardcore) — nový run vždy začíná bez brokovnice, POKUD
      // hráč nemá trvale odemčenou dvouhlavňovku (viz
      // game/core/shotgunEquipment.ts#createFreshRunShotgunEquipment,
      // game/core/monsterDefeatReward.ts) — stejná signalizace jako u
      // livesRemaining/gameMode.
      const isFreshRun = rawLivesRemaining <= 0;
      const livesRemaining = isFreshRun ? GAME_MODE_CONFIG[gameMode].startingLives : rawLivesRemaining;
      const shotgunEquipment = isFreshRun
        ? createFreshRunShotgunEquipment(getMonsterDefeatReward().doubleBarrelUnlocked)
        : // Dobití náboje na začátku (opakované i nové) noci (viz zadání
          // "Každý nový den / nová noc dobije 1 náboj") — bez brokovnice
          // zůstává 0, s dvouhlavňovkou dobije na 2.
          {
            hasShotgun: state.hasShotgun,
            hasDoubleBarrelShotgun: state.hasDoubleBarrelShotgun,
            shotgunAmmo: getRechargedShotgunAmmo(state),
          };
      dispatch({
        type: "RESTART_SHIFT",
        roomBulbs: getRoomBulbs(),
        bulbsRemaining: getBulbsRemaining(),
        nightFeatures,
        gameMode,
        livesRemaining,
        hasShotgun: shotgunEquipment.hasShotgun,
        hasDoubleBarrelShotgun: shotgunEquipment.hasDoubleBarrelShotgun,
        shotgunAmmo: shotgunEquipment.shotgunAmmo,
      });
    } else {
      const gameMode = selectedGameModeRef.current;
      const shotgunEquipment = createFreshRunShotgunEquipment(getMonsterDefeatReward().doubleBarrelUnlocked);
      // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) — jen
      // SKUTEČNĚ nový run (START_SHIFT z menu), ne RESTART_SHIFT pokračování
      // stejné směny po smrti s životy navíc.
      recordRunStarted();
      dispatch({
        type: "START_SHIFT",
        roomBulbs: getRoomBulbs(),
        bulbsRemaining: getBulbsRemaining(),
        nightFeatures,
        gameMode,
        livesRemaining: GAME_MODE_CONFIG[gameMode].startingLives,
        hasShotgun: shotgunEquipment.hasShotgun,
        hasDoubleBarrelShotgun: shotgunEquipment.hasDoubleBarrelShotgun,
        shotgunAmmo: shotgunEquipment.shotgunAmmo,
      });
    }
  }

  function handleRestart() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    pendingShiftKindRef.current = "restart";
    dispatch({ type: "SHOW_BRIEFING" });
  }

  // Dokončení first-night near-miss cinematic (viz efekt na state.screen ===
  // "death" výše) — NIKDY neodkrývá DeathScreen. Místo toho pokračuje přes
  // stejný briefing/restart flow jako běžný "retry" (handleRestart) — MVP
  // "bezpečně obnovená Noc 1", ne chirurgický návrat doprostřed rozehrané
  // směny. survivedNights/serverRunState nebyly touhle událostí nijak
  // změněny, takže briefing i getNightConfig dál správně ukážou Noc 1.
  function handleCinematicComplete() {
    setActiveCinematicSceneId(null);
    pendingShiftKindRef.current = "restart";
    dispatch({ type: "SHOW_BRIEFING" });
  }

  function handleGoToMenu() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "GO_TO_MENU" });
  }

  // Trvalá true ending odměna (viz zadání, game/core/monsterDefeatReward.ts) —
  // volá se PŘESNĚ jednou, když MonsterDefeatedScreen dokončí (nebo hráč
  // přeskočí) cinematic, NIKDY dřív (ne jen podle state.screen ===
  // "monsterDefeated" — hráč ještě nemusí cinematic vidět celý). Normal i
  // Hardcore odemykají stejnou odměnu — žádná podmínka na state.gameMode
  // tady záměrně není. Čistě lokální localStorage MVP (viz komentář v
  // monsterDefeatReward.ts) — server persistence není potřeba pro tenhle krok.
  function handleMonsterDefeatedCinematicComplete() {
    recordMonsterDefeat();
    // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) — stejné
    // volací místo (a tím stejná "jen jednou" záruka) jako recordMonsterDefeat
    // výše, ať monsterKills nikdy nedrifne od reward.monsterDefeatsCount.
    // MonsterDefeatedScreen.tsx sám hlídá, že onCinematicComplete nevystřelí
    // dvakrát za jedno mountnutí (viz jeho doneRef guard).
    recordMonsterKill();

    // Serverový Hardcore profil (viz zadání "serverové ukládání profilu
    // hlídače jen pro Hardcore") — VÝHRADNĚ Hardcore. Normal true ending se
    // zastaví přesně tady: lokální reward/stats výše se zapíšou beze změny
    // (Normal chování zůstává, jak bylo), ale žádný fetch na server se
    // nezavolá, žádná serverová Hardcore hodnota se nedotkne (viz zadání
    // "Normal true ending NESMÍ odemknout serverovou dvouhlavňovku/zvýšit
    // hardcoreMonsterDefeatsCount").
    if (state.gameMode !== "hardcore") return;

    // Izolovaný Hardcore-only lokální counter (viz
    // game/core/hardcorePlayerProfileSnapshot.ts) — NIKDY
    // game/core/monsterDefeatReward.ts (ten je mode-agnostic). Zvyšuje se
    // jen tady, jen pro Hardcore.
    const hardcoreProgress = recordLocalHardcoreMonsterDefeat();
    const snapshot = createHardcoreProfileSnapshotFromLocalState(getPlayerProfileStats(), hardcoreProgress);

    // Best-effort, stejný "fire and forget s warning logem" vzor jako
    // /api/player/death a /api/player/survive-night výše — selhání
    // (nepřihlášený hráč, VPS nedostupné) nesmí zablokovat/rozbít
    // MonsterDefeatedScreen, ProfileScreen.tsx na příštím načtení prostě
    // zůstane u lokálních dat.
    fetch("/api/player/hardcore-profile/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    }).catch((err) => {
      console.warn("[nocni-hlidac] hardcore-profile sync request failed", err);
    });
  }

  function handleToggleDoor() {
    dispatch({ type: "TOGGLE_DOOR" });
  }

  function handleLookAtDoor() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "LOOK_AT_DOOR" });
  }

  function handleLookAtDesk() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "LOOK_AT_DESK" });
  }

  // DEV-ONLY: DebugPanel's direct door toggle simulates both steps of the
  // normal flow (look at door, then toggle) instead of bypassing it.
  function handleDebugToggleDoor() {
    dispatch({ type: "LOOK_AT_DOOR" });
    dispatch({ type: "TOGGLE_DOOR" });
  }

  function handleLookAtGenerator() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "LOOK_AT_GENERATOR" });
  }

  function handleLookAtLeftWall() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "LOOK_AT_LEFT_WALL" });
  }

  // Zahájí DRŽENÍ "Nouzově opustit místnost" (viz LeftWallView.tsx tlačítko,
  // pointerDown) — nesmí jít vyběhnout hned, hráč musí tlačítko držet
  // EMERGENCY_RUN_WINDUP_DURATION_MS (stejný "drž a riskuj" vzor jako ruční
  // výměna žárovky). Po tu dobu dál běží normální herní smyčka (isRunning
  // se kvůli activeMiniGame vypíná až PO skutečném spuštění minihry, viz
  // useGameLoop níže) — hráč je reálně v ohrožení, ne jen čeká na loading.
  // Skutečné spuštění EmergencyMiniGame přijde až přes emergencyRunReadySeq
  // efekt výše, jakmile reducer dotáhne držení do konce.
  //
  // canStartBatteryEmergencyRun (night feature flag guard) se kontroluje i
  // TADY, ne jen skrytím tlačítka v LeftWallView — kdyby se tlačítko někdy
  // omylem zobrazilo (bug v UI/stará verze night configu apod.), spuštění
  // se tím i tak bezpečně odmítne. Zavřené dveře držení vůbec nezačnou —
  // tlačítko v LeftWallView zůstává klikatelné (jen vizuálně ztlumené), takže
  // sem pointerDown dorazí vždy; tady se rozhodne, jestli se opravdu spustí,
  // nebo jen ukáže hint.
  function handleStartEmergencyRunWindup() {
    if (!canStartBatteryEmergencyRun(state.nightFeatures) && !canStartShotgunEmergencyRun(state.nightFeatures, state.hasShotgun)) {
      return;
    }
    if (state.doorClosed) {
      audioManager.play(AUDIO_EVENTS.uiClick);
      setEmergencyRunMessage(COPY.game.emergencyRunNeedsOpenDoorLabel);
      return;
    }
    audioManager.play(AUDIO_EVENTS.uiClick);
    // Varování se ukáže hned při zahájení držení, ne až po dokončení — hráč
    // ho má vidět v okamžiku rozhodnutí, ne jako zpětné potvrzení.
    setEmergencyRunMessage(COPY.game.emergencyRunDangerWarningLabel);
    dispatch({ type: "START_EMERGENCY_RUN_WINDUP" });
  }

  function handleCancelEmergencyRunWindup() {
    dispatch({ type: "CANCEL_EMERGENCY_RUN_WINDUP" });
  }

  // "Nechat si to projít hlavou" (viz zadání) — stejný vzor jako
  // handleStartEmergencyRunWindup výše, ale bez "potřebuje otevřené dveře"
  // větve (canStartThinkItOverWindup nevyžaduje doorClosed). Guard je i tady
  // zdvojený (LeftWallView tlačítko se stejně zobrazí jen s hasShotgun) —
  // kdyby se přesto zobrazilo omylem, spuštění se bezpečně odmítne.
  function handleStartThinkItOverWindup() {
    if (!canStartThinkItOverWindup(state)) return;
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "START_THINK_IT_OVER_WINDUP" });
  }

  function handleCancelThinkItOverWindup() {
    dispatch({ type: "CANCEL_THINK_IT_OVER_WINDUP" });
  }

  // Jediné místo, které zpracuje EmergencyMiniGameResult (viz
  // EmergencyMiniGame onComplete kontrakt) — vždy zavře minihru, pak podle
  // outcome buď dobije energii (returned + worldEffects), spustí existující
  // death flow (dead), nebo jen tiše vrátí hráče zpět bez efektu (failed).
  function handleEmergencyMiniGameComplete(result: EmergencyMiniGameResult) {
    setActiveMiniGame(null);

    if (result.outcome === "dead") {
      dispatch({ type: "EMERGENCY_MINIGAME_DIED" });
      return;
    }

    if (result.outcome === "returned") {
      // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) — jen
      // "returned", nikdy "dead"/"failed" (ty se dřív vrátí/nedojdou sem).
      recordExpeditionReturned();
      const newPower = applyEmergencyWorldEffects(state.power, result.worldEffects);
      const rechargedAmount = newPower - state.power;
      const messages: string[] = [];
      if (rechargedAmount > 0) {
        dispatch({ type: "RECHARGE_POWER", amount: rechargedAmount });
        // Zaokrouhleno na celé číslo — power je plynule odčerpávaný float
        // (viz applyPowerDelta v gameReducer.ts), takže rechargedAmount by
        // jinak v textu ukazoval desetinná místa (a při clampu na MAX_POWER
        // i necelé zbytkové "+12.7"), zatímco HUD (PowerMeter.tsx) energii
        // vždy zobrazuje zaokrouhlenou (Math.round).
        messages.push(COPY.game.emergencyRunEnergyRechargedLabel.replace("{amount}", String(Math.round(rechargedAmount))));
      }

      // "Donesl jsem baterii, ale přivedl jsem si to za sebou" (viz zadání) —
      // posune enemyStage blíž ke kanceláři, NIKDY nezpůsobí smrt tady ani v
      // gameReducer.ts (viz APPLY_OFFICE_THREAT_ON_RETURN) — skutečný
      // útok/smrt se dál rozhoduje jen v normálním ENEMY_ADVANCE tiku, hráč
      // má reálné okno zareagovat dveřmi/světlem/kamerou.
      if (result.officeThreatOnReturn?.active) {
        dispatch({ type: "APPLY_OFFICE_THREAT_ON_RETURN", intensity: result.officeThreatOnReturn.intensity });
        messages.push(COPY.game.emergencyRunThreatFollowedLabel);
      }

      // Zamčené dveře kanceláře (viz zadání) — hráč zůstal venku moc dlouho,
      // monstrum FYZICKY doběhlo do kanceláře v minihře (viz
      // EmergencyWorldEffect "monster_reached_office"). Vlastní krizový
      // aftermath (viz gameReducer.ts APPLY_MONSTER_REACHED_OFFICE_AFTERMATH,
      // game/core/officeBreachAftermath.ts) — NE stejná reakce jako
      // officeThreatOnReturn výše (ta jen posune enemyStage). Tenhle scénář
      // navíc rozbije žárovku a spustí poruchu generátoru, s vlastní delší
      // reakční dobou. Nezávislé na officeThreatOnReturn výše — obě se mohou
      // v jedné výpravě uplatnit zároveň.
      if (resolveOfficeThreatTriggeredFromWorldEffects(result.worldEffects)) {
        dispatch({ type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" });
        messages.push(COPY.game.emergencyRunMonsterReachedOfficeLabel);
        // Krizový návrat musí posadit hráče rovnou před dveře (viz zadání
        // "první krok je zavřít dveře, ne přepínat pohledy") — hráč se
        // typicky vrací zpátky na left_wall (odkud minihru spustil), stejná
        // existující akce jako tlačítko "Otočit se ke dveřím". Běžný návrat
        // BEZ monster_reached_office zůstává beze změny (playerView se
        // nedotýká).
        dispatch({ type: "LOOK_AT_DOOR" });
      }

      // Brokovnice/náboj (viz zadání "první krok k true endingu",
      // game/core/shotgunEquipment.ts) — KAŽDÝ bezpečný návrat dobije náboj
      // na plno, pokud hráč brokovnici má (ať už ji přinesl teď, nebo už ji
      // měl dřív), bez ohledu na to, co přesně sebral/kolik nábojů cestou
      // vystřelil. "dead"/"failed" výše tenhle dispatch vůbec nezavolají —
      // brokovnice/náboj se tedy nikdy nezíská bez skutečného návratu.
      const shotgunResult = applyShotgunEmergencyReturn(
        { hasShotgun: state.hasShotgun, hasDoubleBarrelShotgun: state.hasDoubleBarrelShotgun },
        state.shotgunAmmo,
        result.worldEffects,
      );
      if (shotgunResult.hasShotgun !== state.hasShotgun || shotgunResult.shotgunAmmo !== state.shotgunAmmo) {
        dispatch({ type: "APPLY_SHOTGUN_EFFECTS", hasShotgun: shotgunResult.hasShotgun, shotgunAmmo: shotgunResult.shotgunAmmo });
        if (!state.hasShotgun && shotgunResult.hasShotgun) {
          messages.push(COPY.game.shotgunAcquiredLabel);
        }
      }

      // Žárovka (viz zadání "ověřit napojení žárovky do hlavní hry") —
      // "bulbs_serviced" worldEffect přičte do existujícího bulbsRemaining
      // skladu (game/core/bulbInventory.ts), žádný nový paralelní systém.
      const bulbsGained = resolveBulbsGainedFromWorldEffects(result.worldEffects);
      if (bulbsGained > 0) {
        dispatch({ type: "ADD_BULBS_REMAINING", amount: bulbsGained });
        messages.push(COPY.game.bulbAcquiredLabel);
      }

      // Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — zásah se
      // potvrdí AŽ TADY, při bezpečném návratu (result.monsterHits, 0/1/2 s
      // dvouhlavňovkou); smrt/nedokončená výprava (outcome "dead"/"failed")
      // tenhle dispatch nikdy nezavolají. Zpráva je záměrně nekonkrétní
      // (žádné "X/10"), ať zůstane skrytý — stejný text při každém
      // potvrzeném zásahu (i při dvou najednou), bez odhalování postupu.
      if (result.monsterHits > 0) {
        // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) —
        // state.pendingMonsterHits je tady pořád PŘED-dispatchová hodnota
        // (stejná, kterou CONFIRM_MONSTER_HIT níže právě potvrdí) — přesně
        // "skutečný počet potvrzených zásahů", ne pevná +1.
        recordMonsterHitsConfirmed(state.pendingMonsterHits);
        dispatch({ type: "CONFIRM_MONSTER_HIT" });
        messages.push(COPY.game.monsterHitConfirmedLabel);
      }

      if (messages.length > 0) setEmergencyRunMessage(messages.join("\n"));
      return;
    }

    // outcome === "failed": zatím jen bezpečně zavřít minihru beze změny
    // energie — hráč se vrátí do kanceláře přesně tam, kde hru opustil.
  }

  // Hráč venku PRÁVĚ TEĎ trefil monstrum brokovnicí (viz
  // EmergencyMiniGame.tsx#fireShot) — volá se jednou za KAŽDÝ nově
  // započítaný zásah (až dvakrát za výpravu s dvouhlavňovkou), jen se to
  // poznamená (GameState.pendingMonsterHits += 1), NEPOTVRZUJE se tím žádný
  // zásah pro hidden true ending. Potvrzení přijde až z
  // handleEmergencyMiniGameComplete při bezpečném návratu
  // (result.monsterHits); smrt venku (EMERGENCY_MINIGAME_DIED) ho zase
  // zahodí.
  function handleMonsterHit() {
    dispatch({ type: "MARK_PENDING_MONSTER_HIT" });
  }

  function handleLookAtMap() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "LOOK_AT_MAP" });
  }

  function handleRestartGenerator() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) — čte se
    // PŘED dispatchem, přes sdílenou willGeneratorRestartSucceed (stejná
    // podmínka jako gameReducer.ts RESTART_GENERATOR "úspěšná" větev).
    // Zbytečný klik na FUNKČNÍ generátor (generatorAccidentalRestartSeq)
    // se NEPOČÍTÁ jako úspěšný restart.
    if (willGeneratorRestartSucceed(state)) {
      recordGeneratorRestarted();
    }
    dispatch({ type: "RESTART_GENERATOR" });
  }

  // DEV-ONLY: same simulate-both-steps pattern as handleDebugToggleDoor.
  function handleDebugRestartGenerator() {
    dispatch({ type: "LOOK_AT_GENERATOR" });
    dispatch({ type: "RESTART_GENERATOR" });
  }

  function handleToggleLight() {
    dispatch({ type: "TOGGLE_LIGHT" });
  }

  function handleStartBulbReplacement() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "START_BULB_REPLACEMENT" });
  }

  function handleCancelBulbReplacement() {
    dispatch({ type: "CANCEL_BULB_REPLACEMENT" });
  }

  function handleSelectCamera(cameraId: CameraId) {
    // heartbeat je zvuk překvapení: hraje jen když je nepřítel právě na
    // kameře nejblíž hráči, a jen poprvé za tuto "návštěvu" — další kliknutí
    // (třeba na jinou kameru a zpátky), dokud tam pořád je, ho neopakuje.
    if (state.enemyStage === nearestCamera.enemyVisibleAtStage && !hasPlayedNearCameraSurpriseRef.current) {
      audioManager.play(AUDIO_EVENTS.heartbeat);
      hasPlayedNearCameraSurpriseRef.current = true;
    }
    dispatch({ type: "OPEN_CAMERA", cameraId });
  }

  function handleCloseCameras() {
    dispatch({ type: "CLOSE_CAMERAS" });
  }

  function handleToggleAudio() {
    dispatch({ type: "TOGGLE_AUDIO_MUTED" });
  }

  const tensionLevel = computeTensionLevel({
    power: state.power,
    startPower: night.startPower,
    remainingMs: state.remainingMs,
    durationMs: night.durationMs,
    enemyStage: state.enemyStage,
    doorClosed: state.doorClosed,
    gameStatus: state.gameStatus,
  });
  const atmosphereStyle = tensionToAtmosphereStyle(tensionLevel);
  const atmosphereVars = atmosphereStyleToCssVars(atmosphereStyle);

  return (
    <>
    <div
      className="atmosphere-root"
      data-flicker={atmosphereStyle.flicker}
      style={atmosphereVars as React.CSSProperties}
    >
      {state.screen === "menu" && <MainMenuScreen onStart={handleStart} />}
      {state.screen === "loading" && <LoadingScreen />}
      {state.screen === "briefing" && <BriefingScreen nightNumber={currentNight} onStartShift={handleBeginShift} />}
      {state.screen === "playing" && !activeMiniGame && (
        <GameScreen
          state={state}
          night={night}
          tensionLevel={tensionLevel}
          heartbeatStress={heartbeatStress}
          nightNumber={currentNight}
          serverCurrentRun={serverRunState?.currentRun ?? null}
          localSurvivedNights={survivedNights}
          bulbsRemaining={state.bulbsRemaining}
          onToggleDoor={handleToggleDoor}
          onToggleLight={handleToggleLight}
          onSelectCamera={handleSelectCamera}
          onCloseCameras={handleCloseCameras}
          onToggleAudio={handleToggleAudio}
          onLookAtDoor={handleLookAtDoor}
          onLookAtDesk={handleLookAtDesk}
          onLookAtGenerator={handleLookAtGenerator}
          onLookAtLeftWall={handleLookAtLeftWall}
          onLookAtMap={handleLookAtMap}
          onRestartGenerator={handleRestartGenerator}
          onDebugToggleDoor={handleDebugToggleDoor}
          onDebugRestartGenerator={handleDebugRestartGenerator}
          onStartBulbReplacement={handleStartBulbReplacement}
          onCancelBulbReplacement={handleCancelBulbReplacement}
          onStartEmergencyRunWindup={handleStartEmergencyRunWindup}
          onCancelEmergencyRunWindup={handleCancelEmergencyRunWindup}
          onStartThinkItOverWindup={handleStartThinkItOverWindup}
          onCancelThinkItOverWindup={handleCancelThinkItOverWindup}
        />
      )}
      {/* Nouzová minihra (viz components/minigame/EmergencyMiniGame.tsx) —
          nahrazuje GameScreen, dokud activeMiniGame běží (viz
          handleStartEmergencyRun/handleEmergencyMiniGameComplete výše).
          `key` na id zajistí čistý remount při případném dalším emergency
          scénáři v budoucnu, ať si komponenta nikdy neponechá starý interní
          stav z předchozího běhu. Vlastní <main> obal (stejný tmavý radarový
          styl jako app/minihra/page.tsx), ať minihra nezávisí na GameScreen
          layoutu, který se tu vůbec nerenderuje. */}
      {state.screen === "playing" && activeMiniGame && (
        <main className="relative min-h-screen p-4 flex flex-col items-center justify-center" style={{ background: "#020a05" }}>
          <div className="w-full max-w-3xl">
            <EmergencyMiniGame
              key={activeMiniGame.id}
              input={activeMiniGame.input}
              onComplete={handleEmergencyMiniGameComplete}
              onMonsterHit={handleMonsterHit}
            />
          </div>
        </main>
      )}
      {/* Cinematic scéna se spouští jen pro first-night near-miss (viz efekt
          výše — isFirstNightNearMiss) — NIKDY nevede na DeathScreen, po
          dokončení (handleCinematicComplete) jde přes briefing zpátky do
          "bezpečně obnovené" Noci 1. Nejdřív krátká tichá pauza
          (cinematicPending, prázdná černá obrazovka), pak CinematicScreen.
          Druhá+ chyba v Noci 1 i Noc 2+ nikdy nenastaví activeCinematicSceneId
          — DeathScreen se zobrazí rovnou jako dnes. */}
      {state.screen === "death" && cinematicPending && <main className="relative min-h-screen w-full bg-black" />}
      {state.screen === "death" && !cinematicPending && activeCinematicSceneId && (
        <CinematicScreen sceneId={activeCinematicSceneId} onComplete={handleCinematicComplete} />
      )}
      {state.screen === "death" && !cinematicPending && !activeCinematicSceneId && (
        <DeathScreen
          reason={state.deathReason}
          deathCount={deathCount}
          gameMode={state.gameMode}
          livesRemaining={state.livesRemaining}
          nightNumber={currentNight}
          onRetry={handleRestart}
        />
      )}
      {state.screen === "win" && (
        <WinScreen survivedNights={survivedNights} onRetry={handleRestart} onGoToMenu={handleGoToMenu} />
      )}
      {/* Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — má
          přednost před běžným win/death flow (gameReducer.ts#CONFIRM_MONSTER_HIT
          nastaví screen "monsterDefeated" přímo, ne přes TICK/ENEMY_ADVANCE). */}
      {state.screen === "monsterDefeated" && (
        <MonsterDefeatedScreen onGoToMenu={handleGoToMenu} onCinematicComplete={handleMonsterDefeatedCinematicComplete} />
      )}
    </div>
    {/* Achievement toast (viz components/game/AchievementToast.tsx) je záměrně
        SOUROZENEC .atmosphere-root, ne jeho potomek — .atmosphere-root má
        trvalý CSS filter (styles/atmosphere.css), který by jinak z něj
        udělal containing block pro position: fixed potomky (stejný gotcha
        jako u LeftWallView.tsx/CinematicScreen.tsx). */}
    {activeAchievement && (
      <AchievementToast achievement={activeAchievement} onDismiss={() => setActiveAchievement(null)} />
    )}
    {/* Trvalý admin indikátor (viz lib/auth/adminUsers.ts, zadání) — na
        VŠECH obrazovkách, ne jen během hraní, proto tady vedle
        AchievementToast (sourozenec .atmosphere-root), ne uvnitř GameScreen. */}
    {isAdmin && <AdminBadge />}
    {/* Krátká zpráva po návratu z nouzové minihry (viz handleEmergencyMiniGameComplete)
        — stejný "sourozenec .atmosphere-root" důvod jako AchievementToast výše,
        záměrně bez nového toast systému (žádná animace, jen auto-mizející text). */}
    {emergencyRunMessage && (
      <div className="fixed top-4 left-4 z-[100] pointer-events-none w-[calc(100%-2rem)] max-w-xs sm:w-80">
        <div className="pixel-panel p-3 text-xs text-amber-300 whitespace-pre-line">{emergencyRunMessage}</div>
      </div>
    )}
    </>
  );
}
