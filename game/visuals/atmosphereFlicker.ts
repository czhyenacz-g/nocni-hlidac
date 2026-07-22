import { ScreenId } from "../core/types";

// Nepravidelné probliknutí žárovky (viz zadání "4. Přidej systém simulace
// probliknutí žárovky") — čisté, testovatelné funkce nad `tensionLevel`,
// stejný "injektovatelný random, produkce Math.random" vzor jako
// game/core/titanEncounterNights.ts#rollTitanEncounterNights. ŽÁDNÝ pravidelný
// loop (viz zadání "nikdy nepoužívej pravidelný loop") — volající
// (game/visuals/useAtmosphereFlicker.ts) si po každém probliknutí vylosuje
// úplně nový, nezávislý interval do dalšího, ne pevný `setInterval`.

export interface AtmosphereFlickerGateInput {
  screen: ScreenId;
  /** `true`, pokud právě běží nouzová minihra (viz zadání "v minihře se má řídit jejím vlastním vizuálním stavem") — ta má vlastní vizuál, atmosférický flicker jí nesmí zasahovat do obrazu. */
  activeMiniGame: boolean;
  /** "Nechat si to projít hlavou" cinematika (viz app/play/page.tsx) — vlastní scéna, ne běžné hraní. */
  thinkItOverCinematicActive: boolean;
  prefersReducedMotion: boolean;
}

/**
 * Jestli smí probliknutí žárovky vůbec běžet (viz zadání "5. Ochrany" —
 * death screen/menu/briefing omezené nebo vypnuté, minihra řízená vlastním
 * stavem, prefers-reduced-motion respektováno) — čistá funkce, ať jde
 * nezávisle otestovat bez React/DOM infrastruktury (žádný jsdom/RTL v
 * projektu, viz atmosphereFlicker.test.ts). `game/visuals/useAtmosphereFlicker.ts`
 * dostane výsledek jako svůj `enabled` argument, žádnou z týhle podmínek
 * nevyhodnocuje samo.
 */
export function computeAtmosphereFlickerActive(input: AtmosphereFlickerGateInput): boolean {
  if (input.prefersReducedMotion) return false;
  if (input.screen !== "playing") return false;
  if (input.activeMiniGame) return false;
  if (input.thinkItOverCinematicActive) return false;
  return true;
}

export interface FlickerEvent {
  /** Jak dlouho jeden "dip" vizuálně trvá (ms) — různé délky, viz zadání. */
  durationMs: number;
  /** 0..1 — jak hluboko probliknutí ztlumí jas (0 = žádný pokles, 1 = úplná tma). */
  intensity: number;
  /** `true` = dvojité probliknutí (dvě rychlé stmívání za sebou), `false` = jeden pokles — viz zadání "někdy jeden pokles, někdy dvojité probliknutí". */
  double: boolean;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * clamp01(t);
}

// Interval mezi probliknutími — VZDY náhodný v tomhle rozsahu (frekvence
// roste s napětím, viz zadání), nikdy pevná hodnota. V klidu (tension 0)
// jde o řídké, sotva postřehnutelné probliknutí (8-20s), u kritického stavu
// (tension 1) o nepravidelné, ale výrazně častější výkyvy (0.7-2.2s).
const MIN_INTERVAL_MS_AT_REST = 8000;
const MIN_INTERVAL_MS_AT_CRITICAL = 700;
const MAX_INTERVAL_MS_AT_REST = 20000;
const MAX_INTERVAL_MS_AT_CRITICAL = 2200;

export interface FlickerIntervalRange {
  minMs: number;
  maxMs: number;
}

/** Rozsah, ze kterého se losuje další čekací doba do probliknutí — čistě odvozený z tensionLevel, žádný vlastní stav. */
export function computeFlickerIntervalRangeMs(tensionLevel: number): FlickerIntervalRange {
  const t = clamp01(tensionLevel);
  return {
    minMs: lerp(MIN_INTERVAL_MS_AT_REST, MIN_INTERVAL_MS_AT_CRITICAL, t),
    maxMs: lerp(MAX_INTERVAL_MS_AT_REST, MAX_INTERVAL_MS_AT_CRITICAL, t),
  };
}

/** Skutečná náhodná čekací doba do PŘÍŠTÍHO probliknutí (viz computeFlickerIntervalRangeMs) — volá se znovu PO KAŽDÉM probliknutí, nikdy jednou dopředu na celou noc. */
export function rollNextFlickerDelayMs(tensionLevel: number, random: () => number = Math.random): number {
  const { minMs, maxMs } = computeFlickerIntervalRangeMs(tensionLevel);
  return minMs + random() * (maxMs - minMs);
}

/**
 * Jedno konkrétní probliknutí — délka, intenzita i to, jestli půjde o
 * dvojité probliknutí, jsou VŽDY náhodné (viz zadání "různé délky a
 * intenzity"), jen jejich PRAVDĚPODOBNOSTNÍ rozsah se posouvá s napětím
 * (silnější/četnější dvojité probliknutí blíž kritickému stavu).
 */
export function rollFlickerEvent(tensionLevel: number, random: () => number = Math.random): FlickerEvent {
  const t = clamp01(tensionLevel);
  const doubleChance = 0.15 + t * 0.35;
  const double = random() < doubleChance;
  const intensity = Math.min(0.9, 0.15 + random() * 0.25 + t * 0.3);
  const durationMs = 60 + random() * 160;
  return { durationMs, intensity, double };
}
