// Tenký multiplayer wrapper okolo updateEnemyAi (game/minigame/logic.ts,
// IMPORTOVANÁ přímo, ne kopírovaná — je to čistá funkce nad `Enemy`/`Wall`
// typy beze změny). updateEnemyAi umí jen jednoho hráče jako cíl; tenhle
// soubor jen vybere nejbližšího živého hráče a zavolá ji per-monster —
// žádná nová AI logika, jen multi-entity smyčka nad existující funkcí.

import { castVisionCone, distance, updateEnemyAi } from "../../minigame/logic";
import { Vec2 } from "../../minigame/types";
import { MonsterState, PlayerState, Wall } from "../state/types";
import { MULTIPLAYER_SURVIVAL_AI_CONFIG } from "../engine/config";

function findNearestAlivePlayer(monster: MonsterState, players: PlayerState[]): PlayerState | null {
  const alivePlayers = players.filter((player) => player.alive);
  if (alivePlayers.length === 0) return null;
  return alivePlayers.reduce((nearest, player) =>
    distance(monster.x, monster.y, player.x, player.y) < distance(monster.x, monster.y, nearest.x, nearest.y) ? player : nearest,
  );
}

/**
 * Jeden tik AI jednoho monstra — beze změny stavu, pokud není žádný živý
 * hráč (monstrum jen zůstane stát, `updateEnemyAi` se vůbec nezavolá).
 * `targetPlayerId` (viz state/types.ts) se nastaví jen v módu `"chasing"` —
 * čistě pro debug overlay, sama AI ho nepotřebuje.
 */
export function tickMonsterAi(monster: MonsterState, players: PlayerState[], walls: Wall[], deltaMs: number, rng?: () => number): MonsterState {
  const target = findNearestAlivePlayer(monster, players);
  if (!target) return monster;

  const updated = updateEnemyAi({
    enemy: monster,
    player: { x: target.x, y: target.y },
    walls,
    deltaMs,
    config: MULTIPLAYER_SURVIVAL_AI_CONFIG,
    rng,
  });

  return { ...updated, id: monster.id, targetPlayerId: updated.mode === "chasing" ? target.id : null };
}

/**
 * Kruhová výseč monstrova vidění jako polygon bodů, pro vykreslení v
 * rendering/renderCanvas.ts — sdílí stejný raycasting primitiv
 * (`castVisionCone`) jako produkční EmergencyMiniGame.tsx, jen jinak
 * zabalený (žádný canvas kód tady).
 */
export function computeMonsterVisionConePolygon(monster: MonsterState, walls: Wall[]): Vec2[] {
  return castVisionCone({
    originX: monster.x,
    originY: monster.y,
    facingAngle: monster.visionAngle,
    coneAngleRad: MULTIPLAYER_SURVIVAL_AI_CONFIG.visionAngleRad,
    range: MULTIPLAYER_SURVIVAL_AI_CONFIG.visionRange,
    walls,
    rayCount: 31,
    stepPx: 6,
  });
}
