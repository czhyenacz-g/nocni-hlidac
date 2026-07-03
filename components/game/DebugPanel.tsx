import { DEBUG_PANEL_ENABLED } from "@/game/balancing/constants";
import { GameState, NightDefinition } from "@/game/core/types";
import DoorControl from "./DoorControl";

interface DebugPanelProps {
  state: GameState;
  night: NightDefinition;
  tensionLevel: number;
  onDebugToggleDoor: () => void;
  onDebugRestartGenerator: () => void;
}

export default function DebugPanel({ state, night, tensionLevel, onDebugToggleDoor, onDebugRestartGenerator }: DebugPanelProps) {
  if (!DEBUG_PANEL_ENABLED) return null;

  // Dev nástroj, ne herní ovládání — na mobilu/užších obrazovkách by jen
  // zabíral místo a mohl překrývat skutečné hotspoty, proto se pod `lg` skryje.
  // Sbalené <details> (bez `open`) = výchozí stav, žádný extra React state.
  return (
    <details className="hidden lg:block pixel-panel p-2 text-[10px] text-gray-500 font-mono leading-tight">
      <summary className="tap-target cursor-pointer select-none">DEV panel</summary>
      <div className="flex flex-col gap-2 mt-2">
        <div>
          gameStatus: {state.gameStatus}
          {state.gameStatus === "blackout" && ` (${state.blackoutElapsedMs.toFixed(0)} / ${night.blackout.durationMs} ms)`}
        </div>
        <div>enemyStage: {state.enemyStage} ({state.lastEnemyDecision})</div>
        <div>tension: {tensionLevel.toFixed(2)}</div>
        <div>power: {state.power.toFixed(1)}</div>
        <div>playerView: {state.playerView}</div>
        <div>door: {state.doorClosed ? "closed" : "open"}</div>
        <div>light: {state.lightOn ? "on" : "off"}</div>
        <div>
          doorLightRepel: {state.doorLightRepelMs.toFixed(0)} / {night.enemy.doorLightRepelRequiredMs} ms
          (roars: {state.monsterRetreatRoarSeq})
        </div>
        <div>generator: {state.generatorState} (faults: {state.generatorFaultCount})</div>
        <DoorControl doorClosed={state.doorClosed} onToggle={onDebugToggleDoor} />
        <button className="pixel-button px-3 py-2 text-xs w-full" onClick={onDebugRestartGenerator}>
          DEV: Restartovat generátor{state.generatorState === "normal" ? " (test penalizace)" : ""}
        </button>
      </div>
    </details>
  );
}
