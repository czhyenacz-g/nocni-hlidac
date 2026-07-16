// Obecný, mode-agnostic serverový profil Objektu 13 (krok 1B, navazuje na
// VPS krok 1A — `Object13PlayerProfile` v project-hub-api). Stejný princip
// jako game/core/hardcorePlayerProfileSnapshot.ts: tenhle repozitář nemá
// přímé DB připojení, tenhle soubor je jen (1) tvar dat (DTO), (2) čistá
// validace/normalizace SDÍLENÁ mezi server-only proxy vrstvou
// (lib/playerProfile/remoteObject13PlayerProfile.ts,
// lib/playerProfile/playerProfileRequestHandlers.ts) a klientskou vrstvou
// (lib/playerProfile/object13PlayerProfileClient.ts,
// components/playerProfile/Object13PlayerProfileProvider.tsx) — žádné React,
// žádný fetch, žádný side effect tady.
//
// `profileData` má od kroku "profilový kontrakt V2 + equipment" přesný,
// validovaný tvar (Object13PlayerProfileDataV2, viz
// object13PlayerProfileContractV2.ts) — `inventory` (počet žárovek) PLUS
// `equipment` (trvalé vlastnictví zbraní: ownedWeapons/equippedWeaponId).
// Nabité náboje/probíhající střelba/lovecká minihra zůstávají v runtime
// GameState, nikdy tady. Žádná munice/baterie/vybavení kanceláře zatím.

import { Object13PlayerProfileDataV2, validateObject13PlayerProfileDataV2 } from "./object13PlayerProfileContractV2";
import { WeaponId, isWeaponId, hasOwnedWeapon, getEquippedWeaponAmmoCapacity as getEquipmentAmmoCapacity } from "./object13PlayerProfileEquipment";

