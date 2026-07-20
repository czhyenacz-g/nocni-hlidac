import { useState } from "react";
import { BULB_REPLACE_DURATION_MS, DEBUG_PANEL_ENABLED } from "@/game/balancing/constants";
import { GameState, GhoulCameraAttackAnimationId, NightDefinition } from "@/game/core/types";
import { getBlackoutPhaseIndex } from "@/game/visuals/blackoutPhase";
import { buildEnemyDebugInfo } from "@/game/core/enemyDebugInfo";
import { resolveDoorMonsterEncounter } from "@/game/core/doorEncounter";
import { isNearRoomLightActive } from "@/game/core/roomBulbs";
import { computePowerDrainBreakdown } from "@/game/core/powerDrain";
import { DEFAULT_DIFFICULTY } from "@/game/difficulty/difficultyConfig";
import { computeNightScaling } from "@/game/difficulty/nightScaling";
import { getMaxDisabledCamerasForNight } from "@/game/core/cameraDamage";
import { GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS } from "@/game/core/cameraDamageConfig";
import { getGhoulCameraAttackAnimation } from "@/game/cameras/cameraAttackAnimation.object13";
import { resolveGhoulCameraAttackFrameState } from "@/game/cameras/cameraAttackAnimation";
import { useObject13PlayerProfile } from "@/components/playerProfile/Object13PlayerProfileProvider";
import { BulbInventoryOperationState, deriveBulbInventoryConfirmOutcome } from "@/game/inventory/bulbInventoryController";
import DoorControl from "./DoorControl";

const GHOUL_CAMERA_ATTACK_ANIMATION_IDS: GhoulCameraAttackAnimationId[] = [
  "outer_yard",
  "left_hallway",
  "right_hallway",
  "door_hallway",
  "door_hallway_light",
];

// Rychlé volby pro admin-only "Test noci" sekci níže (viz zadání "testovací
// nástroj pro late-run scény") — přesně nocí, které zajímají Valhala
// (20–30) a Night 30 endingy (30).
const QUICK_DEBUG_NIGHTS = [20, 29, 30] as const;

interface DebugPanelProps {
  state: GameState;
  night: NightDefinition;
  tensionLevel: number;
  /** Kolikátá noc v řadě (viz game/core/survivedNights.ts) — jen pro dopočet night scaling multiplikátoru v "Power drain breakdown" níže, chybí-li bere se jako noc 1. */
  nightNumber?: number;
  /** Serverový currentRun přihlášeného hráče (viz app/api/auth/me/route.ts) — `null` = nepřihlášený/hub API nedostupné. */
  serverCurrentRun: number | null;
  /** Lokální localStorage counter (viz game/core/survivedNights.ts) — fallback pro nepřihlášeného hráče. */
  localSurvivedNights: number;
  /** Admin-only "Test noci" sekce (viz zadání) — regulérní hráč (isAdmin false) ji vůbec neuvidí, i kdyby DebugPanel měl otevřený. */
  isAdmin: boolean;
  onDebugToggleDoor: () => void;
  onDebugRestartGenerator: () => void;
  /** Viz GameState.debugNightOverride, gameActions.ts SET_DEBUG_NIGHT. */
  onSetDebugNight: (night: number) => void;
  /** Viz GameState.cameraDamage, game/core/cameraDamage.ts — ruční spuštění útoku Ghoula na aktuální kameru / reset poškození kamer. `animationId` (viz zadání "vybrat konkrétní sekvenci") je volitelný override. */
  onDebugTriggerGhoulCameraAttack: (animationId?: GhoulCameraAttackAnimationId) => void;
  onDebugResetCameraDamage: () => void;
  /** Viz zadání "přeskočit na poslední frame" / "přeskočit rovnou do offline stavu". */
  onDebugSkipCameraAttackToLastFrame: () => void;
  onDebugSkipCameraAttackToOffline: () => void;
  /** Teleportuje Ghoula na lokaci první vyřazené kamery (viz zadání "otestovat mikrofon"). */
  onDebugMoveEnemyToDisabledCamera: () => void;
  /** Ručně přehraje zvuk kroků z mikrofonu bez ohledu na cooldown. */
  onDebugPlayDisabledCameraFootsteps: () => void;
  /** Viz GameState.debugGhoulCameraAttackChanceOverride — `null` = produkční 5 %. */
  onSetDebugGhoulCameraAttackChance: (chance: number | null) => void;
  /** "SPUSTIT TITANA 1/2/3" (viz zadání "8. ADMIN / DEBUG OVLÁDÁNÍ") — přepne night/reducer na jednu ze tří vylosovaných Titanových nocí (`encounterIndex` 0/1/2) a nastaví ho na první stage. Admin-only, nezávislé na aktuálním čísle dne. */
  onDebugStartTitan: (encounterIndex: 0 | 1 | 2) => void;
  /** "TITAN: DALŠÍ STAGE" — posune Titana o jednu stage po jeho trase; no-op mimo Titanovu noc / v attack/graveyard. */
  onDebugAdvanceTitanStage: () => void;
}

