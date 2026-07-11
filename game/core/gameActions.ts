import { CameraId, RoomBulbsState } from "./types";
import { NightFeatureFlags } from "../difficulty/nightConfig";
import { GameMode } from "./gameMode";

export type GameAction =
  | { type: "START_LOADING" }
  // Krátký briefing panel před START_SHIFT/RESTART_SHIFT (viz
  // components/screens/BriefingScreen.tsx) — jen přechod na screen
  // "briefing", žádná jiná změna stavu.
  | { type: "SHOW_BRIEFING" }
  // roomBulbs (viz game/core/roomBulbs.ts), bulbsRemaining (viz
  // game/core/bulbInventory.ts) a nightFeatures (viz
  // game/difficulty/nightConfig.ts) jsou volitelné — app/play/page.tsx je
  // posílá načtené z localStorage / spočítané přes getNightConfig, chybí-li
  // se použijí čerstvé výchozí hodnoty (createDefaultRoomBulbs,
  // BULBS_CONFIG.startingCount, DEFAULT_NIGHT_FEATURES).
  // gameMode/livesRemaining jsou stejně volitelné jako pole výše — chybí-li,
  // createInitialGameState spadne na DEFAULT_GAME_MODE / čerstvé
  // GAME_MODE_CONFIG[gameMode].startingLives (nový run). app/play/page.tsx
  // pošle skutečnou hodnotu: čerstvou při novém startu (vybranou na
  // MainMenuScreen), nebo zachovanou `state.gameMode`/`state.livesRemaining`
  // při RESTART_SHIFT (viz gameMode.ts, handleBeginShift).
  // hasShotgun/shotgunAmmo/hasDoubleBarrelShotgun jsou stejná volitelná
  // trojice navíc (viz game/core/shotgunEquipment.ts) — chybí-li,
  // createInitialGameState spadne na `false`/`0`/`false` (nový run bez
  // brokovnice). app/play/page.tsx#handleBeginShift pošle
  // hasDoubleBarrelShotgun: true jen na "fresh run" větvi, když má hráč
  // trvale odemčenou dvouhlavňovku (viz monsterDefeatReward.ts).
  | {
      type: "START_SHIFT";
      roomBulbs?: RoomBulbsState;
      bulbsRemaining?: number;
      nightFeatures?: NightFeatureFlags;
      gameMode?: GameMode;
      livesRemaining?: number;
      hasShotgun?: boolean;
      shotgunAmmo?: number;
      hasDoubleBarrelShotgun?: boolean;
      // Přenáší se přes restart/další noc stejně jako hasShotgun výše (viz
      // GameState.monsterKilledThisRun, game/core/night30Ending.ts) — chybí-li,
      // createInitialGameState spadne na `false` (nový run).
      monsterKilledThisRun?: boolean;
    }
  | {
      type: "RESTART_SHIFT";
      roomBulbs?: RoomBulbsState;
      bulbsRemaining?: number;
      nightFeatures?: NightFeatureFlags;
      gameMode?: GameMode;
      livesRemaining?: number;
      hasShotgun?: boolean;
      shotgunAmmo?: number;
      hasDoubleBarrelShotgun?: boolean;
      monsterKilledThisRun?: boolean;
    }
  | { type: "TOGGLE_DOOR" }
  | { type: "TOGGLE_LIGHT" }
  | { type: "LOOK_AT_DOOR" }
  | { type: "LOOK_AT_DESK" }
  | { type: "LOOK_AT_GENERATOR" }
  | { type: "LOOK_AT_LEFT_WALL" }
  | { type: "LOOK_AT_MAP" }
  | { type: "RESTART_GENERATOR" }
  | { type: "OPEN_CAMERA"; cameraId: CameraId }
  | { type: "CLOSE_CAMERAS" }
  | { type: "TOGGLE_AUDIO_MUTED" }
  // Posuvník na LeftWallView.tsx (jen s brokovnicí) — viz
  // game/minigame/config.ts#OFFICE_DOOR_LOCK_MIN_MS/MAX_MS. Reducer hodnotu
  // sám neclampuje (viz zadání "posuvník už to hlídá"), ale komponenta i tak
  // vždy posílá hodnotu v platném rozsahu.
  | { type: "SET_OFFICE_DOOR_LOCK_MS"; value: number }
  | { type: "START_BULB_REPLACEMENT" }
  // Puštění tlačítka/pointer leave/cancel před dokončením — viz DoorView.tsx.
  // No-op, pokud žádná výměna zrovna neběží.
  | { type: "CANCEL_BULB_REPLACEMENT" }
  // stressLevel (0..1, viz game/audio/useHeartbeatStress.ts) je volitelný —
  // řídí jen game/core/stressTimeScale.ts, chybí-li, čas běží normální
  // rychlostí (stejné jako stressLevel 0). currentNight (survivedNights + 1,
  // viz game/core/survivedNights.ts) řídí jen game/difficulty/nightScaling.ts,
  // chybí-li, bere se jako noc 1 (žádné ztěžování). Ani jedno pole nezajímá
  // zbytek herní logiky/audia.
  | { type: "TICK"; deltaMs: number; stressLevel?: number; currentNight?: number }
  | { type: "ENEMY_ADVANCE" }
  | { type: "GO_TO_MENU" }
  // Efekt z nouzové minihry (viz EmergencyMiniGame, game/minigame/types.ts
  // EmergencyWorldEffect "energy_recharged") po returned resultu —
  // app/play/page.tsx#handleEmergencyMiniGameComplete pošle už spočítané
  // množství, reducer jen přičte a clampne na MAX_POWER. amount <= 0 je no-op.
  | { type: "RECHARGE_POWER"; amount: number }
  // Hráč zemřel uvnitř nouzové minihry (outcome "dead", viz
  // EmergencyMiniGame) — stejný death flow jako ENEMY_ADVANCE/TICK, jen
  // spuštěný zvenčí (z app/play/page.tsx), ne z herní smyčky.
  | { type: "EMERGENCY_MINIGAME_DIED" }
  // Držení tlačítka "Jít ven" (viz EmergencyRunWindupState, LeftWallView.tsx)
  // — stejný start/cancel pár jako START_BULB_REPLACEMENT/CANCEL_BULB_REPLACEMENT.
  // Samotné spuštění EmergencyMiniGame nastává až mimo reducer, když
  // app/play/page.tsx uvidí zvýšené emergencyRunReadySeq po TICKu, který
  // držení dotáhl do konce.
  | { type: "START_EMERGENCY_RUN_WINDUP" }
  | { type: "CANCEL_EMERGENCY_RUN_WINDUP" }
  // Držení "Nechat si to projít hlavou" (viz ThinkItOverWindupState,
  // LeftWallView.tsx) — stejný start/cancel pár jako
  // START_EMERGENCY_RUN_WINDUP/CANCEL_EMERGENCY_RUN_WINDUP výše, ale po
  // doběhnutí se jen zvýší thinkItOverReadySeq (žádná minihra).
  | { type: "START_THINK_IT_OVER_WINDUP" }
  | { type: "CANCEL_THINK_IT_OVER_WINDUP" }
  // Hráč se vrátil z nouzové minihry (outcome "returned"), ale monstrum ho
  // pronásledovalo/bylo blízko kanceláře (viz
  // game/minigame/officeThreat.ts#evaluateOfficeThreatOnReturn,
  // app/play/page.tsx#handleEmergencyMiniGameComplete) — posune enemyStage
  // blíž ke kanceláři (viz gameReducer.ts OFFICE_THREAT_STAGE_CANDIDATES),
  // NIKDY nezpůsobí smrt sama o sobě. `intensity` je prostá string union,
  // záměrně NE `OfficeThreatIntensity` z game/minigame/types.ts — game/core/*
  // nikdy nesmí importovat typy z game/minigame/* (viz types.ts nahoře).
  | { type: "APPLY_OFFICE_THREAT_ON_RETURN"; intensity: "low" | "medium" | "high" }
  // Monstrum FYZICKY doběhlo do kanceláře v EmergencyMiniGame, PAK se hráč
  // bezpečně vrátil (viz EmergencyWorldEffect "monster_reached_office" v
  // game/minigame/types.ts, app/play/page.tsx#handleEmergencyMiniGameComplete
  // přes resolveOfficeThreatTriggeredFromWorldEffects) — na rozdíl od
  // APPLY_OFFICE_THREAT_ON_RETURN výše (monstrum jen "bylo poblíž") tenhle
  // scénář navíc rozbije dveřní žárovku a spustí poruchu generátoru (viz
  // gameReducer.ts, game/core/officeBreachAftermath.ts) — reálná krize s
  // delší reakční dobou (OFFICE_BREACH_REACTION_WINDOW_MS), ne jen posunutý
  // enemyStage. Žádný payload — vždy stejná, pevná reakce.
  | { type: "APPLY_MONSTER_REACHED_OFFICE_AFTERMATH" }
  // Bezpečný návrat z emergency výpravy (viz game/core/shotgunEquipment.ts,
  // app/play/page.tsx#handleEmergencyMiniGameComplete) — volající tam už
  // spočítal finální hasShotgun/shotgunAmmo (applyShotgunEmergencyReturn),
  // reducer je jen zapíše. Smrt/nedokončená výprava tuhle akci nikdy
  // nedispatchne, takže brokovnice/náboj se tímhle nikdy nezíská bez
  // skutečného návratu do kanceláře.
  | { type: "APPLY_SHOTGUN_EFFECTS"; hasShotgun: boolean; shotgunAmmo: number }
  // Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — dva kroky,
  // stejné rozdělení jako "sebrání věci" vs. "dokončení mise" v minihře:
  // MARK_PENDING_MONSTER_HIT se dispatchne HNED, jak hráč venku trefí
  // monstrum (viz EmergencyMiniGame.tsx#fireShot, app/play/page.tsx
  // onMonsterHit) — zásah se ale ještě NEPOČÍTÁ. CONFIRM_MONSTER_HIT přijde
  // až po bezpečném návratu (outcome "returned" + result.monsterHit, viz
  // handleEmergencyMiniGameComplete) a teprve tam se `monsterHitsToday`
  // zvýší. Smrt venku (EMERGENCY_MINIGAME_DIED) pending zásah jen zahodí,
  // CONFIRM_MONSTER_HIT se pro ni nikdy nedispatchne.
  | { type: "MARK_PENDING_MONSTER_HIT" }
  // `alreadyDefeatedBefore` = monsterDefeatsCount > 0 SPOČÍTANÉ PŘED touhle
  // výhrou (viz game/core/monsterDefeatReward.ts), zjištěné volajícím
  // (app/play/page.tsx) při dispatchi — reducer sám žádný localStorage
  // nečte. Rozhoduje, jestli 10. zásah v týhle noci je úplně první životní
  // výhra (celý dosavadní flow, screen "monsterDefeated") nebo opakovaná
  // (zadání "bestie je mrtvá, ale nebyla poslední" — hra pokračuje, jen se
  // nepřítel na zbytek noci zastaví, viz CONFIRM_MONSTER_HIT case).
  | { type: "CONFIRM_MONSTER_HIT"; alreadyDefeatedBefore: boolean }
  // Sebraná žárovka v emergency výpravě, potvrzená bezpečným návratem (viz
  // game/core/emergencyMiniGameIntegration.ts#resolveBulbsGainedFromWorldEffects,
  // app/play/page.tsx#handleEmergencyMiniGameComplete) — přičte se do
  // existujícího GameState.bulbsRemaining skladu, žádný nový paralelní
  // systém (viz zadání "ověřit napojení žárovky do hlavní hry").
  | { type: "ADD_BULBS_REMAINING"; amount: number };
