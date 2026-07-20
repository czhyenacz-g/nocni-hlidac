"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import MainMenuScreen from "@/components/screens/MainMenuScreen";
import LoadingScreen from "@/components/screens/LoadingScreen";
import BriefingScreen from "@/components/screens/BriefingScreen";
import GameScreen from "@/components/screens/GameScreen";
import DeathScreen from "@/components/screens/DeathScreen";
import WinScreen from "@/components/screens/WinScreen";
import Night30EndingScreen from "@/components/screens/Night30EndingScreen";
import MonsterDefeatedScreen from "@/components/screens/MonsterDefeatedScreen";
import DeathSequenceOverlay from "@/components/death/DeathSequenceOverlay";
import { getLiveDeathSequenceConfig, isDoorAttackDeath } from "@/game/death/liveDeathSequenceConfig";
import { resolveNightDefinition } from "@/game/nights/nightRegistry";
import { createInitialGameState } from "@/game/core/gameState";
import {
  canStartGeneratorOverloadWindup,
  canStartThinkItOverWindup,
  createGameReducer,
  isBulbReplacementReadyToConfirm,
  willGeneratorRestartSucceed,
} from "@/game/core/gameReducer";
import { isWatchingDisabledCameraFootstepsSource } from "@/game/core/cameraDamage";
import { useGameLoop } from "@/game/core/gameLoop";
import { CameraId, GhoulCameraAttackAnimationId } from "@/game/core/types";
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_EVENTS } from "@/game/audio/audioEvents";
import { AUDIO_CONFIG } from "@/game/audio/audioConfig";
import { computeTitanFootstepVolume } from "@/game/audio/titanFootsteps";
import { isTitanEncounterActive } from "@/game/core/titanEncounter";
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
  TITAN_FOOTSTEP_VOLUME_RAMP_MS,
} from "@/game/balancing/constants";
import { getTitanEncounterNights, resetTitanEncounterNights } from "@/game/core/titanEncounterNights";
import { chooseDoorBangPlaybackPlan } from "@/game/audio/doorBangPlayback";
import CinematicScreen from "@/components/screens/CinematicScreen";
import { CinematicSceneId } from "@/content/cinematics";
import AchievementToast from "@/components/game/AchievementToast";
import AdminBadge from "@/components/game/AdminBadge";
import { Achievement, getAchievement } from "@/content/achievements";
import { unlockAchievement } from "@/game/core/achievementStorage";
import { getDeathCount, incrementDeathCount } from "@/game/core/deathCount";
import { MonsterDefeatReward, getMonsterDefeatReward, recordMonsterDefeat } from "@/game/core/monsterDefeatReward";
import {
  PlayerProfileStats,
  getPlayerProfileStats,
  recordBulbReplaced,
  recordDeath,
  recordExpeditionReturned,
  recordExpeditionStarted,
  recordGeneratorRestarted,
  recordHardcoreDeathOnNight,
  recordMonsterHitsConfirmed,
  recordMonsterKill,
  recordNightSurvived,
  recordRunStarted,
} from "@/game/core/playerProfileStats";
import {
  createHardcoreProfileSnapshotFromLocalState,
  recordLocalHardcoreMonsterDefeat,
} from "@/game/core/hardcorePlayerProfileSnapshot";
import { PlayerAchievement } from "@/game/core/playerAchievements";
import { resolveAchievementResultUnlocks } from "@/game/core/achievementResultUnlocks";
import { getShownResultAchievementIds, markResultAchievementsAsShown } from "@/game/core/achievementResultStorage";
import { hasUsedFirstNightTechnicianWarning, markFirstNightTechnicianWarningUsed } from "@/game/core/firstNightWarning";
import { shouldShowValhalaEndingCinematic } from "@/game/core/valhalaEnding";
import { Night30EndingKind, resolveNight30Ending } from "@/game/core/night30Ending";
import { getSurvivedNights, incrementSurvivedNights, resetSurvivedNights } from "@/game/core/survivedNights";
import { getBulbsRemaining, setBulbsRemaining } from "@/game/core/bulbInventory";
import { shouldPlaySonicCannonToggleClick } from "@/game/core/sonicCannon";
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
import { applyShotgunEmergencyReturn, canRequestAmmo, getRechargedShotgunAmmo } from "@/game/core/shotgunEquipment";
import EmergencyMiniGame from "@/components/minigame/EmergencyMiniGame";
import { EmergencyMiniGameInput, EmergencyMiniGameResult } from "@/game/minigame/types";
import { COPY } from "@/content/copy";
import type { AuthenticatedPlayer } from "@/lib/auth/types";
import { isAdminUsername } from "@/lib/auth/adminUsers";
import type { GuardRunState } from "@/lib/leaderboard/types";
import type { GuardRunResponse } from "@/lib/leaderboard/guardRunRequestHandlers";
import { DEFAULT_GAME_MODE, GAME_MODE_CONFIG, GameMode, resolveGameMode } from "@/game/core/gameMode";
import { Object13PlayerProfileProvider, useObject13PlayerProfile } from "@/components/playerProfile/Object13PlayerProfileProvider";
import { resolveStartingBulbsRemaining } from "@/game/core/bulbInventory";
import {
  BulbInventoryOperationState,
  decideBulbReplacementConfirmAction,
  deriveBulbInventoryConfirmOutcome,
} from "@/game/inventory/bulbInventoryController";
import {
  deriveWeaponAcquisitionConfirmOutcome,
  resolveFreshRunShotgunEquipment,
  resolveWeaponAcquisitionPersistenceMode,
} from "@/game/equipment/weaponAcquisitionController";
import { resolveExistingPlayerWeaponMigrationAction } from "@/game/equipment/existingPlayerWeaponMigration";

/**
 * Object13PlayerProfileProvider (viz zadání "krok 1B" a "profilový kontrakt
 * V1 + inventář žárovek") obaluje CELOU stránku ZVENKU — `PlayPageContent`
 * je jeho potomek, takže může volat `useObject13PlayerProfile()` přímo
 * (Provider nemůže obalovat vlastní komponentu zevnitř jejího vlastního
 * návratu a zároveň jí dát přístup ke svému kontextu).
 */
export default function PlayPage() {
  return (
    <Object13PlayerProfileProvider>
      <PlayPageContent />
    </Object13PlayerProfileProvider>
  );
}

