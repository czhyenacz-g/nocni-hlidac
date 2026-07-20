import { useState } from "react";
import { CameraId, GameState, GhoulCameraAttackAnimationId, NightDefinition } from "@/game/core/types";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { GENERATOR_OVERLOAD_DOOR_DURATION_MS, STRESS_DEV_HUD_ENABLED } from "@/game/balancing/constants";
import { COPY } from "@/content/copy";
import { computeNearRoomBulbWearRatio } from "@/game/core/roomBulbs";
import { canReplaceBulb, canStartGeneratorOverloadWindup } from "@/game/core/gameReducer";
import { canStartBatteryEmergencyRun, canStartShotgunEmergencyRun } from "@/game/core/emergencyMiniGameIntegration";
import { resolveOfficeBreachPhase } from "@/game/core/officeBreachAftermath";
import { isMonsterAtDoor } from "@/game/core/doorEncounter";
import { resolveTitanOverloadFrameSrc } from "@/game/visuals/titanDoorAssets";
import SceneBackground from "@/components/SceneBackground";
import DeskView from "../game/DeskView";
import DoorView from "../game/DoorView";
import GeneratorView from "../game/GeneratorView";
import LeftWallView from "../game/LeftWallView";
import ObjectMapView from "../game/ObjectMapView";
import BlackoutView from "../game/BlackoutView";
import PowerMeter from "../game/PowerMeter";
import ShiftTimer from "../game/ShiftTimer";
import AudioToggle from "../game/AudioToggle";
import MapButton from "../game/MapButton";
import DebugPanel from "../game/DebugPanel";
import OfficeBreachBanner from "../game/OfficeBreachBanner";
import RadioMessageOverlay from "../game/radio/RadioMessageOverlay";

