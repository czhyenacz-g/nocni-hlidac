"use client";

import { useEffect, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CONE_ANGLE_RAD,
  CONE_RANGE,
  WALLS,
  createInitialEnemy,
  createInitialPlayer,
} from "@/game/minigame/config";
import { Direction, Enemy, MiniGameStatus, Player } from "@/game/minigame/types";
import {
  DIRECTION_ANGLES,
  circlesTouch,
  directionFromVector,
  isEnemyHit,
  moveWithWallSliding,
  stepTowards,
} from "@/game/minigame/logic";

// Izolovaný prototyp minihry (viz app/minihra/page.tsx) — vlastní
// requestAnimationFrame smyčka mimo React render cyklus. Mutable herní stav
// žije v refu (gameRef), ať se hra neproháněla přes setState 60×/s; do
// Reactu (useState status/shotsLeft) se propisuje jen při SKUTEČNÉ změně
// (výstřel, smrt, výhra, restart), aby se stavový panel/overlay překreslil.
interface MiniGameRefState {
  player: Player;
  enemy: Enemy;
  status: MiniGameStatus;
}

function createInitialState(): MiniGameRefState {
  return { player: createInitialPlayer(), enemy: createInitialEnemy(), status: "playing" };
}

const MOVE_KEYS: Record<string, { dx: number; dy: number }> = {
  w: { dx: 0, dy: -1 },
  arrowup: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  arrowdown: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  arrowleft: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
  arrowright: { dx: 1, dy: 0 },
};

export default function MiniGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<MiniGameRefState>(createInitialState());
  const heldKeysRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | null>(null);

  const [status, setStatus] = useState<MiniGameStatus>("playing");
  const [shotsLeft, setShotsLeft] = useState(1);

  function restart() {
    gameRef.current = createInitialState();
    setStatus("playing");
    setShotsLeft(gameRef.current.player.shotsLeft);
  }

  function fireShot() {
    const game = gameRef.current;
    if (game.status !== "playing" || game.player.shotsLeft <= 0) return;

    game.player.shotsLeft = 0;
    setShotsLeft(0);

    const hit = isEnemyHit({
      player: game.player,
      enemy: game.enemy,
      coneAngleRad: CONE_ANGLE_RAD,
      range: CONE_RANGE,
    });

    if (hit) {
      game.enemy.alive = false;
      game.status = "won";
      setStatus("won");
    }
    // Miss: náboj je pryč (shotsLeft už 0), hra dál běží (nepřítel se dál blíží).
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key === " " || key === "spacebar") {
        event.preventDefault();
        fireShot();
        return;
      }
      if (key === "r") {
        event.preventDefault();
        restart();
        return;
      }
      if (MOVE_KEYS[key]) {
        event.preventDefault();
        heldKeysRef.current.add(key);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (MOVE_KEYS[key]) heldKeysRef.current.delete(key);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tick = () => {
      const game = gameRef.current;

      if (game.status === "playing") {
        let dx = 0;
        let dy = 0;
        for (const key of heldKeysRef.current) {
          const move = MOVE_KEYS[key];
          if (!move) continue;
          dx += move.dx;
          dy += move.dy;
        }

        if (dx !== 0 || dy !== 0) {
          const length = Math.hypot(dx, dy) || 1;
          const moved = moveWithWallSliding(
            game.player.x,
            game.player.y,
            (dx / length) * game.player.speed,
            (dy / length) * game.player.speed,
            game.player.radius,
            WALLS,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
          );
          game.player.x = moved.x;
          game.player.y = moved.y;
          game.player.direction = directionFromVector(dx, dy, game.player.direction);
        }

        if (game.enemy.alive) {
          const step = stepTowards(game.enemy.x, game.enemy.y, game.player.x, game.player.y, game.enemy.speed);
          const moved = moveWithWallSliding(
            game.enemy.x,
            game.enemy.y,
            step.dx,
            step.dy,
            game.enemy.radius,
            WALLS,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
          );
          game.enemy.x = moved.x;
          game.enemy.y = moved.y;

          if (circlesTouch(game.player.x, game.player.y, game.player.radius, game.enemy.x, game.enemy.y, game.enemy.radius)) {
            game.status = "gameOver";
            setStatus("gameOver");
          }
        }
      }

      draw(ctx, game);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="pixel-panel p-3 text-xs flex flex-wrap gap-x-6 gap-y-1">
        <div>
          Stav:{" "}
          {status === "playing" ? "Probíhá obchůzka" : status === "won" ? "Monstrum zasaženo" : "Monstrum tě dostalo"}
        </div>
        <div>Náboje: {shotsLeft}</div>
        <div className="text-gray-400">WASD / šipky: pohyb · mezerník: výstřel · R: restart</div>
      </div>

      <div className="relative pixel-panel p-2 w-full">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-auto block"
          style={{ maxWidth: `${CANVAS_WIDTH}px` }}
        />

        {status !== "playing" && (
          <div className="absolute inset-2 flex items-center justify-center bg-black/70">
            <div className="pixel-panel p-6 text-center">
              {status === "won" ? (
                <>
                  <div className="text-sm font-bold text-green-400 mb-1">Monstrum zasaženo.</div>
                  <div className="text-xs text-gray-400 mb-3">Prototyp dokončen.</div>
                </>
              ) : (
                <div className="text-sm font-bold text-red-500 mb-3">Monstrum tě dostalo.</div>
              )}
              <div className="text-xs text-gray-300">R — restart</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function draw(ctx: CanvasRenderingContext2D, game: MiniGameRefState) {
  const { player, enemy, status } = game;

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Pozadí.
  ctx.fillStyle = "#111318";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Zdi — výrazné šedé/kovové obdélníky.
  ctx.fillStyle = "#54585f";
  ctx.strokeStyle = "#2a2d32";
  ctx.lineWidth = 2;
  for (const wall of WALLS) {
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
  }

  // Výseč vidění/zásahu — poloprůhledný kužel ve směru pohledu hráče.
  const facing = DIRECTION_ANGLES[player.direction];
  ctx.fillStyle = status === "gameOver" ? "rgba(120, 30, 30, 0.25)" : "rgba(250, 204, 21, 0.18)";
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.arc(player.x, player.y, CONE_RANGE, facing - CONE_ANGLE_RAD / 2, facing + CONE_ANGLE_RAD / 2);
  ctx.closePath();
  ctx.fill();

  // Nepřítel.
  ctx.fillStyle = enemy.alive ? "#dc2626" : "#4b5563";
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();

  // Hráč.
  ctx.fillStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
}
