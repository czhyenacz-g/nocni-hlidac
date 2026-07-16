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
// DŮLEŽITÉ (viz zadání "krok 1B"): `profileData` je v týhle fázi záměrně
// OPAQUE — validuje/normalizuje se jen jako "plain JSON objekt", obsah se
// nikde nečte ani neinterpretuje. Žádný inventář/nastavení/postup sem ještě
// nepatří (to je až budoucí krok, viz TECH_DESIGN.md).

/** Sdílený tvar s VPS `Object13PlayerProfileDto` (project-hub-api, viz report kroku 1A) — beze změny napříč server proxy i klientem. */
export interface Object13PlayerProfileDto {
  discordUserId: string;
  profileVersion: number;
  profileData: Record<string, unknown>;
  revision: number;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
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
 * jen jako "plain object" (viz zadání "profileData je zatím opaque") —
 * obsah samotný se nijak nekontroluje/neinterpretuje.
 */
export function isValidObject13PlayerProfileDto(value: unknown): value is Object13PlayerProfileDto {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.discordUserId === "string" &&
    value.discordUserId.length > 0 &&
    isFiniteInteger(value.profileVersion) &&
    isPlainObject(value.profileData) &&
    isFiniteInteger(value.revision) &&
    isValidTimestampString(value.createdAt) &&
    isValidTimestampString(value.updatedAt) &&
    isValidTimestampString(value.lastSeenAt)
  );
}

/**
 * Normalizuje `profileData` na bezpečný plain object — `{}` pro cokoliv
 * jiného (poškozený/neobjektový tvar, viz zadání "poškozený nebo
 * neobjektový profileData se bezpečně normalizuje"). Defense-in-depth pro
 * volající, které z nějakého důvodu dostanou syrovou hodnotu mimo
 * `isValidObject13PlayerProfileDto` (ten už `profileData` sám ověřuje, ale
 * tahle funkce je samostatně použitelná i jinde).
 */
export function normalizeObject13PlayerProfileData(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
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
  profileData: Record<string, unknown>;
}

export type ValidateIncomingPutBodyResult =
  | { ok: true; data: IncomingObject13PlayerProfilePutBody }
  | { ok: false };

/**
 * Přísná validace (žádný lenientní silent fallback, viz zadání "krok 1A" —
 * stejný princip platí i tady) — neplatný tvar/typ vrátí `{ ok: false }`,
 * volající (viz playerProfileRequestHandlers.ts) na tom pozná "400, VPS se
 * vůbec nevolá" (test "Neplatný browser payload vrátí 400 bez volání VPS").
 * `profileData` se tu jen ověří jako plain object — VELIKOST/nebezpečné
 * klíče validuje VÝHRADNĚ VPS (project-hub-api), tahle vrstva tu kontrolu
 * záměrně neduplikuje (jeden zdroj pravdy pro tenhle konkrétní limit).
 */
export function validateIncomingObject13PlayerProfilePutBody(raw: unknown): ValidateIncomingPutBodyResult {
  if (!isPlainObject(raw)) return { ok: false };
  const { expectedRevision, profileVersion, profileData } = raw;
  if (!isFiniteInteger(expectedRevision) || expectedRevision <= 0) return { ok: false };
  if (!isFiniteInteger(profileVersion) || profileVersion <= 0) return { ok: false };
  if (!isPlainObject(profileData)) return { ok: false };
  return { ok: true, data: { expectedRevision, profileVersion, profileData } };
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
