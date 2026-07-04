// Kolik nocí v řadě aktuální hlídač přežil bez smrti — čistě lokální
// localStorage counter, žádný backend/login/databáze. Na rozdíl od
// game/core/deathCount.ts (ten počítá CELKEM selhání napříč hlídači a nikdy
// se nemaže) je tenhle counter per-hlídač: smrt ho vynuluje, protože
// aktuální hlídač skončil (viz app/play/page.tsx).
const SURVIVED_NIGHTS_STORAGE_KEY = "nocni-hlidac:object13:survived-nights";

/** Bezpečné i mimo prohlížeč (SSR) nebo bez dostupného localStorage — vrátí 0, hra nespadne. */
export function getSurvivedNights(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(SURVIVED_NIGHTS_STORAGE_KEY);
    const parsed = raw === null ? 0 : parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/** Zvýší counter o 1 a vrátí novou hodnotu. Volat přesně jednou za výhru (viz app/play/page.tsx). */
export function incrementSurvivedNights(): number {
  if (typeof window === "undefined") return 0;
  try {
    const next = getSurvivedNights() + 1;
    window.localStorage.setItem(SURVIVED_NIGHTS_STORAGE_KEY, String(next));
    return next;
  } catch {
    return getSurvivedNights();
  }
}

/** Vynuluje counter (aktuální hlídač zemřel) a vrátí 0. Volat přesně jednou za smrt. */
export function resetSurvivedNights(): number {
  if (typeof window === "undefined") return 0;
  try {
    window.localStorage.setItem(SURVIVED_NIGHTS_STORAGE_KEY, "0");
  } catch {
    // Ignoruj — i kdyby se nepovedlo zapsat, hra nesmí spadnout.
  }
  return 0;
}
