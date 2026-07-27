// Fork rendering — vizuální styl (barvy, mlha války, výseče, HUD) je
// ZKOPÍROVANÝ z components/minigame/EmergencyMiniGame.tsx#draw (canvas kód
// je svázaný s tou konkrétní React komponentou, nejde importovat), ale
// samotná geometrie/vidění pod ním (castVisionCone, getPlayerVisibilityAtPoint,
// hasLineOfSight) je IMPORTOVANÁ přímo z game/minigame/logic.ts a
// game/minigame/playerVision.ts — viz README.md.
//
// Temporary fork from components/minigame/EmergencyMiniGame.tsx#draw for
// multiplayer-survival experimentation. Do not synchronize automatically
// without explicit review.

import { DIRECTION_ANGLES, castVisionCone } from "../../minigame/logic";
import { getPlayerVisibilityAtPoint } from "../../minigame/playerVision";
import { getMiniGameWallRenderStyle } from "../../minigame/mapVisuals";
import { computeMonsterVisionConePolygon } from "../ai/monsterAi";
import { CANVAS_HEIGHT, CANVAS_WIDTH, CONE_ANGLE_RAD, CONE_RANGE, ITEM_RADIUS, PLAYER_VISION_CONFIG, PLAYER_VISION_RAY_COUNT, PLAYER_VISION_RAY_STEP_PX, computeWorldScale } from "../engine/config";
import { MultiplayerSurvivalState, PlayerState } from "../state/types";

export interface MultiplayerSurvivalDebugToggles {
  showPlayerCone: boolean;
  showMonsterCone: boolean;
  showCollisionWalls: boolean;
  showTargetPlayerId: boolean;
  showEnragedState: boolean;
  showPickupHitboxes: boolean;
}

export const DEFAULT_DEBUG_TOGGLES: MultiplayerSurvivalDebugToggles = {
  showPlayerCone: false,
  showMonsterCone: false,
  showCollisionWalls: false,
  showTargetPlayerId: false,
  showEnragedState: false,
  showPickupHitboxes: false,
};

/** Barva těla/výseče/facing-tick podle indexu hráče v `state.players` — čistě vizuální rozlišení pro 2+ hráče, viz vykreslovací smyčka níže. */
const PLAYER_COLORS = [
  { fill: "#d9ffe8", shadow: "rgba(200,255,220,0.9)", stroke: "#3fe08a", coneFill: "rgba(163,255,130,0.18)" },
  { fill: "#bae6fd", shadow: "rgba(125,211,252,0.9)", stroke: "#38bdf8", coneFill: "rgba(56,189,248,0.18)" },
];

let fogCanvas: HTMLCanvasElement | null = null;

function getFogCanvas(width: number, height: number): HTMLCanvasElement {
  if (!fogCanvas || fogCanvas.width !== width || fogCanvas.height !== height) {
    fogCanvas = document.createElement("canvas");
    fogCanvas.width = width;
    fogCanvas.height = height;
  }
  return fogCanvas;
}

/**
 * Mlha se odkrývá pro SJEDNOCENÍ viditelnosti VŠECH živých hráčů (ne jen
 * jednoho "primárního") — každý hráč má sice vlastní vision cone (viz
 * getPlayerVisibilityAtPoint níže, počítané per-hráč), ale tenhle dev
 * prototyp nemá split-screen, takže na jednom sdíleném canvasu dává smysl
 * ukázat "co vidí PARTA", ne jen první hráč. Pro 1 hráče je to beze změny
 * oproti dřívějšku.
 */
