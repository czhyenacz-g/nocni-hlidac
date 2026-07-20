// Persistovaná trojice náhodně vylosovaných "Titanových nocí" pro AKTUÁLNÍ
// průchod 30 nocemi (viz zadání "tři náhodná setkání s Titanem během 30
// nocí") — stejný localStorage vzor jako game/core/survivedNights.ts (jediný
// zdroj "kolikátá noc" pro Normal), jen pro tuhle jednu novou hodnotu.
//
// Hardcore i Normal sdílejí STEJNÉ úložiště (per-browser, ne server) —
// server (project-hub-api) dnes ukládá jen `currentRun`/`bestRun`, žádné
// obecné "libovolné pole čísel pro tenhle run" pole neexistuje a jeho
// přidání by vyžadovalo schema/migraci v samostatném repozitáři mimo dosah
// týhle změny (viz report, "Rizika a otevřené body"). Run hranice (kdy se
// smí vylosovat NOVÁ trojice) je detekovaná stejným signálem, jaký už každý
// mód používá pro "run skončil": Normal resetuje survivedNights na 0,
// Hardcore vždy resetuje serverRunState.currentRun na 0 (jediný život) — na
// STEJNÉM místě v app/play/page.tsx, kde se tohle děje, se volá
// `resetTitanEncounterNights()`.
const STORAGE_KEY = "nocni-hlidac:object13:titan-encounter-nights";

/**
 * Tři disjunktní intervaly (viz zadání "Důležitá pravidla losování") —
 * noc 10 nikdy nemůže padnout (žádný interval ji neobsahuje), a protože
 * intervaly se nikdy nepřekrývají, tři vylosované hodnoty nemůžou nikdy
 * kolidovat mezi sebou.
 */
export const TITAN_ENCOUNTER_RANGES: readonly (readonly [number, number])[] = [
  [11, 15],
  [16, 21],
  [22, 30],
];

/** Vylosuje jednu hodnotu z KAŽDÉHO intervalu (přesně tři, v pořadí encounterů 1/2/3). Injektovatelný `random` — testy dostanou deterministický zdroj, produkce `Math.random`. */
export function rollTitanEncounterNights(random: () => number = Math.random): number[] {
  return TITAN_ENCOUNTER_RANGES.map(([min, max]) => min + Math.floor(random() * (max - min + 1)));
}

/** `true` jen pro validní trojici (přesně 3 celá čísla, každé uvnitř SVÉHO intervalu) — ochrana proti ručně upravenému/poškozenému localStorage. */
function isValidTitanEncounterNights(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length !== TITAN_ENCOUNTER_RANGES.length) return false;
  return value.every((n, index) => {
    if (!Number.isInteger(n)) return false;
    const [min, max] = TITAN_ENCOUNTER_RANGES[index];
    return n >= min && n <= max;
  });
}

function readStoredTitanEncounterNights(): number[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return isValidTitanEncounterNights(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredTitanEncounterNights(nights: number[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nights));
  } catch {
    // Soukromé prohlížení / plné úložiště — stejná tichá tolerance jako
    // survivedNights.ts, hra musí fungovat i bez perzistence.
  }
}

/**
 * Jediné čtecí místo (viz zadání "vylosovat na začátku nového průchodu nebo
 * nejpozději ve chvíli, kdy jsou poprvé potřeba") — pokud v localStorage nic
 * není (nový hráč, starý save bez tohohle pole, poškozená hodnota), vylosuje
 * ROVNOU novou trojici a natrvalo ji uloží, takže KAŽDÉ další volání (i po
 * refreshi stránky) vrátí STEJNÁ čísla, dokud je nezruší `resetTitanEncounterNights`.
 */
export function getTitanEncounterNights(): number[] {
  const stored = readStoredTitanEncounterNights();
  if (stored) return stored;
  const fresh = rollTitanEncounterNights();
  writeStoredTitanEncounterNights(fresh);
  return fresh;
}

/**
 * Volá se VÝHRADNĚ v okamžiku, kdy daný run skutečně skončil (viz
 * app/play/page.tsx — stejné místo jako `resetSurvivedNights()` pro Normal a
 * Hardcore `/api/player/death` větev) — vylosuje a rovnou uloží NOVOU
 * trojici pro příští run. Restart STEJNÉ noci po smrti (Normal se
 * zbývajícími životy) tohle nikdy nevolá, takže Titanovy noci zůstávají
 * stejné (viz zadání pravidla 4/5).
 */
export function resetTitanEncounterNights(): number[] {
  const fresh = rollTitanEncounterNights();
  writeStoredTitanEncounterNights(fresh);
  return fresh;
}