interface GameScreenProps {
  state: GameState;
  night: NightDefinition;
  tensionLevel: number;
  /** Plynulá stress hodnota (0..1) z game/audio/useHeartbeatStress.ts — jen pro dev HUD (PowerMeter), viz STRESS_DEV_HUD_ENABLED. */
  heartbeatStress: number;
  /** Kolikátá noc v řadě aktuálního hlídače (viz game/core/survivedNights.ts) — jen popisek pro ShiftTimer. */
  nightNumber: number;
  /** Serverový currentRun přihlášeného hráče (viz app/api/auth/me/route.ts) — jen pro DebugPanel "Run source", `null` = nepřihlášený/hub API nedostupné. */
  serverCurrentRun: number | null;
  /** Lokální localStorage counter (viz game/core/survivedNights.ts) — jen pro DebugPanel "Run source". */
  localSurvivedNights: number;
  /** Campaign hodnota z GameState.bulbsRemaining (viz game/core/bulbInventory.ts pro persistenci) — snižuje se v reduceru při dokončené ruční výměně. */
  bulbsRemaining: number;
  /** Přihlášený admin (viz lib/auth/adminUsers.ts) — jen pro admin-only rychlé testovací pomůcky (viz DeskView.tsx#CameraPanel door alert LED), žádná herní pravidla na tom nestaví. */
  isAdmin: boolean;
  onToggleDoor: () => void;
  onToggleLight: () => void;
  onSelectCamera: (id: CameraId) => void;
  onCloseCameras: () => void;
  onToggleSonicCannon: () => void;
  onToggleAudio: () => void;
  onLookAtDoor: () => void;
  onLookAtDesk: () => void;
  onLookAtGenerator: () => void;
  onLookAtLeftWall: () => void;
  onLookAtMap: () => void;
  /** Zahájí/zruší držení "Nouzově opustit místnost" (viz app/play/page.tsx#handleStartEmergencyRunWindup/handleCancelEmergencyRunWindup, GameState.emergencyRunWindup) — jen na left_wall pohledu, viz LeftWallView.tsx. */
  onStartEmergencyRunWindup: () => void;
  onCancelEmergencyRunWindup: () => void;
  /** Zahájí/zruší držení "Nechat si to projít hlavou" (viz app/play/page.tsx#handleStartThinkItOverWindup/handleCancelThinkItOverWindup, GameState.thinkItOverWindup) — jen na left_wall pohledu, jen s brokovnicí. */
  onStartThinkItOverWindup: () => void;
  onCancelThinkItOverWindup: () => void;
  /** Posuvník na LeftWallView.tsx (jen s brokovnicí) — viz GameState.officeDoorLockMs, game/minigame/config.ts#OFFICE_DOOR_LOCK_MIN_MS/MAX_MS. */
  onChangeOfficeDoorLockMs: (value: number) => void;
  onRestartGenerator: () => void;
  /**
   * Hold-to-activate "PŘETÍŽIT GENERÁTOR" (viz zadání) — stejný
   * pointerDown/Up pár jako onStartEmergencyRunWindup/onCancelEmergencyRunWindup
   * výše, žádný window.confirm. Viz app/play/page.tsx#handleStartGeneratorOverloadWindup/
   * handleCancelGeneratorOverloadWindup, GameState.generatorOverloadWindup.
   */
  onStartGeneratorOverloadWindup: () => void;
  onCancelGeneratorOverloadWindup: () => void;
  onDebugToggleDoor: () => void;
  onDebugRestartGenerator: () => void;
  /** Admin-only "Test noci" v DebugPanel.tsx (viz zadání, GameState.debugNightOverride). */
  onSetDebugNight: (night: number) => void;
  onStartBulbReplacement: () => void;
  onCancelBulbReplacement: () => void;
  /** "ZAŽÁDAT O MUNICI" na LeftWallView.tsx (viz zadání "systém brokovnice a přebíjení"). */
  onRequestAmmo: () => void;
  /** Dev-only ruční spuštění útoku Ghoula na aktuální kameru (viz zadání "spolehlivě otestovat", DebugPanel.tsx). */
  onDebugTriggerGhoulCameraAttack: (animationId?: GhoulCameraAttackAnimationId) => void;
  onDebugResetCameraDamage: () => void;
  onDebugMoveEnemyToDisabledCamera: () => void;
  onDebugPlayDisabledCameraFootsteps: () => void;
  onSetDebugGhoulCameraAttackChance: (chance: number | null) => void;
  onDebugSkipCameraAttackToLastFrame: () => void;
  onDebugSkipCameraAttackToOffline: () => void;
  /** "SPUSTIT TITANA" / "TITAN: DALŠÍ STAGE" (viz zadání "8. ADMIN / DEBUG OVLÁDÁNÍ", DebugPanel.tsx). */
  onDebugStartTitan: () => void;
  onDebugAdvanceTitanStage: () => void;
}