/** Sdílený tvar s VPS `Object13PlayerProfileDto` (project-hub-api) — beze změny napříč server proxy i klientem. */
export interface Object13PlayerProfileDto {
  discordUserId: string;
  profileVersion: number;
  profileData: Object13PlayerProfileDataV2;
  revision: number;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

// ── Selectory (viz zadání "12. Klientská služba a Provider") ────────────

export function getOwnedWeapons(profile: Object13PlayerProfileDto): WeaponId[] {
  return profile.profileData.equipment.ownedWeapons;
}

export function getEquippedWeaponId(profile: Object13PlayerProfileDto): WeaponId | null {
  return profile.profileData.equipment.equippedWeaponId;
}

export function profileHasWeapon(profile: Object13PlayerProfileDto, weaponId: WeaponId): boolean {
  return hasOwnedWeapon(profile.profileData.equipment, weaponId);
}

export function getEquippedWeaponAmmoCapacity(profile: Object13PlayerProfileDto): number {
  return getEquipmentAmmoCapacity(profile.profileData.equipment);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/** ISO 8601 timestamp string — `Date.parse` je shovívavé (přijme i ledacos, co ISO není), ale "je to string, co jde naparsovat na platné datum" stačí jako ochrana proti `null`/číslu/nesmyslu z nedůvěryhodné odpovědi. */
function isValidTimestampString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

/**
 * Bezpečné ověření CELÉHO tvaru odpovědi z project-hub-api (přes Next.js
 * proxy, nebo přímo z VPS na server-side straně) — `false` na cokoliv, co
 * neodpovídá přesně `Object13PlayerProfileDto`. `profileData` se ověřuje
 * přísně proti V2 kontraktu (`validateObject13PlayerProfileDataV2`,
 * object13PlayerProfileContractV2.ts) — server sám garantuje jen validní V2
 * tvar (migruje starý V1/normalizuje poškozený profil při GET), tahle
 * validace je tu jako defense-in-depth pro volající, které nedůvěřuje
 * syrové odpovědi. Odpověď ve starém V1 tvaru (bez `equipment`) se tu
 * záměrně NEPOVAŽUJE za validní/ready V2 — migraci dělá výhradně server
 * (viz zadání "3. ... V1 server response se na klientovi nepovažuje za
 * ready V2, pokud migraci má dělat server").
 */
export function isValidObject13PlayerProfileDto(value: unknown): value is Object13PlayerProfileDto {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.discordUserId === "string" &&
    value.discordUserId.length > 0 &&
    isFiniteInteger(value.profileVersion) &&
    validateObject13PlayerProfileDataV2(value.profileData).ok &&
    isFiniteInteger(value.revision) &&
    isValidTimestampString(value.createdAt) &&
    isValidTimestampString(value.updatedAt) &&
    isValidTimestampString(value.lastSeenAt)
  );
}

// ── PUT tělo requestu (klient -> Next.js proxy) ──────────────────────────

/**
 * Co hráčův prohlížeč smí poslat na `PUT /api/player/profile` — VÝSLOVNĚ
 * bez `discordUserId` (viz zadání "Browser NESMÍ posílat discordUserId jako
 * autoritativní hodnotu") — proxy vrstva ho vždy doplní ze session, tenhle
 * typ/validátor ho proto ani nezná/nečte.
 */
export interface IncomingObject13PlayerProfilePutBody {
  expectedRevision: number;
  profileVersion: number;
  profileData: Object13PlayerProfileDataV2;
}

export type ValidateIncomingPutBodyResult =
  | { ok: true; data: IncomingObject13PlayerProfilePutBody }
  | { ok: false };

/**
 * Přísná validace (žádný lenientní silent fallback) — neplatný tvar/typ
 * vrátí `{ ok: false }`, volající (viz playerProfileRequestHandlers.ts) na
 * tom pozná "400, VPS se vůbec nevolá" (test "Neplatný browser payload
 * vrátí 400 bez volání VPS"). `profileData` se ověřuje přísně proti V2
 * kontraktu (`validateObject13PlayerProfileDataV2`) — VPS validuje tentýž
 * tvar znovu nezávisle (playerProfileValidation.ts), duplicitní kontrola je
 * tu záměrná (fail fast, bez zbytečného round-tripu na VPS), ne jediný
 * zdroj pravdy.
 */
export function validateIncomingObject13PlayerProfilePutBody(raw: unknown): ValidateIncomingPutBodyResult {
  if (!isPlainObject(raw)) return { ok: false };
  const { expectedRevision, profileVersion, profileData } = raw;
  if (!isFiniteInteger(expectedRevision) || expectedRevision <= 0) return { ok: false };
  if (!isFiniteInteger(profileVersion) || profileVersion <= 0) return { ok: false };
  const validated = validateObject13PlayerProfileDataV2(profileData);
  if (!validated.ok) return { ok: false };
  return { ok: true, data: { expectedRevision, profileVersion, profileData: validated.data } };
}

// ── Inventářová operace (add/consume) tělo requestu (klient -> Next.js proxy) ──

/** Co hráčův prohlížeč smí poslat na `POST /api/player/profile/inventory/bulb/add|consume` — bez `discordUserId`, stejný princip jako obecný PUT výše. */
export interface IncomingObject13PlayerProfileInventoryOperationBody {
  amount: number;
  expectedRevision: number;
}

export type ValidateIncomingInventoryOperationBodyResult =
  | { ok: true; data: IncomingObject13PlayerProfileInventoryOperationBody }
  | { ok: false };

/** `amount` musí být kladné celé číslo (žádná nulová/záporná/desetinná spotřeba/nález). */
export function validateIncomingObject13PlayerProfileInventoryOperationBody(
  raw: unknown,
): ValidateIncomingInventoryOperationBodyResult {
  if (!isPlainObject(raw)) return { ok: false };
  const { amount, expectedRevision } = raw;
  if (!isFiniteInteger(amount) || amount <= 0) return { ok: false };
  if (!isFiniteInteger(expectedRevision) || expectedRevision <= 0) return { ok: false };
  return { ok: true, data: { amount, expectedRevision } };
}

// ── Equipment operace (unlock) tělo requestu (klient -> Next.js proxy) ──

/** Co hráčův prohlížeč smí poslat na `POST /api/player/profile/equipment/weapon/unlock` — bez `discordUserId`, stejný princip jako inventářová operace výše. */
export interface IncomingObject13PlayerProfileWeaponOperationBody {
  weaponId: WeaponId;
  expectedRevision: number;
}

export type ValidateIncomingWeaponOperationBodyResult =
  | { ok: true; data: IncomingObject13PlayerProfileWeaponOperationBody }
  | { ok: false };

export function validateIncomingObject13PlayerProfileWeaponOperationBody(
  raw: unknown,
): ValidateIncomingWeaponOperationBodyResult {
  if (!isPlainObject(raw)) return { ok: false };
  const { weaponId, expectedRevision } = raw;
  if (typeof weaponId !== "string" || !isWeaponId(weaponId)) return { ok: false };
  if (!isFiniteInteger(expectedRevision) || expectedRevision <= 0) return { ok: false };
  return { ok: true, data: { weaponId, expectedRevision } };
}

// ── Klientský load/save state (viz components/playerProfile/Object13PlayerProfileProvider.tsx) ──

export type Object13PlayerProfileLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; profile: Object13PlayerProfileDto }
  | { status: "unauthorized" }
  | { status: "unavailable"; error?: string };

