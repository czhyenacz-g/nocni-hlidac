import { MiniGameLayout, MiniGameLayoutWall } from "./layoutTypes";

// Validace datově definované mapy (viz layoutTypes.ts) — čistá funkce, žádné
// side-efekty. Volá se v testech (viz layoutValidation.test.ts) nad KAŽDÝM
// layoutem v game/minigame/layouts/index.ts, ať nový/upravený layout nejde
// omylem nechat rozbitý (chybějící slot, kolidující obdélník, duplicitní id).

export interface MiniGameLayoutValidationResult {
  ok: boolean;
  errors: string[];
}

function pointInWall(px: number, py: number, wall: MiniGameLayoutWall): boolean {
  return px >= wall.x && px <= wall.x + wall.width && py >= wall.y && py <= wall.y + wall.height;
}

/**
 * Minimální strukturální validace (viz zadání) — id/name, kladné rozměry
 * světa, unikátní id místností/zdí/slotů, sloty odkazující na existující
 * roomId, sloty/zdi uvnitř world bounds, sloty ne uvnitř zdi/překážky, a
 * povinná přítomnost aspoň jednoho player_start/player_exit/monster_spawn
 * slotu. NEOVĚŘUJE dosažitelnost start → objective → exit (pathfinding) —
 * záměrně ponecháno jako TODO (viz zadání "pokud je to moc velký zásah,
 * zapiš jako TODO"), tahle validace je čistě strukturální/geometrická.
 */
export function validateMiniGameLayout(layout: MiniGameLayout): MiniGameLayoutValidationResult {
  const errors: string[] = [];

  if (!layout.id) errors.push("layout.id is missing");
  if (!layout.name) errors.push("layout.name is missing");
  if (!(layout.world.width > 0)) errors.push("layout.world.width must be > 0");
  if (!(layout.world.height > 0)) errors.push("layout.world.height must be > 0");

  const roomIds = new Set<string>();
  for (const room of layout.rooms) {
    if (roomIds.has(room.id)) errors.push(`duplicate room id: "${room.id}"`);
    roomIds.add(room.id);
  }

  const wallIds = new Set<string>();
  for (const wall of layout.walls) {
    if (wallIds.has(wall.id)) errors.push(`duplicate wall id: "${wall.id}"`);
    wallIds.add(wall.id);

    if (
      wall.x < 0 ||
      wall.y < 0 ||
      wall.x + wall.width > layout.world.width ||
      wall.y + wall.height > layout.world.height
    ) {
      errors.push(`wall "${wall.id}" lies outside world bounds`);
    }
  }

  const slotIds = new Set<string>();
  for (const slot of layout.slots) {
    if (slotIds.has(slot.id)) errors.push(`duplicate slot id: "${slot.id}"`);
    slotIds.add(slot.id);

    if (!roomIds.has(slot.roomId)) {
      errors.push(`slot "${slot.id}" references unknown roomId "${slot.roomId}"`);
    }

    if (slot.x < 0 || slot.x > layout.world.width || slot.y < 0 || slot.y > layout.world.height) {
      errors.push(`slot "${slot.id}" lies outside world bounds`);
    }

    for (const wall of layout.walls) {
      if (pointInWall(slot.x, slot.y, wall)) {
        errors.push(`slot "${slot.id}" lies inside wall/obstacle "${wall.id}"`);
      }
    }
  }

  if (!layout.slots.some((slot) => slot.tags.includes("player_start"))) {
    errors.push("layout has no player_start slot");
  }
  if (!layout.slots.some((slot) => slot.tags.includes("player_exit"))) {
    errors.push("layout has no player_exit slot");
  }
  if (!layout.slots.some((slot) => slot.tags.includes("monster_spawn"))) {
    errors.push("layout has no monster_spawn slot");
  }

  return { ok: errors.length === 0, errors };
}
