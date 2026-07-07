// Jednorázová "záchrana" místního technika při první smrtelné chybě v Noci 1
// (viz content/cinematics.ts#old_guard_first_death_warning, app/play/page.tsx)
// — čistě lokální localStorage flag, žádný backend/login/databáze. Není to
// skutečná smrt: neinkrementuje deathCount, neresetuje survivedNights/server
// currentRun a nevolá /api/player/death (viz app/play/page.tsx). Jakmile je
// jednou použitá, každá další smrtelná chyba v Noci 1 (i po restartu směny)
// už jde normálním death flow.
const FIRST_NIGHT_WARNING_STORAGE_KEY = "nocni-hlidac:object13:first-night-technician-warning-used";

/** Bezpečné i mimo prohlížeč (SSR) nebo bez dostupného localStorage — vrátí `false` (varování "ještě nepoužité"), hra nespadne. */
export function hasUsedFirstNightTechnicianWarning(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FIRST_NIGHT_WARNING_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Označí varování jako spotřebované — volat přesně jednou, při skutečném spuštění near-miss cinematic (viz app/play/page.tsx). */
export function markFirstNightTechnicianWarningUsed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIRST_NIGHT_WARNING_STORAGE_KEY, "1");
  } catch {
    // Ignoruj — i kdyby se nepovedlo zapsat, hra nesmí spadnout (nejhorší
    // případ: near-miss by šlo spustit vícekrát, ne že by hra selhala).
  }
}