export type Object13PlayerProfileSaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "conflict"; currentProfile: Object13PlayerProfileDto }
  // Doménové stavy inventářových operací (addBulbs/consumeBulbs, viz
  // Object13PlayerProfileProvider.tsx) — jasně odlišené od "error", ať UI
  // umí zobrazit "žárovky došly" jinak než obecnou chybu.
  | { status: "exceeds_maximum" }
  | { status: "insufficient_inventory" }
  | { status: "error"; error: string };

/**
 * Výsledek `fetchObject13PlayerProfile()` (viz
 * lib/playerProfile/object13PlayerProfileClient.ts) — samostatný typ od
 * `Object13PlayerProfileLoadState` (ten navíc zná "idle"/"loading", které
 * dávají smysl jen v Reactu, ne jako výsledek jednoho konkrétního volání).
 */
export type FetchObject13PlayerProfileResult =
  | { status: "ready"; profile: Object13PlayerProfileDto }
  | { status: "unauthorized" }
  | { status: "unavailable"; error?: string };

/**
 * Čistá projekce `FetchObject13PlayerProfileResult` -> `Object13PlayerProfileLoadState`
 * (viz zadání "odděl state machine nebo čistou logiku mimo React") — Provider
 * (components/playerProfile/Object13PlayerProfileProvider.tsx) tuhle funkci
 * jen volá a výsledek pošle do `setState`, žádná vlastní rozhodovací logika
 * tam navíc. Testovatelné bez Reactu/DOM.
 */
export function deriveLoadStateFromFetchResult(result: FetchObject13PlayerProfileResult): Object13PlayerProfileLoadState {
  if (result.status === "ready") return { status: "ready", profile: result.profile };
  if (result.status === "unauthorized") return { status: "unauthorized" };
  return { status: "unavailable", error: result.error };
}

/** Výsledek `saveObject13PlayerProfile()` (viz object13PlayerProfileClient.ts). */
export type SaveObject13PlayerProfileResult =
  | { status: "saved"; profile: Object13PlayerProfileDto }
  | { status: "conflict"; currentRevision: number; currentProfile?: Object13PlayerProfileDto }
  | { status: "unauthorized" }
  | { status: "too_large" }
  | { status: "error"; error: string };

export interface DeriveSaveStateResult {
  /** Nová hodnota `Object13PlayerProfileSaveState`. */
  saveState: Object13PlayerProfileSaveState;
  /**
   * Pokud zápis SKUTEČNĚ uspěl, `nextLoadState` říká Provideru, ať rovnou
   * nahradí i `loadState` čerstvým profilem ze serverové odpovědi (viz
   * zadání "po úspěšném uložení nahradit lokální profil odpovědí serveru")
   * — bez druhého GET. `undefined`, když se `loadState` nemá měnit
   * (konflikt/chyba samy o sobě nikdy nepřepisují, co je zrovna `ready`).
   */
  nextLoadState?: Object13PlayerProfileLoadState;
}

/**
 * Čistá projekce `SaveObject13PlayerProfileResult` -> nový `saveState` (+
 * volitelně nový `loadState` při úspěchu) — stejný "odděl mimo React" princip
 * jako `deriveLoadStateFromFetchResult` výše. `conflict` BEZ `currentProfile`
 * (VPS/proxy ho z nějakého důvodu nepřidalo) se namapuje na `error`, ne na
 * fabrikovaný `conflict` stav bez dat — volající (`reloadAfterConflict`) by
 * jinak neměl co zobrazit.
 */
export function deriveSaveStateFromSaveResult(result: SaveObject13PlayerProfileResult): DeriveSaveStateResult {
  if (result.status === "saved") {
    return {
      saveState: { status: "saved" },
      nextLoadState: { status: "ready", profile: result.profile },
    };
  }
  if (result.status === "conflict") {
    if (!result.currentProfile) {
      return { saveState: { status: "error", error: "conflict_without_profile" } };
    }
    return { saveState: { status: "conflict", currentProfile: result.currentProfile } };
  }
  if (result.status === "unauthorized") {
    return { saveState: { status: "error", error: "unauthorized" } };
  }
  if (result.status === "too_large") {
    return { saveState: { status: "error", error: "too_large" } };
  }
  return { saveState: { status: "error", error: result.error } };
}