function drawFogOfWar(ctx: CanvasRenderingContext2D, state: MultiplayerSurvivalState, players: PlayerState[]) {
  const fog = getFogCanvas(state.map.width, state.map.height);
  const fogCtx = fog.getContext("2d");
  if (!fogCtx) return;

  fogCtx.clearRect(0, 0, fog.width, fog.height);
  fogCtx.fillStyle = "rgba(2,8,4,0.94)";
  fogCtx.fillRect(0, 0, fog.width, fog.height);

  fogCtx.globalCompositeOperation = "destination-out";
  fogCtx.filter = "blur(10px)";

  for (const player of players) {
    if (!player.alive) continue;
    const facingAngle = DIRECTION_ANGLES[player.direction];

    const peripheralPoints = castVisionCone({
      originX: player.x,
      originY: player.y,
      facingAngle,
      coneAngleRad: Math.PI * 2,
      range: PLAYER_VISION_CONFIG.peripheralRangePx,
      walls: state.map.walls,
      rayCount: PLAYER_VISION_RAY_COUNT,
      stepPx: PLAYER_VISION_RAY_STEP_PX,
    });
    const directionalPoints = castVisionCone({
      originX: player.x,
      originY: player.y,
      facingAngle,
      coneAngleRad: PLAYER_VISION_CONFIG.directionalAngleRad,
      range: PLAYER_VISION_CONFIG.directionalRangePx,
      walls: state.map.walls,
      rayCount: PLAYER_VISION_RAY_COUNT,
      stepPx: PLAYER_VISION_RAY_STEP_PX,
    });

    for (const points of [peripheralPoints, directionalPoints]) {
      if (points.length === 0) continue;
      fogCtx.beginPath();
      fogCtx.moveTo(player.x, player.y);
      for (const point of points) fogCtx.lineTo(point.x, point.y);
      fogCtx.closePath();
      fogCtx.fill();
    }
  }

  fogCtx.filter = "none";
  fogCtx.globalCompositeOperation = "source-over";

  ctx.drawImage(fog, 0, 0);
}

