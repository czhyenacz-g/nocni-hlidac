import { MiniGameLayout, MiniGameLayoutRoom, MiniGameLayoutSlot, MiniGameLayoutSlotTag } from "./layoutTypes";
import { EmergencyMiniGameInput, MiniGameItemId, Vec2 } from "./types";
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

/**
 * `excludeSlotIds` (viz zadání "itemy se nesmí spawnout na stejném slotu") —
 * volitelný, chybí-li se nic nevylučuje (beze změny oproti dřívějšku).
 * Vyhodí MiniGamePlacementError i když tag technicky existuje, ale VŠECHNY
 * jeho sloty jsou už obsazené jinou položkou — radši jasná chyba než tichý
 * chybějící item (viz zadání).
 */
function pickSlotByTag(
  layout: MiniGameLayout,
  tag: MiniGameLayoutSlotTag,
  rng: () => number,
  excludeSlotIds: ReadonlySet<string> = new Set(),
): MiniGameLayoutSlot {
  const candidates = slotsWithTag(layout, tag).filter((slot) => !excludeSlotIds.has(slot.id));
  if (candidates.length === 0) {
    throw new MiniGamePlacementError(`Layout "${layout.id}" has no free slot tagged "${tag}"`);
  }
  return pickWeighted(candidates, rng);
}

/** "collect_item" bez explicitního itemToCollect se (stejně jako dřív v resolveEquipmentFromInput-adjacent logice) chová jako "fuse" — viz EmergencyMiniGame.tsx#getMissionHint. */
function objectiveTagForInput(input: EmergencyMiniGameInput): MiniGameLayoutSlotTag | null {
  if (input.objective !== "collect_item") return null;
  return input.itemToCollect ?? "fuse";
}

/** Jeden vyřešený slot doplňkového lootu (viz EmergencyMiniGameInput.extraLootItems, zadání "sandbox výprava"). */
export interface ResolvedLootPlacement {
  itemId: MiniGameItemId;
  slotId: string;
  position: Vec2;
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
  /**
   * Doplňkový loot navíc k hlavnímu objective (viz
   * EmergencyMiniGameInput.extraLootItems, zadání "sandbox výprava") — vždy
   * pole (prázdné, pokud input.extraLootItems chybí/je prázdné), jeden záznam
   * na položku, nikdy ne na stejném slotu jako start/exit/spawn/objective ani
   * jiná loot položka (viz pickSlotByTag excludeSlotIds).
   */
  extraLoot: ResolvedLootPlacement[];
}

/**
 * Vybere konkrétní sloty (start/exit/monster spawn/objective/doplňkový loot)
 * z layoutu pro danou misi a seed — čistá funkce, žádný Math.random přímo
 * (viz createSeededRandom). Pořadí losování (start, exit, monster spawn,
 * objective, pak extraLootItems v pořadí, v jakém jsou v inputu) je pevné,
 * ať je výsledek pro daný seed stabilní i při budoucích úpravách týhle
 * funkce, dokud se pořadí zachová. Každý draw vylučuje všechny dosud vybrané
 * sloty (viz `usedSlotIds`), ať žádné dvě položky nikdy nesdílí slot.
 */
export function resolveMiniGamePlacement(
  layout: MiniGameLayout,
  input: EmergencyMiniGameInput,
  seed: string,
): ResolvedMiniGamePlacement {
  const rng = createSeededRandom(seed);
  const usedSlotIds = new Set<string>();

  const playerStartSlot = pickSlotByTag(layout, "player_start", rng, usedSlotIds);
  usedSlotIds.add(playerStartSlot.id);
  const playerExitSlot = pickSlotByTag(layout, "player_exit", rng, usedSlotIds);
  usedSlotIds.add(playerExitSlot.id);
  const monsterSpawnSlot = pickSlotByTag(layout, "monster_spawn", rng, usedSlotIds);
  usedSlotIds.add(monsterSpawnSlot.id);

  const objectiveTag = objectiveTagForInput(input);
  const objectiveSlot = objectiveTag ? pickSlotByTag(layout, objectiveTag, rng, usedSlotIds) : undefined;
  if (objectiveSlot) usedSlotIds.add(objectiveSlot.id);

  const extraLoot: ResolvedLootPlacement[] = [];
  for (const itemId of input.extraLootItems ?? []) {
    const slot = pickSlotByTag(layout, itemId, rng, usedSlotIds);
    usedSlotIds.add(slot.id);
    extraLoot.push({ itemId, slotId: slot.id, position: { x: slot.x, y: slot.y } });
  }

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
    extraLoot,
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
