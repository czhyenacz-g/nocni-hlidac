import { clamp, distance } from "./logic";
import { EnemyMode, OfficeThreatOnReturn, Vec2, Wall } from "./types";

// Vyhodnotí, jestli se má "hrozba" z minihry přenést zpět do hlavní hry při
// úspěšném návratu (viz zadání "donesl jsem baterii, ale přivedl jsem si to
// za sebou") — čistá funkce, žádný React/GameState, jen minihra vlastní
// pojmy (Enemy mode/pozice, Vec2, Wall). Hlavní hra (app/play/page.tsx) z
// výsledku přečte jen `intensity` a přeloží ho na vlastní GameAction — tenhle
// soubor o hlavní hře nic neví a nesmí (stejná nezávislost jako zbytek
// game/minigame/*).

export interface EvaluateOfficeThreatInput {
  enemyMode: EnemyMode;
  enemyPosition: Vec2;
  playerPosition: Vec2;
  /** Bounds místnosti "office" (viz layoutPlacement.ts#getRoomBoundsForSlot) — hrozba "blízko kanceláře" se počítá vůči tomuhle obdélníku, ne pevnému bodu. */
  officeZone: Wall;
  /** Dosah (px), pod kterým se monstrum počítá jako "blízko hráče". */
  nearPlayerRadiusPx: number;
  /** Dosah (px) od officeZone, pod kterým se monstrum počítá jako "blízko kanceláře". */
  nearOfficeRadiusPx: number;
}

/** Vzdálenost bodu od nejbližšího bodu obdélníku — 0, pokud bod leží uvnitř (stejný "closest point" vzor jako circleIntersectsWall v logic.ts). */
function distanceToRect(point: Vec2, rect: Wall): number {
  const closestX = clamp(point.x, rect.x, rect.x + rect.width);
  const closestY = clamp(point.y, rect.y, rect.y + rect.height);
  return distance(point.x, point.y, closestX, closestY);
}

/**
 * `undefined` = žádná hrozba (monstrum nehonilo, nebylo blízko hráče ani
 * kanceláře) — hlavní hra pak nic nedělá. Priorita důvodu (pro čitelnost
 * DebugPanel/reportu, ne pro gameplay): honička > blízko kanceláře > blízko
 * hráče. Intenzita: honička ZÁROVEŇ blízko kanceláře = "high" (monstrum už
 * je prakticky u dveří), jen jedno z toho = "medium", jen blízkost hráči
 * (bez honičky, bez blízkosti kanceláři) = "low".
 */
export function evaluateOfficeThreatOnReturn(input: EvaluateOfficeThreatInput): OfficeThreatOnReturn | undefined {
  const { enemyMode, enemyPosition, playerPosition, officeZone, nearPlayerRadiusPx, nearOfficeRadiusPx } = input;

  const isChasing = enemyMode === "chasing";
  const isNearPlayer = distance(enemyPosition.x, enemyPosition.y, playerPosition.x, playerPosition.y) <= nearPlayerRadiusPx;
  const isNearOffice = distanceToRect(enemyPosition, officeZone) <= nearOfficeRadiusPx;

  if (!isChasing && !isNearPlayer && !isNearOffice) return undefined;

  const reason = isChasing ? "monster_chasing" : isNearOffice ? "monster_near_office" : "monster_near_player";
  const intensity = isChasing && isNearOffice ? "high" : isChasing || isNearOffice ? "medium" : "low";

  return { active: true, reason, intensity };
}
