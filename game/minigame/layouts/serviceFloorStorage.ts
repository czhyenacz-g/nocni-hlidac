import { MiniGameLayout } from "../layoutTypes";

// První komplexnější servisně-skladová mapa (viz zadání "evakuační plán /
// půdorys budovy") — 8 místností kolem centrální vertikální chodby, dvojice
// zdí s mezerou (dveřní otvor) na každé sdílené hranici mezi místnostmi (ne
// jedna dlouhá zeď), regálové/strojní překážky uvnitř místností pro
// stealth/obcházení, dva sloupy přímo v centrální chodbě, ať není jedna
// přímá průhledná čára od shora dolů. Svět 1400×900 (větší a komplexnější
// než service_floor_alpha, viz config.ts#computeMiniGameWorldScale — canvas
// se dopočítá menším měřítkem, ne zvlášť nastavovaným natvrdo).
//
// Topologie (levý sloupec / centrální chodba / pravý sloupec, shora dolů):
//   STORAGE A         | CENTRAL          | TECHNICAL ROOM
//   UTILITY ROOM      | CORRIDOR         | SERVICE ACCESS
//   STORAGE B         | (spine, 0-820)   | MAINTENANCE / WORKSHOP
//                      OFFICE (pod chodbou)
//
// Aspoň dvě alternativní trasy mezi klíčovými zónami: levý/pravý sloupec má
// vlastní vnitřní průchody nahoru/dolů (např. STORAGE A -> UTILITY ROOM ->
// STORAGE B) NEZÁVISLE na centrální chodbě, takže obejít monstrum v chodbě
// jde i bokem přes vlastní sloupec.
export const SERVICE_FLOOR_STORAGE: MiniGameLayout = {
  id: "service_floor_storage",
  name: "Skladové patro — servisní trakt",
  description:
    "Komplexnější servisně-skladová mapa: sklady, technické zázemí, centrální chodba, service/loading přístup pro monstrum, víc tras a slepých větví.",
  world: { width: 1400, height: 900 },
  rooms: [
    { id: "storage_a", name: "Sklad A", kind: "storage", bounds: { x: 0, y: 0, width: 560, height: 260 } },
    { id: "technical_room", name: "Technická místnost", kind: "technical", bounds: { x: 840, y: 0, width: 560, height: 260 } },
    { id: "utility_room", name: "Údržbářská místnost", kind: "utility", bounds: { x: 0, y: 260, width: 560, height: 300 } },
    {
      id: "central_corridor",
      name: "Centrální chodba",
      kind: "corridor",
      bounds: { x: 560, y: 0, width: 280, height: 820 },
    },
    { id: "service_access", name: "Servisní/nakládací vstup", kind: "loading", bounds: { x: 840, y: 260, width: 560, height: 300 } },
    { id: "storage_b", name: "Sklad B", kind: "storage", bounds: { x: 0, y: 560, width: 560, height: 260 } },
    { id: "maintenance", name: "Dílna / údržba", kind: "maintenance", bounds: { x: 840, y: 560, width: 560, height: 260 } },
    { id: "office", name: "Kancelář", kind: "office", bounds: { x: 560, y: 820, width: 280, height: 80 } },
  ],
  walls: [
    // Sklad A <-> centrální chodba (mezera/dveře uprostřed sdílené hranice).
    { id: "wall_a1", x: 550, y: 0, width: 20, height: 70, kind: "wall" },
    { id: "wall_a2", x: 550, y: 190, width: 20, height: 70, kind: "wall" },
    // Centrální chodba <-> technická místnost.
    { id: "wall_b1", x: 830, y: 0, width: 20, height: 70, kind: "wall" },
    { id: "wall_b2", x: 830, y: 190, width: 20, height: 70, kind: "wall" },
    // Sklad A <-> údržbářská místnost (vlastní vnitřní průchod, nezávislý na centrální chodbě).
    { id: "wall_c1", x: 0, y: 250, width: 220, height: 20, kind: "wall" },
    { id: "wall_c2", x: 340, y: 250, width: 220, height: 20, kind: "wall" },
    // Technická místnost <-> servisní/nakládací vstup.
    { id: "wall_d1", x: 840, y: 250, width: 220, height: 20, kind: "wall" },
    { id: "wall_d2", x: 1180, y: 250, width: 220, height: 20, kind: "wall" },
    // Údržbářská místnost <-> centrální chodba.
    { id: "wall_e1", x: 550, y: 260, width: 20, height: 90, kind: "wall" },
    { id: "wall_e2", x: 550, y: 470, width: 20, height: 90, kind: "wall" },
    // Centrální chodba <-> servisní/nakládací vstup.
    { id: "wall_f1", x: 830, y: 260, width: 20, height: 90, kind: "wall" },
    { id: "wall_f2", x: 830, y: 470, width: 20, height: 90, kind: "wall" },
    // Údržbářská místnost <-> sklad B (další nezávislý vnitřní průchod).
    { id: "wall_g1", x: 0, y: 550, width: 220, height: 20, kind: "wall" },
    { id: "wall_g2", x: 340, y: 550, width: 220, height: 20, kind: "wall" },
    // Servisní/nakládací vstup <-> dílna/údržba.
    { id: "wall_h1", x: 840, y: 550, width: 220, height: 20, kind: "wall" },
    { id: "wall_h2", x: 1180, y: 550, width: 220, height: 20, kind: "wall" },
    // Sklad B <-> centrální chodba.
    { id: "wall_i1", x: 550, y: 560, width: 20, height: 70, kind: "wall" },
    { id: "wall_i2", x: 550, y: 750, width: 20, height: 70, kind: "wall" },
    // Centrální chodba <-> dílna/údržba.
    { id: "wall_j1", x: 830, y: 560, width: 20, height: 70, kind: "wall" },
    { id: "wall_j2", x: 830, y: 750, width: 20, height: 70, kind: "wall" },
    // Centrální chodba <-> kancelář (úzký vchod na konci chodby).
    { id: "wall_k1", x: 560, y: 810, width: 80, height: 20, kind: "wall" },
    { id: "wall_k2", x: 760, y: 810, width: 80, height: 20, kind: "wall" },

    // Regály/stroje/překážky uvnitř místností — stealth kryty, ať nejsou
    // místnosti prázdné otevřené arény (viz zadání "line of sight / stealth").
    { id: "shelf_a1", x: 60, y: 60, width: 200, height: 40, kind: "shelf" },
    { id: "shelf_a2", x: 300, y: 150, width: 200, height: 40, kind: "shelf" },
    { id: "machine_tech1", x: 950, y: 60, width: 150, height: 50, kind: "machine" },
    { id: "machine_tech2", x: 1150, y: 150, width: 150, height: 40, kind: "machine" },
    { id: "machine_util", x: 150, y: 350, width: 180, height: 50, kind: "machine" },
    { id: "obstacle_service", x: 950, y: 320, width: 150, height: 50, kind: "obstacle" },
    { id: "shelf_b1", x: 60, y: 600, width: 200, height: 40, kind: "shelf" },
    { id: "shelf_b2", x: 300, y: 700, width: 200, height: 40, kind: "shelf" },
    { id: "obstacle_maint1", x: 1000, y: 620, width: 150, height: 40, kind: "obstacle" },
    { id: "shelf_maint", x: 1150, y: 700, width: 150, height: 40, kind: "shelf" },
    // Dva sloupy přímo v centrální chodbě — láme přímou průhlednou čáru shora dolů.
    { id: "pillar_1", x: 650, y: 380, width: 40, height: 40, kind: "obstacle" },
    { id: "pillar_2", x: 700, y: 600, width: 40, height: 40, kind: "obstacle" },
  ],
  slots: [
    { id: "office_start_01", roomId: "office", x: 700, y: 860, tags: ["player_start"], debugName: "Start (kancelář)" },
    { id: "office_exit_01", roomId: "office", x: 680, y: 860, tags: ["player_exit"], debugName: "Návrat (kancelář)" },

    // Monster spawn — service/loading access, service entrance, dark corridor (viz zadání).
    {
      id: "monster_spawn_loading_01",
      roomId: "service_access",
      x: 1300,
      y: 400,
      tags: ["monster_spawn"],
      debugName: "Spawn — nakládací přístup",
    },
    {
      id: "monster_spawn_service_01",
      roomId: "maintenance",
      x: 1320,
      y: 780,
      tags: ["monster_spawn"],
      debugName: "Spawn — servisní vstup",
    },
    {
      id: "monster_spawn_dark_corridor_01",
      roomId: "central_corridor",
      x: 700,
      y: 500,
      tags: ["monster_spawn"],
      debugName: "Spawn — temná chodba",
    },

    { id: "battery_storage_01", roomId: "storage_a", x: 150, y: 120, tags: ["battery"], debugName: "Baterie — sklad A" },
    { id: "battery_technical_01", roomId: "technical_room", x: 1050, y: 140, tags: ["battery"], debugName: "Baterie — technická místnost" },
    { id: "battery_maintenance_01", roomId: "maintenance", x: 1100, y: 690, tags: ["battery"], debugName: "Baterie — dílna" },

    { id: "bulb_storage_01", roomId: "storage_b", x: 150, y: 650, tags: ["bulb"], debugName: "Žárovka — sklad B" },
    { id: "bulb_utility_01", roomId: "utility_room", x: 250, y: 450, tags: ["bulb"], debugName: "Žárovka — údržbářská místnost" },

    { id: "fuse_technical_01", roomId: "technical_room", x: 1200, y: 200, tags: ["fuse"], debugName: "Pojistka — technická místnost" },
    { id: "fuse_service_01", roomId: "service_access", x: 1200, y: 350, tags: ["fuse"], debugName: "Pojistka — servisní vstup" },

    { id: "shotgun_maintenance_01", roomId: "maintenance", x: 1250, y: 750, tags: ["shotgun"], debugName: "Brokovnice — dílna" },

    { id: "ammo_storage_01", roomId: "storage_a", x: 450, y: 200, tags: ["ammo"], debugName: "Náboje — sklad A" },
    { id: "ammo_workshop_01", roomId: "maintenance", x: 1000, y: 780, tags: ["ammo"], debugName: "Náboje — dílna" },

    { id: "toolbox_maintenance_01", roomId: "maintenance", x: 900, y: 650, tags: ["toolbox"], debugName: "Nářadí — dílna" },

    { id: "generic_loot_storage_01", roomId: "storage_b", x: 450, y: 750, tags: ["generic_loot"], debugName: "Obecný loot — sklad B" },
    {
      id: "generic_loot_utility_01",
      roomId: "utility_room",
      x: 100,
      y: 500,
      tags: ["generic_loot"],
      debugName: "Obecný loot — údržbářská místnost",
    },
  ],
};
