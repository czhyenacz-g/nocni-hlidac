import { MiniGameLayout, MiniGameLayoutId } from "../layoutTypes";
import { SERVICE_FLOOR_ALPHA } from "./serviceFloorAlpha";
import { SERVICE_FLOOR_STORAGE } from "./serviceFloorStorage";
import { SERVICE_FLOOR_EVAC_PLAN } from "./serviceFloorEvacPlan";

// Registr všech dostupných map (viz layoutTypes.ts) — nový layout = nový
// soubor v týhle složce + přidání sem, žádná mapa nikdy natvrdo jinde
// (config.ts/EmergencyMiniGame.tsx čtou jen odsud přes getMiniGameLayout).
export const MINIGAME_LAYOUTS: MiniGameLayout[] = [SERVICE_FLOOR_ALPHA, SERVICE_FLOOR_STORAGE, SERVICE_FLOOR_EVAC_PLAN];

export const DEFAULT_MINIGAME_LAYOUT_ID: MiniGameLayoutId = SERVICE_FLOOR_ALPHA.id;

/** Neznámé/chybějící id spadne na výchozí layout (service_floor_alpha), nikdy nevrátí undefined — stejný "bezpečný fallback" vzor jako getMiniGameDebugScenario. */
export function getMiniGameLayout(id: MiniGameLayoutId): MiniGameLayout {
  return MINIGAME_LAYOUTS.find((layout) => layout.id === id) ?? SERVICE_FLOOR_ALPHA;
}
