"use client";

import { useEffect, useRef, useState } from "react";
import {
  createInitialMultiplayerSurvivalState,
  DEFAULT_DEBUG_TOGGLES,
  MultiplayerSurvivalDebugToggles,
  MultiplayerSurvivalState,
  renderMultiplayerSurvival,
  tickMultiplayerSurvival,
} from "@/game/multiplayer-survival";
import { EMPTY_KEYBOARD_MOVE_STATE, KeyboardMoveState, resolveMoveVectorFromKeys } from "@/game/multiplayer-survival/debug/keyboardInput";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/game/multiplayer-survival/engine/config";
// audioManager/AUDIO_EVENTS jsou obecná infrastruktura (game/audio/*), ne
// nic svázaného s EmergencyMiniGame.tsx — bezpečné importovat beze změny
// (viz README.md "Co bylo převzato přímo importem").
import { audioManager } from "@/game/audio/audioManager";
import { AUDIO_EVENTS } from "@/game/audio/audioEvents";

// Samostatná dev/test route pro game/multiplayer-survival/ (viz
// game/multiplayer-survival/README.md) — NENAHRAZUJE ani nemění /minihra.
// Žádná herní logika tady, jen: drž stav, sbírej vstup (klávesnice), volej
// tickMultiplayerSurvival + renderMultiplayerSurvival, přehraj zvuky na
// zásadní herní eventy (výstřel/zásah/pickup — stejná fronta jako
// EmergencyMiniGame.tsx). Jeden hráč ("player-1"), WASD/šipky = pohyb,
// mezerník = výstřel.
const PLAYER_ID = "player-1";

const KEY_MAP: Record<string, keyof KeyboardMoveState> = {
  w: "up",
  ArrowUp: "up",
  s: "down",
  ArrowDown: "down",
  a: "left",
  ArrowLeft: "left",
  d: "right",
  ArrowRight: "right",
  " ": "firing",
};

export default function MultiplayerSurvivalDevPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<MultiplayerSurvivalState>(createInitialMultiplayerSurvivalState([PLAYER_ID]));
  const keysRef = useRef<KeyboardMoveState>({ ...EMPTY_KEYBOARD_MOVE_STATE });
  const wasFiringRef = useRef(false);
  const [status, setStatus] = useState(stateRef.current.status);
  const [hud, setHud] = useState({ ammo: stateRef.current.players[0].ammo, items: 0 });
  const [debug, setDebug] = useState<MultiplayerSurvivalDebugToggles>(DEFAULT_DEBUG_TOGGLES);
  const debugRef = useRef(debug);
  debugRef.current = debug;

  useEffect(() => {
    audioManager.init();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = KEY_MAP[event.key];
      if (!key) return;
      keysRef.current = { ...keysRef.current, [key]: true };
    }
    function handleKeyUp(event: KeyboardEvent) {
      const key = KEY_MAP[event.key];
      if (!key) return;
      keysRef.current = { ...keysRef.current, [key]: false };
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let frameId: number;
    let lastTimestamp: number | null = null;

    function loop(timestamp: number) {
      const deltaMs = lastTimestamp === null ? 16 : Math.min(timestamp - lastTimestamp, 100);
      lastTimestamp = timestamp;

      const before = stateRef.current;
      const { moveX, moveY } = resolveMoveVectorFromKeys(keysRef.current);
      const firing = keysRef.current.firing && !wasFiringRef.current;
      wasFiringRef.current = keysRef.current.firing;

      const after = tickMultiplayerSurvival(before, [{ playerId: PLAYER_ID, moveX, moveY, firing }], deltaMs);
      stateRef.current = after;

      // Zvuková odezva na herní eventy mezi před/po tikem — stejná fronta
      // eventů jako EmergencyMiniGame.tsx, jen vyhodnocená diffem stavu
      // místo callbacků uvnitř komponenty.
      const beforePlayer = before.players[0];
      const afterPlayer = after.players[0];
      if (firing) {
        audioManager.play(afterPlayer.ammo < beforePlayer.ammo ? AUDIO_EVENTS.uiClick : AUDIO_EVENTS.weaponEmptyClick);
      }
      const beforeMonster = before.monsters[0];
      const afterMonster = after.monsters[0];
      if (beforeMonster?.alive && afterMonster && !afterMonster.alive) {
        audioManager.play(AUDIO_EVENTS.monsterFinalDeathRoar);
      } else if (beforeMonster && afterMonster && beforeMonster.stunRemainingMs === 0 && afterMonster.stunRemainingMs > 0) {
        audioManager.play(AUDIO_EVENTS.monsterWounded);
      }
      if (afterPlayer.collectedItemIds.length > beforePlayer.collectedItemIds.length) {
        audioManager.play(AUDIO_EVENTS.bulbReplaceSuccess);
      }

      setStatus(after.status);
      setHud({ ammo: afterPlayer.ammo, items: afterPlayer.collectedItemIds.length });

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) renderMultiplayerSurvival(ctx, after, debugRef.current);

      frameId = requestAnimationFrame(loop);
    }

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  function toggle(key: keyof MultiplayerSurvivalDebugToggles) {
    setDebug((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <main className="min-h-screen bg-black p-4 flex flex-col items-center gap-3 text-gray-300 font-mono">
      <div className="text-center">
        <h1 className="text-lg font-bold">Multiplayer Survival — dev prototyp (skladové patro)</h1>
        <p className="text-xs text-gray-500 mt-1">
          Izolovaná laboratoř (game/multiplayer-survival/) — nenahrazuje /minihra. WASD/šipky = pohyb, mezerník = výstřel.
        </p>
      </div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border border-gray-700" />
      <p className="text-xs text-gray-500">
        status: {status} · ammo: {hud.ammo} · items: {hud.items}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-gray-400">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={debug.showPlayerCone} onChange={() => toggle("showPlayerCone")} /> player cone
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={debug.showMonsterCone} onChange={() => toggle("showMonsterCone")} /> monster cone
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={debug.showCollisionWalls} onChange={() => toggle("showCollisionWalls")} /> collision walls
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={debug.showTargetPlayerId} onChange={() => toggle("showTargetPlayerId")} /> targetPlayerId
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={debug.showEnragedState} onChange={() => toggle("showEnragedState")} /> enraged state
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={debug.showPickupHitboxes} onChange={() => toggle("showPickupHitboxes")} /> pickup hitboxes
        </label>
      </div>
    </main>
  );
}