export default function GameScreen({
  state,
  night,
  tensionLevel,
  heartbeatStress,
  nightNumber,
  serverCurrentRun,
  localSurvivedNights,
  bulbsRemaining,
  isAdmin,
  onToggleDoor,
  onToggleLight,
  onSelectCamera,
  onCloseCameras,
  onToggleSonicCannon,
  onToggleAudio,
  onLookAtDoor,
  onLookAtDesk,
  onLookAtGenerator,
  onLookAtLeftWall,
  onLookAtMap,
  onStartEmergencyRunWindup,
  onCancelEmergencyRunWindup,
  onStartThinkItOverWindup,
  onCancelThinkItOverWindup,
  onChangeOfficeDoorLockMs,
  onRestartGenerator,
  onStartGeneratorOverloadWindup,
  onCancelGeneratorOverloadWindup,
  onDebugToggleDoor,
  onDebugRestartGenerator,
  onSetDebugNight,
  onStartBulbReplacement,
  onCancelBulbReplacement,
  onRequestAmmo,
  onDebugTriggerGhoulCameraAttack,
  onDebugResetCameraDamage,
  onDebugMoveEnemyToDisabledCamera,
  onDebugPlayDisabledCameraFootsteps,
  onSetDebugGhoulCameraAttackChance,
  onDebugSkipCameraAttackToLastFrame,
  onDebugSkipCameraAttackToOffline,
  onDebugStartTitan,
  onDebugAdvanceTitanStage,
}: GameScreenProps) {
  // Pozadí pro desk/generator (BACKGROUND_SCENES.play) — jen mimo blackout,
  // kdy BlackoutView stejně celou obrazovku nahrazuje vlastní atmosférou.
  // DoorView i LeftWallView mají vlastní lokální řešení (sdílená
  // .door-scene-frame, viz DoorSceneFrame.tsx/LeftWallView.tsx) —
  // NErenderují se tu přes SceneBackground, aby scéna nezávisela na viewport
  // bg-cover škálování (viz DoorSceneFrame.tsx pro zdůvodnění). Stejný důvod,
  // proč obě nejsou v max-w-[33.6rem] wrapperu a nemají běžný HUD (čas/zvuk/
  // energie) — jen svoje rámované okno na scénu + tlačítko zpět.
  const isWideSceneView = state.playerView === "door" || state.playerView === "left_wall";
  const showPlayBackground = state.gameStatus !== "blackout" && !isWideSceneView;
  // Jestli je "Jít ven pro baterii" tuhle noc vůbec dostupné (viz
  // game/core/emergencyMiniGameIntegration.ts#canStartBatteryEmergencyRun,
  // NightFeatureFlags.emergencyRunsEnabled/batteryRunEnabled) — jediné místo
  // v komponentách, které to dopočítá; LeftWallView dostane jen hotový
  // boolean, ne celou nightFeatures strukturu.
  const canStartBatteryRun = canStartBatteryEmergencyRun(state.nightFeatures);
  // "Jít ven" tlačítko se zobrazí, dokud je dostupná ASPOŇ jedna výprava
  // (battery run, nebo od noci 10 shotgun run, viz
  // game/core/emergencyMiniGameIntegration.ts#canStartShotgunEmergencyRun) —
  // KTEROU z nich app/play/page.tsx skutečně spustí, se rozhoduje samostatně
  // (stejná priorita) až při skutečném doběhnutí držení, ne tady.
  const canStartEmergencyRun = canStartBatteryRun || canStartShotgunEmergencyRun(state.nightFeatures, state.hasShotgun);
  // "monster_reached_office" krize (viz zadání, game/core/officeBreachAftermath.ts)
  // — `null` mimo krizi/po jejím vyřešení, jinak která ze tří fází (dveře ->
  // generátor -> žárovka) je zrovna aktuální. Jediné místo, které tohle
  // počítá — OfficeBreachBanner i LeftWallView dostanou jen hotovou hodnotu.
  const officeBreachPhase = resolveOfficeBreachPhase(state);
  // Zbývající celé sekundy probíhajícího přetížení generátoru (viz zadání
  // "zobrazení času přetížení") — `null` mimo přetížení. Zaokrouhleno nahoru
  // (Math.ceil), ať odpočet ukáže "10 s" hned na prvním tiku po spuštění a
  // "1 s" těsně před zničením dveří, ne "0 s" o kus dřív.
  const doorGeneratorOverloadSecondsRemaining =
    state.doorGeneratorOverloadUntilMs !== null
      ? Math.max(0, Math.ceil((state.doorGeneratorOverloadUntilMs - state.elapsedMs) / 1000))
      : null;
  // Titan (viz zadání "napoj kompletní dveřní vizuální sekvenci Titana") se
  // identifikuje výhradně přes `night.enemy.id === "titan"` (stejná
  // podmínka jako gameReducer.ts#updateDoorGeneratorOverload) — ŽÁDNÉ nové
  // `isTitan` pole v GameState. `isMonsterAtDoor` je stejná sdílená
  // definice jako zbytek hry (`"at_door"` i `"breach"`).
  const isTitanNight = night.enemy.id === "titan";
  const isTitanAtDoor = isTitanNight && state.enemyStage === "at_door";
  const isTitanBreach = isTitanNight && state.enemyStage === "breach";
  const isTitanAttack = isTitanNight && state.enemyStage === "attack";
  // Countdown snímek specifický pro Titana — jen když přetížení SKUTEČNĚ
  // běží A Titan je zrovna u dveří (viz zadání "pokud Titan není u dveří,
  // ponech generický obrázek"). `null` jinak, DoorView.tsx pak sám spadne
  // zpět na generický DOOR_GENERATOR_OVERLOAD_FRAME_INDEX.
  const titanOverloadFrameSrc =
    state.doorGeneratorOverloadUntilMs !== null && isTitanNight && isMonsterAtDoor(state)
      ? resolveTitanOverloadFrameSrc(state.elapsedMs, state.doorGeneratorOverloadUntilMs, GENERATOR_OVERLOAD_DOOR_DURATION_MS)
      : null;
  // DEV panel je schválně skrytý ve výchozím stavu (ne jen collapsed <details>
  // jako dřív) — objeví se jen po pravém kliku na popisek "Noc {n}" v
  // ShiftTimeru (viz onNightLabelContextMenu níže). Čistě UI viditelnost dev
  // nástroje, ne herní stav — nepatří do GameState/reduceru.
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);
  function handleToggleDebugPanel(e: React.MouseEvent) {
    e.preventDefault();
    setDebugPanelVisible((visible) => !visible);
  }
  // Dev debug text pro PowerMeter — přesný údaj v sekundách, ne finální
  // atmosférický text (viz game/core/roomBulbs.ts, content/copy.ts).
  // `undefined`, dokud nightFeatures.bulbLifetimeEnabled je false (Noc 1–3,
  // viz game/difficulty/nightConfig.ts) — bez tyhle podmínky by řádek pořád
  // ukazoval nehybné "30 s" (BULBS_CONFIG.defaultLifetimeMs), protože
  // updateRoomBulbs v gameReducer.ts tenhle týden vůbec neodečítá životnost;
  // vypadá to jako zaseknutý counter, přitom je to jen mechanika, co se na
  // tuhle noc ještě nepoužívá (viz zadání "bug: počítadlo zaseknuté na 30s").
  const nearRoomBulb = state.roomBulbs.nearRoom;
  const nearRoomBulbLabel = state.nightFeatures.bulbLifetimeEnabled
    ? nearRoomBulb.broken
      ? COPY.game.bulbBrokenLabel
      : `${Math.ceil(nearRoomBulb.remainingMs / 1000)} s`
    : undefined;

  return (
    // <main> je bez bg-* třídy a bez max-w-md — SceneBackground (potomek s
    // -z-10) musí sedět přímo v <main>, jinak by ho buď zakrylo vlastní
    // pozadí <main>u (viz MainMenuScreen.tsx), nebo by byl omezený na užší
    // sloupec (viz max-w-md níže) a zbytek širší obrazovky by zůstal holý
    // <body> background. Herní obsah je proto v samostatném vnitřním divu.
    <main className="relative min-h-screen p-4">
      {showPlayBackground && <SceneBackground scene={BACKGROUND_SCENES.play} />}

      {/* Rádiová zpráva (viz zadání, game/radio/, components/game/radio/) —
          pasivní informační vrstva na VŠECH pohledech (stejná konvence jako
          OfficeBreachBanner níže), vlastní stav/timer/speechSynthesis si drží
          celé uvnitř sebe (viz useRadioMessage.ts), GameScreen jen předává
          monsterStage/nightNumber. */}
      <RadioMessageOverlay
        monsterStage={state.enemyStage}
        nightNumber={nightNumber}
        sonicCannonResultSeq={state.sonicCannonResultSeq}
        lastSonicCannonResult={state.lastSonicCannonResult}
        cameraOfflineSeq={state.cameraOfflineSeq}
        cameraAttackStartedSeq={state.cameraAttackStartedSeq}
      />

      {/* DoorView schválně NENÍ v max-w-[33.6rem] — dveřní scéna (DoorSceneFrame)
          má využít co nejvíc dostupné plochy viewportu (viz .door-scene-frame,
          styles/pixel.css), ne být omezená na stejný sloupec jako desk/generator.
          DoorView si samo zabaluje tlačítko zpět do vlastního max-w-md (užší,
          beze změny), ať nezůstane přes celou šířku (viz DoorView.tsx).
          Desk/generator/blackout sloupec je o 20 % širší než dřívější max-w-md
          (28rem -> 33.6rem) — hlavně kvůli kamerovému detailu (CameraView),
          který díky tomu může být po "ladění signálu" větší. */}
      <div className={`flex flex-col gap-4 ${isWideSceneView ? "" : "max-w-[33.6rem] mx-auto"}`}>
        {/* Krizový panel (viz zadání, "monster_reached_office") — na rozdíl
            od ShiftTimer/PowerMeter níže se renderuje NA VŠECH pohledech
            (i door/left_wall), ať hráč instrukci nepropásne bez ohledu na
            to, kam se zrovna dívá. Mimo blackout (ten celou obrazovku
            nahrazuje vlastní atmosférou, viz BlackoutView níže). */}
        {state.gameStatus !== "blackout" && <OfficeBreachBanner phase={officeBreachPhase} />}

        {/* V DoorView/LeftWallView schválně nerenderujeme čas/zvuk/energii
            vůbec (ne jen skryté přes CSS) — hráč se má soustředit na scénu,
            ne na obecné HUD. Desk/generator zůstávají beze změny. */}
        {!isWideSceneView && (
          <>
            <div className="flex justify-between items-center">
              <ShiftTimer
                remainingMs={state.remainingMs}
                nightNumber={nightNumber}
                onNightLabelContextMenu={handleToggleDebugPanel}
              />
              <div className="flex items-center gap-2">
                <MapButton onClick={onLookAtMap} />
                <AudioToggle muted={state.audioMuted} onToggle={onToggleAudio} />
              </div>
            </div>

            <PowerMeter
              power={state.power}
              rechargeSeq={state.powerRechargeSeq}
              stressPercent={
                STRESS_DEV_HUD_ENABLED && debugPanelVisible ? Math.round(heartbeatStress * 100) : undefined
              }
              bulbsRemaining={bulbsRemaining}
              nearRoomBulbLabel={nearRoomBulbLabel}
              nearRoomBulbCountingDown={nearRoomBulbLabel !== undefined && !nearRoomBulb.broken}
            />
          </>
        )}

        {state.gameStatus === "blackout" ? (
          <BlackoutView blackoutElapsedMs={state.blackoutElapsedMs} blackout={night.blackout} />
        ) : (
          <>
            {state.playerView === "desk" && (
              <DeskView
                state={state}
                night={night}
                isAdmin={isAdmin}
                onToggleLight={onToggleLight}
                onSelectCamera={onSelectCamera}
                onCloseCameras={onCloseCameras}
                onToggleSonicCannon={onToggleSonicCannon}
                onLookAtDoor={onLookAtDoor}
                onLookAtGenerator={onLookAtGenerator}
                onLookAtLeftWall={onLookAtLeftWall}
              />
            )}
            {state.playerView === "door" && (
              <DoorView
                doorClosed={state.doorClosed}
                doorDestroyed={state.doorDestroyed}
                doorGeneratorOverloadActive={state.doorGeneratorOverloadUntilMs !== null}
                doorGeneratorOverloadSecondsRemaining={doorGeneratorOverloadSecondsRemaining}
                isDoorDeathReveal={state.doorDeathRevealUntilMs !== null}
                bulbBroken={state.roomBulbs.nearRoom.broken}
                bulbWearRatio={computeNearRoomBulbWearRatio(state)}
                canReplaceBulb={canReplaceBulb(state)}
                bulbReplacementActive={state.bulbReplacement.active}
                bulbReplacementProgressMs={state.bulbReplacement.progressMs}
                bulbReplaceSuccessSeq={state.bulbReplaceSuccessSeq}
                closeDoorUrgent={officeBreachPhase === "close_door"}
                isTitanAtDoor={isTitanAtDoor}
                isTitanBreach={isTitanBreach}
                isTitanAttack={isTitanAttack}
                titanOverloadFrameSrc={titanOverloadFrameSrc}
                isTitanOverloadDeathReveal={state.titanOverloadDeathRevealUntilMs !== null}
                onToggleDoor={onToggleDoor}
                onLookAtDesk={onLookAtDesk}
                onStartBulbReplacement={onStartBulbReplacement}
                onCancelBulbReplacement={onCancelBulbReplacement}
              />
            )}
            {state.playerView === "generator" && (
              <GeneratorView
                generatorState={state.generatorState}
                beepSeq={state.generatorBeepSeq}
                accidentalRestartSeq={state.generatorAccidentalRestartSeq}
                onRestartGenerator={onRestartGenerator}
                onLookAtDesk={onLookAtDesk}
                canOverloadGenerator={state.nightFeatures.generatorOverloadEnabled}
                canStartOverload={canStartGeneratorOverloadWindup(state)}
                overloadWindupActive={state.generatorOverloadWindup.active}
                overloadWindupProgressMs={state.generatorOverloadWindup.progressMs}
                onStartGeneratorOverloadWindup={onStartGeneratorOverloadWindup}
                onCancelGeneratorOverloadWindup={onCancelGeneratorOverloadWindup}
              />
            )}
            {state.playerView === "left_wall" && (
              <LeftWallView
                onLookAtDesk={onLookAtDesk}
                onLookAtDoor={onLookAtDoor}
                officeBreachActive={officeBreachPhase !== null}
                onStartEmergencyRunWindup={onStartEmergencyRunWindup}
                onCancelEmergencyRunWindup={onCancelEmergencyRunWindup}
                doorClosed={state.doorClosed}
                canStartEmergencyRun={canStartEmergencyRun}
                emergencyRunWindupActive={state.emergencyRunWindup.active}
                emergencyRunWindupProgressMs={state.emergencyRunWindup.progressMs}
                hasShotgun={state.hasShotgun}
                hasDoubleBarrelShotgun={state.hasDoubleBarrelShotgun}
                shotgunAmmo={state.shotgunAmmo}
                onStartThinkItOverWindup={onStartThinkItOverWindup}
                onCancelThinkItOverWindup={onCancelThinkItOverWindup}
                thinkItOverWindupActive={state.thinkItOverWindup.active}
                thinkItOverWindupProgressMs={state.thinkItOverWindup.progressMs}
                hasWoundedMonsterToday={state.monsterHitsToday > 0}
                officeDoorLockMs={state.officeDoorLockMs}
                onChangeOfficeDoorLockMs={onChangeOfficeDoorLockMs}
                onRequestAmmo={onRequestAmmo}
              />
            )}
            {state.playerView === "object_map" && <ObjectMapView onLookAtDesk={onLookAtDesk} />}
          </>
        )}

        {debugPanelVisible && (
          <div className={isWideSceneView ? "w-full max-w-md mx-auto" : ""}>
            <DebugPanel
              state={state}
              night={night}
              tensionLevel={tensionLevel}
              nightNumber={nightNumber}
              serverCurrentRun={serverCurrentRun}
              localSurvivedNights={localSurvivedNights}
              isAdmin={isAdmin}
              onDebugToggleDoor={onDebugToggleDoor}
              onDebugRestartGenerator={onDebugRestartGenerator}
              onSetDebugNight={onSetDebugNight}
              onDebugStartTitan={onDebugStartTitan}
              onDebugAdvanceTitanStage={onDebugAdvanceTitanStage}
              onDebugTriggerGhoulCameraAttack={onDebugTriggerGhoulCameraAttack}
              onDebugResetCameraDamage={onDebugResetCameraDamage}
              onDebugMoveEnemyToDisabledCamera={onDebugMoveEnemyToDisabledCamera}
              onDebugPlayDisabledCameraFootsteps={onDebugPlayDisabledCameraFootsteps}
              onSetDebugGhoulCameraAttackChance={onSetDebugGhoulCameraAttackChance}
              onDebugSkipCameraAttackToLastFrame={onDebugSkipCameraAttackToLastFrame}
              onDebugSkipCameraAttackToOffline={onDebugSkipCameraAttackToOffline}
            />
          </div>
        )}
      </div>
    </main>
  );
}
