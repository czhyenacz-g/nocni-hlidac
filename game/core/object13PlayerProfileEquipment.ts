// Equipment model — profilový kontrakt V2 (krok "profilový kontrakt V2 +
// equipment"), sdílený tvar s project-hub-api
// (src/modules/nocniHlidac/playerProfileEquipment.ts — stejný registr,
// stejné pojmenování, žádný přímý import mezi repozitáři). Vlastnictví
// zbraně je DLOUHODOBÝ profilový stav (ownedWeapons/equippedWeaponId) —
// nabité náboje, probíhající střelba a lovecká minihra zůstávají v runtime
// GameState, nikdy tady.

export type WeaponId = "single_shotgun" | "double_barrel_shotgun";

export interface WeaponDefinition {
  id: WeaponId;
  /** Kolik nábojů zbraň pojme nabitá — jediný zdroj pro runtime kapacitu (viz game/core/shotgunEquipment.ts), žádné druhé natvrdo zapsané 1/2. */
  ammoCapacity: number;
}

export const WEAPON_REGISTRY: Readonly<Record<WeaponId, WeaponDefinition>> = {
  single_shotgun: { id: "single_shotgun", ammoCapacity: 1 },
  double_barrel_shotgun: { id: "double_barrel_shotgun", ammoCapacity: 2 },
};

export const WEAPON_IDS = Object.keys(WEAPON_REGISTRY) as WeaponId[];

export function isWeaponId(value: string): value is WeaponId {
  return Object.prototype.hasOwnProperty.call(WEAPON_REGISTRY, value);
}

export interface Object13EquipmentState {
  ownedWeapons: WeaponId[];
  equippedWeaponId: WeaponId | null;
}

export function createDefaultEquipmentState(): Object13EquipmentState {
  return { ownedWeapons: [], equippedWeaponId: null };
}

export function hasOwnedWeapon(equipment: Object13EquipmentState, weaponId: WeaponId): boolean {
  return equipment.ownedWeapons.includes(weaponId);
}

export function getEquippedWeapon(equipment: Object13EquipmentState): WeaponId | null {
  return equipment.equippedWeaponId;
}

/** Kapacita munice vybavené zbraně — `0`, pokud nic není vybavené. Jediné místo, které tenhle odvoz dělá (viz zadání "17. UI levé stěny" — žádné druhé odvození jinde). */
export function getEquippedWeaponAmmoCapacity(equipment: Object13EquipmentState): number {
  return equipment.equippedWeaponId ? WEAPON_REGISTRY[equipment.equippedWeaponId].ammoCapacity : 0;
}

function isPlainObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type EquipmentValidationError =
  | { code: "not_object" }
  | { code: "unknown_equipment_key"; key: string }
  | { code: "ownedWeapons_not_array" }
  | { code: "unknown_weapon_id"; weaponId: string }
  | { code: "duplicate_weapon_id"; weaponId: string }
  | { code: "invalid_equipped_weapon_id" }
  | { code: "equipped_weapon_not_owned" };

export type EquipmentValidationResult =
  | { ok: true; equipment: Object13EquipmentState }
  | { ok: false; error: EquipmentValidationError };

const ALLOWED_EQUIPMENT_KEYS = new Set(["ownedWeapons", "equippedWeaponId"]);

/** Klientský mirror serverového `validateEquipmentState` — stejná přísná, plně whitelistovaná pravidla, žádný silent fallback. */
export function validateEquipmentState(raw: unknown): EquipmentValidationResult {
  if (!isPlainObjectValue(raw)) return { ok: false, error: { code: "not_object" } };

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_EQUIPMENT_KEYS.has(key)) return { ok: false, error: { code: "unknown_equipment_key", key } };
  }

  const rawOwned = raw.ownedWeapons;
  if (!Array.isArray(rawOwned)) return { ok: false, error: { code: "ownedWeapons_not_array" } };

  const ownedWeapons: WeaponId[] = [];
  const seen = new Set<string>();
  for (const item of rawOwned) {
    if (typeof item !== "string" || !isWeaponId(item)) {
      return { ok: false, error: { code: "unknown_weapon_id", weaponId: typeof item === "string" ? item : String(item) } };
    }
    if (seen.has(item)) return { ok: false, error: { code: "duplicate_weapon_id", weaponId: item } };
    seen.add(item);
    ownedWeapons.push(item);
  }

  const rawEquipped = raw.equippedWeaponId;
  if (rawEquipped !== null && (typeof rawEquipped !== "string" || !isWeaponId(rawEquipped))) {
    return { ok: false, error: { code: "invalid_equipped_weapon_id" } };
  }
  const equippedWeaponId = rawEquipped as WeaponId | null;
  if (equippedWeaponId !== null && !ownedWeapons.includes(equippedWeaponId)) {
    return { ok: false, error: { code: "equipped_weapon_not_owned" } };
  }

  return { ok: true, equipment: { ownedWeapons, equippedWeaponId } };
}
