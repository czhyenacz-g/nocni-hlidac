// Object13PlayerProfileDataV1 — profilový kontrakt v1 (krok "profilový
// kontrakt V1 + inventář žárovek"), sdílený tvar s project-hub-api
// (src/modules/nocniHlidac/playerProfileInventory.ts — stejný registr,
// stejné pojmenování, žádný přímý import mezi repozitáři). Jediná dnes
// podporovaná položka je `bulb` (náhradní žárovka) — žádné zbraně, munice,
// baterie ani vybavení kanceláře. Přidání další položky = nový klíč v
// OBJECT13_INVENTORY_ITEM_REGISTRY, žádná změna kontraktu ani volajících.

import { BULBS_CONFIG } from "./bulbsConfig";

export type Object13InventoryItemId = "bulb";

export type Object13InventoryItems = Partial<Record<Object13InventoryItemId, number>>;

export interface Object13PlayerProfileDataV1 {
  inventory: {
    items: Object13InventoryItems;
  };
}

export interface Object13InventoryItemDefinition {
  id: Object13InventoryItemId;
  defaultQuantity: number;
  minQuantity: number;
  /**
   * Čistě technický bezpečnostní strop (ochrana proti poškozené/nesmyslné
   * hodnotě), NE herní limit — hra sama žádný strop na inventář nemá.
   */
  maxQuantity: number;
}

const BULB_TECHNICAL_MAX_QUANTITY = 999;

/**
 * JEDINÝ zdroj pravdy pro default/min/max náhradních žárovek v tomhle
 * repozitáři — `defaultQuantity` čte `BULBS_CONFIG.startingCount`
 * (bulbsConfig.ts), ne vlastní zkopírované číslo (viz zadání "nevkládej
 * číslo ručně do více souborů"). Změna `BULBS_CONFIG.startingCount` tak
 * automaticky ovlivní i výchozí hodnotu nových profilů — beze změny
 * existujících řádků na VPS (ty čtou svoji uloženou hodnotu, ne tenhle
 * registr, viz Object13PlayerProfileProvider.tsx).
 */
export const OBJECT13_INVENTORY_ITEM_REGISTRY: Readonly<Record<Object13InventoryItemId, Object13InventoryItemDefinition>> = {
  bulb: {
    id: "bulb",
    defaultQuantity: BULBS_CONFIG.startingCount,
    minQuantity: 0,
    maxQuantity: BULB_TECHNICAL_MAX_QUANTITY,
  },
};

export const OBJECT13_INVENTORY_ITEM_IDS = Object.keys(OBJECT13_INVENTORY_ITEM_REGISTRY) as Object13InventoryItemId[];

export function isObject13InventoryItemId(value: string): value is Object13InventoryItemId {
  return Object.prototype.hasOwnProperty.call(OBJECT13_INVENTORY_ITEM_REGISTRY, value);
}

/** Nikdy `{}` — nový profil vždy začíná s každou registrovanou položkou na jejím `defaultQuantity`. */
export function createDefaultObject13PlayerProfileDataV1(): Object13PlayerProfileDataV1 {
  const items: Object13InventoryItems = {};
  for (const id of OBJECT13_INVENTORY_ITEM_IDS) {
    items[id] = OBJECT13_INVENTORY_ITEM_REGISTRY[id].defaultQuantity;
  }
  return { inventory: { items } };
}

/** Chybějící klíč se čte jako 0, nikdy `undefined`. */
export function getInventoryItemQuantity(profileData: Object13PlayerProfileDataV1, itemId: Object13InventoryItemId): number {
  return profileData.inventory.items[itemId] ?? 0;
}

function isPlainObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type Object13PlayerProfileDataV1ValidationError =
  | { code: "not_object" }
  | { code: "unknown_top_level_key"; key: string }
  | { code: "missing_inventory" }
  | { code: "inventory_not_object" }
  | { code: "unknown_inventory_key"; key: string }
  | { code: "missing_items" }
  | { code: "items_not_object" }
  | { code: "unknown_item_id"; itemId: string }
  | { code: "invalid_quantity"; itemId: string }
  | { code: "quantity_out_of_range"; itemId: string };

export type Object13PlayerProfileDataV1ValidationResult =
  | { ok: true; data: Object13PlayerProfileDataV1 }
  | { ok: false; error: Object13PlayerProfileDataV1ValidationError };

const ALLOWED_TOP_LEVEL_KEYS = new Set(["inventory"]);
const ALLOWED_INVENTORY_KEYS = new Set(["items"]);

/**
 * Klientský parser/validátor pro `profileData` odpovídající serverovému
 * `validateObject13PlayerProfileDataV1` (project-hub-api,
 * playerProfileValidation.ts) — stejná přísná, plně whitelistovaná pravidla,
 * žádný lenientní silent fallback. Používá ho `isValidObject13PlayerProfileDto`
 * (object13PlayerProfile.ts) při ověřování celé odpovědi ze serveru/proxy.
 */
export function validateObject13PlayerProfileDataV1(raw: unknown): Object13PlayerProfileDataV1ValidationResult {
  if (!isPlainObjectValue(raw)) return { ok: false, error: { code: "not_object" } };

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) return { ok: false, error: { code: "unknown_top_level_key", key } };
  }
  if (!("inventory" in raw)) return { ok: false, error: { code: "missing_inventory" } };

  const inventory = raw.inventory;
  if (!isPlainObjectValue(inventory)) return { ok: false, error: { code: "inventory_not_object" } };

  for (const key of Object.keys(inventory)) {
    if (!ALLOWED_INVENTORY_KEYS.has(key)) return { ok: false, error: { code: "unknown_inventory_key", key } };
  }
  if (!("items" in inventory)) return { ok: false, error: { code: "missing_items" } };

  const items = inventory.items;
  if (!isPlainObjectValue(items)) return { ok: false, error: { code: "items_not_object" } };

  const validatedItems: Object13InventoryItems = {};
  for (const [itemId, rawQuantity] of Object.entries(items)) {
    if (!isObject13InventoryItemId(itemId)) return { ok: false, error: { code: "unknown_item_id", itemId } };
    if (typeof rawQuantity !== "number" || !Number.isInteger(rawQuantity)) {
      return { ok: false, error: { code: "invalid_quantity", itemId } };
    }
    const def = OBJECT13_INVENTORY_ITEM_REGISTRY[itemId];
    if (rawQuantity < def.minQuantity || rawQuantity > def.maxQuantity) {
      return { ok: false, error: { code: "quantity_out_of_range", itemId } };
    }
    validatedItems[itemId] = rawQuantity;
  }

  return { ok: true, data: { inventory: { items: validatedItems } } };
}
