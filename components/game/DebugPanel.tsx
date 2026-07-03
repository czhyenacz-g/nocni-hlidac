import { DEBUG_PANEL_ENABLED } from "@/game/balancing/constants";
import { GameState } from "@/game/core/types";
import DoorControl from "./DoorControl";

interface DebugPanelProps {
  state: GameState;
  tensionLevel: number;
  onDebugToggleDoor: () => void;
  onDebugRestartGenerator: () => void;
}

export default function DebugPanel({ state, tensionLevel, onDebugToggleDoor, onDebugRestartGenerator }: DebugPanelProps) {
  if (!DEBUG_PANEL_ENABLED) return null;

  return (
    <div className="pixel-panel p-2 text-[10px] text-gray-500 font-mono leading-tight flex flex-col gap-2">
      <div>enemyStage: {state.enemyStage}</div>
      <div>tension: {tensionLevel.toFixed(2)}</div>
      <div>power: {state.power.toFixed(1)}</div>
      <div>playerView: {state.playerView}</div>
      <div>door: {state.doorClosed ? "closed" : "open"}</div>
      <div>light: {state.lightOn ? "on" : "off"}</div>
      <div>generator: {state.generatorState} (faults: {state.generatorFaultCount})</div>
      <DoorControl doorClosed={state.doorClosed} onToggle={onDebugToggleDoor} />
      {state.generatorState !== "normal" && (
        <button className="pixel-button px-3 py-2 text-xs w-full" onClick={onDebugRestartGenerator}>
          DEV: Restartovat generátor
        </button>
      )}
    </div>
  );
}
