// Skutečná mapa skladového patra (SERVICE_FLOOR_STORAGE) — IMPORTOVANÁ přímo
// z game/minigame/layouts/serviceFloorStorage.ts, ne zkopírovaná. Je to čistá
// datová definice mimo produkční komponentu (game/minigame/layouts/*), takže
// import beze změny je bezpečný a zaručuje nulový drift oproti ostré minihře
// — přesně stejné rozměry, zdi, průchody i pickup sloty, viz README.md.
// `MiniGameLayoutWall` je strukturální nadmnožina `Wall` (x/y/width/height),
// takže `layout.walls` jde použít přímo v `moveWithWallSliding`/
// `hasLineOfSight`/`castVisionCone` beze změny.

import { SERVICE_FLOOR_STORAGE } from "../../minigame/layouts/serviceFloorStorage";
import { MiniGameItemId } from "../../minigame/types";
import { MultiplayerSurvivalMap, PickupState } from "../state/types";

export const PROTOTYPE_MAP: MultiplayerSurvivalMap = {
  id: SERVICE_FLOOR_STORAGE.id,
  width: SERVICE_FLOOR_STORAGE.world.width,
  height: SERVICE_FLOOR_STORAGE.world.height,
  walls: SERVICE_FLOOR_STORAGE.walls,
  rooms: SERVICE_FLOOR_STORAGE.rooms.map((room) => ({ id: room.id, name: room.name, bounds: room.bounds })),
};

const ITEM_TAGS: MiniGameItemId[] = ["battery", "bulb", "fuse", "shotgun", "ammo", "toolbox", "key", "empty"];

function isItemTag(tag: string): tag is MiniGameItemId {
  return (ITEM_TAGS as string[]).includes(tag);
}

/** Všechny sloty s alespoň jedním item tagem (battery/bulb/fuse/shotgun/ammo/toolbox) — stejné pickupy jako na ostré výpravě po týhle mapě, jen VŠECHNY najednou (žádný náhodný výběr podle mise/seed jako layoutPlacement.ts). */
export const PROTOTYPE_PICKUPS: PickupState[] = SERVICE_FLOOR_STORAGE.slots
  .filter((slot) => slot.tags.some(isItemTag))
  .map((slot) => ({
    id: slot.id,
    itemId: slot.tags.find(isItemTag) as MiniGameItemId,
    x: slot.x,
    y: slot.y,
    collected: false,
  }));

export const PROTOTYPE_PLAYER_SPAWNS: Array<{ x: number; y: number }> = SERVICE_FLOOR_STORAGE.slots
  .filter((slot) => slot.tags.includes("player_start"))
  .map((slot) => ({ x: slot.x, y: slot.y }));

export const PROTOTYPE_MONSTER_SPAWNS: Array<{ x: number; y: number }> = SERVICE_FLOOR_STORAGE.slots
  .filter((slot) => slot.tags.includes("monster_spawn"))
  .map((slot) => ({ x: slot.x, y: slot.y }));