// ── Inventářová operace (add/consume) — klientský výsledek + odvození stavu ──

/** Výsledek `addBulbsToProfile()`/`consumeBulbsFromProfile()` (viz lib/playerProfile/object13PlayerProfileClient.ts). */
export type Object13PlayerProfileInventoryOperationResult =
  | { status: "updated"; profile: Object13PlayerProfileDto }
  | { status: "conflict"; currentRevision: number; currentProfile?: Object13PlayerProfileDto }
  | { status: "exceeds_maximum" }
  | { status: "insufficient_inventory" }
  | { status: "unauthorized" }
  | { status: "error"; error: string };

/**
 * Čistá projekce `Object13PlayerProfileInventoryOperationResult` -> nový
 * `saveState` (+ volitelně nový `loadState` při úspěchu) — stejný princip
 * jako `deriveSaveStateFromSaveResult` výše, sdílené s ním přes `DeriveSaveStateResult`.
 * Provider (Object13PlayerProfileProvider.tsx) NIKDY na `insufficient_inventory`/
 * `exceeds_maximum`/`conflict` sám neopakuje volání (viz zadání "neprovádí
 * slepý retry") — jen promítne výsledek do stavu.
 */
export function deriveSaveStateFromInventoryOperationResult(
  result: Object13PlayerProfileInventoryOperationResult,
): DeriveSaveStateResult {
  if (result.status === "updated") {
    return {
      saveState: { status: "saved" },
      nextLoadState: { status: "ready", profile: result.profile },
    };
  }
  if (result.status === "conflict") {
    if (!result.currentProfile) {
      return { saveState: { status: "error", error: "conflict_without_profile" } };
    }
    return { saveState: { status: "conflict", currentProfile: result.currentProfile } };
  }
  if (result.status === "exceeds_maximum") {
    return { saveState: { status: "exceeds_maximum" } };
  }
  if (result.status === "insufficient_inventory") {
    return { saveState: { status: "insufficient_inventory" } };
  }
  if (result.status === "unauthorized") {
    return { saveState: { status: "error", error: "unauthorized" } };
  }
  return { saveState: { status: "error", error: result.error } };
}

// ── Equipment operace (unlock) — klientský výsledek + odvození stavu ──

/** Výsledek `unlockWeapon()` (viz lib/playerProfile/object13PlayerProfileClient.ts). `"unchanged"` = zbraň už byla vlastněná a správně vybavená (idempotentní no-op, revision beze změny) — pořád úspěch, jen bez skutečné mutace. */
export type Object13PlayerProfileWeaponUnlockResult =
  | { status: "updated"; profile: Object13PlayerProfileDto }
  | { status: "unchanged"; profile: Object13PlayerProfileDto }
  | { status: "conflict"; currentRevision: number; currentProfile?: Object13PlayerProfileDto }
  | { status: "unauthorized" }
  | { status: "error"; error: string };

/**
 * Čistá projekce `Object13PlayerProfileWeaponUnlockResult` -> nový
 * `saveState` (+ volitelně nový `loadState`) — stejný princip jako
 * `deriveSaveStateFromInventoryOperationResult` výše. `"updated"` i
 * `"unchanged"` OBOJE nahradí `loadState` čerstvým profilem ze serveru (i
 * `"unchanged"` vrací aktuální profil, i když ho technicky nezměnilo) — ať
 * je `loadState` vždy v souladu s tím, co server právě potvrdil.
 */
export function deriveSaveStateFromWeaponUnlockResult(result: Object13PlayerProfileWeaponUnlockResult): DeriveSaveStateResult {
  if (result.status === "updated" || result.status === "unchanged") {
    return {
      saveState: { status: "saved" },
      nextLoadState: { status: "ready", profile: result.profile },
    };
  }
  if (result.status === "conflict") {
    if (!result.currentProfile) {
      return { saveState: { status: "error", error: "conflict_without_profile" } };
    }
    return { saveState: { status: "conflict", currentProfile: result.currentProfile } };
  }
  if (result.status === "unauthorized") {
    return { saveState: { status: "error", error: "unauthorized" } };
  }
  return { saveState: { status: "error", error: result.error } };
}
