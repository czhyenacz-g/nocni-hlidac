import { MiniGameLayout } from "../layoutTypes";

// Kompatibilní baseline layout — datový převod PŮVODNÍ (natvrdo v config.ts
// zadrátované) mapy prototypu, beze změny hratelnosti/geometrie. Čísla níže
// (zdi, start/exit/item pozice) odpovídají 1:1 dřívějším WALLS/EXIT_ZONE/
// ITEM_SPAWN_POSITION hodnotám z config.ts (WORLD_WIDTH=1000, WORLD_HEIGHT=650,
// tj. CANVAS_WIDTH/HEIGHT 800×520 škálované MINIGAME_WORLD_SCALE=0.8) — viz
// game/minigame/config.ts, které teď tyhle konstanty odvozuje odsud, ne
// obráceně. Jediný item slot nese VŠECHNY item tagy (battery/bulb/fuse/...),
// stejně jako dřív jeden pevný ITEM_SPAWN_POSITION sloužil pro libovolný
// itemToCollect bez ohledu na typ.
export const SERVICE_FLOOR_ALPHA: MiniGameLayout = {
  id: "service_floor_alpha",
  name: "Servisní patro Alfa",
  description: "Základní, jednoduchá mapa — kompatibilní převod původního prototypu nouzové obchůzky.",
  world: { width: 1000, height: 650 },
  rooms: [
    { id: "office", name: "Kancelář", kind: "office", bounds: { x: 425, y: 512.5, width: 120, height: 90 } },
    { id: "hub", name: "Hala", kind: "corridor", bounds: { x: 0, y: 0, width: 1000, height: 650 } },
  ],
  walls: [
    { id: "wall_01", x: 325, y: 0, width: 24, height: 287.5, kind: "wall" },
    { id: "wall_02", x: 325, y: 375, width: 24, height: 275, kind: "wall" },
    { id: "wall_03", x: 650, y: 175, width: 250, height: 24, kind: "wall" },
    { id: "wall_04", x: 150, y: 475, width: 200, height: 24, kind: "wall" },
    { id: "wall_05", x: 750, y: 400, width: 24, height: 200, kind: "wall" },
  ],
  slots: [
    { id: "office_start_01", roomId: "office", x: 500, y: 575, tags: ["player_start"], debugName: "Start (kancelář)" },
    { id: "office_exit_01", roomId: "office", x: 485, y: 557.5, tags: ["player_exit"], debugName: "Návrat (kancelář)" },
    { id: "monster_spawn_hub_01", roomId: "hub", x: 500, y: 75, tags: ["monster_spawn"], debugName: "Spawn monstra (hala)" },
    {
      id: "item_generic_01",
      roomId: "hub",
      x: 187.5,
      y: 575,
      tags: ["battery", "bulb", "fuse", "shotgun", "ammo", "key", "toolbox", "generic_loot"],
      debugName: "Obecný spawn itemu",
    },
  ],
};
