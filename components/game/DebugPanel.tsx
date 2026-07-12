import { useState } from "react";
import { BULB_REPLACE_DURATION_MS, DEBUG_PANEL_ENABLED } from "@/game/balancing/constants";
import { GameState, NightDefinition } from "@/game/core/types";
import { getBlackoutPhaseIndex } from "@/game/visuals/blackoutPhase";
import { buildEnemyDebugInfo } from "@/game/core/enemyDebugInfo";
import { resolveDoorMonsterEncounter } from "@/game/core/doorEncounter";
import { isNearRoomLightActive } from "@/game/core/roomBulbs";
import { computePowerDrainBreakdown } from "@/game/core/powerDrain";
import { DEFAULT_DIFFICULTY } from "@/game/difficulty/difficultyConfig";
import { computeNightScaling } from "@/game/difficulty/nightScaling";
import DoorControl from "./DoorControl";

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
  /** Admin-only "Experimentální ruční kamera" (viz zadání, game/visuals/cameraManualPan.ts, CameraView.tsx). Default false, čistě lokální UI stav v GameScreen.tsx — žádný vliv na GameState/gameplay. */
  manualCameraExperimentEnabled: boolean;
  onToggleManualCameraExperiment: () => void;
  onDebugToggleDoor: () => void;
  onDebugRestartGenerator: () => void;
  /** Viz GameState.debugNightOverride, gameActions.ts SET_DEBUG_NIGHT. */
  onSetDebugNight: (night: number) => void;
}

export default function DebugPanel({
  state,
  night,
  tensionLevel,
  nightNumber,
  serverCurrentRun,
  localSurvivedNights,
  isAdmin,
  manualCameraExperimentEnabled,
  onToggleManualCameraExperiment,
  onDebugToggleDoor,
  onDebugRestartGenerator,
  onSetDebugNight,
}: DebugPanelProps) {
  // Lokální text inputu — ne GameState (je to jen rozepsaná hodnota PŘED
  // odesláním, viz handleSetDebugNightSubmit níže), samostatné od
  // state.debugNightOverride.
  const [debugNightInput, setDebugNightInput] = useState(() => String(nightNumber ?? 1));

  if (!DEBUG_PANEL_ENABLED) return null;

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
            Power drain{drain.watchingCameras ? " (sleduje kamery — jen drain, žádné dobíjení)" : ""}:
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

        {/* Admin-only "Experimentální ruční kamera" (viz zadání) — čistě
            vizuální experiment nad kamerovým detailem (viz
            game/visuals/cameraManualPan.ts, CameraView.tsx), default
            vypnuto, žádný vliv na GameState/gameplay/spotřebu energie. */}
        {isAdmin && (
          <div className="border-t border-amber-700/60 pt-2 mt-1">
            <label className="flex items-center gap-1.5 text-amber-400 cursor-pointer">
              <input
                type="checkbox"
                checked={manualCameraExperimentEnabled}
                onChange={onToggleManualCameraExperiment}
              />
              Experimentální ruční kamera
            </label>
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
