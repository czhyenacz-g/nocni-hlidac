import { describe, expect, it } from "vitest";
import {
  createDefaultObject13PlayerProfileDataV1,
  getInventoryItemQuantity,
  isObject13InventoryItemId,
  Object13PlayerProfileDataV1,
  OBJECT13_INVENTORY_ITEM_REGISTRY,
  validateObject13PlayerProfileDataV1,
} from "./object13PlayerProfileInventory";
import { BULBS_CONFIG } from "./bulbsConfig";

describe("OBJECT13_INVENTORY_ITEM_REGISTRY", () => {
  it("2. bulb defaultQuantity mirrors the single central BULBS_CONFIG.startingCount", () => {
    expect(OBJECT13_INVENTORY_ITEM_REGISTRY.bulb.defaultQuantity).toBe(BULBS_CONFIG.startingCount);
  });

  it("bulb has min 0 and a documented technical max", () => {
    expect(OBJECT13_INVENTORY_ITEM_REGISTRY.bulb.minQuantity).toBe(0);
    expect(OBJECT13_INVENTORY_ITEM_REGISTRY.bulb.maxQuantity).toBe(999);
  });
});

describe("isObject13InventoryItemId", () => {
  it("accepts bulb, rejects anything else", () => {
    expect(isObject13InventoryItemId("bulb")).toBe(true);
    expect(isObject13InventoryItemId("shotgun")).toBe(false);
    expect(isObject13InventoryItemId("")).toBe(false);
  });
});

describe("createDefaultObject13PlayerProfileDataV1", () => {
  it("1/6. a new profile has inventory.items.bulb at the registry default, never an empty object", () => {
    const data = createDefaultObject13PlayerProfileDataV1();
    expect(data).toEqual({ inventory: { items: { bulb: BULBS_CONFIG.startingCount } } });
    expect(Object.keys(data.inventory.items).length).toBeGreaterThan(0);
  });
});

describe("getInventoryItemQuantity", () => {
  it("reads the stored quantity, missing key reads as 0", () => {
    const data: Object13PlayerProfileDataV1 = { inventory: { items: { bulb: 4 } } };
    expect(getInventoryItemQuantity(data, "bulb")).toBe(4);
    expect(getInventoryItemQuantity({ inventory: { items: {} } }, "bulb")).toBe(0);
  });
});

describe("validateObject13PlayerProfileDataV1", () => {
  it("accepts a well-formed profile", () => {
    const result = validateObject13PlayerProfileDataV1({ inventory: { items: { bulb: 10 } } });
    expect(result.ok).toBe(true);
  });

  it("5. rejects a legacy empty {} profile", () => {
    expect(validateObject13PlayerProfileDataV1({}).ok).toBe(false);
  });

  it("5. rejects an unknown top-level key", () => {
    const result = validateObject13PlayerProfileDataV1({ inventory: { items: {} }, extra: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unknown_top_level_key");
  });

  it("6. rejects an unknown item id", () => {
    const result = validateObject13PlayerProfileDataV1({ inventory: { items: { shotgun: 1 } } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unknown_item_id");
  });

  it("3. rejects a negative quantity", () => {
    expect(validateObject13PlayerProfileDataV1({ inventory: { items: { bulb: -1 } } }).ok).toBe(false);
  });

  it("4. rejects a quantity above the registry maximum", () => {
    expect(validateObject13PlayerProfileDataV1({ inventory: { items: { bulb: 1000 } } }).ok).toBe(false);
  });

  it("a __proto__ top-level key is rejected as unknown, never reaches a dangerous-key path", () => {
    const raw = JSON.parse('{"__proto__": {"polluted": true}}') as Record<string, unknown>;
    const result = validateObject13PlayerProfileDataV1(raw);
    expect(result.ok).toBe(false);
  });
});
