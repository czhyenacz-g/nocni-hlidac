"use client";

import { useEffect, useRef, useState } from "react";
import { renderMultiplayerSurvival } from "@/game/multiplayer-survival";
import { predictLocalPlayerPosition, useMultiplayerSurvivalOnline } from "@/game/multiplayer-survival/server/useMultiplayerSurvivalOnline";
import { EMPTY_KEYBOARD_MOVE_STATE, KeyboardMoveState, resolveMoveVectorFromKeys } from "@/game/multiplayer-survival/debug/keyboardInput";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/game/multiplayer-survival/engine/config";
import { MultiplayerSurvivalState } from "@/game/multiplayer-survival";

// Skutečný (websocketový) multiplayer dev route — NENÍ totéž jako
// /dev/multiplayer-survival (ta zůstává lokální 2-hráčová 1-tabová verze
// beze změny, viz README.md). Tahle stránka je JEDEN klient: otevři ji ve
// dvou různých oknech prohlížeče (běžné + anonymní, ať mají oddělený
// localStorage token) proti spuštěnému `npm run dev:mp-survival-server`.
// Ovládání: WASD + mezerník (výstřel) — je to jen jeden hráč na okno.
const DEFAULT_SERVER_URL = process.env.NEXT_PUBLIC_MULTIPLAYER_SURVIVAL_WS_URL ?? "http://localhost:4001";

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

export default function MultiplayerSurvivalOnlineDevPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { status, errorMessage, playerId, state, lastAppliedSeq, pingMs, sendInput } = useMultiplayerSurvivalOnline(DEFAULT_SERVER_URL);
  const keysRef = useRef<KeyboardMoveState>({ ...EMPTY_KEYBOARD_MOVE_STATE });
  const wasFiringRef = useRef(false);
  const predictedRef = useRef<{ x: number; y: number; direction: MultiplayerSurvivalState["players"][number]["direction"] } | null>(null);
  const lastSyncedSeqRef = useRef(0);
  const [hud, setHud] = useState({ ammo: 0, items: 0, alive: true });

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

  // Kdykoliv dorazí NOVÝ (přijatý, ne zahozený) autoritativní snapshot,
  // "snapni" lokální predikci na server hodnotu vlastního hráče — jednoduchá
  // korekce, ne plný rollback/replay nepotvrzených vstupů (viz
  // useMultiplayerSurvivalOnline.ts#predictLocalPlayerPosition).
  useEffect(() => {
    if (!state || !playerId) return;
    if (lastAppliedSeq === lastSyncedSeqRef.current) return;
    lastSyncedSeqRef.current = lastAppliedSeq;
    const authoritative = state.players.find((p) => p.id === playerId);
    if (authoritative) predictedRef.current = { x: authoritative.x, y: authoritative.y, direction: authoritative.direction };
  }, [state, playerId, lastAppliedSeq]);

  useEffect(() => {
    let frameId: number;

    function loop() {
      const { moveX, moveY } = resolveMoveVectorFromKeys(keysRef.current);
      const firing = keysRef.current.firing && !wasFiringRef.current;
      wasFiringRef.current = keysRef.current.firing;
      sendInput(moveX, moveY, firing);

      if (state && playerId) {
        const authoritative = state.players.find((p) => p.id === playerId);
        if (authoritative && !predictedRef.current) {
          predictedRef.current = { x: authoritative.x, y: authoritative.y, direction: authoritative.direction };
        }
        if (predictedRef.current && authoritative) {
          predictedRef.current = predictLocalPlayerPosition(
            { ...predictedRef.current, radius: authoritative.radius, speed: authoritative.speed },
            moveX,
            moveY,
            state.map.walls,
            state.map.width,
            state.map.height,
          );
        }

        const displayState: MultiplayerSurvivalState = {
          ...state,
          players: state.players.map((p) =>
            p.id === playerId && predictedRef.current ? { ...p, x: predictedRef.current.x, y: predictedRef.current.y, direction: predictedRef.current.direction } : p,
          ),
        };

        setHud({ ammo: authoritative?.ammo ?? 0, items: authoritative?.collectedItemIds.length ?? 0, alive: authoritative?.alive ?? true });

        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) renderMultiplayerSurvival(ctx, displayState);
      }

      frameId = requestAnimationFrame(loop);
    }

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [state, playerId, sendInput]);

  return (
    <main className="min-h-screen bg-black p-4 flex flex-col items-center gap-3 text-gray-300 font-mono">
      <div className="text-center">
        <h1 className="text-lg font-bold">Multiplayer Survival — ONLINE dev prototyp</h1>
        <p className="text-xs text-gray-500 mt-1">
          Otevři tuhle stránku ve druhém okně (nejlépe anonymní), ať se připojíš jako druhý hráč. WASD + mezerník. Server: <code>npm run dev:mp-survival-server</code>.
        </p>
      </div>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border border-gray-700" />
      <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 justify-center">
        <span>connection: {status}</span>
        <span>playerId: {playerId ?? "-"}</span>
        <span>seq: {lastAppliedSeq}</span>
        <span>ping: {pingMs !== null ? `${pingMs}ms` : "-"}</span>
        <span>ammo: {hud.ammo}</span>
        <span>items: {hud.items}</span>
        <span>{hud.alive ? "alive" : "down"}</span>
      </div>
      {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}
    </main>
  );
}
