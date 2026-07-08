import { MiniGameLayoutRoom, MiniGameLayoutRoomKind, MiniGameLayoutWall, MiniGameLayoutWallKind } from "./layoutTypes";

// Čisté, testovatelné helpery pro vizuální/evakuačně-plánový vzhled mapy
// (viz zadání "vizuální/design pass pro service_floor_evac_plan") — žádná
// gameplay logika, jen co a jak se v EmergencyMiniGame.tsx#draw vykreslí
// NAVÍC k existujícím zdem/slotům. Funguje pro libovolný layout, ne jen
// service_floor_evac_plan.

/**
 * Krátký, VELKÝMI PÍSMENY čitelný popisek místnosti pro běžné (ne-dev)
 * zobrazení — bere se přímo z `room.name` (layouty mají jména už krátká a
 * čitelná, viz game/minigame/layouts/serviceFloorEvacPlan.ts), žádný
 * samostatný "display name" field navíc.
 */
export function getMiniGameRoomDisplayLabel(room: Pick<MiniGameLayoutRoom, "name">): string {
  return room.name.toUpperCase();
}

/**
 * Jestli se má popisek/label místnosti zobrazit i BĚŽNÉMU hráči (ne jen v
 * dev overlayi) — jen "identifikující" druhy (sklad/technická/údržba/
 * nakládací/kancelář), ne chodby/utility/service/unknown. Cíl: hráč se má
 * lépe orientovat v půdorysu (sklad vs. rozvodna vs. dílna), ale mapa nemá
 * působit přeplácaně popisky na každé chodbě.
 */
const ROOM_KINDS_LABELED_BY_DEFAULT: ReadonlySet<MiniGameLayoutRoomKind> = new Set([
  "storage",
  "technical",
  "maintenance",
  "loading",
  "office",
]);

export function shouldShowRoomLabelByDefault(kind: MiniGameLayoutRoomKind): boolean {
  return ROOM_KINDS_LABELED_BY_DEFAULT.has(kind);
}

/**
 * Vizuální styl zdi/překážky podle `MiniGameLayoutWall.kind` — chybějící
 * `kind` (starší/ruční data) se bere jako obyčejná zeď, stejný bezpečný
 * fallback jako jinde v projektu (nikdy nespadne na neplatný/neznámý styl).
 */
export function getMiniGameWallRenderStyle(wall: Pick<MiniGameLayoutWall, "kind">): MiniGameLayoutWallKind {
  return wall.kind ?? "wall";
}