export default function DebugPanel({
  state,
  night,
  tensionLevel,
  nightNumber,
  serverCurrentRun,
  localSurvivedNights,
  isAdmin,
  onDebugToggleDoor,
  onDebugRestartGenerator,
  onSetDebugNight,
  onDebugTriggerGhoulCameraAttack,
  onDebugResetCameraDamage,
  onDebugMoveEnemyToDisabledCamera,
  onDebugPlayDisabledCameraFootsteps,
  onSetDebugGhoulCameraAttackChance,
  onDebugSkipCameraAttackToLastFrame,
  onDebugSkipCameraAttackToOffline,
  onDebugStartTitan,
  onDebugAdvanceTitanStage,
}: DebugPanelProps) {
  // Vybraná sekvence pro "DEV: Vyřadit s konkrétní sekvencí" (viz zadání
  // "vybrat konkrétní sekvenci") — čistě UI výběr PŘED odesláním, ne
  // GameState (stejný vzor jako debugNightInput níže).
  const [selectedAnimationId, setSelectedAnimationId] = useState<GhoulCameraAttackAnimationId>("left_hallway");
  // Lokální text inputu — ne GameState (je to jen rozepsaná hodnota PŘED
  // odesláním, viz handleSetDebugNightSubmit níže), samostatné od
  // state.debugNightOverride.
  const [debugNightInput, setDebugNightInput] = useState(() => String(nightNumber ?? 1));

  // "TEST PROFILE WRITE" (viz zadání "krok 1B", "10. Technický test
  // zápisu") — čte se VŽDY (Rules of Hooks), i když se DEBUG_PANEL_ENABLED
  // guard níže rovnou vrátí `null` — komponenta samotná se v produkčním
  // buildu i tak vůbec nevykreslí (DEBUG_PANEL_ENABLED je jen build-time
  // konstanta, ne runtime env, viz balancing/constants.ts), ale samotné
  // tlačítko je navíc podmíněné `process.env.NODE_ENV !== "production"`
  // (viz JSX níže) — dvojitá pojistka, ne spoléhání na jediný gate.
  const object13Profile = useObject13PlayerProfile();
  // Vlastní pending stav pro dev-only ADD/CONSUME tlačítka (viz zadání "15.
  // Development/debug") — nezávislý na app/play/page.tsx#bulbInventoryOperationState
  // (ten řeší jen skutečné herní události), čte se VŽDY (Rules of Hooks),
  // stejně jako object13Profile výše.
  const [bulbDebugOperationState, setBulbDebugOperationState] = useState<BulbInventoryOperationState>({ status: "idle" });

  if (!DEBUG_PANEL_ENABLED) return null;

  // Dev-only přímé volání SKUTEČNÉHO add/consume endpointu (viz zadání "15.
  // Development/debug") — stejná cesta jako běžná herní logika
  // (object13Profile.addBulbs/consumeBulbs), jen bez vazby na konkrétní
  // herní událost. Vlastní pending guard, ať dvojklik nespustí dvě volání.
  function handleDebugAddBulb() {
    if (bulbDebugOperationState.status === "adding" || bulbDebugOperationState.status === "consuming") return;
    setBulbDebugOperationState({ status: "adding" });
    void object13Profile.addBulbs(1).then((result) => {
      const outcome = deriveBulbInventoryConfirmOutcome(result);
      setBulbDebugOperationState(outcome.outcome === "confirmed" ? { status: "idle" } : { status: "error", error: outcome.outcome });
    });
  }

  function handleDebugConsumeBulb() {
    if (bulbDebugOperationState.status === "adding" || bulbDebugOperationState.status === "consuming") return;
    setBulbDebugOperationState({ status: "consuming" });
    void object13Profile.consumeBulbs(1).then((result) => {
      const outcome = deriveBulbInventoryConfirmOutcome(result);
      setBulbDebugOperationState(outcome.outcome === "confirmed" ? { status: "idle" } : { status: "error", error: outcome.outcome });
    });
  }

  // Bezpečný technický test zápisu (viz zadání "profilový kontrakt V1 +
  // inventář žárovek", "6. Obecný PUT profilu") — profil se jen znovu uloží
  // BEZE ZMĚNY (stejný `profileData`/`profileVersion`, jen aktuální
  // `expectedRevision`), ať ověří celou write cestu (proxy -> VPS ->
  // revision +1) bez posílání jakéhokoliv klíče mimo V1 kontrakt.
  function handleTestProfileWrite() {
    if (object13Profile.loadState.status !== "ready") return;
    const current = object13Profile.loadState.profile;
    void object13Profile.save({
      expectedRevision: current.revision,
      profileVersion: current.profileVersion,
      profileData: current.profileData,
    });
  }

  function handleSetDebugNightSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(debugNightInput);
    if (Number.isFinite(parsed)) onSetDebugNight(parsed);
  }

  // DEV panel nezná zvolenou obtížnost přímo (createGameReducer si ji drží
  // jen ve své uzávěře, GameState o ní nic neví) — app/play/page.tsx dnes
  // vždy volá createGameReducer(night) bez druhého argumentu, takže reálně
  // běžící obtížnost je vždy DEFAULT_DIFFICULTY. Až se to změní (výběr
  // obtížnosti), tenhle řádek bude potřeba nahradit skutečnou hodnotou
  // protaženou jako prop.
  const enemyDebug = buildEnemyDebugInfo(state, night, DEFAULT_DIFFICULTY);
  // Čistě diagnostický souhrn door encounter helperů (viz game/core/doorEncounter.ts)
  // — jedno místo ke čtení, žádná vlastní logika.
  const doorEncounter = resolveDoorMonsterEncounter(state);

  // "Power drain breakdown" — přesně tatáž funkce, kterou TICK používá pro
  // skutečný přepočet `power` (game/core/powerDrain.ts), ať tenhle panel
  // nikdy neukazuje jiná čísla, než jaká hru doopravdy řídí (viz
  // TECH_DESIGN.md "Power drain diagnostika" — audit podezřele rychlého
  // vybití energie, kde přesně tohle chybělo).
  const nightScaling = computeNightScaling(nightNumber ?? 1);
  const drain = computePowerDrainBreakdown(state, night, nightScaling);

  // Dev nástroj, ne herní ovládání — na mobilu/užších obrazovkách by jen
  // zabíral místo a mohl překrývat skutečné hotspoty, proto se pod `lg` skryje.
  // Sbalené <details> (bez `open`) = výchozí stav, žádný extra React state.
  return (
    <details className="hidden lg:block pixel-panel p-2 text-[10px] text-gray-500 font-mono leading-tight">
      <summary className="tap-target cursor-pointer select-none">DEV panel</summary>
      <div className="flex flex-col gap-2 mt-2">
        <div>
          gameStatus: {state.gameStatus}
          {state.gameStatus === "blackout" &&
            ` (${state.blackoutElapsedMs.toFixed(0)} / ${night.blackout.durationMs} ms, phase ${getBlackoutPhaseIndex(state.blackoutElapsedMs, night.blackout)}, phaseSeq ${state.blackoutPhaseSeq}, roarSeq ${state.blackoutRoarSeq})`}
        </div>
        {state.doorDeathRevealUntilMs !== null && (
          <div>doorDeathReveal: {(state.doorDeathRevealUntilMs - state.elapsedMs).toFixed(0)} ms zbývá</div>
        )}
        <div>tension: {tensionLevel.toFixed(2)}</div>
        <div>power: {state.power.toFixed(1)}</div>
        <div className="border-t border-gray-700 pt-2 mt-1">
          <div className="text-gray-400 mb-1">
            Power drain{drain.sonicCannonActive ? " (sonické dělo aktivní — jen drain, žádné dobíjení)" : ""}:
          </div>
          <div>idle: {drain.idleDrain.toFixed(3)}/s</div>
          <div>camera: {drain.cameraDrain.toFixed(3)}/s</div>
          <div>door: {drain.doorDrain.toFixed(3)}/s</div>
          <div>light: {drain.lightDrain.toFixed(3)}/s</div>
          <div>generator (critical/restarting extra): {drain.generatorExtraDrain.toFixed(3)}/s</div>
          <div>night scaling multiplier: ×{drain.nightScalingMultiplier.toFixed(2)}</div>
          <div>total drain: {drain.totalDrainPerSecond.toFixed(3)}/s</div>
          <div>recharge: {drain.rechargePerSecondWhenIdle.toFixed(3)}/s</div>
          <div className={drain.netPerSecond < 0 ? "text-red-400" : "text-green-400"}>
            net: {drain.netPerSecond >= 0 ? "+" : ""}
            {drain.netPerSecond.toFixed(3)}/s
          </div>
        </div>
        <div>playerView: {state.playerView}</div>
        <div>door: {state.doorClosed ? "closed" : "open"}</div>
        <div>light: {state.lightOn ? "on" : "off"}</div>
        <div>
          doorLightRepel: {state.doorLightRepelMs.toFixed(0)} / {night.enemy.doorLightRepelRequiredMs} ms
          (roars: {state.monsterRetreatRoarSeq})
        </div>
        <div>
          doorHallwayUvRepel: {state.doorHallwayUvRepelMs.toFixed(0)} /{" "}
          {night.enemy.doorHallwayUvRepelRequiredMs} ms (hallway retreat{" "}
          {doorEncounter.hallwayUvForcingRetreat ? "accumulating" : "idle"})
        </div>
        <div>
          door encounter: at door {doorEncounter.atDoor ? "yes" : "no"}, blocked attack{" "}
          {doorEncounter.blockedByClosedDoor ? "yes" : "no"} (bangs: {state.doorBangSeq}), retreating{" "}
          {doorEncounter.lightForcingRetreat ? "yes" : "no"}
        </div>
        <div>generator: {state.generatorState} (faults: {state.generatorFaultCount})</div>
        <div>
          bulb (nearRoom): {(state.roomBulbs.nearRoom.remainingMs / 1000).toFixed(1)}s /{" "}
          {(state.roomBulbs.nearRoom.maxMs / 1000).toFixed(1)}s
          {state.roomBulbs.nearRoom.broken ? " (BROKEN)" : ""} — light active:{" "}
          {isNearRoomLightActive(state) ? "yes" : "no"} (breaks: {state.bulbBreakSeq})
        </div>
        <div>Náhradní žárovky: {state.bulbsRemaining}</div>
        {/* Hidden true ending (viz zadání, game/core/monsterEnding.ts) — skryté
            hráčovi, ale dev panel ho může klidně ukázat i s číslem, viz zadání
            "Debug panel může počet zásahů klidně ukazovat". */}
        <div>
          Brokovnice: {state.hasShotgun ? (state.hasDoubleBarrelShotgun ? "dvouhlavňovka" : "ano") : "ne"}
          {state.hasShotgun ? ` (náboj ${state.shotgunAmmo})` : ""} — zásahy dnes: {state.monsterHitsToday}
          {state.pendingMonsterHits > 0 ? ` (nepotvrzené zásahy: ${state.pendingMonsterHits})` : ""}
          {state.monsterDefeated ? " — TRUE ENDING DOSAŽEN" : ""}
        </div>
        {state.bulbReplacement.active && (
          <div>
            bulb replacement: {(state.bulbReplacement.progressMs / 1000).toFixed(1)}s /{" "}
            {(BULB_REPLACE_DURATION_MS / 1000).toFixed(1)}s
          </div>
        )}

        {/* Monster debug — rozšířený diagnostický výpis (viz game/core/enemyDebugInfo.ts).
            Záměrně ukecané, není to finální design, jen ať jde snadno testovat pohyb
            monstra/retreat/verification bez hádání z chování hry. */}
        <div className="border-t border-gray-700 pt-2 mt-1">
          <div className="text-gray-400 mb-1">Monster debug:</div>
          <div>Stage: {enemyDebug.stage} ({enemyDebug.lastDecision})</div>
          <div>Route: {enemyDebug.route.join(" → ")}</div>
          <div>Branch: {enemyDebug.routeBranch}</div>
          <div>
            Active camera: {enemyDebug.activeCameraId ?? "—"} ({enemyDebug.cameraViewMode})
          </div>
          <div>Visible on current camera: {enemyDebug.visibleOnActiveCamera ? "yes" : "no"}</div>
          <div>Being watched: {enemyDebug.isBeingWatched ? "yes" : "no"}</div>
          <div>
            Sonic cannon: {enemyDebug.sonicCannonRunning ? "running" : "off"}
            {enemyDebug.sonicCannonRunning && (enemyDebug.sonicCannonAffectingEnemy ? " (aimed at monster)" : " (empty camera)")}
          </div>
          <div>
            Min stay: {enemyDebug.minStayMs !== null ? `${enemyDebug.minStayMs} ms` : "none"}
            {enemyDebug.minStayBlocking ? " — BLOCKING next decision" : ""}
          </div>
          <div>
            Difficulty: {enemyDebug.difficulty} (monster_check_or_return:{" "}
            {enemyDebug.monsterCheckOrReturnActive ? "active" : "off"})
          </div>
          {state.monsterRetreatedTo !== null && (
            <div>
              Retreat target: {state.monsterRetreatedTo} (camera: {enemyDebug.verificationCameraId ?? "none"})
            </div>
          )}
          <div>Verification required: {enemyDebug.verificationRequired ? "yes" : "no"}</div>
          {enemyDebug.verificationRequired && <div>Verification camera: {enemyDebug.verificationCameraId ?? "—"}</div>}
          <div>
            Opening door consequence:{" "}
            {enemyDebug.openingDoorWouldReturnMonster ? "monster returns to door_hallway (unverified)" : "safe"}
          </div>
        </div>

        {/* Vzácný útok Ghoula na kameru (viz zadání, game/core/cameraDamage.ts)
            — produkční šance (GHOUL_CAMERA_ATTACK_CHANCE, 5 %) zůstává beze
            změny; "100 %"/"5 %" tlačítka jen nastavují
            debugGhoulCameraAttackChanceOverride, ostatní tlačítka ji vůbec
            nečtou (viz canDebugTriggerGhoulCameraAttack/debugTriggerGhoulCameraAttack). */}
        <div className="border-t border-gray-700 pt-2 mt-1">
          <div className="text-gray-400 mb-1">Ghoul camera attack debug:</div>
          <div>disabledCameraIds: {state.cameraDamage.disabledCameraIds.join(", ") || "—"}</div>
          <div>
            limit tuhle noc: {state.cameraDamage.disabledCameraIds.length} / {getMaxDisabledCamerasForNight(nightNumber ?? 1)}
          </div>
          <div>
            activeAttack: {state.cameraDamage.activeAttack ? `${state.cameraDamage.activeAttack.cameraId} (started ${state.cameraDamage.activeAttack.startedAtMs}, animationId ${state.cameraDamage.activeAttack.animationId ?? "— (CSS fallback)"})` : "—"}
          </div>
          {state.cameraDamage.activeAttack &&
            (() => {
              const animation = getGhoulCameraAttackAnimation(state.cameraDamage.activeAttack.animationId);
              const elapsedSinceAttackMs = state.elapsedMs - state.cameraDamage.activeAttack.startedAtMs;
              if (!animation) return <div>animation: none (CSS darken/grain fallback)</div>;
              const frameState = resolveGhoulCameraAttackFrameState(animation.frames.length, GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS, elapsedSinceAttackMs);
              return (
                <div>
                  animation: {animation.frames.length} frames, frameDurationMs {animation.frameDurationMs.toFixed(1)}, elapsedMs{" "}
                  {elapsedSinceAttackMs.toFixed(0)}, frameIndex {frameState.frameIndex}, holdingLastFrame{" "}
                  {frameState.isHoldingLastFrame ? "yes" : "no"}
                </div>
              );
            })()}
          <div>
            startedSeq: {state.cameraAttackStartedSeq} — offlineSeq: {state.cameraOfflineSeq} — footstepsSeq:{" "}
            {state.disabledCameraFootstepsSeq}
          </div>
          <div>
            chance override: {state.debugGhoulCameraAttackChanceOverride !== null ? `${state.debugGhoulCameraAttackChanceOverride * 100}%` : "off (5%)"}
          </div>
          <div className="flex gap-1.5 mt-1">
            <button type="button" className="pixel-button px-2 py-1 text-xs flex-1" onClick={() => onDebugTriggerGhoulCameraAttack()}>
              DEV: Vyřadit aktuální kameru
            </button>
            <button type="button" className="pixel-button px-2 py-1 text-xs flex-1" onClick={onDebugResetCameraDamage}>
              DEV: Reset poškození kamer
            </button>
          </div>
          {/* Konkrétní sekvence (viz zadání "vybrat konkrétní sekvenci") — obchází normální kamera+světlo výběr, jinak stejné podmínky jako "Vyřadit aktuální kameru". */}
          <div className="flex gap-1.5 mt-1 items-center">
            <select
              className="pixel-button px-1.5 py-1 text-xs"
              value={selectedAnimationId}
              onChange={(e) => setSelectedAnimationId(e.target.value as GhoulCameraAttackAnimationId)}
            >
              {GHOUL_CAMERA_ATTACK_ANIMATION_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="pixel-button px-2 py-1 text-xs flex-1"
              onClick={() => onDebugTriggerGhoulCameraAttack(selectedAnimationId)}
            >
              DEV: Vyřadit s vybranou sekvencí
            </button>
          </div>
          <div className="flex gap-1.5 mt-1">
            <button type="button" className="pixel-button px-2 py-1 text-xs flex-1" onClick={onDebugSkipCameraAttackToLastFrame}>
              DEV: Skok na poslední frame
            </button>
            <button type="button" className="pixel-button px-2 py-1 text-xs flex-1" onClick={onDebugSkipCameraAttackToOffline}>
              DEV: Skok do offline
            </button>
          </div>
          <div className="flex gap-1.5 mt-1">
            <button type="button" className="pixel-button px-2 py-1 text-xs flex-1" onClick={onDebugMoveEnemyToDisabledCamera}>
              DEV: Ghoul -&gt; offline kamera
            </button>
            <button type="button" className="pixel-button px-2 py-1 text-xs flex-1" onClick={onDebugPlayDisabledCameraFootsteps}>
              DEV: Přehrát kroky
            </button>
          </div>
          <div className="flex gap-1.5 mt-1">
            <button
              type="button"
              className="pixel-button px-2 py-1 text-xs flex-1"
              onClick={() => onSetDebugGhoulCameraAttackChance(1)}
            >
              DEV: Šance 100 %
            </button>
            <button
              type="button"
              className="pixel-button px-2 py-1 text-xs flex-1"
              onClick={() => onSetDebugGhoulCameraAttackChance(null)}
            >
              DEV: Šance zpět na 5 %
            </button>
          </div>
        </div>

        {/* Night config (viz game/difficulty/nightConfig.ts) — jaké mechaniky
            jsou tuhle noc zapnuté, rozřešené jednou při START_SHIFT/RESTART_SHIFT
            a odteď žijící ve state.nightFeatures. */}
        <div className="border-t border-gray-700 pt-2 mt-1">
          <div className="text-gray-400 mb-1">Night config:</div>
          <div>generatorFaults: {state.nightFeatures.generatorFaultsEnabled ? "on" : "off"}</div>
          <div>bulbLifetime: {state.nightFeatures.bulbLifetimeEnabled ? "on" : "off"}</div>
          <div>bulbReplacement: {state.nightFeatures.bulbReplacementEnabled ? "on" : "off"}</div>
          <div>retreatVerification: {state.nightFeatures.monsterRetreatVerificationEnabled ? "on" : "off"}</div>
          <div>emergencyRuns: {state.nightFeatures.emergencyRunsEnabled ? "on" : "off"}</div>
          <div>batteryRun: {state.nightFeatures.batteryRunEnabled ? "on" : "off"}</div>
        </div>

        {/* Run source (viz app/play/page.tsx serverRunState/survivedNights) —
            při testu má být na první pohled jasné, jestli se noc počítá ze
            serveru (přihlášený hráč) nebo z lokálního fallbacku. */}
        <div className="border-t border-gray-700 pt-2 mt-1">
          <div className="text-gray-400 mb-1">Run source:</div>
          <div>server currentRun: {serverCurrentRun ?? "—"}</div>
          <div>local survived nights: {localSurvivedNights}</div>
          <div>resolved currentNight: {nightNumber ?? 1}</div>
          <div>debugNightOverride: {state.debugNightOverride ?? "—"}</div>
          <div>
            gameMode: {state.gameMode} — lives: {state.livesRemaining} — monsterKilledThisRun:{" "}
            {state.monsterKilledThisRun ? "ano" : "ne"}
          </div>
          <div>
            hasShotgun: {state.hasShotgun ? "ano" : "ne"} — hasDoubleBarrelShotgun:{" "}
            {state.hasDoubleBarrelShotgun ? "ano" : "ne"}
          </div>
        </div>

        {/* Object13PlayerProfile (viz zadání "krok 1B" a "profilový kontrakt
            V1 + inventář žárovek") — VÝHRADNĚ development, nikdy v
            produkčním buildu, i kdyby měl hráč DebugPanel nějak otevřený
            (viz zadání "nesmí být dostupná v produkčním běžném UI... nesmí
            existovat mimo development/debug režim"). "TEST PROFILE WRITE"
            profil jen znovu uloží beze změny (viz handleTestProfileWrite
            výše) — nikdy neposílá klíč mimo V1 kontrakt. */}
        {process.env.NODE_ENV !== "production" && (
          <div className="border-t border-gray-700 pt-2 mt-1">
            <div className="text-gray-400 mb-1">Object13 profile (dev only):</div>
            <div>status: {object13Profile.loadState.status}</div>
            {object13Profile.loadState.status === "ready" && (
              <>
                <div>revision: {object13Profile.loadState.profile.revision}</div>
                <div>profileVersion: {object13Profile.loadState.profile.profileVersion}</div>
                <div>bulb: {object13Profile.loadState.profile.profileData.inventory.items.bulb ?? 0}</div>
              </>
            )}
            <div>save status: {object13Profile.saveState.status}</div>
            {object13Profile.saveState.status === "conflict" && (
              <div className="text-amber-400">
                conflict — server revision {object13Profile.saveState.currentProfile.revision}
              </div>
            )}
            {object13Profile.saveState.status === "error" && (
              <div className="text-red-400">error: {object13Profile.saveState.error}</div>
            )}
            <div className="flex gap-1.5 mt-1.5">
              <button
                type="button"
                className="pixel-button px-2 py-1 text-xs flex-1"
                onClick={handleTestProfileWrite}
                disabled={object13Profile.loadState.status !== "ready" || object13Profile.saveState.status === "saving"}
              >
                TEST PROFILE WRITE
              </button>
              {object13Profile.saveState.status === "conflict" && (
                <button
                  type="button"
                  className="pixel-button px-2 py-1 text-xs flex-1"
                  onClick={object13Profile.reloadAfterConflict}
                >
                  Reload after conflict
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bulb inventory debug (viz zadání "profilový kontrakt V1" —
            "15. Development/debug") — VÝHRADNĚ development, stejný dvojitý
            gate jako sekce výše. Tlačítka volají SKUTEČNÝ
            add/consume endpoint (object13Profile.addBulbs/consumeBulbs),
            NIKDY obecný save() — stejná cesta, kterou používá běžná herní
            logika. Vlastní `bulbDebugOperationState`, ať dvojklik nemůže
            spustit dvě operace najednou (stejný princip jako
            app/play/page.tsx#bulbInventoryPendingRef). */}
        {process.env.NODE_ENV !== "production" && (
          <div className="border-t border-gray-700 pt-2 mt-1">
            <div className="text-gray-400 mb-1">Bulb inventory (dev only):</div>
            <div>runtime bulbsRemaining: {state.bulbsRemaining}</div>
            <div>
              server bulb:{" "}
              {object13Profile.loadState.status === "ready" ? (object13Profile.loadState.profile.profileData.inventory.items.bulb ?? 0) : "—"}
            </div>
            <div>
              runtime === server:{" "}
              {object13Profile.loadState.status === "ready"
                ? String(state.bulbsRemaining === (object13Profile.loadState.profile.profileData.inventory.items.bulb ?? 0))
                : "—"}
            </div>
            <div>pending: {bulbDebugOperationState.status}</div>
            {bulbDebugOperationState.status === "error" && (
              <div className="text-red-400">error: {bulbDebugOperationState.error}</div>
            )}
            <div className="flex gap-1.5 mt-1.5">
              <button
                type="button"
                className="pixel-button px-2 py-1 text-xs flex-1"
                onClick={handleDebugAddBulb}
                disabled={bulbDebugOperationState.status !== "idle" && bulbDebugOperationState.status !== "error"}
              >
                DEBUG ADD BULB
              </button>
              <button
                type="button"
                className="pixel-button px-2 py-1 text-xs flex-1"
                onClick={handleDebugConsumeBulb}
                disabled={bulbDebugOperationState.status !== "idle" && bulbDebugOperationState.status !== "error"}
              >
                DEBUG CONSUME BULB
              </button>
            </div>
          </div>
        )}

        {/* Admin-only "Test noci" (viz zadání "testovací nástroj pro
            late-run scény, Valhala/Night 30 endingy") — regulérní hráč
            (isAdmin false) tenhle blok vůbec nedostane, i s otevřeným DEV
            panelem. Nastavuje jen GameState.debugNightOverride
            (SET_DEBUG_NIGHT) — žádné jiné pole (gameMode/livesRemaining/
            hasShotgun/monsterKilledThisRun/roomBulbs/...) se tím nemění. */}
        {isAdmin && (
          <div className="border-t border-amber-700/60 pt-2 mt-1">
            <div className="text-amber-400 mb-1">Test noci/dne (admin):</div>
            <form className="flex gap-1.5 mb-1.5" onSubmit={handleSetDebugNightSubmit}>
              <input
                type="number"
                min={1}
                max={999}
                className="pixel-button w-16 px-1.5 py-1 text-xs"
                value={debugNightInput}
                onChange={(e) => setDebugNightInput(e.target.value)}
              />
              <button type="submit" className="pixel-button px-2 py-1 text-xs flex-1">
                Nastavit noc
              </button>
            </form>
            <div className="flex gap-1.5">
              {QUICK_DEBUG_NIGHTS.map((quickNight) => (
                <button
                  key={quickNight}
                  type="button"
                  className="pixel-button px-2 py-1 text-xs flex-1"
                  onClick={() => {
                    setDebugNightInput(String(quickNight));
                    onSetDebugNight(quickNight);
                  }}
                >
                  Noc {quickNight}
                </button>
              ))}
            </div>

            {/* Titan (viz zadání "8. ADMIN / DEBUG OVLÁDÁNÍ") — tři
                samostatná tlačítka "SPUSTIT TITANA 1/2/3" (ne jedno se
                selectorem), ať jde KAŽDÉ ze tří setkání (a jeho vlastní
                náhodně vybranou "escape" hlášku, viz useTitanEscapeMessage.ts)
                spustit jedním klikem, nezávisle na aktuálním čísle dne — přepne
                night/reducer na odpovídající vylosovanou Titanovu noc a
                nastaví ho na první stage. "TITAN: DALŠÍ STAGE" jen posune o
                jednu stage po stejné trase jako běžná hra. Stejný prostý
                button vzor jako "DEV: Restartovat generátor" níže. */}
            <div className="text-amber-400 mb-1 mt-1.5">Titan:</div>
            <div className="flex gap-1.5">
              <button type="button" className="pixel-button px-2 py-1 text-xs flex-1" onClick={() => onDebugStartTitan(0)}>
                SPUSTIT TITANA 1
              </button>
              <button type="button" className="pixel-button px-2 py-1 text-xs flex-1" onClick={() => onDebugStartTitan(1)}>
                SPUSTIT TITANA 2
              </button>
              <button type="button" className="pixel-button px-2 py-1 text-xs flex-1" onClick={() => onDebugStartTitan(2)}>
                SPUSTIT TITANA 3
              </button>
            </div>
            <button type="button" className="pixel-button px-2 py-1 text-xs w-full mt-1.5" onClick={onDebugAdvanceTitanStage}>
              TITAN: DALŠÍ STAGE
            </button>
          </div>
        )}

        <DoorControl doorClosed={state.doorClosed} onToggle={onDebugToggleDoor} />
        <button className="pixel-button px-3 py-2 text-xs w-full" onClick={onDebugRestartGenerator}>
          DEV: Restartovat generátor{state.generatorState === "normal" ? " (test penalizace)" : ""}
        </button>
      </div>
    </details>
  );
}
