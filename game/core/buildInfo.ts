// Automatický identifikátor buildu (viz next.config.ts, zadání "chci vidět,
// že proběhl deploy") — na rozdíl od dřívější ručně psané GAME_VERSION
// (odstraněná, viz git historie) se tohle mění při KAŽDÉM Vercel deployi
// samo, bez rizika, že se zapomene bumpnout. `NEXT_PUBLIC_BUILD_COMMIT`
// chybí mimo Vercel (lokální `npm run dev`/`build`) — `"dev"` fallback.

/** Prvních 7 znaků git commit SHA aktuálního buildu, nebo `"dev"` mimo Vercel. */
export const BUILD_COMMIT: string = (process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "dev").slice(0, 7);

/** ISO čas, kdy tenhle build vznikl (vyhodnoceno jednou v next.config.ts při `next build`/`next dev` startu). */
export const BUILD_TIME: string = process.env.NEXT_PUBLIC_BUILD_TIME ?? new Date(0).toISOString();

/** Den, od kterého se počítá "v1" (viz zadání "dnes je v1.00, počítej dny ode dneška... od 1.7.2026"). */
const VERSION_EPOCH = "2026-07-01T00:00:00Z";

/** Po tolika dnech od VERSION_EPOCH (nebo od posledního rollover) se major verze zvýší o 1 a den se vynuluje zpátky na 00. */
const VERSION_DAYS_PER_MAJOR = 100;

/**
 * `v{major}.{den:02d}+{HHmm}` — čistě kosmetické, automatické verzování
 * (viz Footer.tsx), ne sémantické verzování podle změn. `major` začíná na 1
 * v den VERSION_EPOCH a zvyšuje se o 1 každých VERSION_DAYS_PER_MAJOR dní,
 * `den` je počet dní od posledního rollover (0–99), `HHmm` je čas buildu
 * (UTC) — dvě různé buildy stejný den tak pořád jdou od sebe odlišit.
 * Neplatný/chybějící `buildTimeIso` spadne na den 0 buildu v 00:00, ne na
 * pád — konzistentní s ostatními bezpečnými fallbacky v tomhle souboru.
 */
export function computeAppVersion(buildTimeIso: string): string {
  const build = new Date(buildTimeIso);
  const epoch = new Date(VERSION_EPOCH);
  const isValid = !Number.isNaN(build.getTime());
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceEpoch = isValid ? Math.max(0, Math.floor((build.getTime() - epoch.getTime()) / msPerDay)) : 0;

  const major = 1 + Math.floor(daysSinceEpoch / VERSION_DAYS_PER_MAJOR);
  const dayInCycle = daysSinceEpoch % VERSION_DAYS_PER_MAJOR;

  const pad2 = (value: number): string => String(value).padStart(2, "0");
  const hh = isValid ? pad2(build.getUTCHours()) : "00";
  const min = isValid ? pad2(build.getUTCMinutes()) : "00";

  return `v${major}.${pad2(dayInCycle)}+${hh}${min}`;
}

/** Připravené k přímému zobrazení (viz Footer.tsx). */
export const APP_VERSION: string = computeAppVersion(BUILD_TIME);
