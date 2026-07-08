import { MiniGameLayout, MiniGameLayoutRoom, MiniGameLayoutSlot, MiniGameLayoutSlotTag } from "./layoutTypes";
import { EmergencyMiniGameInput, Vec2 } from "./types";
import { createSeededRandom } from "./seededRandom";

// Vybírá KONKRÉTNÍ sloty (start/exit/monster spawn/objective) z datově
// definovaného layoutu pro konkrétní misi + seed (viz zadání) — layoutTypes.ts
// samo o sobě žádnou logiku výběru nemá, jen popisuje mapu. Deterministické:
// stejný (layout, input, seed) vrací vždy stejný výsledek.

/**
 * Vyhozeno, když layout nemá žádný slot s požadovaným tagem — NIKDY tiché
 * spadnutí na náhodnou pozici (viz zadání). Validovaný layout (viz
 * layoutValidation.ts) tohle nikdy nevyhodí pro player_start/player_exit/
 * monster_spawn (validátor je vyžaduje povinně); reálně hrozí jen pro
 * objective tagy (battery/bulb/...), pokud daný layout danou misi vůbec
 * nepodporuje.
 */
export class MiniGamePlacementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MiniGamePlacementError";
  }
}

function slotsWithTag(layout: MiniGameLayout, tag: MiniGameLayoutSlotTag): MiniGameLayoutSlot[] {
  return layout.slots.filter((slot) => slot.tags.includes(tag));
}

/** Váhovaný výběr (chybějící `weight` = 1) — deterministický vůči `rng`. */
function pickWeighted(slots: MiniGameLayoutSlot[], rng: () => number): MiniGameLayoutSlot {
  const totalWeight = slots.reduce((sum, slot) => sum + (slot.weight ?? 1), 0);
  let roll = rng() * totalWeight;
  for (const slot of slots) {
    roll -= slot.weight ?? 1;
    if (roll <= 0) return slot;
  }
  return slots[slots.length - 1];
}

function pickSlotByTag(layout: MiniGameLayout, tag: MiniGameLayoutSlotTag, rng: () => number): MiniGameLayoutSlot {
  const candidates = slotsWithTag(layout, tag);
  if (candidates.length === 0) {
    throw new MiniGamePlacementError(`Layout "${layout.id}" has no slot tagged "${tag}"`);
  }
  return pickWeighted(candidates, rng);
}

/** "collect_item" bez explicitního itemToCollect se (stejně jako dřív v resolveEquipmentFromInput-adjacent logice) chová jako "fuse" — viz EmergencyMiniGame.tsx#getMissionHint. */
function objectiveTagForInput(input: EmergencyMiniGameInput): MiniGameLayoutSlotTag | null {
  if (input.objective !== "collect_item") return null;
  return input.itemToCollect ?? "fuse";
}

export interface ResolvedMiniGamePlacement {
  layout: MiniGameLayout;
  seed: string;
  playerStartSlotId: string;
  playerExitSlotId: string;
  monsterSpawnSlotId: string;
  /** Chybí pro objective jiný než "collect_item". */
  objectiveSlotId?: string;
  playerStart: Vec2;
  playerExit: Vec2;
  monsterSpawn: Vec2;
  objectivePosition?: Vec2;
}

/**
 * Vybere konkrétní sloty (start/exit/monster spawn/objective) z layoutu pro
 * danou misi a seed — čistá funkce, žádný Math.random přímo (viz
 * createSeededRandom). Pořadí losování (start, exit, monster spawn,
 * objective) je pevné, ať je výsledek pro daný seed stabilní i při budoucích
 * úpravách týhle funkce, dokud se pořadí zachová.
 */
export function resolveMiniGamePlacement(
  layout: MiniGameLayout,
  input: EmergencyMiniGameInput,
  seed: string,
): ResolvedMiniGamePlacement {
  const rng = createSeededRandom(seed);

  const playerStartSlot = pickSlotByTag(layout, "player_start", rng);
  const playerExitSlot = pickSlotByTag(layout, "player_exit", rng);
  const monsterSpawnSlot = pickSlotByTag(layout, "monster_spawn", rng);

  const objectiveTag = objectiveTagForInput(input);
  const objectiveSlot = objectiveTag ? pickSlotByTag(layout, objectiveTag, rng) : undefined;

  return {
    layout,
    seed,
    playerStartSlotId: playerStartSlot.id,
    playerExitSlotId: playerExitSlot.id,
    monsterSpawnSlotId: monsterSpawnSlot.id,
    objectiveSlotId: objectiveSlot?.id,
    playerStart: { x: playerStartSlot.x, y: playerStartSlot.y },
    playerExit: { x: playerExitSlot.x, y: playerExitSlot.y },
    monsterSpawn: { x: monsterSpawnSlot.x, y: monsterSpawnSlot.y },
    objectivePosition: objectiveSlot ? { x: objectiveSlot.x, y: objectiveSlot.y } : undefined,
  };
}

/**
 * "Návratová zóna" pro E/exit interakci — obdélník MÍSTNOSTI, která obsahuje
 * daný slot (typicky playerExitSlotId), ne samostatné natvrdo zadané
 * EXIT_ZONE políčko jako dřív. Datově řízené: velikost/pozice zóny je
 * bounds místnosti "office" v layoutu, ne magické číslo v komponentě.
 */
export function getRoomBoundsForSlot(layout: MiniGameLayout, slotId: string): MiniGameLayoutRoom["bounds"] {
  const slot = layout.slots.find((candidate) => candidate.id === slotId);
  if (!slot) throw new MiniGamePlacementError(`Layout "${layout.id}" has no slot with id "${slotId}"`);
  const room = layout.rooms.find((candidate) => candidate.id === slot.roomId);
  if (!room) throw new MiniGamePlacementError(`Layout "${layout.id}" slot "${slotId}" references unknown room "${slot.roomId}"`);
  return room.bounds;
}
