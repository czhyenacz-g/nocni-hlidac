import { MiniGameLayout } from "../layoutTypes";

// Druhý, výrazně komplexnější servisně-skladový layout (viz zadání
// "evakuační plán / půdorys budovy") — 10 místností v pravidelné 3-sloupcové
// mřížce (levý sklad. trakt / centrální sloupec / pravý technický trakt),
// world 1500×950. Na rozdíl od service_floor_storage.ts (kde je KAŽDÁ
// sdílená hranice dveřní mezera) tenhle layout záměrně kombinuje úzké dveře
// (chokepointy) s pár zcela otevřenými hranicemi (levý/pravý vertikální
// bypass + otevřená nakládací zóna nahoře) — víc odlišných tras, ne jen
// jednotný vzorec.
//
// Topologie (sloupce x:0-600 / 600-900 / 900-1500, řádky shora dolů):
//
//   LOADING ACCESS (celá šířka nahoře — otevřená manipulační zóna, monster spawn)
//   ------------[D]---------------[E]-----------
//   STORAGE A   | CENTRAL         | TECHNICAL ROOM
//   ------------(open)------------(open)---------
//   UTILITY ROOM| CORRIDOR        | SERVICE CORRIDOR
//   ------------[K]---------------------------- (open) --
//   STORAGE B   | LOWER CORRIDOR  | MAINTENANCE WORKSHOP
//               ------[O]------
//                  OFFICE
//
// [X] = úzké dveře/chokepoint, (open) = plně otevřená hranice (žádná zeď).
// Aspoň 3 alternativní trasy mezi levým a pravým traktem:
//   1. přes LOADING ACCESS nahoře (dveře do storage_a i technical_room)
//   2. přes CENTRAL CORRIDOR uprostřed (dveře na obě strany)
//   3. oklikou dole: STORAGE A -> (open) UTILITY ROOM -> (open) STORAGE B ->
//      [dveře] LOWER CORRIDOR -> [dveře] MAINTENANCE WORKSHOP -> (open)
//      SERVICE CORRIDOR -> (open) TECHNICAL ROOM
export const SERVICE_FLOOR_EVAC_PLAN: MiniGameLayout = {
  id: "service_floor_evac_plan",
  name: "Servisní patro — evakuační plán",
  description:
    "Nejkomplexnější servisně-skladová mapa: 10 místností ve 3 sloupcích, kombinace úzkých dveří a otevřených vertikálních obchvatů, otevřená nakládací zóna nahoře jako monster spawn.",
  world: { width: 1500, height: 950 },
  rooms: [
    { id: "loading_access", name: "Nakládací/servisní vstup", kind: "loading", bounds: { x: 0, y: 0, width: 1500, height: 200 } },
    { id: "storage_a", name: "Sklad A", kind: "storage", bounds: { x: 0, y: 200, width: 600, height: 280 } },
    { id: "central_corridor", name: "Centrální chodba", kind: "corridor", bounds: { x: 600, y: 200, width: 300, height: 480 } },
    { id: "technical_room", name: "Technická místnost / rozvodna", kind: "technical", bounds: { x: 900, y: 200, width: 600, height: 280 } },
    { id: "utility_room", name: "Údržbářská místnost", kind: "utility", bounds: { x: 0, y: 480, width: 600, height: 200 } },
    { id: "service_corridor", name: "Servisní chodba", kind: "service", bounds: { x: 900, y: 480, width: 600, height: 200 } },
    { id: "storage_b", name: "Sklad B / zásoby", kind: "storage", bounds: { x: 0, y: 680, width: 600, height: 270 } },
    { id: "lower_corridor", name: "Spodní chodba", kind: "corridor", bounds: { x: 600, y: 680, width: 300, height: 180 } },
    { id: "maintenance_workshop", name: "Údržba / dílna", kind: "maintenance", bounds: { x: 900, y: 680, width: 600, height: 270 } },
    { id: "office", name: "Kancelář", kind: "office", bounds: { x: 600, y: 860, width: 300, height: 90 } },
  ],
  walls: [
    // Obvodové zdi (viz zadání) — tenké, jen ať jsou vidět/kolizní explicitně,
    // navrch nad clampem pohybu na hranice světa.
    { id: "perimeter_top", x: 0, y: 0, width: 1500, height: 15, kind: "wall" },
    { id: "perimeter_bottom", x: 0, y: 935, width: 1500, height: 15, kind: "wall" },
    { id: "perimeter_left", x: 0, y: 0, width: 15, height: 950, kind: "wall" },
    { id: "perimeter_right", x: 1485, y: 0, width: 15, height: 950, kind: "wall" },

    // Loading access <-> storage_a / technical_room — úzké dveře (chokepointy).
    { id: "wall_a1", x: 0, y: 190, width: 230, height: 20, kind: "wall" },
    { id: "wall_a2", x: 370, y: 190, width: 230, height: 20, kind: "wall" },
    { id: "wall_c1", x: 900, y: 190, width: 230, height: 20, kind: "wall" },
    { id: "wall_c2", x: 1270, y: 190, width: 230, height: 20, kind: "wall" },
    // Loading access <-> central_corridor je záměrně BEZ zdi (plně otevřená
    // hranice) — nahoře je to jedna souvislá otevřenější manipulační zóna.

    // Storage_a <-> central_corridor, central_corridor <-> technical_room — dveře.
    { id: "wall_d1", x: 590, y: 200, width: 20, height: 80, kind: "wall" },
    { id: "wall_d2", x: 590, y: 400, width: 20, height: 80, kind: "wall" },
    { id: "wall_e1", x: 890, y: 200, width: 20, height: 80, kind: "wall" },
    { id: "wall_e2", x: 890, y: 400, width: 20, height: 80, kind: "wall" },
    // Storage_a <-> utility_room je BEZ zdi — vlastní vertikální obchvat
    // levého traktu, nezávislý na centrální chodbě (viz topologie výše).

    // Central_corridor <-> utility_room, central_corridor <-> service_corridor — dveře.
    { id: "wall_g1", x: 590, y: 480, width: 20, height: 50, kind: "wall" },
    { id: "wall_g2", x: 590, y: 630, width: 20, height: 50, kind: "wall" },
    { id: "wall_h1", x: 890, y: 480, width: 20, height: 50, kind: "wall" },
    { id: "wall_h2", x: 890, y: 630, width: 20, height: 50, kind: "wall" },
    // Technical_room <-> service_corridor je BEZ zdi — vertikální obchvat
    // pravého traktu (zrcadlově k levému).

    // Central_corridor <-> lower_corridor — dveře (chokepoint před kanceláří).
    { id: "wall_k1", x: 600, y: 670, width: 90, height: 20, kind: "wall" },
    { id: "wall_k2", x: 810, y: 670, width: 90, height: 20, kind: "wall" },

    // Storage_b <-> lower_corridor, lower_corridor <-> maintenance_workshop — dveře.
    { id: "wall_m1", x: 590, y: 680, width: 20, height: 40, kind: "wall" },
    { id: "wall_m2", x: 590, y: 820, width: 20, height: 40, kind: "wall" },
    { id: "wall_n1", x: 890, y: 680, width: 20, height: 40, kind: "wall" },
    { id: "wall_n2", x: 890, y: 820, width: 20, height: 40, kind: "wall" },
    // Utility_room <-> storage_b a service_corridor <-> maintenance_workshop
    // jsou BEZ zdi — pokračování obou vertikálních obchvatů až úplně dolů.

    // Lower_corridor <-> office — úzký vchod do kanceláře.
    { id: "wall_o1", x: 600, y: 850, width: 90, height: 20, kind: "wall" },
    { id: "wall_o2", x: 810, y: 850, width: 90, height: 20, kind: "wall" },

    // Regály/stroje/překážky uvnitř místností — lámou line of sight (viz zadání).
    { id: "shelf_a1", x: 60, y: 240, width: 220, height: 40, kind: "shelf" },
    { id: "shelf_a2", x: 320, y: 340, width: 220, height: 40, kind: "shelf" },
    { id: "pillar_1", x: 700, y: 280, width: 40, height: 40, kind: "obstacle" },
    { id: "pillar_2", x: 750, y: 500, width: 40, height: 40, kind: "obstacle" },
    { id: "machine_tech1", x: 1000, y: 240, width: 180, height: 50, kind: "machine" },
    { id: "machine_tech2", x: 1250, y: 340, width: 180, height: 40, kind: "machine" },
    { id: "machine_util", x: 150, y: 540, width: 200, height: 50, kind: "machine" },
    { id: "obstacle_service", x: 1050, y: 540, width: 180, height: 50, kind: "obstacle" },
    { id: "shelf_b1", x: 60, y: 720, width: 220, height: 40, kind: "shelf" },
    { id: "shelf_b2", x: 320, y: 820, width: 220, height: 40, kind: "shelf" },
    { id: "worktable_1", x: 1000, y: 720, width: 180, height: 40, kind: "obstacle" },
    { id: "worktable_2", x: 1200, y: 830, width: 180, height: 40, kind: "obstacle" },
    { id: "crate_loading", x: 700, y: 60, width: 120, height: 40, kind: "obstacle" },
  ],
  slots: [
    { id: "office_start_01", roomId: "office", x: 750, y: 905, tags: ["player_start"], debugName: "Start (kancelář)" },
    { id: "office_exit_01", roomId: "office", x: 780, y: 905, tags: ["player_exit"], debugName: "Návrat (kancelář)" },

    {
      id: "monster_spawn_loading_01",
      roomId: "loading_access",
      x: 1400,
      y: 100,
      tags: ["monster_spawn"],
      debugName: "Spawn — nakládací/servisní vstup",
    },
    {
      id: "monster_spawn_service_01",
      roomId: "service_corridor",
      x: 1400,
      y: 600,
      tags: ["monster_spawn"],
      debugName: "Spawn — servisní chodba",
    },
    {
      id: "monster_spawn_dark_corridor_01",
      roomId: "central_corridor",
      x: 750,
      y: 420,
      tags: ["monster_spawn"],
      debugName: "Spawn — temná centrální chodba",
    },

    { id: "battery_storage_a_01", roomId: "storage_a", x: 450, y: 240, tags: ["battery"], debugName: "Baterie — sklad A" },
    { id: "battery_technical_01", roomId: "technical_room", x: 1050, y: 350, tags: ["battery"], debugName: "Baterie — rozvodna" },
    { id: "battery_maintenance_01", roomId: "maintenance_workshop", x: 1300, y: 700, tags: ["battery"], debugName: "Baterie — dílna" },

    { id: "bulb_storage_b_01", roomId: "storage_b", x: 450, y: 900, tags: ["bulb"], debugName: "Žárovka — sklad B" },
    { id: "bulb_utility_01", roomId: "utility_room", x: 450, y: 550, tags: ["bulb"], debugName: "Žárovka — údržbářská místnost" },

    { id: "fuse_technical_01", roomId: "technical_room", x: 1350, y: 250, tags: ["fuse"], debugName: "Pojistka — rozvodna" },
    { id: "fuse_service_01", roomId: "service_corridor", x: 1400, y: 550, tags: ["fuse"], debugName: "Pojistka — servisní chodba" },

    { id: "shotgun_maintenance_01", roomId: "maintenance_workshop", x: 1400, y: 780, tags: ["shotgun"], debugName: "Brokovnice — dílna" },

    { id: "ammo_storage_a_01", roomId: "storage_a", x: 150, y: 420, tags: ["ammo"], debugName: "Náboje — sklad A" },
    { id: "ammo_workshop_01", roomId: "maintenance_workshop", x: 1000, y: 900, tags: ["ammo"], debugName: "Náboje — dílna" },

    { id: "toolbox_maintenance_01", roomId: "maintenance_workshop", x: 1150, y: 900, tags: ["toolbox"], debugName: "Nářadí — dílna" },

    { id: "generic_loot_storage_01", roomId: "storage_b", x: 150, y: 850, tags: ["generic_loot"], debugName: "Obecný loot — sklad B" },
    {
      id: "generic_loot_utility_01",
      roomId: "utility_room",
      x: 100,
      y: 650,
      tags: ["generic_loot"],
      debugName: "Obecný loot — údržbářská místnost",
    },
  ],
};
