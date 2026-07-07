"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import MainMenuScreen from "@/components/screens/MainMenuScreen";
import LoadingScreen from "@/components/screens/LoadingScreen";
import BriefingScreen from "@/components/screens/BriefingScreen";
import GameScreen from "@/components/screens/GameScreen";
import DeathScreen from "@/components/screens/DeathScreen";
import WinScreen from "@/components/screens/WinScreen";
import { NIGHT_01 } from "@/game/nights/night01";
import { createInitialGameState } from "@/game/core/gameState";
import { createGameReducer } from "@/game/core/gameReducer";
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
} from "@/game/balancing/constants";
import CinematicScreen from "@/components/screens/CinematicScreen";
import { CinematicSceneId } from "@/content/cinematics";
import AchievementToast from "@/components/game/AchievementToast";
import { Achievement, getAchievement } from "@/content/achievements";
import { unlockAchievement } from "@/game/core/achievementStorage";
import { getDeathCount, incrementDeathCount } from "@/game/core/deathCount";
import { hasUsedFirstNightTechnicianWarning, markFirstNightTechnicianWarningUsed } from "@/game/core/firstNightWarning";
import { getSurvivedNights, incrementSurvivedNights, resetSurvivedNights } from "@/game/core/survivedNights";
import { getBulbsRemaining, setBulbsRemaining } from "@/game/core/bulbInventory";
import { applyDailyBulbService, getRoomBulbs, setRoomBulbs } from "@/game/core/roomBulbs";
import { useHeartbeatStress } from "@/game/audio/useHeartbeatStress";
import { getNightConfig } from "@/game/difficulty/nightConfig";
import type { AuthenticatedPlayer } from "@/lib/auth/types";
import type { GuardRunState } from "@/lib/leaderboard/types";
import type { GuardRunResponse } from "@/lib/leaderboard/guardRunRequestHandlers";

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
  // Jediný zdroj "kolikátá noc" — používá ho HUD (ShiftTimer přes nightNumber
  // prop níže), night scaling (game/difficulty/nightScaling.ts) i briefing
  // (getNightConfig). Serverový currentRun má přednost, jakmile je k
  // dispozici — lokální survivedNights je jen fallback (anonymní hráč, nebo
  // než se server stav stihne načíst).
  const currentNight = serverRunState ? serverRunState.currentRun + 1 : survivedNights + 1;

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
    isRunning: state.isRunning,
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
  const prevGameStatusRef = useRef(state.gameStatus);
  const prevBlackoutPhaseSeqRef = useRef(state.blackoutPhaseSeq);
  const prevBulbBreakSeqRef = useRef(state.bulbBreakSeq);
  const prevBulbReplaceSuccessSeqRef = useRef(state.bulbReplaceSuccessSeq);
  // Zvuk překvapení na nejbližší kameře smí zaznít jen jednou za "návštěvu" —
  // dokud tam nepřítel je, další kliknutí na kameru (ani na jinou a zpátky) ho
  // znovu nespustí. Resetuje se, až nepřítel z téhle stage odejde (uteče/postoupí).
  const hasPlayedNearCameraSurpriseRef = useRef(false);
  // Briefing panel (viz components/screens/BriefingScreen.tsx) je mezikrok
  // před START_SHIFT i před RESTART_SHIFT — tenhle ref si pamatuje, kterou
  // z těch dvou akcí má "Nastoupit na směnu" po skončení briefingu spustit.
  const pendingShiftKindRef = useRef<"start" | "restart">("start");
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
        // Aktuální hlídač skončil — survival streak jde na 0 (viz
        // game/core/survivedNights.ts), death counter nahoře tím není dotčený.
        setSurvivedNights(resetSurvivedNights());
        // Žárovka je vlastnost OBJEKTU, ne hlídače — smrt ji jen uloží tak, jak
        // byla (žádný denní servis, ten běží jen po přežité směně, viz "win"
        // níže), ať další hlídač pokračuje přesně odtud, kde předchozí skončil.
        setRoomBulbs(state.roomBulbs);
        // Náhradní žárovky patří do campaignu stejně jako roomBulbs — pokud
        // hráč spotřeboval kus dřív v týhle směně (dokončená ruční výměna),
        // musí to přežít i smrt z jiného důvodu, ne se ztratit.
        setBulbsRemaining(state.bulbsRemaining);
        // Best-effort online stav (viz TECH_DESIGN.md "VPS API specifikace") —
        // server si identitu vezme ze session, ne odsud (klient nikdy neposílá
        // discordUserId). Nepřihlášený hráč dostane 401, nedostupné VPS API
        // 202 — v obou případech hra pokračuje beze změny, jen zaloguje warning
        // (viz applyGuardRunResponse), ať je z Vercel logu jasné, že server
        // currentRun se pro tenhle běh nemusel resetovat na 0.
        fetch("/api/player/death", { method: "POST" })
          .then((res) => res.json())
          .then((body: GuardRunResponse["body"]) => applyGuardRunResponse(body, "death"))
          .catch((err) => {
            console.warn("[nocni-hlidac] death request failed — server currentRun may not have been reset to 0", err);
          });
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
      // Best-effort online stav — stejná pravidla jako u "death" výše
      // (identita ze session, žádné opakované volání každou sekundu, jen
      // jednou za skutečný přechod na "win"). Úspěch aktualizuje
      // serverRunState, ať příští briefing ukáže SKUTEČNĚ další noc podle
      // serveru, ne lokální counter.
      fetch("/api/player/survive-night", { method: "POST" })
        .then((res) => res.json())
        .then((body: GuardRunResponse["body"]) => applyGuardRunResponse(body, "survive-night"))
        .catch((err) => {
          console.warn("[nocni-hlidac] survive-night request failed — server currentRun may not have advanced", err);
        });
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
    if (prevMonsterRetreatRoarSeqRef.current !== state.monsterRetreatRoarSeq) {
      audioManager.play(AUDIO_EVENTS.monsterRetreatRoar);
      prevMonsterRetreatRoarSeqRef.current = state.monsterRetreatRoarSeq;
    }
  }, [state.monsterRetreatRoarSeq]);

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
    }
  }, [state.bulbReplaceSuccessSeq]);

  useEffect(() => {
    if (prevGameStatusRef.current !== "blackout" && state.gameStatus === "blackout") {
      audioManager.play(AUDIO_EVENTS.blackoutHowl);
    }
    prevGameStatusRef.current = state.gameStatus;
  }, [state.gameStatus]);

  // Fáze 1/2 blackoutu (viz getBlackoutPhaseIndex) mají svůj zvuk — vzdálený
  // krok, blížící se krok. Fázi 0 (start) pokrývá blackoutHowl výše. Poslední
  // fáze (3, těsně před koncem) záměrně NEhraje žádný další zvuk — místo
  // toho ambient plynule doztichne úplně (viz BLACKOUT_FINAL_AMBIENCE_FADE_MS),
  // ať hráč čeká na smrt potichu, ne s dalším efektem navrch. Konec
  // (jumpscare) pokrývá efekt na screen === "death" beze změny.
  useEffect(() => {
    if (prevBlackoutPhaseSeqRef.current !== state.blackoutPhaseSeq) {
      const phase = getBlackoutPhaseIndex(state.blackoutElapsedMs, night.blackout);
      if (phase === 1) audioManager.play(AUDIO_EVENTS.enemyStep);
      else if (phase === 2) audioManager.play(AUDIO_EVENTS.enemyNear);
      else if (phase === 3) audioManager.fadeOutLoop(AUDIO_EVENTS.ambienceLoop, BLACKOUT_FINAL_AMBIENCE_FADE_MS);
      prevBlackoutPhaseSeqRef.current = state.blackoutPhaseSeq;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.blackoutPhaseSeq]);

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

  function handleStart() {
    audioManager.init();
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "START_LOADING" });
  }

  // Briefing panel "Nastoupit na směnu" — spustí buď START_SHIFT (nový start
  // z menu/loading) nebo RESTART_SHIFT (retry po smrti/výhře), podle toho,
  // odkud hráč na briefing přišel (viz pendingShiftKindRef). Oba dostávají
  // stejná data: persistovaný stav žárovek + čerstvě rozřešený night config
  // pro aktuální noc (getNightConfig(currentNight).features).
  function handleBeginShift() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    const nightFeatures = getNightConfig(currentNight).features;
    if (pendingShiftKindRef.current === "restart") {
      dispatch({ type: "RESTART_SHIFT", roomBulbs: getRoomBulbs(), bulbsRemaining: getBulbsRemaining(), nightFeatures });
    } else {
      dispatch({ type: "START_SHIFT", roomBulbs: getRoomBulbs(), bulbsRemaining: getBulbsRemaining(), nightFeatures });
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

  function handleLookAtMap() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    dispatch({ type: "LOOK_AT_MAP" });
  }

  function handleRestartGenerator() {
    audioManager.play(AUDIO_EVENTS.uiClick);
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
      {state.screen === "playing" && (
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
        />
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
        <DeathScreen reason={state.deathReason} deathCount={deathCount} onRetry={handleRestart} />
      )}
      {state.screen === "win" && (
        <WinScreen survivedNights={survivedNights} onRetry={handleRestart} onGoToMenu={handleGoToMenu} />
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
    </>
  );
}