function PlayPageContent() {
  const object13Profile = useObject13PlayerProfile();

  // Noc/reducer/nearestCamera musí být PŘED useReducer níže (potřebuje
  // `night` pro svůj lazy initializer) — proto jsou tyhle tři hooky (dřív
  // deklarované až za useReducer, viz zadání kontext "hoisted") teď tady,
  // hned na začátku. Nezávisí na `state` ani na sobě navzájem v žádném
  // problematickém pořadí (plain useState/useRef bez GameState reference).
  //
  // `debugNightOverride` je NOVÝ, čistě komponentový mirror
  // GameState.debugNightOverride (viz gameReducer.ts SET_DEBUG_NIGHT) —
  // existuje VÝHRADNĚ proto, aby šlo přepnout `night`/`gameReducer`
  // (viz useMemo níže) DŘÍV, než je vůbec spočítaný `state` (kruhová
  // závislost: state potřebuje gameReducer, gameReducer potřebuje night,
  // night potřebuje "kolikátá noc", a tahle hodnota byla dřív počítaná AŽ
  // ZE state.debugNightOverride). GameState.debugNightOverride samo dál
  // existuje beze změny (zobrazení/scaling/getNightConfig níže) —
  // `handleSetDebugNight`/`handleDebugStartTitan` teď jen aktualizují OBĚ
  // hodnoty atomicky, ať zůstanou v souladu.
  const [debugNightOverride, setDebugNightOverride] = useState<number | null>(null);
  const selectedGameModeRef = useRef<GameMode>(DEFAULT_GAME_MODE);
  const [survivedNights, setSurvivedNights] = useState(() => getSurvivedNights());
  const [serverRunState, setServerRunState] = useState<GuardRunState | null>(null);
  // Persistovaná trojice náhodně vylosovaných "Titanových nocí" pro AKTUÁLNÍ
  // průchod (viz zadání "tři náhodná setkání s Titanem během 30 nocí",
  // game/core/titanEncounterNights.ts) — lazy initializer čte/losuje jen
  // JEDNOU při mountu (viz zadání "nevylosovávej při každém renderu"),
  // vyresetuje se explicitně (setTitanEncounterNights(resetTitanEncounterNights()))
  // VÝHRADNĚ na stejném místě jako survivedNights/serverRunState reset po
  // skutečném konci runu (viz efekt na state.screen === "death" níže) —
  // NIKDY na pouhý restart stejné noci.
  const [titanEncounterNights, setTitanEncounterNights] = useState<number[]>(() => getTitanEncounterNights());

  // Stejný vzorec jako `currentNight` dřív (viz níže) — jen s
  // `debugNightOverride` (mirror výše) místo `state.debugNightOverride`,
  // protože `state` tady ještě neexistuje. Jakmile jednou night/gameReducer
  // ukáže na Titanovu NightDefinition, `night`/`gameReducer` se PŘES
  // useMemo přepočítají PŘED tím, než React zpracuje jakýkoliv nově
  // dispatchnutý action (viz zadání "8. ADMIN / DEBUG OVLÁDÁNÍ" a
  // handleDebugStartTitan níže, který spoléhá přesně na tohle pořadí).
  const currentNightEstimate =
    debugNightOverride ??
    (selectedGameModeRef.current === "hardcore" && serverRunState ? serverRunState.currentRun + 1 : survivedNights + 1);
  const night = useMemo(
    () => resolveNightDefinition(currentNightEstimate, titanEncounterNights),
    [currentNightEstimate, titanEncounterNights],
  );
  const gameReducer = useMemo(() => createGameReducer(night), [night]);
  // Kamera nejblíž hráči (nejvyšší order) — používá se pro podmíněný
  // heartbeat při výběru kamery, viz handleSelectCamera níže.
  const nearestCamera = useMemo(() => [...night.cameras].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0], [night]);

  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialGameState(night));

  // Orchestrace inventářových operací se žárovkami (viz zadání "profilový
  // kontrakt V1" — oprava architektonické odchylky: "KAŽDÁ TRVALÁ
  // INVENTÁŘOVÁ ZMĚNA V HARDCORE MUSÍ BÝT EXPLICITNĚ POTVRZENA SERVEREM V
  // OKAMŽIKU, KDY K NÍ DOJDE", ne souhrnnou deltou na konci směny). Reducer
  // (game/core/gameReducer.ts) je čistě synchronní — žádný fetch/await tam
  // — orchestrace žije tady a v game/inventory/bulbInventoryController.ts
  // (čisté rozhodovací/mapovací funkce, testovatelné bez Reactu).
  //
  // `bulbInventoryPendingRef`: JEDNA probíhající operace blokuje další (viz
  // zadání "nesmí dojít k dvojímu consume při opakovaném kliknutí") — ref, ne
  // state, ať se čte synchronně hned na začátku handleru, ne až po rerenderu.
  const bulbInventoryPendingRef = useRef(false);
  // Po nejasném výsledku (timeout/`unavailable`) se žádná další inventářová
  // operace nesmí spustit, dokud si hráč/orchestrace explicitně nevyžádá
  // `object13Profile.reload()` — jinak by mohlo dojít ke dvojí spotřebě,
  // pokud request server ve skutečnosti zpracoval, ale odpověď se ztratila
  // (viz zadání "13. Výpadek odpovědi po zápisu"). Vyčistí se, jakmile
  // `object13Profile.loadState` znovu dosáhne "ready" (viz effect níže).
  const bulbInventoryNeedsReloadRef = useRef(false);
  const [bulbInventoryOperationState, setBulbInventoryOperationState] = useState<BulbInventoryOperationState>({
    status: "idle",
  });
  useEffect(() => {
    if (object13Profile.loadState.status === "ready") {
      bulbInventoryNeedsReloadRef.current = false;
    }
  }, [object13Profile.loadState]);
  // Stejná "jedna probíhající operace blokuje další" ochrana jako
  // bulbInventoryPendingRef výše, jen pro trvalé odemykání zbraní (viz
  // zadání "13. nesmí dojít k dvojímu získání... pending operace blokuje").
  // Žádný needsReload mezistav navíc — na rozdíl od žárovek tu není žádný
  // rozehraný UI progres, který by bez reloadu zůstal zaseknutý; neúspěšné
  // odemčení prostě zůstane neodemčené a příští stejná herní událost to
  // zkusí znovu (žádný automatický retry, viz zadání).
  const weaponAcquisitionPendingRef = useRef(false);
  // Jednorázová migrace existujícího hráče se starou (lokální) dvouhlavňovkovou
  // odměnou do equipment modelu (viz zadání "10. Migrace existujícího
  // hráče", game/equipment/existingPlayerWeaponMigration.ts) — ref zaručí
  // NEJVÝŠ JEDEN pokus za mount, i kdyby request selhal
  // (conflict/unavailable) — žádný automatický retry. Nezávislé na
  // zvoleném gameMode (běží, jakmile je profil `ready`, ještě před
  // spuštěním jakékoliv směny).
  const existingPlayerWeaponMigrationAttemptedRef = useRef(false);
  useEffect(() => {
    if (existingPlayerWeaponMigrationAttemptedRef.current) return;
    const action = resolveExistingPlayerWeaponMigrationAction(object13Profile.loadState, getMonsterDefeatReward());
    if (action.type !== "unlock_double_barrel") return;
    existingPlayerWeaponMigrationAttemptedRef.current = true;
    object13Profile.unlockWeapon("double_barrel_shotgun").then((result) => {
      const outcome = deriveWeaponAcquisitionConfirmOutcome(result);
      if (outcome.outcome !== "confirmed") {
        console.warn("[nocni-hlidac] existing player double barrel migration did not confirm", result.status);
      }
    });
  }, [object13Profile.loadState]);
  // Kolik hlídačů už na týhle pozici selhalo — čistě lokální localStorage
  // counter (viz game/core/deathCount.ts), nezávislý na herním stavu/reduceru.
  // Lazy initializer čte aktuální hodnotu jen jednou při prvním mountu.
  const [deathCount, setDeathCount] = useState(() => getDeathCount());
  // survivedNights/serverRunState jsou teď deklarované výše (viz komentář
  // "hoisted" u useReducer) — dřívější druhá deklarace tady byla odstraněna.
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
  // selectedGameModeRef je teď deklarovaný výše (viz komentář "hoisted").
  // Jediný zdroj "kolikátá noc" — používá ho HUD (ShiftTimer přes nightNumber
  // prop níže), night scaling (game/difficulty/nightScaling.ts) i briefing
  // (getNightConfig). Serverový currentRun má přednost, ale JEN pro Hardcore
  // (viz zadání "Normal progress může být dočasně lokální, server currentRun
  // zůstává jen Hardcore") — Normal vždy počítá z lokálního survivedNights, i
  // když je hráč přihlášený a serverRunState je k dispozici z dřívějšího
  // Hardcore runu ve stejné session. `selectedGameModeRef` (ne `state.gameMode`)
  // je tu záměrně — musí platit i v krátkém okně menu -> loading -> briefing,
  // PŘED tím, než START_SHIFT skutečně zapíše gameMode do GameState.
  // Admin-only debug override (viz zadání "testovací nástroj pro late-run
  // scény", GameState.debugNightOverride, DebugPanel.tsx) — PŘEBÍJÍ normální
  // výpočet, když je nastavený, ať admin může rychle otestovat Night 30
  // ending/Valhala, aniž by musel opravdu odehrát/přežít 20-30 nocí.
  const currentNight =
    state.debugNightOverride ??
    (selectedGameModeRef.current === "hardcore" && serverRunState ? serverRunState.currentRun + 1 : survivedNights + 1);
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
  // "Nechat si to projít hlavou" cinematic (viz content/cinematics.ts
  // think_it_over_warning, LeftWallView.tsx) — stejný "hlavní smyčka stojí,
  // dokud tohle běží" vzor jako activeMiniGame výše (viz useGameLoop
  // isRunning níže), ať hráč nemůže umřít uprostřed nepřerušitelné scény,
  // na kterou zrovna nemůže reagovat.
  const [thinkItOverCinematicActive, setThinkItOverCinematicActive] = useState(false);
  // Volitelné "intro" cinematic (viz content/cinematics.ts#intro, zadání
  // "Spustit intro") — otevřené z BriefingScreen.tsx (jen Noc 1) i z
  // app/terms/page.tsx (přes IntroCinematicButton.tsx). Na briefingu je to
  // čistě lokální UI přepínač (BriefingScreen/CinematicScreen), nic
  // nedispatchuje do gameReduceru — hra samotná (gameMode/livesRemaining/
  // shotgun/monsterKilledThisRun/isRunning) zůstává úplně beze změny, dokud
  // hráč sám neklikne "Nastoupit na směnu".
  const [introCinematicActive, setIntroCinematicActive] = useState(false);

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
    // Dokud běží nouzová minihra (activeMiniGame) nebo "Nechat si to projít
    // hlavou" cinematic (thinkItOverCinematicActive), hlavní herní smyčka
    // (TICK/ENEMY_ADVANCE) musí stát — jinak by čas/energie/nepřítel běžely
    // dál na pozadí, zatímco hráč je mimo kancelář/nemůže na obrazovku
    // vůbec reagovat.
    isRunning: state.isRunning && !activeMiniGame && !thinkItOverCinematicActive,
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
  const prevSonicCannonToggleSeqRef = useRef(state.sonicCannonToggleSeq);
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
  const prevCameraAttackStartedSeqRef = useRef(state.cameraAttackStartedSeq);
  const prevCameraOfflineSeqRef = useRef(state.cameraOfflineSeq);
  const prevDisabledCameraFootstepsSeqRef = useRef(state.disabledCameraFootstepsSeq);
  const prevBulbReplaceSuccessSeqRef = useRef(state.bulbReplaceSuccessSeq);
  const prevEmergencyRunReadySeqRef = useRef(state.emergencyRunReadySeq);
  const prevThinkItOverReadySeqRef = useRef(state.thinkItOverReadySeq);
  const prevGeneratorOverloadReadySeqRef = useRef(state.generatorOverloadReadySeq);
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
  // Death sekvence (ticho -> bílý záblesk -> shake -> zvuk, viz
  // components/death/DeathSequenceOverlay.tsx a /death-test, kde se
  // laděla) — jen pro SKUTEČNOU smrt, ne pro první-noc near-miss (ten dál
  // jede starým fadeOut+jumpscare flow do CinematicScreen, viz efekt na
  // state.screen níže). Dokud běží, DeathScreen se vůbec nemountuje (viz
  // JSX níže), ať hráč nemůže kliknout na neviditelné tlačítko pod
  // neprůhledným overlayem. `onComplete` ji vrátí na `false`, DeathScreen
  // se pak zobrazí normálně.
  const [deathSequenceActive, setDeathSequenceActive] = useState(false);
  // Valhala cinematic (viz zadání, content/cinematics.ts#valhala_ending,
  // game/core/valhalaEnding.ts#shouldShowValhalaEndingCinematic) — meziscéna
  // PŘED death sekvencí výše, jen pro Hardcore smrt v noci 20–30 včetně.
  // Vlastní boolean (stejný vzor jako thinkItOverCinematicActive), NE
  // znovupoužití cinematicPending/activeCinematicSceneId výše — ty patří
  // výhradně k first-night near-miss flow (onComplete tam vede zpátky do
  // briefingu/restartu, ne do normálního death flow, viz handleCinematicComplete).
  // Dokud je `true`, ani DeathSequenceOverlay ani DeathScreen se nemountují
  // (viz JSX níže) — po dokončení scény (handleValhalaCinematicComplete) se
  // vrátí na `false` a rovnou spustí normální deathSequenceActive, přesně
  // jako by Valhala nikdy neproběhla.
  const [valhalaCinematicActive, setValhalaCinematicActive] = useState(false);
  // DeathSequenceOverlay dokončí jen ticho/bílý záblesk/shake/zvuk (žádný
  // vlastní statický obrázek ani "GAME OVER" text, viz
  // game/death/liveDeathSequenceConfig.ts) — jakmile skončí, rovnou se
  // namountuje DeathScreen. Ten sám drží dialog "Předčasný konec směny"
  // schovaný, dokud ghoul_death animace na jeho pozadí nedoběhne na poslední
  // snímek a chvíli se na něm nezastaví (viz DeathScreen.tsx), takže žádný
  // další reveal timeout tady navíc není potřeba.
  function handleDeathSequenceComplete() {
    setDeathSequenceActive(false);
  }
  // Achievement toast (viz components/game/AchievementToast.tsx) — čistě
  // vizuální, nezávislý na screen flow. `null` = žádný toast aktivní.
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  // Profil achievementy na výsledkových obrazovkách (viz zadání "Napojit
  // achievementy na výsledkové obrazovky", game/core/achievementResultUnlocks.ts)
  // — NEZAMĚŇOVAT s activeAchievement výše (starý toast systém, jen
  // "meet_hynek", zobrazuje se BĚHEM hraní). Tenhle "baseline" ref si
  // pamatuje poslední stats/reward, proti kterým se porovnává — aktualizuje
  // se PO KAŽDÉM vyhodnocení (viz evaluateResultAchievements níže), ne při
  // každém renderu, ať se mid-run odemčení (žárovka/generátor/výprava/zásah)
  // nikdy neztratí — zachytí ho nejbližší další death/win/monsterDefeated
  // vyhodnocení, i kdyby proběhlo o několik směn později.
  const achievementBaselineRef = useRef<{ stats: PlayerProfileStats; reward: MonsterDefeatReward } | null>(null);
  if (achievementBaselineRef.current === null) {
    achievementBaselineRef.current = { stats: getPlayerProfileStats(), reward: getMonsterDefeatReward() };
  }
  const [deathNewlyUnlockedAchievements, setDeathNewlyUnlockedAchievements] = useState<PlayerAchievement[]>([]);
  // Snímek "kdo/kolikátá noc mě zabila" PŘESNĚ v okamžiku smrti (viz zadání
  // "oprav dvojitý Game Over" — `night.enemy.id`/`currentNight` se čtou
  // naživo na každém renderu a `night` se PŘEPOČÍTÁ, jakmile smrt-efekt níže
  // resetuje survivedNights/titanEncounterNights na novou náhodnou trojici
  // — bez snímku by <DeathScreen> po pár sekundách dostal `activeMonsterId`
  // jiného monstra/`nightNumber` jiné noci, než která hráče doopravdy
  // zabila). Výchozí hodnoty se nikdy nevykreslí — DeathScreen se renderuje
  // jen po `state.screen === "death"`, což vždy nejdřív projde efektem, co
  // je nastaví.
  const [deathMonsterId, setDeathMonsterId] = useState<string>("imp");
  const [deathNightNumber, setDeathNightNumber] = useState<number>(1);
  const [winNewlyUnlockedAchievements, setWinNewlyUnlockedAchievements] = useState<PlayerAchievement[]>([]);
  const [monsterDefeatedNewlyUnlockedAchievements, setMonsterDefeatedNewlyUnlockedAchievements] = useState<PlayerAchievement[]>(
    [],
  );
  // Hardcore Noc 30 ending (viz zadání, game/core/night30Ending.ts) —
  // rozhoduje, jestli se na přechodu do "win" zobrazí Night30EndingScreen
  // (varianta "no_kill"/"warrior") MÍSTO WinScreen. Přepočítává se znovu při
  // KAŽDÉM přechodu na "win" (viz efekt níže), ne jen nastavuje na
  // "no_kill"/"warrior" — "none" case se musí taky explicitně zapsat, jinak
  // by hodnota z jednoho runu mohla přežít do dalšího "win" v témže
  // page.tsx mountu.
  const [night30Ending, setNight30Ending] = useState<Night30EndingKind>("none");

  /**
   * Porovná aktuální stats/reward proti poslednímu baseline (viz
   * achievementBaselineRef výše), vrátí nově odemčené achievementy (které
   * ještě nebyly zobrazené), rovnou je označí jako zobrazené
   * (markResultAchievementsAsShown) a posune baseline na aktuální stav.
   * Volat PŘESNĚ jednou na death/win/monsterDefeated přechod, VŽDY po
   * příslušných record*() voláních (ne dřív), ať baseline zachytí i tuhle
   * poslední událost.
   */
  function evaluateResultAchievements(): PlayerAchievement[] {
    const previous = achievementBaselineRef.current ?? { stats: getPlayerProfileStats(), reward: getMonsterDefeatReward() };
    const nextStats = getPlayerProfileStats();
    const nextReward = getMonsterDefeatReward();
    const { newlyUnlocked } = resolveAchievementResultUnlocks({
      previousStats: previous.stats,
      previousReward: previous.reward,
      nextStats,
      nextReward,
      alreadyShownAchievementIds: getShownResultAchievementIds(),
    });
    achievementBaselineRef.current = { stats: nextStats, reward: nextReward };
    if (newlyUnlocked.length > 0) {
      markResultAchievementsAsShown(newlyUnlocked.map((achievement) => achievement.id));
    }
    return newlyUnlocked;
  }
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

      if (isFirstNightNearMiss) {
        // Near-miss NENÍ smrt — starý krátký fadeOut+jumpscare "leknutí"
        // flow zůstává beze změny, vede do CinematicScreen, ne do death
        // sekvence níže (ta je vyladěná jako delší atmosférická cinematika
        // přesně pro SKUTEČNOU smrt, viz zadání "chci to i na live, když
        // někdo zemře"). (1) ambience plynule ztiší přes AMBIENCE_DEATH_FADE_MS,
        // (2) JUMPSCARE_SILENT_GAP_MS naprostého ticha, (3) teprve pak
        // jumpscare (viz AUDIO_DESIGN.md "Ticho před lekačkou").
        audioManager.fadeOutLoop(AUDIO_EVENTS.ambienceLoop, AMBIENCE_DEATH_FADE_MS);
        jumpscareTimeout = setTimeout(
          () => audioManager.play(AUDIO_EVENTS.jumpscare),
          AMBIENCE_DEATH_FADE_MS + JUMPSCARE_SILENT_GAP_MS,
        );
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
        // Snímek monstra/noci PRO TENHLE konkrétní death screen (viz
        // komentář u deathMonsterId výše) — musí se zapsat PŘED
        // jakýmkoliv resetem survivedNights/titanEncounterNights níže.
        setDeathMonsterId(night.enemy.id);
        setDeathNightNumber(nightThatEnded);
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
        // Hardcore death-by-night histogram (viz zadání "Uzavřít Hardcore
        // profil a achievementy", game/core/playerProfileStats.ts) — VÝHRADNĚ
        // Hardcore, stejná podmínka jako serverový Hardcore sync níže.
        // `nightThatEnded` (ne `currentNight`, ten by po případném resetu
        // survivedNights níže už neodrážel noc, ve které hráč umřel).
        if (state.gameMode === "hardcore") {
          recordHardcoreDeathOnNight(nightThatEnded);
        }
        // Achievementy pro DeathScreen (viz zadání "Napojit achievementy na
        // výsledkové obrazovky") — AŽ TEĎ, po recordDeath/recordHardcoreDeathOnNight
        // výše, ať "Setkání s Hynkem" i "První konec služby" mají šanci se v
        // tomhle vyhodnocení objevit. Nikdy toast, jen připraveno pro
        // DeathScreen render níže.
        setDeathNewlyUnlockedAchievements(evaluateResultAchievements());
        // Žárovka je vlastnost OBJEKTU, ne hlídače — smrt ji jen uloží tak, jak
        // byla (žádný denní servis, ten běží jen po přežité směně, viz "win"
        // níže), ať další hlídač pokračuje přesně odtud, kde předchozí skončil.
        // Beze změny podle gameMode — bulby patří objektu, ne konkrétnímu runu.
        setRoomBulbs(state.roomBulbs);
        // Náhradní žárovky patří do campaignu stejně jako roomBulbs — pokud
        // hráč spotřeboval kus dřív v týhle směně (dokončená ruční výměna),
        // musí to přežít i smrt z jiného důvodu, ne se ztratit. DŮLEŽITÉ (viz
        // zadání "profilový kontrakt V1" — oprava architektonické odchylky):
        // tohle NENÍ souhrnná synchronizace na VPS — Hardcore už každou
        // spotřebu potvrdil serverem přesně v okamžiku, kdy nastala (viz
        // CONFIRM_BULB_REPLACEMENT/bulbInventoryActions.ts), takže smrt tady
        // žádný inventory request neposílá. Jediné, co zbývá, je anonymní
        // localStorage (přihlášený hráč do něj nikdy nezapisuje, viz
        // game/core/bulbInventory.ts).
        if (object13Profile.loadState.status === "unauthorized") {
          setBulbsRemaining(state.bulbsRemaining);
        }

        // Normal se zbývajícím životem "opakuje noc" — run nekončí, takže
        // survivedNights se NErestuje a server API se vůbec nevolá (viz
        // zadání "neresetuj currentRun", "nezapisuj leaderboard"). Cokoliv
        // jiné (Normal bez životů, nebo Hardcore — ten vždy) je skutečný
        // konec runu, viz gameMode.ts.
        const isNormalContinuing = state.gameMode === "normal" && state.livesRemaining > 0;

        // survivedNights je VÝHRADNĚ Normal counter (viz currentNight výše —
        // Hardcore vždy počítá z serverRunState.currentRun, nikdy odsud) —
        // proto se resetuje jen při skutečném konci NORMAL runu. Bez
        // `state.gameMode === "normal"` by smrt v Hardcore vynulovala i
        // rozehranou Normal šňůru, i když s ní vůbec nesouvisí (viz zadání
        // "ujisti se... normal 6 nocí, přepnu na hardcore, umřu — normal
        // streak nemá zmizet").
        if (state.gameMode === "normal" && !isNormalContinuing) {
          // Aktuální hlídač skončil — survival streak jde na 0 (viz
          // game/core/survivedNights.ts), death counter nahoře tím není dotčený.
          setSurvivedNights(resetSurvivedNights());
          // Stejná "run skutečně skončil" hranice jako survivedNights reset
          // výše — vylosuje NOVOU trojici Titanových nocí pro příští run
          // (viz zadání "teprve nový kompletní průchod smí vylosovat jinou
          // trojici", game/core/titanEncounterNights.ts). Restart stejné
          // noci (isNormalContinuing===true) tohle nikdy nezavolá.
          setTitanEncounterNights(resetTitanEncounterNights());
        }

        if (state.gameMode === "hardcore") {
          // Hardcore má jediný život (GAME_MODE_CONFIG.hardcore.startingLives
          // === 1) — KAŽDÁ Hardcore smrt je tedy vždy skutečný konec runu,
          // stejná "run skončil" hranice jako Normal bez životů výše.
          setTitanEncounterNights(resetTitanEncounterNights());
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

        // Skutečná smrt spouští death sekvenci (ticho -> bílý záblesk ->
        // shake -> zvuk, viz components/death/DeathSequenceOverlay.tsx,
        // game/death/liveDeathSequenceConfig.ts) místo starého krátkého
        // fadeOut+jumpscare flow — ten zůstává jen pro near-miss výše.
        // Ambient/heartbeat hraje dál normálně, dokud sekvence sama
        // nezačne (cutAmbientInstantly ho tvrdě přeruší přesně v
        // nakonfigurovaný moment, viz deathSequenceConfig.ts).
        // Valhala meziscéna (viz zadání, game/core/valhalaEnding.ts) — jen
        // Hardcore smrt v noci 20–30 včetně. `nightThatEnded`, ne
        // `currentNight` (stejný důvod jako recordHardcoreDeathOnNight výše).
        // Vůbec neovlivňuje bookkeeping nad touhle větví (recordDeath/
        // recordHardcoreDeathOnNight/achievementy/roomBulbs/server fetch) —
        // ten proběhl už výše, přesně jednou, bez ohledu na Valhalu. Jen
        // odloží START death sekvence, dokud scéna neskončí.
        if (
          shouldShowValhalaEndingCinematic({
            gameMode: state.gameMode,
            nightNumber: nightThatEnded,
            isFirstNightNearMiss: false,
            isRealDeath: true,
          })
        ) {
          setValhalaCinematicActive(true);
        } else {
          setDeathSequenceActive(true);
        }
      }

      if (state.deathReason === "door_open_at_attack") {
        // Poslední krok těsně u dveří hraje hned (nezávisle na tom, jestli
        // jde o near-miss nebo skutečnou smrt) — zřetelně odděleně, ne
        // zamíchaně přes zbytek sekvence.
        audioManager.play(AUDIO_EVENTS.enemyStep);
      }

      // Cinematic scéna jen pro first-night near-miss (viz výše) — ambience
      // se ztlumuje už nahoře (fadeOutLoop), tahle pauza je navíc krátká
      // tichá prodleva PŘED zobrazením CinematicScreen (viz JSX níže), ať
      // přechod nepůsobí okamžitě. Druhá+ chyba v Noci 1 i Noc 2+ tenhle
      // blok vůbec nespustí — DeathScreen (přes death sekvenci) se zobrazí
      // rovnou jako dnes.
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
      // ne při kliknutí na tlačítko, ne opakovaně při rerenderu. Jen Normal
      // (viz stejná podmínka u resetu výše) — Hardcore výhra nesmí navyšovat
      // tenhle čistě Normal counter, i když se stejnou nocí zrovna náhodou
      // sedí currentNight.
      if (state.gameMode === "normal") {
        setSurvivedNights(incrementSurvivedNights());
      }
      // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) —
      // currentNight je noc, kterou hráč PRÁVĚ přežil (stejná hodnota jako
      // nightThatEnded v "death" větvi výše), ne noc PO přechodu. hardcoreBestNight
      // se aktualizuje jen pro gameMode "hardcore", jen směrem nahoru (viz
      // recordNightSurvived).
      recordNightSurvived(state.gameMode, currentNight);
      // Achievementy pro WinScreen (viz zadání "Napojit achievementy na
      // výsledkové obrazovky") — AŽ TEĎ, po recordNightSurvived výše.
      setWinNewlyUnlockedAchievements(evaluateResultAchievements());
      // Denní servis: jen SKUTEČNĚ prasklé žárovky se vymění za náhradní kus
      // ze skladu (viz game/core/roomBulbs.ts#applyDailyBulbService) — slabá,
      // ale neprasklá žárovka se nedotkne. Běží jen tady (přežitá směna),
      // nikdy na smrt (viz "death" výše). DŮLEŽITÉ (viz zadání "profilový
      // kontrakt V1" — oprava architektonické odchylky): servis SPOTŘEBOVÁVÁ
      // náhradní žárovku stejně jako ruční výměna u dveří, takže v Hardcore
      // je to TAKÉ potvrzená serverová událost, ne lokální odhad promítnutý
      // do souhrnné delty. `roomBulbs` (aktivní žárovka) je vždy čistě
      // lokální bez ohledu na režim — persistuje se v každé větvi níže.
      if (!state.roomBulbs.nearRoom.broken) {
        // Nic k servisu — jen zachovat roomBulbs beze změny (idempotentní
        // localStorage zápis, stejné chování jako dřív).
        setRoomBulbs(state.roomBulbs);
      } else if (object13Profile.loadState.status === "unauthorized") {
        // Anonymní hráč — beze změny oproti dosavadnímu chování, čistě lokální.
        const serviced = applyDailyBulbService(state.roomBulbs, state.bulbsRemaining);
        setRoomBulbs(serviced.roomBulbs);
        setBulbsRemaining(serviced.bulbsRemaining);
      } else if (!GAME_MODE_CONFIG[state.gameMode].persistInventory) {
        // Training (přihlášený, ale netrvalý inventář) — servis se provede
        // jen jako pracovní kopie pro tenhle (už skončený) běh, nic se
        // nikam neukládá (viz zadání "6. Training" — "nic se na konci
        // směny neukládá").
        const serviced = applyDailyBulbService(state.roomBulbs, state.bulbsRemaining);
        setRoomBulbs(serviced.roomBulbs);
      } else if (object13Profile.loadState.status === "ready" && state.bulbsRemaining > 0) {
        // Hardcore + ready profil — server-confirmed spotřeba PŘESNĚ jedné
        // náhradní žárovky. `RoomBulbsState` má dnes jediný klíč (`nearRoom`,
        // viz game/core/types.ts), takže je `amount: 1` vždy správně. Až
        // přibude druhá místnost, správné řešení je JEDNA atomická operace
        // `consumeBulbs(amount: brokenCount)` (endpoint už `amount` podporuje,
        // viz TECH_DESIGN.md "Profilový kontrakt V1 a inventář žárovek") —
        // NIKDY N samostatných `consumeBulbs(1)` volání s mezilehlými
        // revisemi, to by řešilo čerstvou revizi mezi kroky zbytečně navíc.
        bulbInventoryPendingRef.current = true;
        setBulbInventoryOperationState({ status: "consuming" });
        const roomBulbsAtWin = state.roomBulbs;
        object13Profile.consumeBulbs(1).then((result) => {
          bulbInventoryPendingRef.current = false;
          const outcome = deriveBulbInventoryConfirmOutcome(result);
          if (outcome.outcome === "confirmed") {
            setBulbInventoryOperationState({ status: "idle" });
            setRoomBulbs({
              ...roomBulbsAtWin,
              nearRoom: { ...roomBulbsAtWin.nearRoom, remainingMs: roomBulbsAtWin.nearRoom.maxMs, broken: false },
            });
            return;
          }
          // Server odmítl/neodpověděl — žárovka zůstává prasklá (stejné
          // chování jako "došly náhradní kusy", viz applyDailyBulbService),
          // žádná lokální oprava bez potvrzení.
          if (outcome.outcome === "unavailable") {
            bulbInventoryNeedsReloadRef.current = true;
          }
          setBulbInventoryOperationState({ status: "error", error: outcome.outcome });
          setRoomBulbs(roomBulbsAtWin);
        });
      } else {
        // Hardcore bez ready profilu (VPS výpadek) nebo bez náhradních kusů
        // — nic k servisu, roomBulbs zůstává prasklá.
        setRoomBulbs(state.roomBulbs);
      }
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
      // Hardcore Noc 30 ending (viz zadání, game/core/night30Ending.ts) —
      // rozhoduje se AŽ TEĎ, PO recordNightSurvived/achievementy/survive-night
      // fetch výše, ale NEMĚNÍ nic z toho — jen řídí, jestli JSX níže vykreslí
      // Night30EndingScreen (varianta "no_kill"/"warrior") místo WinScreen
      // pro tenhle jeden přechod. `currentNight` je stejná hodnota, kterou
      // recordNightSurvived výše právě zapsal jako přežitou noc (viz
      // komentář nad ním).
      setNight30Ending(
        resolveNight30Ending({
          gameMode: state.gameMode,
          nightNumber: currentNight,
          survivedNight: true,
          hasKilledMonsterThisRun: state.monsterKilledThisRun,
        }),
      );
    }
    if (state.screen === "monsterDefeated") {
      // Skrytý true ending (viz zadání "GAME OVER pro monstrum, ale ambient/
      // heartbeat hraje dál přes dialog") — na rozdíl od "win"/"death" výše
      // useHeartbeatStress.ts při !isRunning (CONFIRM_MONSTER_HIT ho nastaví
      // rovnou s přechodem na "monsterDefeated") jen ZTLUMÍ heartbeat na 0 a
      // vrátí ambientu PLNOU hlasitost zpátky, ale loop samotný nikdy
      // nezastaví (žádné stopLoop tam není) — bez tohohle bloku by tak
      // ambient dál slyšitelně hrál přes celé MonsterDefeatedScreen.tsx
      // cinematic (timed captions + vlastní namluvený zvuk), viz
      // MONSTER_DEFEATED_CINEMATIC_AUDIO_SRC.
      audioManager.stopLoop(AUDIO_EVENTS.ambienceLoop);
      audioManager.stopLoop(AUDIO_EVENTS.heartbeatStressSlow);
      audioManager.stopLoop(AUDIO_EVENTS.heartbeatStressFast);
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

  // Stejná siréna (STEJNÝ audio event, žádný duplicitní asset/systém) po
  // dobu držení "PŘETÍŽIT GENERÁTOR" (viz GeneratorView.tsx#handlePointerDown/Up).
  // Navíc kontroluje `state.isRunning` (na rozdíl od efektu výše) — reducer
  // dnes nikde explicitně nenuluje `generatorOverloadWindup.active` při
  // smrti/konci směny (stejná mezera existuje i u emergencyRunWindup výše),
  // takže bez tyhle podmínky by siréna mohla zůstat viset i po screen
  // "death"/"win", kde GeneratorView už není vidět. `isRunning` false =
  // hra skončila, siréna vždy zastaví, bez ohledu na to, co si `active`
  // pole samo pamatuje.
  useEffect(() => {
    if (state.generatorOverloadWindup.active && state.isRunning) {
      audioManager.startLoop(AUDIO_EVENTS.emergencyRunSiren);
    } else {
      audioManager.stopLoop(AUDIO_EVENTS.emergencyRunSiren);
    }
  }, [state.generatorOverloadWindup.active, state.isRunning]);

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
    // Přesně jedno mechanické cvaknutí sonického děla (viz zadání) — JEDINÉ
    // místo, které ho přehrává, ať pro ruční zapnutí/vypnutí (viz
    // handleToggleSonicCannon výše) i pro automatické vypnutí po
    // sonic-modified decision ticku (viz gameReducer.ts ENEMY_ADVANCE
    // sonicResultUpdate). Znovupoužitý existující `lightClick` ("cvaknutí
    // vypínače") — žádný nový click event, sedí přesně na "relé/přepínač",
    // ne generický webový uiClick.
    const prevToggleSeq = prevSonicCannonToggleSeqRef.current;
    prevSonicCannonToggleSeqRef.current = state.sonicCannonToggleSeq;
    // Čisté rozhodnutí vytažené do game/core/sonicCannon.ts#shouldPlaySonicCannonToggleClick
    // (testovatelné bez React efektu) — `false` pro čerstvý/resetovaný stav
    // (nová směna, smrt, menu) i pro beze změny, `true` jen pro skutečný
    // ruční/auto-off toggle (viz zadání "žádný click při resetu stavu...
    // pokud by to působilo rušivě").
    if (!shouldPlaySonicCannonToggleClick(state.sonicCannonToggleSeq, prevToggleSeq)) return;
    audioManager.play(AUDIO_EVENTS.lightClick);
  }, [state.sonicCannonToggleSeq]);

  useEffect(() => {
    // Provozní bzučení sonického děla — ČISTĚ odvozené z
    // state.sonicCannonActive (viz zadání "sonicCannonActive zůstává
    // jediný zdroj pravdy... nevytvářej paralelní lokální boolean"), žádný
    // vlastní isHumPlaying stav. Pokrývá VŠECHNY cesty k `false`
    // (ruční vypnutí, auto-off po výsledku, přepnutí/zavření kamery,
    // blackout, smrt/konec směny/menu — viz withSonicCannonAutoOff a
    // createInitialGameState v gameReducer.ts/gameState.ts) stejně, beze
    // změny na KAŽDÉ z nich zvlášť.
    if (state.sonicCannonActive) {
      audioManager.startLoop(AUDIO_EVENTS.sonicCannonHum);
    } else {
      audioManager.stopLoop(AUDIO_EVENTS.sonicCannonHum);
    }
  }, [state.sonicCannonActive]);

  // Nezávislé na efektu výše (ten reaguje na ZMĚNU sonicCannonActive) —
  // tohle je tvrdá pojistka při skutečném odmountování stránky (navigace
  // pryč z /play), ať bzučení nikdy nezůstane hrát na pozadí jinde v appce.
  useEffect(() => {
    return () => audioManager.stopLoop(AUDIO_EVENTS.sonicCannonHum);
  }, []);

  // Titanovy kroky na štěrku (viz zadání "Titan nemá během přibližování
  // správné kroky a stres") — stejný dvouefektový vzor jako sonicCannonHum
  // výše: jeden reaktivní start/stop na `isTitanEncounterActive(state, night)`
  // (JEDINÝ zdroj pravdy "encounter právě běží", viz game/core/titanEncounter.ts
  // — pokrývá začátek/konec noci, smrt, zabití generátorem i odchod z
  // "playing" beze zvláštního kódu na každou cestu zvlášť), plus samostatná
  // tvrdá pojistka na skutečné odmountování stránky. `startLoop`/`stopLoop`
  // jsou idempotentní (viz zadání "v jednu chvíli smí hrát jen jedna
  // instance" — je to zaručené existující architekturou audioManageru, ne
  // něčím novým tady), takže žádný prevRef diffing navíc není potřeba.
  const titanEncounterActiveNow = isTitanEncounterActive(state, night);
  useEffect(() => {
    if (titanEncounterActiveNow) {
      audioManager.startLoop(AUDIO_EVENTS.titanFootsteps);
    } else {
      audioManager.stopLoop(AUDIO_EVENTS.titanFootsteps);
    }
  }, [titanEncounterActiveNow]);

  useEffect(() => {
    return () => audioManager.stopLoop(AUDIO_EVENTS.titanFootsteps);
  }, []);

  // Hlasitost kroků plynule roste s Titanovou stage (viz zadání "50 % na
  // začátku, plynule až 100 % u dveří, žádný skok") — `rampLoopVolume`
  // (stejná requestAnimationFrame technika jako fadeOutLoop, viz
  // audioManager.ts) se spustí jen na SKUTEČNOU změnu stage, ne na každý
  // TICK/rerender, takže mezi dvěma stage hlasitost zůstává stabilní na
  // poslední dosažené hodnotě — přesně jeden plynulý přechod na jednu
  // změnu. Mimo aktivní Titanovo setkání se vůbec nespouští (viz `if`
  // guard) — loop mezitím stejně nehraje (viz efekt výše), takže by ramp
  // jen zbytečně běžel na pozadí bez slyšitelného efektu.
  useEffect(() => {
    if (!titanEncounterActiveNow) return;
    const targetVolume = computeTitanFootstepVolume(state.enemyStage, AUDIO_CONFIG[AUDIO_EVENTS.titanFootsteps].volume);
    audioManager.rampLoopVolume(AUDIO_EVENTS.titanFootsteps, targetVolume, TITAN_FOOTSTEP_VOLUME_RAMP_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titanEncounterActiveNow, state.enemyStage]);

  useEffect(() => {
    if (prevBulbBreakSeqRef.current !== state.bulbBreakSeq) {
      audioManager.play(AUDIO_EVENTS.bulbBreak);
      prevBulbBreakSeqRef.current = state.bulbBreakSeq;
    }
  }, [state.bulbBreakSeq]);

  // Vzácný útok Ghoula na kameru (viz zadání, game/core/cameraDamage.ts) —
  // dva samostatné seq eventy: začátek útoku (idle -> attacking) a úplná
  // ztráta signálu (attacking -> offline, viz GameState.cameraOfflineSeq).
  // Rádiová hláška na cameraOfflineSeq řeší RadioMessageOverlay.tsx/
  // useCameraDisabledRadioMessage.ts samostatně, tady jen zvuk.
  useEffect(() => {
    if (prevCameraAttackStartedSeqRef.current !== state.cameraAttackStartedSeq) {
      audioManager.play(AUDIO_EVENTS.cameraDamageStart);
      prevCameraAttackStartedSeqRef.current = state.cameraAttackStartedSeq;
    }
  }, [state.cameraAttackStartedSeq]);

  useEffect(() => {
    if (prevCameraOfflineSeqRef.current !== state.cameraOfflineSeq) {
      audioManager.play(AUDIO_EVENTS.cameraSignalLost);
      prevCameraOfflineSeqRef.current = state.cameraOfflineSeq;
    }
  }, [state.cameraOfflineSeq]);

  // Mikrofon offline kamery (viz zadání "vyřazení kamery znamená pouze
  // ztrátu obrazu, ne zvuku") — GameState.disabledCameraFootstepsSeq se
  // zvyšuje výhradně v gameReducer.ts#withDisabledCameraFootsteps (vstup
  // Ghoula do lokace s offline kamerou, respektuje cooldown), tady jen
  // zvuk. Přehraje se JEN tehdy, když hráč PRÁVĚ TEĎ (v okamžiku události)
  // sleduje detail PŘESNĚ té kamery, které se událost týká (viz zadání "je
  // právě vybraná tato kamera A existuje aktivní audio událost pro tuto
  // lokaci") — jinak se seq jen "spotřebuje" beze zvuku (žádné doplnění při
  // pozdějším přepnutí na tuhle kameru, viz zadání "nové kroky se mohou
  // přehrát až při nové samostatné herní události").
  useEffect(() => {
    if (prevDisabledCameraFootstepsSeqRef.current === state.disabledCameraFootstepsSeq) return;
    prevDisabledCameraFootstepsSeqRef.current = state.disabledCameraFootstepsSeq;
    if (isWatchingDisabledCameraFootstepsSource(state)) {
      audioManager.play(AUDIO_EVENTS.disabledCameraFootsteps);
    }
  }, [
    state.disabledCameraFootstepsSeq,
    state.cameraOpen,
    state.cameraViewMode,
    state.playerView,
    state.activeCameraId,
    state.lastDisabledCameraFootstepsCameraId,
  ]);

  // Jakmile hráč přestane sledovat detail TÉ kamery, které se poslední
  // událost týkala (přepnutí kamery, zavření kamerového systému, opuštění
  // pohledu na desk), zvuk kroků se OKAMŽITĚ zastaví — ne jen pauza, i
  // currentTime na 0 (viz zadání "aby se při návratu na kameru nedohrávala
  // stará událost"), ať se náhodou nerozehraje odjinud. `audioManager.play`
  // beztak currentTime před přehráním resetuje, tohle je jen jistota pro
  // okamžik MEZI odchodem z kamery a případnou další událostí.
  const wasWatchingDisabledCameraFootstepsRef = useRef(false);
  useEffect(() => {
    const isWatchingThatCamera = isWatchingDisabledCameraFootstepsSource(state);
    if (wasWatchingDisabledCameraFootstepsRef.current && !isWatchingThatCamera) {
      audioManager.stopLoop(AUDIO_EVENTS.disabledCameraFootsteps);
    }
    wasWatchingDisabledCameraFootstepsRef.current = isWatchingThatCamera;
  }, [state.cameraOpen, state.cameraViewMode, state.playerView, state.activeCameraId, state.lastDisabledCameraFootstepsCameraId]);

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
            state.officeDoorLockMs,
            state.monsterDefeated,
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
            state.officeDoorLockMs,
            state.monsterDefeated,
          ),
        });
      }
    }
    prevEmergencyRunReadySeqRef.current = state.emergencyRunReadySeq;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.emergencyRunReadySeq]);

  // Držení "Nechat si to projít hlavou" doběhlo celé (viz gameReducer.ts
  // START_THINK_IT_OVER_WINDUP/TICK) — spustí celou cinematic scénu (viz
  // content/cinematics.ts think_it_over_warning), ne jen krátkou hlášku
  // (na výslovnou žádost, viz zadání "dej to do většího dialogu"). Stejný
  // `>` (ne `!==`) diff jako emergencyRunReadySeq — nová směna resetuje
  // thinkItOverReadySeq zpět na 0, což by prostý `!==` diff mylně vzal za
  // "windup zrovna doběhl".
  useEffect(() => {
    if (state.thinkItOverReadySeq > prevThinkItOverReadySeqRef.current) {
      setThinkItOverCinematicActive(true);
    }
    prevThinkItOverReadySeqRef.current = state.thinkItOverReadySeq;
  }, [state.thinkItOverReadySeq]);

  function handleThinkItOverCinematicComplete() {
    setThinkItOverCinematicActive(false);
  }

  // Držení "PŘETÍŽIT GENERÁTOR" doběhlo celé (viz gameReducer.ts
  // START_GENERATOR_OVERLOAD_WINDUP/TICK) — teprve TADY se dispatchne
  // skutečné START_GENERATOR_OVERLOAD (energetické chování jako restart +
  // desetisekundové zamčení/zničení dveří). Stejný `>` diff jako
  // emergencyRunReadySeq/thinkItOverReadySeq výše, ze stejného důvodu (nová
  // směna resetuje seq zpět na 0).
  useEffect(() => {
    if (state.generatorOverloadReadySeq > prevGeneratorOverloadReadySeqRef.current) {
      dispatch({ type: "START_GENERATOR_OVERLOAD" });
    }
    prevGeneratorOverloadReadySeqRef.current = state.generatorOverloadReadySeq;
  }, [state.generatorOverloadReadySeq]);

  // "Spustit intro" na BriefingScreen.tsx (jen Noc 1, viz JSX níže) —
  // otevře cinematic, žádný dispatch (viz introCinematicActive komentář
  // výše). Dokončení jen scénu zavře, hráč zůstává na stejném briefingu se
  // stále funkčním "Nastoupit na směnu".
  function handleStartIntroFromBriefing() {
    setIntroCinematicActive(true);
  }

  function handleIntroCinematicComplete() {
    setIntroCinematicActive(false);
  }

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
    setIntroCinematicActive(false);
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
        ? resolveFreshRunShotgunEquipment(gameMode, object13Profile.loadState, getMonsterDefeatReward().doubleBarrelUnlocked)
        : // Dobití náboje na začátku (opakované i nové) noci (viz zadání
          // "Každý nový den / nová noc dobije 1 náboj") — bez brokovnice
          // zůstává 0, s dvouhlavňovkou dobije na 2.
          {
            hasShotgun: state.hasShotgun,
            hasDoubleBarrelShotgun: state.hasDoubleBarrelShotgun,
            shotgunAmmo: getRechargedShotgunAmmo(state),
          };
      // VŽDY čte aktuální ready profil (Hardcore) / localStorage fallback —
      // NIKDY konečný runtime stav předchozí směny ani necommitnutou deltu
      // (viz zadání "11. Start další směny" — oprava architektonické
      // odchylky). Hardcore run bez ready profilu se sem vůbec nedostane
      // (viz MainMenuScreen.tsx#hardcoreBlockedByProfile).
      const restartBulbsRemaining = resolveStartingBulbsRemaining(object13Profile.loadState);
      dispatch({
        type: "RESTART_SHIFT",
        roomBulbs: getRoomBulbs(),
        bulbsRemaining: restartBulbsRemaining,
        nightFeatures,
        gameMode,
        livesRemaining,
        hasShotgun: shotgunEquipment.hasShotgun,
        hasDoubleBarrelShotgun: shotgunEquipment.hasDoubleBarrelShotgun,
        shotgunAmmo: shotgunEquipment.shotgunAmmo,
        // Stejná "fresh run resetuje, pokračování zachová" konvence jako
        // hasShotgun výše (viz GameState.monsterKilledThisRun,
        // game/core/noKillEnding.ts) — na rozdíl od brokovnice tu není
        // žádná trvalá odměna, co by fresh run mohla nastartovat rovnou na `true`.
        monsterKilledThisRun: isFreshRun ? false : state.monsterKilledThisRun,
      });
    } else {
      const gameMode = selectedGameModeRef.current;
      const shotgunEquipment = resolveFreshRunShotgunEquipment(
        gameMode,
        object13Profile.loadState,
        getMonsterDefeatReward().doubleBarrelUnlocked,
      );
      // Profil hlídače (viz zadání, game/core/playerProfileStats.ts) — jen
      // SKUTEČNĚ nový run (START_SHIFT z menu), ne RESTART_SHIFT pokračování
      // stejné směny po smrti s životy navíc.
      recordRunStarted();
      const startBulbsRemaining = resolveStartingBulbsRemaining(object13Profile.loadState);
      dispatch({
        type: "START_SHIFT",
        roomBulbs: getRoomBulbs(),
        bulbsRemaining: startBulbsRemaining,
        nightFeatures,
        gameMode,
        livesRemaining: GAME_MODE_CONFIG[gameMode].startingLives,
        hasShotgun: shotgunEquipment.hasShotgun,
        hasDoubleBarrelShotgun: shotgunEquipment.hasDoubleBarrelShotgun,
        shotgunAmmo: shotgunEquipment.shotgunAmmo,
        // Vždy skutečně nový run (navigace z menu) — vždy `false`.
        monsterKilledThisRun: false,
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

  // Dokončení Valhala cinematic (viz zadání, efekt na state.screen ===
  // "death" výše) — NA ROZDÍL OD handleCinematicComplete výše pokračuje do
  // normálního death flow (death sekvence -> DeathScreen), ne do
  // briefingu/restartu — tohle JE skutečná smrt, jen s meziscénou navíc.
  // Žádný dispatch, žádné další recordDeath/achievementy — ty proběhly už
  // jednou v efektu výše, dřív, než se Valhala vůbec rozhodla spustit.
  function handleValhalaCinematicComplete() {
    setValhalaCinematicActive(false);
    setDeathSequenceActive(true);
  }

  function handleGoToMenu() {
    audioManager.play(AUDIO_EVENTS.uiClick);
    // Defenzivní reset (viz zadání "run je považovaný za ukončený") — GO_TO_MENU
    // stejně vždy vede pryč z "win", takže na JSX podmínku dole nemá vliv, ale
    // ať night30Ending nikdy nezůstane nesprávně "no_kill"/"warrior" pro
    // příští win v téže session, kdyby se sem někdy dostalo dřív, než efekt
    // výše stihne přepočítat.
    setNight30Ending("none");
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
    // Achievementy pro MonsterDefeatedScreen (viz zadání "Napojit
    // achievementy na výsledkové obrazovky") — AŽ TEĎ, po recordMonsterDefeat/
    // recordMonsterKill výše, PŘED případným early return pro Normal (obě
    // strany gameMode mají mít šanci na "Už nejsi ucho"/"Lovec bestií").
    // MonsterDefeatedScreen.tsx zobrazí panel až ve výsledkové části (po
    // cinematicu), tenhle state je jen "co ukázat, až tam hráč dojde".
    setMonsterDefeatedNewlyUnlockedAchievements(evaluateResultAchievements());

    // Noc, na které hráč monstrum porazil, se dřív NIKDE nezapočítala jako
    // přežitá (viz zadání "nestalo se, že se resetoval počet dní" — ne,
    // neresetoval, ale taky se nezvyšoval — screen "monsterDefeated" jde
    // úplně mimo normální "win" flow, které jinak survivedNights/currentRun
    // navyšuje). Stejná podmínka/vzor jako `state.screen === "win"` výše
    // (jen Normal navyšuje lokální survivedNights, žádný fetch).
    if (state.gameMode === "normal") {
      setSurvivedNights(incrementSurvivedNights());
    }

    // Serverový Hardcore profil (viz zadání "serverové ukládání profilu
    // hlídače jen pro Hardcore") — VÝHRADNĚ Hardcore. Normal true ending se
    // zastaví přesně tady: lokální reward/stats výše se zapíšou beze změny
    // (Normal chování zůstává, jak bylo), ale žádný fetch na server se
    // nezavolá, žádná serverová Hardcore hodnota se nedotkne (viz zadání
    // "Normal true ending NESMÍ odemknout serverovou dvouhlavňovku/zvýšit
    // hardcoreMonsterDefeatsCount").
    if (state.gameMode !== "hardcore") return;

    // Trvalé odemčení dvouhlavňovky (viz zadání "14. server-confirmed
    // double barrel acquisition") — server-authoritative domain event,
    // stejný "fire-and-forget s warning logem" vzor jako survive-night/
    // hardcore-profile sync níže. Žádný lokální dispatch navíc netřeba
    // (běžící run tímhle screenem stejně končí) — projeví se až v příští
    // misi přes resolveFreshRunShotgunEquipment (viz
    // game/equipment/weaponAcquisitionController.ts), jednou už bude
    // equippedWeaponId v profilu potvrzené.
    object13Profile.unlockWeapon("double_barrel_shotgun").then((unlockResult) => {
      const outcome = deriveWeaponAcquisitionConfirmOutcome(unlockResult);
      if (outcome.outcome !== "confirmed") {
        console.warn("[nocni-hlidac] double barrel weapon unlock did not confirm", unlockResult.status);
      }
    });

    // Stejný survive-night zápis jako běžná výhra (viz `state.screen ===
    // "win"` výše, stejný TODO ohledně dvouhlavňovky v currentRun/bestRun
    // žebříčku platí i tady) — bez tohohle currentRun pro tuhle noc nikdy
    // nenavýší a příští Hardcore run tak nesmyslně začíná zase na noci 1
    // (viz zadání "zase začínám ode dne 1").
    fetch("/api/player/survive-night", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameMode: "hardcore" }),
    })
      .then((res) => res.json())
      .then((body: GuardRunResponse["body"]) => applyGuardRunResponse(body, "survive-night"))
      .catch((err) => {
        console.warn("[nocni-hlidac] survive-night request failed after monster defeat — server currentRun may not have advanced", err);
      });

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

  /** Posuvník na LeftWallView.tsx (jen s brokovnicí) — viz GameState.officeDoorLockMs, game/minigame/config.ts#OFFICE_DOOR_LOCK_MIN_MS/MAX_MS. Perzistuje jako hráčské nastavení, ne per-noc hodnota (viz gameReducer.ts). */
  function handleChangeOfficeDoorLockMs(value: number) {
    dispatch({ type: "SET_OFFICE_DOOR_LOCK_MS", value });
  }

  // "ZAŽÁDAT O MUNICI" na LeftWallView.tsx (viz zadání "systém brokovnice a
  // přebíjení") — canRequestAmmo se čte ze SOUČASNÉHO state PŘED dispatchem
  // (stejný "zvol zvuk podle stavu, co znám teď" vzor jako
  // handleStartThinkItOverWindup výše), ať se zvuk úspěchu/odmítnutí přesně
  // shoduje s tím, co REQUEST_AMMO v reduceru samo o sobě udělá (nebo
  // neudělá). Dva různé odmítací případy (plná zbraň / žádná zbraň zatím
  // nenalezená) sdílí jeden zvuk (viz audioEvents.ts#ammoRequestRejected).
  function handleRequestAmmo() {
    if (!canRequestAmmo(state)) {
      audioManager.play(AUDIO_EVENTS.ammoRequestRejected);
      return;
    }
    audioManager.play(AUDIO_EVENTS.ammoDispenseClick);
    dispatch({ type: "REQUEST_AMMO" });
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

      // Brokovnice/náboj (viz zadání "systém brokovnice a přebíjení",
      // game/core/shotgunEquipment.ts) — KAŽDÝ bezpečný návrat přenese SKUTEČNĚ
      // zbylou munici (state.shotgunAmmo před výpravou minus result.shotsUsed
      // vystřelené cestou, plus případný ammo_acquired loot), NE plné dobití
      // (zadání "to je záměrné nové herní chování" — zapomene-li hráč
      // dobít před dalším výjezdem, vyrazí i s 0 náboji). "dead"/"failed"
      // výše tenhle dispatch vůbec nezavolají — brokovnice/náboj se tedy
      // nikdy nezíská bez skutečného návratu.
      const shotgunResult = applyShotgunEmergencyReturn(
        { hasShotgun: state.hasShotgun, hasDoubleBarrelShotgun: state.hasDoubleBarrelShotgun },
        state.shotgunAmmo,
        result.shotsUsed,
        result.worldEffects,
      );
      const gainedShotgunOwnership = !state.hasShotgun && shotgunResult.hasShotgun;

      if (gainedShotgunOwnership && resolveWeaponAcquisitionPersistenceMode(state.gameMode, object13Profile.loadState) === "server") {
        // Hardcore + ready profil (viz zadání "13. server-confirmed single
        // shotgun acquisition") — vlastnictví zbraně se v runtime GameState
        // projeví AŽ PO potvrzení serverem, nikdy dřív. `shotgunAmmo` pro
        // tuhle výpravu se aplikuje spolu s ním (žádné "má munici, ale
        // nemá zbraň" mezistav) — munice samotná zůstává runtime hodnota,
        // ale nemá smysl bez potvrzeného vlastnictví zbraně.
        if (!weaponAcquisitionPendingRef.current) {
          weaponAcquisitionPendingRef.current = true;
          object13Profile.unlockWeapon("single_shotgun").then((unlockResult) => {
            weaponAcquisitionPendingRef.current = false;
            const outcome = deriveWeaponAcquisitionConfirmOutcome(unlockResult);
            if (outcome.outcome !== "confirmed") {
              // conflict/unavailable — trvalé odemčení se NEDOKONČÍ, žádný
              // automatický retry (viz zadání). Hráč zůstává bez brokovnice
              // v tomhle runtime stavu, i když ji fyzicky sebral v minihře.
              return;
            }
            dispatch({ type: "APPLY_SHOTGUN_EFFECTS", hasShotgun: shotgunResult.hasShotgun, shotgunAmmo: shotgunResult.shotgunAmmo });
            setEmergencyRunMessage(COPY.game.shotgunAcquiredLabel);
          });
        }
      } else if (shotgunResult.hasShotgun !== state.hasShotgun || shotgunResult.shotgunAmmo !== state.shotgunAmmo) {
        // Training/anonymní (lokální mode), nebo jen změna munice (zbraň už
        // vlastněná) — dokončuje se okamžitě, žádné čekání na server (viz
        // zadání "munice zůstává runtime stav aktuální mise").
        dispatch({ type: "APPLY_SHOTGUN_EFFECTS", hasShotgun: shotgunResult.hasShotgun, shotgunAmmo: shotgunResult.shotgunAmmo });
        if (gainedShotgunOwnership) {
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

        // "alreadyDefeatedBefore" = hráč porazil bestii už NĚKDY dřív (jiná
        // noc/run) — monsterDefeatsCount > 0 PŘED touhle výhrou. Počítá se
        // tady (ne v reduceru, ten localStorage nečte) stejným výpočtem jako
        // confirmMonsterHit v gameReducer.ts, ať víme PŘED dispatchem, jestli
        // tenhle zásah spustí opakovanou porážku (viz zadání "bestie je
        // mrtvá, ale nebyla poslední").
        const willDefeatMonster =
          state.monsterHitsToday + state.pendingMonsterHits >= state.nightFeatures.monsterTrueEndingRequiredHits;
        const alreadyDefeatedBefore = getMonsterDefeatReward().monsterDefeatsCount > 0;

        dispatch({ type: "CONFIRM_MONSTER_HIT", alreadyDefeatedBefore });

        if (willDefeatMonster && alreadyDefeatedBefore) {
          // Opakovaná porážka nejde přes MonsterDefeatedScreen/
          // handleMonsterDefeatedCinematicComplete (run nekončí) — trvalé
          // statistiky/odměny se tedy musí zapsat přímo tady, jinak by
          // monsterDefeatsCount/monsterKills u opakovaných výher tiše
          // přestaly růst. Achievementy záměrně NEvyhodnocujeme tady
          // (evaluateResultAchievements by je rovnou označila za "zobrazené"
          // bez skutečného zobrazení) — přirozeně se odhalí při nejbližším
          // dalším win/death vyhodnocení v týhle směně.
          recordMonsterDefeat();
          recordMonsterKill();
          if (state.gameMode === "hardcore") {
            const hardcoreProgress = recordLocalHardcoreMonsterDefeat();
            const snapshot = createHardcoreProfileSnapshotFromLocalState(getPlayerProfileStats(), hardcoreProgress);
            fetch("/api/player/hardcore-profile/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(snapshot),
            }).catch((err) => {
              console.warn("[nocni-hlidac] hardcore-profile sync request failed (repeat monster defeat)", err);
            });
          }
          messages.push(COPY.game.monsterDefeatedRepeatLabel);
        } else {
          messages.push(COPY.game.monsterHitConfirmedLabel);
        }
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

  // "PŘETÍŽIT GENERÁTOR" (viz zadání "zničené dveře vlastní chybou hráče") —
  // ŽÁDNÝ window.confirm, čistě hold-to-activate, stejný vzor jako
  // handleStartEmergencyRunWindup/handleCancelEmergencyRunWindup výše
  // (canStartGeneratorOverloadWindup je jen UX zkratka proti zbytečnému
  // dispatchi, autoritativní podmínka zůstává v reduceru). Varování se
  // ukáže hned při zahájení držení (stejný emergencyRunMessage slot jako
  // "Jít ven" — žádný nový toast systém, viz zadání), siréna běží přes
  // samostatný useEffect výše sledující generatorOverloadWindup.active.
  function handleStartGeneratorOverloadWindup() {
    if (!canStartGeneratorOverloadWindup(state)) return;
    audioManager.play(AUDIO_EVENTS.uiClick);
    setEmergencyRunMessage(COPY.game.generatorOverloadWarningLabel);
    dispatch({ type: "START_GENERATOR_OVERLOAD_WINDUP" });
  }

  function handleCancelGeneratorOverloadWindup() {
    dispatch({ type: "CANCEL_GENERATOR_OVERLOAD_WINDUP" });
  }

  // DEV-ONLY: same simulate-both-steps pattern as handleDebugToggleDoor.
  function handleDebugRestartGenerator() {
    dispatch({ type: "LOOK_AT_GENERATOR" });
    dispatch({ type: "RESTART_GENERATOR" });
  }

  // ADMIN-ONLY: viz zadání "testovací nástroj pro late-run scény",
  // DebugPanel.tsx "Test noci" sekce. Aktualizuje OBĚ reprezentace "kolikátá
  // noc pro debug override" atomicky — GameState.debugNightOverride
  // (zobrazení/scaling/getNightConfig, beze změny) I komponentový
  // `debugNightOverride` mirror výše (ten reálně přepíná `night`/
  // `gameReducer`, viz komentář u useMemo nahoře). Bez druhého by třeba
  // ruční "Nastavit noc" na 15 přepnulo ČÍSLO, ale ne skutečnou
  // NightDefinition/monstrum.
  function handleSetDebugNight(nightNumber: number) {
    setDebugNightOverride(nightNumber);
    dispatch({ type: "SET_DEBUG_NIGHT", night: nightNumber });
  }

  // ADMIN-ONLY "SPUSTIT TITANA 1/2/3" (viz zadání "8. ADMIN / DEBUG
  // OVLÁDÁNÍ" — tři samostatné debug akce, ať jde ručně ověřit KAŽDÉ ze tří
  // setkání zvlášť, včetně jeho vlastní náhodně vybrané "escape" hlášky, viz
  // useTitanEscapeMessage.ts). `encounterIndex` (0/1/2) jen vybere
  // KTEROU z persistovaných `titanEncounterNights` hodnot použít jako
  // debugNightOverride — samotný mechanismus (přepnutí night/reducer PŘED
  // dispatchem DEBUG_START_TITAN, viz pendingDebugStartTitanRef) je beze
  // změny. Nezávislé na aktuálním čísle dne (viz zadání) — funguje i když
  // hráč zrovna hraje úplně jinou noc, přepíše ji.
  const pendingDebugStartTitanRef = useRef(false);
  function handleDebugStartTitan(encounterIndex: 0 | 1 | 2) {
    pendingDebugStartTitanRef.current = true;
    setDebugNightOverride(titanEncounterNights[encounterIndex]);
  }
  useEffect(() => {
    if (!pendingDebugStartTitanRef.current || night.enemy.id !== "titan") return;
    pendingDebugStartTitanRef.current = false;
    dispatch({ type: "DEBUG_START_TITAN" });
  }, [night]);

  // ADMIN-ONLY "TITAN: DALŠÍ STAGE" — na rozdíl od výše žádné přepínání
  // night/reducer, jen prostý dispatch (reducer sám no-opuje mimo Titanovu
  // noc, viz gameReducer.ts DEBUG_ADVANCE_TITAN_STAGE).
  function handleDebugAdvanceTitanStage() {
    dispatch({ type: "DEBUG_ADVANCE_TITAN_STAGE" });
  }

  // DEV-ONLY: ručně spustí útok Ghoula na PRÁVĚ AKTIVNÍ kameru (viz zadání
  // "spolehlivě otestovat", game/core/cameraDamage.ts) — obchází jen
  // náhodný hod, ne ostatní podmínky (reducer si je ověří sám).
  // `currentNight` stejná hodnota jako ENEMY_ADVANCE (limit podle čísla noci).
  function handleDebugTriggerGhoulCameraAttack(animationId?: GhoulCameraAttackAnimationId) {
    dispatch({ type: "DEBUG_TRIGGER_GHOUL_CAMERA_ATTACK", currentNight, animationId });
  }

  function handleDebugResetCameraDamage() {
    dispatch({ type: "DEBUG_RESET_CAMERA_DAMAGE" });
  }

  function handleDebugMoveEnemyToDisabledCamera() {
    dispatch({ type: "DEBUG_MOVE_ENEMY_TO_DISABLED_CAMERA" });
  }

  function handleDebugPlayDisabledCameraFootsteps() {
    dispatch({ type: "DEBUG_PLAY_DISABLED_CAMERA_FOOTSTEPS" });
  }

  function handleSetDebugGhoulCameraAttackChance(chance: number | null) {
    dispatch({ type: "SET_DEBUG_GHOUL_CAMERA_ATTACK_CHANCE_OVERRIDE", chance });
  }

  function handleDebugSkipCameraAttackToLastFrame() {
    dispatch({ type: "DEBUG_SKIP_CAMERA_ATTACK_TO_LAST_FRAME" });
  }

  function handleDebugSkipCameraAttackToOffline() {
    dispatch({ type: "DEBUG_SKIP_CAMERA_ATTACK_TO_OFFLINE" });
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

  // Sleduje, kdy je ruční výměna žárovky u dveří ready-to-confirm (progres
  // dosáhl konce, viz gameReducer.ts#isBulbReplacementReadyToConfirm) a podle
  // gameMode/profilu rozhodne, jak ji potvrdit — Training/anonymní rovnou
  // (dispatch(CONFIRM_BULB_REPLACEMENT) je synchronní, žádné čekání), Hardcore
  // teprve PO úspěšné odpovědi serveru (viz zadání "4. Hardcore: spotřeba
  // žárovky"). `bulbInventoryPendingRef` blokuje zdvojený dispatch, pokud by
  // se effect nějak spustil znovu, než doběhne první serverová odpověď.
  useEffect(() => {
    const action = decideBulbReplacementConfirmAction({
      readyToConfirm: isBulbReplacementReadyToConfirm(state),
      operationPending: bulbInventoryPendingRef.current,
      needsReload: bulbInventoryNeedsReloadRef.current,
      gameMode: state.gameMode,
      loadState: object13Profile.loadState,
    });

    if (action.type === "none") return;

    if (action.type === "cancel_blocked_needs_reload") {
      // Nejasný výsledek z dřívější operace (timeout/unavailable) — další
      // inventářová operace je blokovaná, dokud si hráč nevyžádá reload (viz
      // zadání "13. Výpadek odpovědi po zápisu"). Rozehranou výměnu bez
      // následku zrušíme, ať progres nezůstane navěky zaseknutý na 100 %.
      dispatch({ type: "CANCEL_BULB_REPLACEMENT" });
      return;
    }

    if (action.type === "confirm_immediately") {
      dispatch({ type: "CONFIRM_BULB_REPLACEMENT" });
      return;
    }

    // action.type === "call_server"
    bulbInventoryPendingRef.current = true;
    setBulbInventoryOperationState({ status: "consuming" });
    object13Profile
      .consumeBulbs(1)
      .then((result) => {
        bulbInventoryPendingRef.current = false;
        const outcome = deriveBulbInventoryConfirmOutcome(result);

        if (outcome.outcome === "confirmed") {
          setBulbInventoryOperationState({ status: "idle" });
          dispatch({ type: "CONFIRM_BULB_REPLACEMENT" });
          return;
        }
        // insufficient_inventory / exceeds_maximum (nikdy nenastane pro
        // consume, ale typ ho zná) / conflict / unavailable — výměna se
        // NEDOKONČÍ, aktivní žárovka se nevymění, bulbsRemaining se nesníží.
        // `unavailable` navíc zablokuje DALŠÍ operace až do reloadu (viz
        // zadání "13.") — nikdy automatický retry.
        if (outcome.outcome === "unavailable") {
          bulbInventoryNeedsReloadRef.current = true;
        }
        setBulbInventoryOperationState({ status: "error", error: outcome.outcome });
        dispatch({ type: "CANCEL_BULB_REPLACEMENT" });
      });
    // Poznámka: žádný `.catch` navíc potřeba — `object13Profile.consumeBulbs`
    // (lib/playerProfile/object13PlayerProfileClient.ts) už sama nikdy
    // nevyhodí, network chyby se mapují na `{status: "error"}` výsledek.
  }, [state.bulbReplacement.active, state.bulbReplacement.progressMs, state.gameMode, object13Profile.loadState]);

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

  function handleToggleSonicCannon() {
    // Žádné přímé audioManager.play() tady — přesně jedno mechanické
    // cvaknutí (ruční i automatické po výsledku) řeší JEDINÝ efekt níže na
    // state.sonicCannonToggleSeq, ať se click nikdy nepřehraje dvakrát (viz
    // zadání "nesmí se přehrát současně dvakrát kvůli reducer eventu a
    // React effectu").
    dispatch({ type: "TOGGLE_SONIC_CANNON" });
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
      {state.screen === "loading" && <LoadingScreen gameMode={selectedGameModeRef.current} />}
      {state.screen === "briefing" && !introCinematicActive && (
        <BriefingScreen nightNumber={currentNight} onStartShift={handleBeginShift} onStartIntro={handleStartIntroFromBriefing} />
      )}
      {state.screen === "briefing" && introCinematicActive && (
        <CinematicScreen sceneId="intro" onComplete={handleIntroCinematicComplete} />
      )}
      {state.screen === "playing" && thinkItOverCinematicActive && (
        <CinematicScreen sceneId="think_it_over_warning" onComplete={handleThinkItOverCinematicComplete} />
      )}
      {state.screen === "playing" && !activeMiniGame && !thinkItOverCinematicActive && (
        <GameScreen
          state={state}
          night={night}
          tensionLevel={tensionLevel}
          heartbeatStress={heartbeatStress}
          nightNumber={currentNight}
          serverCurrentRun={serverRunState?.currentRun ?? null}
          localSurvivedNights={survivedNights}
          bulbsRemaining={state.bulbsRemaining}
          isAdmin={isAdmin}
          onToggleDoor={handleToggleDoor}
          onToggleLight={handleToggleLight}
          onSelectCamera={handleSelectCamera}
          onCloseCameras={handleCloseCameras}
          onToggleSonicCannon={handleToggleSonicCannon}
          onToggleAudio={handleToggleAudio}
          onLookAtDoor={handleLookAtDoor}
          onLookAtDesk={handleLookAtDesk}
          onLookAtGenerator={handleLookAtGenerator}
          onLookAtLeftWall={handleLookAtLeftWall}
          onLookAtMap={handleLookAtMap}
          onRestartGenerator={handleRestartGenerator}
          onStartGeneratorOverloadWindup={handleStartGeneratorOverloadWindup}
          onCancelGeneratorOverloadWindup={handleCancelGeneratorOverloadWindup}
          onDebugToggleDoor={handleDebugToggleDoor}
          onDebugRestartGenerator={handleDebugRestartGenerator}
          onSetDebugNight={handleSetDebugNight}
          onDebugStartTitan={handleDebugStartTitan}
          onDebugAdvanceTitanStage={handleDebugAdvanceTitanStage}
          onDebugTriggerGhoulCameraAttack={handleDebugTriggerGhoulCameraAttack}
          onDebugResetCameraDamage={handleDebugResetCameraDamage}
          onDebugMoveEnemyToDisabledCamera={handleDebugMoveEnemyToDisabledCamera}
          onDebugPlayDisabledCameraFootsteps={handleDebugPlayDisabledCameraFootsteps}
          onSetDebugGhoulCameraAttackChance={handleSetDebugGhoulCameraAttackChance}
          onDebugSkipCameraAttackToLastFrame={handleDebugSkipCameraAttackToLastFrame}
          onDebugSkipCameraAttackToOffline={handleDebugSkipCameraAttackToOffline}
          onStartBulbReplacement={handleStartBulbReplacement}
          onCancelBulbReplacement={handleCancelBulbReplacement}
          onRequestAmmo={handleRequestAmmo}
          onStartEmergencyRunWindup={handleStartEmergencyRunWindup}
          onCancelEmergencyRunWindup={handleCancelEmergencyRunWindup}
          onStartThinkItOverWindup={handleStartThinkItOverWindup}
          onCancelThinkItOverWindup={handleCancelThinkItOverWindup}
          onChangeOfficeDoorLockMs={handleChangeOfficeDoorLockMs}
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
      {/* Valhala meziscéna (viz zadání, efekt výše, game/core/valhalaEnding.ts) —
          jen Hardcore smrt v noci 20–30 včetně. Nezávislá na cinematicPending/
          activeCinematicSceneId (ty patří výhradně first-night near-miss flow
          výše) — vlastní boolean, vlastní onComplete, který na rozdíl od
          handleCinematicComplete pokračuje do normální death sekvence, ne do
          briefingu. */}
      {state.screen === "death" && valhalaCinematicActive && (
        <CinematicScreen sceneId="valhala_ending" onComplete={handleValhalaCinematicComplete} />
      )}
      {state.screen === "death" &&
        !cinematicPending &&
        !activeCinematicSceneId &&
        !valhalaCinematicActive &&
        !deathSequenceActive && (
        <DeathScreen
          reason={state.deathReason}
          deathCount={deathCount}
          gameMode={state.gameMode}
          livesRemaining={state.livesRemaining}
          nightNumber={deathNightNumber}
          newlyUnlockedAchievements={deathNewlyUnlockedAchievements}
          activeMonsterId={deathMonsterId}
          onRetry={handleRestart}
        />
      )}
      {/* Hardcore Noc 30 ending (viz zadání, game/core/night30Ending.ts) —
          NAHRAZUJE WinScreen pro tenhle jeden přechod, ne doplňuje ho.
          recordNightSurvived/achievementy/survive-night fetch proběhly už v
          efektu výše, stejně jako pro běžnou výhru — night30Ending jen řídí,
          KTERÁ obrazovka (a případně KTERÁ varianta) se zobrazí. */}
      {state.screen === "win" && night30Ending !== "none" && (
        <Night30EndingScreen
          kind={night30Ending}
          newlyUnlockedAchievements={winNewlyUnlockedAchievements}
          onGoToMenu={handleGoToMenu}
        />
      )}
      {state.screen === "win" && night30Ending === "none" && (
        <WinScreen
          survivedNights={survivedNights}
          newlyUnlockedAchievements={winNewlyUnlockedAchievements}
          onRetry={handleRestart}
          onGoToMenu={handleGoToMenu}
        />
      )}
      {/* Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — má
          přednost před běžným win/death flow (gameReducer.ts#CONFIRM_MONSTER_HIT
          nastaví screen "monsterDefeated" přímo, ne přes TICK/ENEMY_ADVANCE). */}
      {state.screen === "monsterDefeated" && (
        <MonsterDefeatedScreen
          onGoToMenu={handleGoToMenu}
          onCinematicComplete={handleMonsterDefeatedCinematicComplete}
          newlyUnlockedAchievements={monsterDefeatedNewlyUnlockedAchievements}
        />
      )}
    </div>
    {/* Skutečná smrt (near-miss jede přes cinematicPending/activeCinematicSceneId
        výše, nikdy sem) — nejdřív death sekvence (ticho -> bílý záblesk ->
        shake -> zvuk, viz DeathSequenceOverlay.tsx, vyladěná na /death-test),
        DeathScreen se mountuje AŽ PO jejím dokončení, ať hráč nemůže kliknout
        na tlačítko schované pod neprůhledným overlayem (ten má
        pointer-events: none, klik by jinak propadl skrz). DeathScreen sám
        pak ještě chvíli drží dialog schovaný, dokud ghoul_death animace na
        jeho pozadí nedoběhne (viz DeathScreen.tsx).
        SOUROZENEC .atmosphere-root, ne jeho potomek — stejný gotcha jako u
        AchievementToast níže (fixed inset-0 uvnitř filtrovaného rodiče by se
        nepřichytil k viewportu, ale ke zborcenému nulovému boxu .atmosphere-root,
        když je overlay jediné dítě). Byl původně omylem uvnitř .atmosphere-root,
        proto se vizuálně vůbec nezobrazoval, i když časování běželo správně. */}
    {state.screen === "death" &&
      !cinematicPending &&
      !activeCinematicSceneId &&
      !valhalaCinematicActive &&
      deathSequenceActive && (
      <DeathSequenceOverlay
        active={deathSequenceActive}
        config={getLiveDeathSequenceConfig(state.deathReason)}
        variant={isDoorAttackDeath(state.deathReason) ? "door" : "default"}
        onComplete={handleDeathSequenceComplete}
      />
    )}
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
