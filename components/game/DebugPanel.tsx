import { DEBUG_PANEL_ENABLED } from "@/game/balancing/constants";
import { GameState } from "@/game/core/types";

interface DebugPanelProps {
  state: GameState;
  tensionLevel: number;
}

export default function DebugPanel({ state, tensionLevel }: DebugPanelProps) {
  if (!DEBUG_PANEL_ENABLED) return null;

  return (
    <div className="pixel-panel p-2 text-[10px] text-gray-500 font-mono leading-tight">
      <div>enemyStage: {state.enemyStage}</div>
      <div>tension: {tensionLevel.toFixed(2)}</div>
      <div>power: {state.power.toFixed(1)}</div>
      <div>door: {state.doorClosed ? "closed" : "open"}</div>
      <div>light: {state.lightOn ? "on" : "off"}</div>
    </div>
  );
}
