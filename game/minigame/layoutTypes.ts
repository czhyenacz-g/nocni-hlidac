import { MiniGameItemId } from "./types";

// Datový model mapy nouzové minihry (viz game/minigame/layouts/*, layoutPlacement.ts,
// layoutValidation.ts) — NEZÁVISLÉ na game/core/types.ts, stejně jako zbytek
// game/minigame/*. Layout sám o sobě neobsahuje žádnou logiku ani náhodu —
// jen popisuje mapu (místnosti, zdi/překážky, sloty pro start/exit/spawn/loot).
// Výběr KONKRÉTNÍHO slotu pro danou misi/seed dělá resolveMiniGamePlacement
// v layoutPlacement.ts, ne tenhle soubor.

export type MiniGameLayoutId = string;

export type MiniGameLayoutRoomKind =
  | "office"
  | "corridor"
  | "storage"
  | "technical"
  | "maintenance"
  | "loading"
  | "utility"
  | "service"
  | "unknown";

export interface MiniGameLayoutRoom {
  id: string;
  name: string;
  kind: MiniGameLayoutRoomKind;
  bounds: { x: number; y: number; width: number; height: number };
  /** Volitelný debug popisek (viz zadání "debug názvy místností") — jen pro čitelnost, žádná logika na tom nestaví. */
  debugName?: string;
}

export type MiniGameLayoutWallKind = "wall" | "shelf" | "door_block" | "machine" | "obstacle";

// Strukturálně nadmnožina game/minigame/types.ts#Wall (x/y/width/height) —
// jde proto předat přímo kamkoliv, kde logic.ts/config.ts očekává Wall[]
// (circleIntersectsAnyWall, moveWithWallSliding, hasLineOfSight, ...), beze
// změny signatur těchhle čistých funkcí.
export interface MiniGameLayoutWall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Jen popisný/vizuální rozdíl (regál vs. plná zeď vs. stroj) — kolize je pro všechny druhy stejná (obdélník). */
  kind?: MiniGameLayoutWallKind;
}

// Tagy odpovídají existujícím MiniGameItemId hodnotám (battery/bulb/fuse/
// shotgun/ammo/key/toolbox z types.ts) + tři speciální (player_start/
// player_exit/monster_spawn) + generic_loot pro budoucí nepojmenovaný loot.
export type MiniGameLayoutSlotTag = "player_start" | "player_exit" | "monster_spawn" | "generic_loot" | MiniGameItemId;

export interface MiniGameLayoutSlot {
  id: string;
  roomId: string;
  x: number;
  y: number;
  tags: MiniGameLayoutSlotTag[];
  /** Relativní váha při náhodném (seed) výběru mezi víc sloty se stejným tagem — chybí-li, bere se jako 1 (viz layoutPlacement.ts#pickSlotByTag). */
  weight?: number;
  /** Volitelný debug popisek (viz zadání) — jen pro čitelnost/ladění, žádná logika na tom nestaví. */
  debugName?: string;
}

export interface MiniGameLayout {
  id: MiniGameLayoutId;
  name: string;
  description?: string;
  world: { width: number; height: number };
  rooms: MiniGameLayoutRoom[];
  walls: MiniGameLayoutWall[];
  slots: MiniGameLayoutSlot[];
}
