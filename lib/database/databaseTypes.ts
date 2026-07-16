// Typy pro veřejnou MVP databázi Objektu 13 (/database) — viz zadání,
// docs/database-mvp.md. Záměrně oddělené od herní logiky (game/core/*):
// tahle databáze je prezentační/informační modul, ne herní stav. Statický
// obsah (lib/database/databaseContent.ts) proti tomuhle tvaruje typovaný,
// ale se hrou vůbec nepropojuje.

/** Čtyři přepínatelné záložky databáze (viz DatabaseTabs.tsx). */
export type DatabaseTabId = "subjects" | "equipment" | "reports" | "manuals";

/**
 * Normalizovaný, BEZPEČNÝ pohled na přihlášeného uživatele — jediné, co smí
 * dojít do klientských komponent (viz zadání "neposílej celý interní user
 * objekt do klientské komponenty"). `userId` je veřejné Discord snowflake ID
 * (ne token, ne e-mail), zatím se nikde v UI přímo nevykresluje, jen si ho
 * drží view model pro budoucí použití (viz lib/database/databaseViewer.ts).
 */
export interface DatabaseViewer {
  isAuthenticated: boolean;
  userId?: string;
  displayName?: string;
}

/**
 * Osobní herní data hráče, pokud jsou už reálně dostupná (viz zadání
 * "Použij pouze skutečně dostupná data"). `currentNight`/`highestNightReached`
 * dnes existují (server currentRun/bestRun, viz lib/leaderboard/types.ts) —
 * `discoveredSubjectCount`/`completedReportCount` zatím ne, zůstávají
 * `undefined` (UI je zobrazí jako "ZATÍM NENAPOJENO", viz
 * DatabaseViewerStatus.tsx). Žádná hodnota se nikdy nedomýšlí.
 */
export interface DatabasePlayerPreview {
  currentNight?: number;
  highestNightReached?: number;
  discoveredSubjectCount?: number;
  completedReportCount?: number;
}

/** Jeden řádek "výzbroj proti subjektu" na kartě subjektu (viz DatabaseSubjectCard.tsx). */
export interface DatabaseSubjectLoadoutLine {
  label: string;
  value: string;
}

/** Potvrzený, "hotový" subjekt (zatím jen Ghoul) — viz zadání "8. ZÁLOŽKA SUBJEKTY". */
export interface DatabaseSubjectPreview {
  id: string;
  code: string;
  name: string;
  status: string;
  classification: string;
  threatLevel: string;
  observations: string[];
  loadout: DatabaseSubjectLoadoutLine[];
  todos: string[];
}

/** Budoucí/plánovaný subjekt (Ghost, Titan, Praetorián) — lehčí tvar, žádná výzbroj/pozorování, jen název + status + plánované vlastnosti. */
export interface DatabasePlannedSubject {
  id: string;
  name: string;
  status: string;
  plannedTraits: string[];
}

/** Jedna pojmenovaná sekce na kartě vybavení (bullet list nebo pár řádků) — viz DatabaseEquipmentCard.tsx. */
export interface DatabaseEquipmentSection {
  heading: string;
  lines: string[];
}

export interface DatabaseEquipmentPreview {
  id: string;
  name: string;
  internalCode: string;
  description: string;
  status: string;
  sections: DatabaseEquipmentSection[];
  todos: string[];
}

export interface DatabaseManualPreview {
  id: string;
  number: string;
  title: string;
  instructions: string[];
  note?: string;
  todos?: string[];
}

/** Jediný ukázkový report v záložce Hlášení (viz zadání "10. ZÁLOŽKA HLÁŠENÍ") — vždy jen demonstrace, nikdy skutečná data hráče. */
export interface DatabaseReportPreview {
  night: number;
  subjectCode: string;
  subjectType: string;
  events: string[];
  outcome: string;
}

/** Jedno pole budoucího (zatím neodesílatelného) formuláře hlášení — viz DatabaseReportFormPreview.tsx. */
export interface DatabaseReportFormField {
  label: string;
  options: string[];
}

/** Stavy TODO bloku (viz DatabaseTodoBlock.tsx) — jen vizuální odlišení, žádná logika. */
export type DatabaseTodoStatus = "concept" | "planned" | "data-not-connected" | "future";

/**
 * Který badge text patří ke kterému stavu (viz zadání "12. TODO BLOKY" —
 * badge "PLÁNOVANÁ FUNKCE" nebo "TODO"). Čistá funkce (žádný COPY import
 * tady, ať zůstane testovatelná bez závislosti na content vrstvě) — volající
 * (DatabaseTodoBlock.tsx) si podle vráceného klíče sám vybere skutečný text
 * z COPY.database.
 */
export function resolveDatabaseTodoBadgeKey(status: DatabaseTodoStatus): "planned" | "todo" {
  return status === "planned" ? "planned" : "todo";
}
