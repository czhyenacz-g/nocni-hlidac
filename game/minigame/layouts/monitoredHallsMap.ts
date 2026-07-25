import { MiniGameLayout } from "../layoutTypes";

// Mapa pro "údržbu kamer" — druhý výjezd z kanceláře (viz zadání "druhý
// výjezd — údržba kamer"). Čtyři propojené místnosti odpovídají skutečné
// kamerové síti Objektu 13 (viz game/cameras/cameras.object13.ts —
// outer_yard/right_hallway/left_hallway/door_hallway, STEJNÁ id, ne
// vymyšlená geometrie), plus kancelář se stejným "start/exit slot" vzorem
// jako ostatní mapy (service_floor_evac_plan.ts). Záměrně jednodušší než
// evac_plan/storage (jedna centrální přepážka mezi levou/pravou chodbou,
// jinak převážně otevřené hranice) — tenhle výjezd zatím jen ověřuje
// průchod (kancelář -> minihra -> výměna kamery -> návrat/smrt), ne
// stealth/maze hloubku skladových map.
//
// Topologie (shora dolů):
//   VENKOVNÍ VSTUP (outer_yard, přes celou šířku)
//   LEVÁ CHODBA (left_hallway) | přepážka | PRAVÁ CHODBA (right_hallway)
//   CHODBA PŘED DVEŘMI (door_hallway, spojuje obě chodby)
//   KANCELÁŘ (office, úzký vchod)
export const MONITORED_HALLS_MAP: MiniGameLayout = {
  id: "monitored_halls",
  name: "Sledované haly",
  description: "Čtyři haly odpovídající kamerové síti Objektu 13 — údržba kamer, druhý výjezd z kanceláře.",
  world: { width: 1000, height: 700 },
  rooms: [
    { id: "outer_yard", name: "Venkovní vstup", kind: "loading", bounds: { x: 0, y: 0, width: 1000, height: 200 } },
    { id: "left_hallway", name: "Levá chodba", kind: "corridor", bounds: { x: 0, y: 200, width: 460, height: 260 } },
    { id: "right_hallway", name: "Pravá chodba", kind: "corridor", bounds: { x: 540, y: 200, width: 460, height: 260 } },
    { id: "door_hallway", name: "Chodba před dveřmi", kind: "corridor", bounds: { x: 300, y: 460, width: 400, height: 160 } },
    { id: "office", name: "Kancelář", kind: "office", bounds: { x: 400, y: 620, width: 200, height: 80 } },
  ],
  walls: [
    // Obvodové zdi.
    { id: "perimeter_top", x: 0, y: 0, width: 1000, height: 15, kind: "wall" },
    { id: "perimeter_bottom", x: 0, y: 685, width: 1000, height: 15, kind: "wall" },
    { id: "perimeter_left", x: 0, y: 0, width: 15, height: 700, kind: "wall" },
    { id: "perimeter_right", x: 985, y: 0, width: 15, height: 700, kind: "wall" },
    // Přepážka mezi levou a pravou chodbou (viz zadání "dva samostatné
    // větve" — outer_yard nad oběma zůstává otevřená hranice, stejně jako
    // door_hallway pod oběma, ať je mapa jednoduchá a čitelná).
    { id: "divider", x: 460, y: 200, width: 80, height: 260, kind: "wall" },
    // Chodba před dveřmi <-> kancelář — úzký vchod (stejný vzor jako
    // ostatní mapy, viz service_floor_evac_plan.ts wall_o1/o2).
    { id: "wall_office_1", x: 300, y: 610, width: 100, height: 20, kind: "wall" },
    { id: "wall_office_2", x: 600, y: 610, width: 100, height: 20, kind: "wall" },
  ],
  slots: [
    { id: "office_start_01", roomId: "office", x: 500, y: 660, tags: ["player_start"], debugName: "Start (kancelář)" },
    { id: "office_exit_01", roomId: "office", x: 480, y: 660, tags: ["player_exit"], debugName: "Návrat (kancelář)" },

    { id: "monster_spawn_outer_yard_01", roomId: "outer_yard", x: 500, y: 100, tags: ["monster_spawn"], debugName: "Spawn — venkovní vstup" },
    { id: "monster_spawn_left_01", roomId: "left_hallway", x: 150, y: 330, tags: ["monster_spawn"], debugName: "Spawn — levá chodba" },
    { id: "monster_spawn_right_01", roomId: "right_hallway", x: 850, y: 330, tags: ["monster_spawn"], debugName: "Spawn — pravá chodba" },

    // Kamerové body (viz zadání "v každé místnosti jeden bod kamery") —
    // přesně JEDEN slot na kameru, tag = reálné CameraId (viz
    // game/cameras/cameras.object13.ts). resolveMiniGamePlacement najde
    // objectivePosition podle EmergencyMiniGameInput.targetCameraId, zbylé
    // tři se jen vykreslí (viz EmergencyMiniGame.tsx#draw), beze změny
    // pravidel/mise.
    { id: "camera_outer_yard_01", roomId: "outer_yard", x: 500, y: 150, tags: ["outer_yard"], debugName: "Kamera — venkovní vstup" },
    { id: "camera_left_hallway_01", roomId: "left_hallway", x: 230, y: 330, tags: ["left_hallway"], debugName: "Kamera — levá chodba" },
    { id: "camera_right_hallway_01", roomId: "right_hallway", x: 770, y: 330, tags: ["right_hallway"], debugName: "Kamera — pravá chodba" },
    { id: "camera_door_hallway_01", roomId: "door_hallway", x: 500, y: 540, tags: ["door_hallway"], debugName: "Kamera — chodba před dveřmi" },
  ],
};
