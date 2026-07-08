import { MiniGameLayout, MiniGameLayoutRoom, MiniGameLayoutSlot, MiniGameLayoutSlotTag } from "./layoutTypes";
import { ResolvedMiniGamePlacement } from "./layoutPlacement";
import { Vec2 } from "./types";

// Čisté, testovatelné helpery pro skrytý developer overlay /minihra (viz
// zadání) — žádné z tohohle NEOVLIVŇUJE gameplay/placement/seed/validaci,
// jen co se navíc ZOBRAZÍ, když je overlay zapnutý (viz
// components/minigame/EmergencyMiniGame.tsx).

// ── Skrytý toggle (Shift + pravý klik do rohu arény) ───────────────────────

export interface MiniGameDevToggleClickInput {
  /** Pozice kliku relativně k canvas elementu (CSS px, ne world/game souřadnice), např. MouseEvent.offsetX/Y. */
  x: number;
  y: number;
  /** MouseEvent.button — 2 = pravé tlačítko. Levý klik (0) nikdy nesmí toggle spustit. */
  button: number;
  shiftKey: boolean;
  /** Skutečná (CSS) šířka/výška vykresleného canvas elementu — hot zóna je vztažená k NĚMU, ne k vnitřnímu rozlišení canvasu. */
  canvasWidth: number;
  canvasHeight: number;
}

export interface MiniGameDevToggleOptions {
  /** Velikost hot zóny (čtverec) v pravém horním rohu, výchozí 48×48 px. */
  hotZoneSizePx?: number;
}

const DEFAULT_DEV_TOGGLE_HOT_ZONE_PX = 48;

/**
 * Jestli tenhle klik má přepnout developer overlay — NENÍ to security
 * feature (kdokoliv si to najde v devtools/kódu), jen skrytá pomůcka, ať
 * běžný hráč na overlay nenarazí omylem. Vyžaduje VŠECHNO najednou: pravé
 * tlačítko (button === 2), podržený Shift, a pozici uvnitř malé hot zóny v
 * pravém horním rohu canvasu — obyčejný pravý klik mimo roh (nebo kdekoliv
 * bez Shiftu, nebo levý klik kdekoliv) nikdy nic neudělá.
 */
export function isMiniGameDevToggleHit(input: MiniGameDevToggleClickInput, options: MiniGameDevToggleOptions = {}): boolean {
  const hotZoneSizePx = options.hotZoneSizePx ?? DEFAULT_DEV_TOGGLE_HOT_ZONE_PX;

  if (input.button !== 2) return false;
  if (!input.shiftKey) return false;

  const inHotZone =
    input.x >= input.canvasWidth - hotZoneSizePx &&
    input.x <= input.canvasWidth &&
    input.y >= 0 &&
    input.y <= hotZoneSizePx;

  return inHotZone;
}

// ── Slot debug labels (viz zadání "S/E/M/B/L/F/G/A/K/T/?") ─────────────────

/** Pořadí, podle kterého se vybere label, když má slot víc tagů najednou — první nalezený v tomhle pořadí vyhrává. */
const SLOT_TAG_PRIORITY: MiniGameLayoutSlotTag[] = [
  "player_start",
  "player_exit",
  "monster_spawn",
  "battery",
  "bulb",
  "fuse",
  "shotgun",
  "ammo",
  "key",
  "toolbox",
  "generic_loot",
];

const SLOT_TAG_DEBUG_LABELS: Record<MiniGameLayoutSlotTag, string> = {
  player_start: "S",
  player_exit: "E",
  monster_spawn: "M",
  battery: "B",
  bulb: "L",
  fuse: "F",
  shotgun: "G",
  ammo: "A",
  key: "K",
  toolbox: "T",
  generic_loot: "?",
};

/**
 * Jedno písmeno pro vykreslení slotu v dev overlayi — podle
 * SLOT_TAG_PRIORITY, pokud má slot víc tagů najednou (viz zadání). "?" i
 * jako bezpečný fallback, kdyby slot neměl žádný rozpoznaný tag (nemělo by
 * nastat u validovaného layoutu, viz layoutValidation.ts).
 */
export function getMiniGameSlotDebugLabel(slot: Pick<MiniGameLayoutSlot, "tags">): string {
  for (const tag of SLOT_TAG_PRIORITY) {
    if (slot.tags.includes(tag)) return SLOT_TAG_DEBUG_LABELS[tag];
  }
  return "?";
}

// ── Vybrané sloty pro aktuální run (zvýraznění v dev overlayi) ─────────────

/** Id všech slotů vybraných resolveMiniGamePlacement pro tenhle konkrétní run — použito jen pro zvýraznění v dev overlayi, gameplay na tomhle nestaví. */
export function getSelectedSlotIds(placement: ResolvedMiniGamePlacement): Set<string> {
  const ids = [placement.playerStartSlotId, placement.playerExitSlotId, placement.monsterSpawnSlotId];
  if (placement.objectiveSlotId) ids.push(placement.objectiveSlotId);
  return new Set(ids);
}

// ── Aktuální místnost hráče (dev lišta) ─────────────────────────────────────

/** Místnost, jejíž bounds obsahují daný bod — první nalezená (layouty v projektu mají neprotínající se místnosti, takže pořadí v praxi nezáleží), `null` mimo všechny místnosti. */
export function getRoomAtPoint(layout: MiniGameLayout, point: Vec2): MiniGameLayoutRoom | null {
  for (const room of layout.rooms) {
    const { x, y, width, height } = room.bounds;
    if (point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height) return room;
  }
  return null;
}
