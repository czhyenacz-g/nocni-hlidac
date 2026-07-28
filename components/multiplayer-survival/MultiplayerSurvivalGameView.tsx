"use client";

import { useEffect, useRef, useState } from "react";
import { formatRemainingTime, MultiplayerSurvivalState, renderMultiplayerSurvival } from "@/game/multiplayer-survival";
import { predictLocalPlayerPosition, useMultiplayerSurvivalOnline } from "@/game/multiplayer-survival/server/useMultiplayerSurvivalOnline";
import { EMPTY_KEYBOARD_MOVE_STATE, KeyboardMoveState, resolveMoveVectorFromKeys } from "@/game/multiplayer-survival/debug/keyboardInput";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/game/multiplayer-survival/engine/config";

// Sdílená "připojený hráč hraje" obrazovka pro multiplayer-survival prototyp
// (viz game/multiplayer-survival/README.md) — jedno místo pro round
// lifecycle UI (čekání/hraní/výhra/prohra + restart), ať se nezdvojuje mezi
// veřejnou vstupní stránkou (app/multiplayer-survival/page.tsx) a dev
// testovací route (app/dev/multiplayer-survival-online/page.tsx).
//
// Ovládání je STEJNÉ v každém okně — WASD i šipky najednou hýbou vlastní
// (jedinou) postavou tohohle okna, mezerník střílí. Identita hráče je dána
// websocket připojením (server/room.ts), tahle komponenta žádné playerId
// sama nevymýšlí ani nezná "hráč 1 vs hráč 2".
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

export interface MultiplayerSurvivalGameViewProps {
  serverUrl: string;
}

export function MultiplayerSurvivalGameView({ serverUrl }: MultiplayerSurvivalGameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { status, errorMessage, playerId, state, lastAppliedSeq, pingMs, sendInput, sendRestart, retry } = useMultiplayerSurvivalOnline(serverUrl);
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

  // Kdykoliv dorazí NOVÝ autoritativní snapshot, "snapni" lokální predikci na
  // server hodnotu vlastního hráče (viz useMultiplayerSurvivalOnline.ts#predictLocalPlayerPosition).
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
      // Vstup se posílá i mimo "playing" (server ho jednoduše ignoruje, viz
      // engine/tick.ts early-return) — jednodušší než místně hlídat round
      // status tady taky.
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
        if (ctx) renderMultiplayerSurvival(ctx, displayState, undefined, playerId ?? undefined);
      }

      frameId = requestAnimationFrame(loop);
    }

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [state, playerId, sendInput]);

  if (status === "connecting") {
    return <p className="text-sm text-gray-400">Připojuji se do hry…</p>;
  }

  if (status === "unreachable") {
    return <ConnectionProblem title="Herní server není dostupný." onRetry={retry} />;
  }

  if (status === "full") {
    return <ConnectionProblem title="Místnost je plná." subtitle="Zkus to prosím znovu za chvíli." onRetry={retry} />;
  }

  if (status === "error") {
    return <ConnectionProblem title={errorMessage ?? "Připojení se nezdařilo."} onRetry={retry} />;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border border-gray-700" />

        {status === "disconnected" && (
          <RoundOverlay title="Spojení přerušeno" subtitle="Zkus se připojit znovu." onRestart={retry} restartLabel="Zkusit znovu" />
        )}

        {status === "joined" && state?.roundStatus === "waiting" && <RoundOverlay title="Čekání na hráče…" />}

        {status === "joined" && state?.roundStatus === "won" && (
          <RoundOverlay title="Přežili jste!" subtitle="Game over pro bestii. Vyhráli jste." onRestart={sendRestart} restartLabel="Nové kolo" />
        )}

        {status === "joined" && state?.roundStatus === "lost" && (
          <RoundOverlay title="Monstrum vás chytilo" subtitle="Game over." onRestart={sendRestart} restartLabel="Nové kolo" />
        )}
      </div>

      {state && (
        <div className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1 justify-center">
          <span>čas: {formatRemainingTime(state.remainingMs)}</span>
          <span>hráči: {state.players.length}</span>
          <span>ammo: {hud.ammo}</span>
          <span>items: {hud.items}</span>
          <span>{hud.alive ? "žiješ" : "sražen"}</span>
          <span>ping: {pingMs !== null ? `${pingMs}ms` : "-"}</span>
        </div>
      )}
      <p className="text-[11px] text-gray-500">Ovládání: WASD nebo šipky pro pohyb, mezerník pro výstřel.</p>
    </div>
  );
}

/** Zobrazí se MÍSTO canvasu, když se ještě vůbec nepodařilo připojit/joinnout (viz zadání "server nedostupný"/"server odmítl"/"místnost je plná") — na rozdíl od `RoundOverlay`, který jede NAD canvasem pro stavy uvnitř už běžící hry. */
function ConnectionProblem({ title, subtitle, onRetry }: { title: string; subtitle?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center px-4">
      <p className="text-sm text-red-400">{title}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      <button onClick={onRetry} className="pixel-button px-4 py-2 text-sm">
        Zkusit znovu
      </button>
    </div>
  );
}

function RoundOverlay({ title, subtitle, onRestart, restartLabel }: { title: string; subtitle?: string; onRestart?: () => void; restartLabel?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-center px-4">
      <p className="text-lg font-bold text-gray-100">{title}</p>
      {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      {onRestart && (
        <button onClick={onRestart} className="pixel-button px-4 py-2 text-sm">
          {restartLabel ?? "Znovu"}
        </button>
      )}
    </div>
  );
}
