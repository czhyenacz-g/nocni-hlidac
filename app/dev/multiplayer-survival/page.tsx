"use client";

import { useEffect, useRef, useState } from "react";
import {
  createInitialMultiplayerSurvivalState,
  DEFAULT_DEBUG_TOGGLES,
  MultiplayerSurvivalDebugToggles,
  MultiplayerSurvivalState,
  PlayerId,
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
// Žádná herní logika tady, jen: drž stav, sbírej vstup ZE DVOU nezávislých
// klávesnicových sad, volej tickMultiplayerSurvival + renderMultiplayerSurvival,
// přehraj zvuky na zásadní herní eventy. Dva LOKÁLNÍ hráči na jedné
// klávesnici (žádný síťový multiplayer, viz README.md):
//   hráč 1 — WASD + mezerník (výstřel)
//   hráč 2 — šipky + Enter (výstřel)
const PLAYER_1_ID: PlayerId = "player-1";
const PLAYER_2_ID: PlayerId = "player-2";
const PLAYER_IDS: PlayerId[] = [PLAYER_1_ID, PLAYER_2_ID];

interface KeyBinding {
  playerId: PlayerId;
  action: keyof KeyboardMoveState;
}

const KEY_BINDINGS: Record<string, KeyBinding> = {
  w: { playerId: PLAYER_1_ID, action: "up" },
  s: { playerId: PLAYER_1_ID, action: "down" },
  a: { playerId: PLAYER_1_ID, action: "left" },
  d: { playerId: PLAYER_1_ID, action: "right" },
  " ": { playerId: PLAYER_1_ID, action: "firing" },
  ArrowUp: { playerId: PLAYER_2_ID, action: "up" },
  ArrowDown: { playerId: PLAYER_2_ID, action: "down" },
  ArrowLeft: { playerId: PLAYER_2_ID, action: "left" },
  ArrowRight: { playerId: PLAYER_2_ID, action: "right" },
  Enter: { playerId: PLAYER_2_ID, action: "firing" },
};

export default function MultiplayerSurvivalDevPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<MultiplayerSurvivalState>(createInitialMultiplayerSurvivalState(PLAYER_IDS));
  const keysRef = useRef<Record<PlayerId, KeyboardMoveState>>({
    [PLAYER_1_ID]: { ...EMPTY_KEYBOARD_MOVE_STATE },
    [PLAYER_2_ID]: { ...EMPTY_KEYBOARD_MOVE_STATE },
  });
  const wasFiringRef = useRef<Record<PlayerId, boolean>>({ [PLAYER_1_ID]: false, [PLAYER_2_ID]: false });
  const [status, setStatus] = useState(stateRef.current.status);
  const [hud, setHud] = useState(() => Object.fromEntries(stateRef.current.players.map((p) => [p.id, { ammo: p.ammo, items: 0, alive: true }])));
  const [debug, setDebug] = useState<MultiplayerSurvivalDebugToggles>(DEFAULT_DEBUG_TOGGLES);
  const debugRef = useRef(debug);
  debugRef.current = debug;

  useEffect(() => {
    audioManager.init();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const binding = KEY_BINDINGS[event.key];
      if (!binding) return;
      keysRef.current = { ...keysRef.current, [binding.playerId]: { ...keysRef.current[binding.playerId], [binding.action]: true } };
    }
    function handleKeyUp(event: KeyboardEvent) {
      const binding = KEY_BINDINGS[event.key];
      if (!binding) return;
      keysRef.current = { ...keysRef.current, [binding.playerId]: { ...keysRef.current[binding.playerId], [binding.action]: false } };
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

      const inputs = PLAYER_IDS.map((playerId) => {
        const keys = keysRef.current[playerId];
        const { moveX, moveY } = resolveMoveVectorFromKeys(keys);
        const firing = keys.firing && !wasFiringRef.current[playerId];
        wasFiringRef.current = { ...wasFiringRef.current, [playerId]: keys.firing };
        return { playerId, moveX, moveY, firing };
      });

      const after = tickMultiplayerSurvival(before, inputs, deltaMs);
      stateRef.current = after;

      // Zvuková odezva na herní eventy mezi před/po tikem — stejná fronta
      // eventů jako EmergencyMiniGame.tsx, jen vyhodnocená diffem stavu
      // místo callbacků uvnitř komponenty, sečtená přes OBA hráče.
      for (const input of inputs) {
        if (!input.firing) continue;
        const beforePlayer = before.players.find((p) => p.id === input.playerId);
        const afterPlayer = after.players.find((p) => p.id === input.playerId);
        if (beforePlayer && afterPlayer) {
          audioManager.play(afterPlayer.ammo < beforePlayer.ammo ? AUDIO_EVENTS.uiClick : AUDIO_EVENTS.weaponEmptyClick);
        }
      }
      const beforeMonster = before.monsters[0];
      const afterMonster = after.monsters[0];
      if (beforeMonster?.alive && afterMonster && !afterMonster.alive) {
        audioManager.play(AUDIO_EVENTS.monsterFinalDeathRoar);
      } else if (beforeMonster && afterMonster && beforeMonster.stunRemainingMs === 0 && afterMonster.stunRemainingMs > 0) {
        audioManager.play(AUDIO_EVENTS.monsterWounded);
      }
      for (const afterPlayer of after.players) {
        const beforePlayer = before.players.find((p) => p.id === afterPlayer.id);
        if (beforePlayer && afterPlayer.collectedItemIds.length > beforePlayer.collectedItemIds.length) {
          audioManager.play(AUDIO_EVENTS.bulbReplaceSuccess);
        }
      }

      setStatus(after.status);
      setHud(Object.fromEntries(after.players.map((p) => [p.id, { ammo: p.ammo, items: p.collectedItemIds.length, alive: p.alive }])));

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
          Izolovaná laboratoř (game/multiplayer-survival/) — nenahrazuje /minihra. Hráč 1: WASD + mezerník. Hráč 2: šipky + Enter.
        </p>
      </div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border border-gray-700" />
      <p className="text-xs text-gray-500">
        status: {status} ·{" "}
        {PLAYER_IDS.map((id) => (
          <span key={id} className="mr-3">
            {id}: {hud[id]?.alive ? "alive" : "down"}, ammo {hud[id]?.ammo}, items {hud[id]?.items}
          </span>
        ))}
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
