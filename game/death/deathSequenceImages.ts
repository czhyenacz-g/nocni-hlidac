// Death image registr pro /death-test (viz zadání "Uprav /death-test a
// DeathSequenceOverlay tak, aby šlo ladit nový death flow") — stejná
// konvence jako game/cameras/cameraAssets.object13.ts: obrázky patří do
// vlastního datového souboru, nikdy natvrdo napsaný název souboru v
// komponentě (viz CLAUDE.md). Necháváme jen ty 2 assety, které v projektu
// SKUTEČNĚ existují (viz report) — žádný nový obrázek, žádná konverze,
// žádné přejmenování.

export interface DeathSequenceImageOption {
  id: string;
  /** Text pro select v DeathTestControls.tsx — popisuje OBSAH, ne jen soubor, ať je jasné, co si hráč vybírá. */
  label: string;
  src: string;
}

/**
 * `dead_monster` — `public/object_13/story/dead_monster.webp` — používá se
 * dnes v MonsterDefeatedScreen.tsx (true-ending cinematic), ale vizuálně už
 * SÁM obsahuje "GAME OVER" nápis + mrtvé monstrum s přeškrtnutýma očima,
 * takže je použitelný i jako death-test podklad.
 *
 * `victory_game_over` — `public/object_13/story/victory_game_ove.png`
 * (přesně tenhle název souboru v projektu existuje, i s překlepem "ove" —
 * viz zadání "nepřejmenovávej assety") — POZOR, obsahově je to spíš
 * "hlídač přežil noc" oslavná grafika (pivo, "SURVIVED ANOTHER NIGHT"
 * hrnek) s nápisem GAME OVER, ne monstrum útočící na hráče — viz report
 * bod 1/2. Žádný `.webp` pro tenhle soubor v projektu není, používá se
 * tedy `.png` přímo (viz zadání "Nekonvertuj assety bez potvrzení").
 */
export const DEATH_SEQUENCE_IMAGE_OPTIONS: DeathSequenceImageOption[] = [
  {
    id: "dead_monster",
    label: "Image 1 — Dead monster (GAME OVER + mrtvé monstrum)",
    src: "/object_13/story/dead_monster.webp",
  },
  {
    id: "victory_game_over",
    label: "Image 2 — Victory/Game Over (hlídač, pivo, „SURVIVED ANOTHER NIGHT“)",
    src: "/object_13/story/victory_game_ove.png",
  },
];

export const DEFAULT_DEATH_SEQUENCE_IMAGE_ID: string = DEATH_SEQUENCE_IMAGE_OPTIONS[0].id;

/** `null`, pokud `id` neodpovídá žádné položce (neplatný/starý config) — volající (DeathSequenceOverlay.tsx) na tohle bezpečně spadne zpět na "nezobrazovat žádný obrázek", nikdy nespadne/nezobrazí rozbitý obrázek. */
export function getDeathSequenceImageSrc(id: string): string | null {
  return DEATH_SEQUENCE_IMAGE_OPTIONS.find((option) => option.id === id)?.src ?? null;
}
