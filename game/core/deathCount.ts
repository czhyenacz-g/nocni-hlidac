// Kolik hlídačů už na téhle pozici selhalo — čistě lokální localStorage
// counter, žádný backend/login/databáze. Lore: restart směny neznamená, že
// se hráč "znovu narodil" nebo načetl save — znamená to, že na stejné místo
// nastoupil další noční hlídač (viz TODO.md). Counter se zvyšuje výhradně
// při přechodu hry do "death" stavu (viz app/play/page.tsx), nikdy při
// kliknutí na tlačítko restartu a nikdy při výhře.
const DEATH_COUNT_STORAGE_KEY = "nocni-hlidac:object13:death-count";

/** Bezpečné i mimo prohlížeč (SSR) nebo bez dostupného localStorage — vrátí 0, hra nespadne. */
export function getDeathCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(DEATH_COUNT_STORAGE_KEY);
    const parsed = raw === null ? 0 : parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/** Zvýší counter o 1 a vrátí novou hodnotu. Volat přesně jednou za smrt (viz app/play/page.tsx). */
export function incrementDeathCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const next = getDeathCount() + 1;
    window.localStorage.setItem(DEATH_COUNT_STORAGE_KEY, String(next));
    return next;
  } catch {
    return getDeathCount();
  }
}
