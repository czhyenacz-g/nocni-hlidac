// Object13PlayerProfileDataV2 — profilový kontrakt v2 (krok "profilový
// kontrakt V2 + equipment"). Přidává `equipment` (trvalé vlastnictví zbraní)
// vedle stávajícího `inventory` (počet žárovek, viz krok "profilový kontrakt
// V1"). Sdílený tvar s project-hub-api's playerProfileContractV2.ts.

import {
  createDefaultObject13PlayerProfileDataV1,
  isObject13InventoryItemId,
  Object13InventoryItems,
  OBJECT13_INVENTORY_ITEM_REGISTRY,
} from "./object13PlayerProfileInventory";
import {
  createDefaultEquipmentState,
  Object13EquipmentState,
  validateEquipmentState,
  EquipmentValidationError,
} from "./object13PlayerProfileEquipment";

export interface Object13PlayerProfileDataV2 {
  inventory: {
    items: Object13InventoryItems;
  };
  equipment: Object13EquipmentState;
}

/** Nikdy jen z poloviny prázdné — vždy default inventář (viz krok V1) PLUS prázdný equipment. */
export function createDefaultObject13PlayerProfileDataV2(): Object13PlayerProfileDataV2 {
  return {
    inventory: createDefaultObject13PlayerProfileDataV1().inventory,
    equipment: createDefaultEquipmentState(),
  };
}

function isPlainObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type Object13PlayerProfileDataV2ValidationError =
  | { code: "not_object" }
  | { code: "unknown_top_level_key"; key: string }
  | { code: "missing_inventory" }
  | { code: "inventory_not_object" }
  | { code: "unknown_inventory_key"; key: string }
  | { code: "missing_items" }
  | { code: "items_not_object" }
  | { code: "unknown_item_id"; itemId: string }
  | { code: "invalid_quantity"; itemId: string }
  | { code: "quantity_out_of_range"; itemId: string }
  | { code: "missing_equipment" }
  | { code: "equipment_invalid"; error: EquipmentValidationError };

export type Object13PlayerProfileDataV2ValidationResult =
  | { ok: true; data: Object13PlayerProfileDataV2 }
  | { ok: false; error: Object13PlayerProfileDataV2ValidationError };

const ALLOWED_V2_TOP_LEVEL_KEYS = new Set(["inventory", "equipment"]);
const ALLOWED_INVENTORY_KEYS = new Set(["items"]);

/**
 * Klientský mirror serverového `validateObject13PlayerProfileDataV2`
 * (project-hub-api, playerProfileValidation.ts) — stejná přísná, plně
 * whitelistovaná pravidla, žádný silent fallback. Používá ho
 * `isValidObject13PlayerProfileDto` (object13PlayerProfile.ts) při ověřování
 * celé odpovědi ze serveru/proxy — server sám garantuje validní V2 (migruje
 * starý V1 při GET), tahle validace je defense-in-depth pro klienta, který
 * syrové odpovědi nevěří naslepo.
 */
export function validateObject13PlayerProfileDataV2(raw: unknown): Object13PlayerProfileDataV2ValidationResult {
  if (!isPlainObjectValue(raw)) return { ok: false, error: { code: "not_object" } };

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_V2_TOP_LEVEL_KEYS.has(key)) return { ok: false, error: { code: "unknown_top_level_key", key } };
  }
  if (!("inventory" in raw)) return { ok: false, error: { code: "missing_inventory" } };
  if (!("equipment" in raw)) return { ok: false, error: { code: "missing_equipment" } };

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

  const equipmentResult = validateEquipmentState(raw.equipment);
  if (!equipmentResult.ok) return { ok: false, error: { code: "equipment_invalid", error: equipmentResult.error } };

  return { ok: true, data: { inventory: { items: validatedItems }, equipment: equipmentResult.equipment } };
}
