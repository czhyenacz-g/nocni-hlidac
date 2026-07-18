import { CameraId, GhoulCameraAttackAnimationId, RoomBulbsState } from "./types";
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
  /**
   * Základ pro budoucí přetížení generátoru (viz TODO.md) — atomicky
   * nastaví `doorDestroyed: true, doorClosed: false`. Zatím nenapojená na
   * žádné produkční UI, jen čistý reducer základ + testy.
   */
  | { type: "DESTROY_DOOR" }
  | { type: "TOGGLE_LIGHT" }
  | { type: "LOOK_AT_DOOR" }
  | { type: "LOOK_AT_DESK" }
  | { type: "LOOK_AT_GENERATOR" }
  | { type: "LOOK_AT_LEFT_WALL" }
  | { type: "LOOK_AT_MAP" }
  | { type: "RESTART_GENERATOR" }
  | { type: "OPEN_CAMERA"; cameraId: CameraId }
  | { type: "CLOSE_CAMERAS" }
  // Přepínač "SONICKÉ DĚLO" v detailu právě otevřené kamery (viz zadání) —
  // beze změny cameraId/výběru kamery. Reducer sám kontroluje, jestli
  // aktivace vůbec dává smysl (detail otevřený, hráč u stolu, energie > 0);
  // vypnutí funguje vždy. Viz GameState.sonicCannonActive.
  | { type: "TOGGLE_SONIC_CANNON" }
  | { type: "TOGGLE_AUDIO_MUTED" }
  // Posuvník na LeftWallView.tsx (jen s brokovnicí) — viz
  // game/minigame/config.ts#OFFICE_DOOR_LOCK_MIN_MS/MAX_MS. Reducer hodnotu
  // sám neclampuje (viz zadání "posuvník už to hlídá"), ale komponenta i tak
  // vždy posílá hodnotu v platném rozsahu.
  | { type: "SET_OFFICE_DOOR_LOCK_MS"; value: number }
  // Admin-only debug nástroj (viz zadání "testovací nástroj pro late-run
  // scény", DebugPanel.tsx, GameState.debugNightOverride) — nastaví, jaké
  // číslo noci app/play/page.tsx dál používá pro Night 30 ending/Valhala
  // rozhodnutí. Reducer sám clampuje `night` na >= 1 (viz gameReducer.ts) —
  // volající (DebugPanel.tsx) nemusí. Nemění žádné jiné pole (gameMode/
  // livesRemaining/hasShotgun/monsterKilledThisRun/roomBulbs/...).
  | { type: "SET_DEBUG_NIGHT"; night: number }
  | { type: "START_BULB_REPLACEMENT" }
  // Puštění tlačítka/pointer leave/cancel před dokončením — viz DoorView.tsx.
  // No-op, pokud žádná výměna zrovna neběží. Používá se i jako "zamítnutí"
  // ze strany orchestrační vrstvy (viz CONFIRM_BULB_REPLACEMENT níže), když
  // Hardcore server odpoví insufficient_inventory/conflict/unavailable —
  // stejný no-op bezpečný reset, žádný jiný efekt.
  | { type: "CANCEL_BULB_REPLACEMENT" }
  // Dispatchuje VÝHRADNĚ orchestrační vrstva (lib/playerProfile/bulbInventoryActions.ts
  // přes app/play/page.tsx), NIKDY přímo UI — teprve poté, co progres dosáhl
  // konce (isBulbReplacementReadyToConfirm) A buď (a) gameMode nepersistuje
  // inventář (Training/anonymní — potvrzuje se rovnou), nebo (b) Hardcore
  // server-side consumeBulbs(1) uspěl. Až TEĎ se skutečně sníží bulbsRemaining
  // a opraví roomBulbs — reducer sám žádný fetch/await neprovádí, jen čeká na
  // tenhle explicitní dispatch. No-op, pokud výměna není ready-to-confirm
  // (bezpečnostní pojistka proti pozdnímu/zdvojenému dispatchi).
  | { type: "CONFIRM_BULB_REPLACEMENT" }
  // stressLevel (0..1, viz game/audio/useHeartbeatStress.ts) je volitelný —
  // řídí jen game/core/stressTimeScale.ts, chybí-li, čas běží normální
  // rychlostí (stejné jako stressLevel 0). currentNight (survivedNights + 1,
  // viz game/core/survivedNights.ts) řídí jen game/difficulty/nightScaling.ts,
  // chybí-li, bere se jako noc 1 (žádné ztěžování). Ani jedno pole nezajímá
  // zbytek herní logiky/audia.
  | { type: "TICK"; deltaMs: number; stressLevel?: number; currentNight?: number }
  // `currentNight` (survivedNights + 1, viz game/core/survivedNights.ts) —
  // stejná hodnota jako TICK.currentNight výše, poslaná i sem (viz
  // game/core/gameLoop.ts), protože ENEMY_ADVANCE ji potřebuje pro
  // GHOUL_CAMERA_ATTACK limit podle čísla noci (viz
  // game/core/cameraDamage.ts#getMaxDisabledCamerasForNight). Chybí-li,
  // bere se jako noc 1 (stejný fallback jako TICK).
  | { type: "ENEMY_ADVANCE"; currentNight?: number }
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
  // Tlačítko "ZAŽÁDAT O MUNICI" na LeftWallView.tsx (viz zadání "systém
  // brokovnice a přebíjení") — přidá přesně JEDEN náboj, nikdy nad kapacitu
  // aktuální zbraně (viz game/core/shotgunEquipment.ts#requestSingleAmmo).
  // Bez brokovnice nebo na plné kapacitě je no-op (canRequestAmmo) — reducer
  // sám nehraje žádný zvuk, o odmítnutí/úspěch se stará
  // app/play/page.tsx#handleRequestAmmo PŘED dispatchem (zná stav ještě
  // před akcí, stejný vzor jako ostatní přímo klikací handlery).
  | { type: "REQUEST_AMMO" }
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
  | { type: "ADD_BULBS_REMAINING"; amount: number }
  // Admin/dev-only ruční spuštění útoku Ghoula na PRÁVĚ AKTIVNÍ kameru (viz
  // zadání "spolehlivě otestovat", DebugPanel.tsx) — obchází JEN náhodný hod
  // (GHOUL_CAMERA_ATTACK_CHANCE zůstává produkčně beze změny, viz
  // game/core/cameraDamage.ts#canDebugTriggerGhoulCameraAttack), ne ostatní
  // podmínky (platná kamera, limit podle čísla noci, kamera zatím není
  // offline/v aktivním útoku). `currentNight` stejná hodnota jako
  // ENEMY_ADVANCE — potřeba pro getMaxDisabledCamerasForNight.
  // `animationId` (viz zadání "vybrat konkrétní sekvenci") je volitelný
  // debug override — chybí-li, reducer vybere sekvenci normálně podle
  // aktivní kamery + světla (viz cameraAttackAnimation.object13.ts).
  | { type: "DEBUG_TRIGGER_GHOUL_CAMERA_ATTACK"; currentNight?: number; animationId?: GhoulCameraAttackAnimationId }
  // Vrátí GameState.cameraDamage na klidový stav bez čekání na novou noc
  // (viz zadání "resetovat stav poškození kamer" v debug režimu).
  | { type: "DEBUG_RESET_CAMERA_DAMAGE" }
  // Dev-only: přesune Ghoula přímo na lokaci PRVNÍ aktuálně vyřazené kamery
  // (viz zadání "přesunout Ghoula do lokace s vyřazenou kamerou a otestovat
  // mikrofon") — no-op bez žádné vyřazené kamery. `enemyStage` změna
  // projde centrálním withDisabledCameraFootsteps wrapperem stejně jako
  // jakýkoliv jiný přesun, takže zvuk kroků z mikrofonu se spustí sám.
  | { type: "DEBUG_MOVE_ENEMY_TO_DISABLED_CAMERA" }
  // Dev-only: ručně přehraje zvuk kroků z mikrofonu bez ohledu na cooldown
  // (viz zadání "ručně přehrát použitý zvuk kroků") — jen zvýší
  // disabledCameraFootstepsSeq, stejný event jako produkční trigger.
  | { type: "DEBUG_PLAY_DISABLED_CAMERA_FOOTSTEPS" }
  // Dev-only override efektivní šance útoku Ghoula na kameru (viz zadání
  // "nastavit šanci na 100 procent", GameState.debugGhoulCameraAttackChanceOverride)
  // — `chance: null` vrátí produkční GHOUL_CAMERA_ATTACK_CHANCE (0.05).
  | { type: "SET_DEBUG_GHOUL_CAMERA_ATTACK_CHANCE_OVERRIDE"; chance: number | null }
  // Dev-only: přeskočí právě probíhající útok rovnou na hold posledního
  // snímku (viz zadání "přeskočit na poslední frame") — no-op bez aktivního útoku.
  | { type: "DEBUG_SKIP_CAMERA_ATTACK_TO_LAST_FRAME" }
  // Dev-only: okamžitě dokončí právě probíhající útok (viz zadání
  // "přeskočit rovnou do offline stavu") — no-op bez aktivního útoku.
  | { type: "DEBUG_SKIP_CAMERA_ATTACK_TO_OFFLINE" };
