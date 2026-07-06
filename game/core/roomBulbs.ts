import { BULBS_CONFIG } from "./bulbsConfig";
import { GameState, RoomBulbsState } from "./types";

// Campaign stav žárovek per místnost — čistě lokální localStorage (stejný
// vzor jako bulbInventory.ts/deathCount.ts/survivedNights.ts), žádný
// backend/login/databáze. Na rozdíl od bulbsRemaining (jednoduché číslo) je
// tohle strukturovaný objekt (JSON.stringify/parse), ale princip perzistence
// je stejný — čte/zapisuje se výhradně z app/play/page.tsx při přechodu mezi
// směnami (win/death), nikdy uprostřed TICKu.
const ROOM_BULBS_STORAGE_KEY = "nocni-hlidac:object13:room-bulbs";

export function createDefaultRoomBulbs(): RoomBulbsState {
  return {
    nearRoom: {
      remainingMs: BULBS_CONFIG.defaultLifetimeMs,
      maxMs: BULBS_CONFIG.defaultLifetimeMs,
      broken: false,
    },
  };
}

function isValidRoomBulbsState(value: unknown): value is RoomBulbsState {
  if (typeof value !== "object" || value === null) return false;
  const nearRoom = (value as { nearRoom?: unknown }).nearRoom;
  if (typeof nearRoom !== "object" || nearRoom === null) return false;
  const { remainingMs, maxMs, broken } = nearRoom as Record<string, unknown>;
  return typeof remainingMs === "number" && typeof maxMs === "number" && typeof broken === "boolean";
}

/** Bezpečné i mimo prohlížeč (SSR) nebo bez dostupného localStorage — vrátí výchozí stav, hra nespadne. */
export function getRoomBulbs(): RoomBulbsState {
  if (typeof window === "undefined") return createDefaultRoomBulbs();
  try {
    const raw = window.localStorage.getItem(ROOM_BULBS_STORAGE_KEY);
    if (raw === null) return createDefaultRoomBulbs();
    const parsed: unknown = JSON.parse(raw);
    return isValidRoomBulbsState(parsed) ? parsed : createDefaultRoomBulbs();
  } catch {
    return createDefaultRoomBulbs();
  }
}

/** Uloží nový stav a vrátí ho zpátky — volat přesně jednou při přechodu win/death (viz app/play/page.tsx). */
export function setRoomBulbs(next: RoomBulbsState): RoomBulbsState {
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(ROOM_BULBS_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getRoomBulbs();
  }
}

/**
 * Jestli místnost `nearRoom` REÁLNĚ svítí — ne jen jestli je vypínač
 * (`state.lightOn`) v poloze "zapnuto". Prasklá žárovka nebo vybitá
 * životnost světlo nedává, i kdyby vypínač zůstal (chybou) v poloze
 * zapnuto. Používá `gameReducer.ts` (drain životnosti, TOGGLE_LIGHT guard) i
 * UI (výběr osvětleného snímku kamery door_hallway) — jediné místo pravdy,
 * ať se tahle podmínka nerozjede na víc míst zvlášť.
 */
export function isNearRoomLightActive(state: GameState): boolean {
  const bulb = state.roomBulbs.nearRoom;
  return state.lightOn && !bulb.broken && bulb.remainingMs > 0;
}

/**
 * Kolik životnosti žárovce `nearRoom` zbývá jako podíl 0..1 — 0 = prasklá
 * (nebo technicky nulová maxMs), 1 = plná/nová. Čistě odvozená hodnota, žádný
 * vlastní stav — DoorView.tsx z ní počítá trvale viditelnou ikonku (jasná ->
 * skoro nová, tmavá/šedá -> skoro prázdná/prasklá), viz GAME_DESIGN.md
 * "Žárovky". Nepočítá se, jestli reálně svítí (na rozdíl od
 * isNearRoomLightActive) — jen fyzický stav žárovky samotné.
 */
export function computeNearRoomBulbWearRatio(state: GameState): number {
  const bulb = state.roomBulbs.nearRoom;
  if (bulb.broken || bulb.maxMs <= 0) return 0;
  return Math.min(1, Math.max(0, bulb.remainingMs / bulb.maxMs));
}

export interface DailyBulbServiceResult {
  roomBulbs: RoomBulbsState;
  bulbsRemaining: number;
}

/**
 * Denní servis po přežité směně (volat jen na "win" přechod, nikdy na
 * smrt/restart) — vymění za náhradní kus ze skladu jen žárovky, které jsou
 * SKUTEČNĚ prasklé; slabá, ale neprasklá žárovka se nedotkne (viz
 * GAME_DESIGN.md "Žárovky"). Iteruje genericky přes všechny místnosti v
 * `roomBulbs`, ne natvrdo jen `nearRoom` — připravené na další místnosti
 * později beze změny téhle funkce.
 */
export function applyDailyBulbService(roomBulbs: RoomBulbsState, bulbsRemaining: number): DailyBulbServiceResult {
  let remaining = bulbsRemaining;
  const serviced = { ...roomBulbs };

  for (const key of Object.keys(roomBulbs) as (keyof RoomBulbsState)[]) {
    const bulb = roomBulbs[key];
    if (!bulb.broken) continue;

    if (remaining > 0) {
      remaining -= 1;
      serviced[key] = { ...bulb, remainingMs: bulb.maxMs, broken: false };
    }
    // jinak zůstává prasklá — žádné náhradní kusy ve skladu.
  }

  return { roomBulbs: serviced, bulbsRemaining: remaining };
}