export function renderMultiplayerSurvival(ctx: CanvasRenderingContext2D, state: MultiplayerSurvivalState, debug: MultiplayerSurvivalDebugToggles = DEFAULT_DEBUG_TOGGLES): void {
  const { map } = state;
  const scale = computeWorldScale(map.width, map.height);

  ctx.save();
  ctx.fillStyle = "#020a05";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.scale(scale, scale);

  // Místnosti (jen obrys/popisek, kolize řeší výhradně map.walls).
  ctx.strokeStyle = "rgba(63, 224, 138, 0.15)";
  ctx.lineWidth = 1;
  ctx.font = "11px monospace";
  for (const room of map.rooms) {
    ctx.strokeRect(room.bounds.x, room.bounds.y, room.bounds.width, room.bounds.height);
    ctx.fillStyle = "rgba(163,255,200,0.4)";
    ctx.fillText(room.name.toUpperCase(), room.bounds.x + 6, room.bounds.y + 14);
  }

  // Zdi/regály/stroje/překážky — barva podle kind, stejná paleta jako
  // EmergencyMiniGame.tsx (viz getMiniGameWallRenderStyle, importovaná beze změny).
  for (const wall of map.walls) {
    const kind = getMiniGameWallRenderStyle(wall);
    ctx.shadowColor = "rgba(63,224,138,0.85)";
    ctx.shadowBlur = kind === "wall" ? 8 : 4;
    ctx.fillStyle = kind === "obstacle" ? "rgba(20,40,12,0.85)" : "rgba(6,26,16,0.9)";
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = kind === "shelf" ? "rgba(63,224,138,0.5)" : kind === "machine" ? "rgba(93,255,160,0.55)" : kind === "obstacle" ? "rgba(163,255,130,0.55)" : "#3fe08a";
    ctx.lineWidth = 2;
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);

    if (debug.showCollisionWalls) {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      ctx.setLineDash([]);
    }
  }

  // Pickupy — žlutá tečka, jen pokud nesebrané. `debug.showPickupHitboxes`
  // navíc obkreslí skutečný interakční okruh (ITEM_RADIUS + player.radius).
  for (const pickup of state.pickups) {
    if (pickup.collected) continue;
    ctx.beginPath();
    ctx.shadowColor = "rgba(250,204,21,0.9)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#facc15";
    ctx.arc(pickup.x, pickup.y, ITEM_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (debug.showPickupHitboxes) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(250,204,21,0.4)";
      ctx.lineWidth = 1;
      ctx.arc(pickup.x, pickup.y, ITEM_RADIUS + 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Monstrum — barva podle stavu, stejná paleta jako produkční minihra.
  for (const monster of state.monsters) {
    if (!monster.alive) continue;

    if (debug.showMonsterCone || monster.mode !== "wounded") {
      const cone = computeMonsterVisionConePolygon(monster, map.walls);
      if (cone.length > 0) {
        ctx.beginPath();
        ctx.moveTo(monster.x, monster.y);
        for (const point of cone) ctx.lineTo(point.x, point.y);
        ctx.closePath();
        ctx.fillStyle = monster.mode === "chasing" ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.1)";
        ctx.fill();
        ctx.strokeStyle = monster.mode === "chasing" ? "rgba(248,113,113,0.65)" : "rgba(239,68,68,0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.fillStyle = monster.stunRemainingMs > 0 ? "#4b5563" : monster.mode === "chasing" ? "#ef4444" : monster.enraged ? "#dc2626" : "#f87171";
    ctx.shadowColor = "rgba(239,68,68,0.6)";
    ctx.shadowBlur = monster.mode === "chasing" ? 16 : 6;
    ctx.arc(monster.x, monster.y, monster.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (debug.showTargetPlayerId || debug.showEnragedState) {
      ctx.fillStyle = "#f8fafc";
      ctx.font = "10px monospace";
      const label = [debug.showTargetPlayerId ? `target=${monster.targetPlayerId ?? "-"}` : null, debug.showEnragedState ? `enraged=${monster.enraged}` : null]
        .filter(Boolean)
        .join(" ");
      ctx.fillText(label, monster.x - 30, monster.y - monster.radius - 6);
    }
  }

  // Hráči — kruh + výseč (bliká bíle při výstřelu, stejně jako produkční
  // "isFlashing"), facing tick, volitelný debug view cone. Každý hráč má
  // vlastní barvu (index 0 = mint jako produkční minihra, index 1+ = cyan,
  // fialová, ...) — čistě vizuální rozlišení "kdo je kdo" pro 2+ hráče,
  // žádný vliv na herní logiku (ta je pořád per-entita v engine/tick.ts).
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    const bodyColor = PLAYER_COLORS[i % PLAYER_COLORS.length];
    const facingAngle = DIRECTION_ANGLES[player.direction];

    if (debug.showPlayerCone) {
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.arc(player.x, player.y, CONE_RANGE, facingAngle - CONE_ANGLE_RAD / 2, facingAngle + CONE_ANGLE_RAD / 2);
      ctx.closePath();
      ctx.fillStyle = player.shotFlashRemainingMs > 0 ? "rgba(255,255,255,0.5)" : bodyColor.coneFill;
      ctx.fill();
    }

    if (!player.alive) {
      ctx.beginPath();
      ctx.fillStyle = "#555";
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    ctx.shadowColor = bodyColor.shadow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = bodyColor.fill;
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = bodyColor.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x + Math.cos(facingAngle) * player.radius, player.y + Math.sin(facingAngle) * player.radius);
    ctx.lineTo(player.x + Math.cos(facingAngle) * (player.radius + 10), player.y + Math.sin(facingAngle) * (player.radius + 10));
    ctx.stroke();

    if (player.lootingProgressMs > 0) {
      ctx.strokeStyle = "rgba(250,204,21,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6, -Math.PI / 2, -Math.PI / 2 + (player.lootingProgressMs / 2000) * Math.PI * 2);
      ctx.stroke();
    }

    if (debug.showTargetPlayerId) {
      ctx.fillStyle = bodyColor.fill;
      ctx.font = "10px monospace";
      ctx.fillText(player.id, player.x - player.radius, player.y - player.radius - 4);
    }
  }

  // Mlha války — sjednocená viditelnost VŠECH živých hráčů (viz
  // drawFogOfWar výše), stejná destination-out + blur technika jako
  // EmergencyMiniGame.tsx#draw. Vypnutelná přes debug.showPlayerCone (dev
  // overlay v ostré minihře taky ruší mlhu).
  if (!debug.showPlayerCone) {
    drawFogOfWar(ctx, state, state.players);
  }

  ctx.restore();

  // HUD — mimo scale/translate, pevné pixely.
  ctx.fillStyle = "#6fe3a0";
  ctx.font = "12px monospace";
  ctx.fillText(`status: ${state.status} · t=${(state.elapsedMs / 1000).toFixed(1)}s`, 8, 16);
  const primary = state.players[0];
  if (primary) {
    ctx.fillText(`ammo: ${primary.ammo}  items: ${primary.collectedItemIds.length}`, 8, 32);
  }
}

/** Čistá pomocná funkce pro HUD/debug — je bod v dosahu hráčova vidění (peripheral/directional/blocked/out_of_range)? Přímé použití getPlayerVisibilityAtPoint (importovaná), žádná duplikace. */
export { getPlayerVisibilityAtPoint };
