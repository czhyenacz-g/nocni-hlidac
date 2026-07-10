// Death image registr pro /death-test (viz zadání "Uprav /death-test a
// DeathSequenceOverlay tak, aby šlo ladit nový death flow") — stejná
// konvence jako game/cameras/cameraAssets.object13.ts: obrázky patří do
// vlastního datového souboru, nikdy natvrdo napsaný název souboru v
// komponentě (viz CLAUDE.md).

export interface DeathSequenceImageOption {
  id: string;
  /** Text pro select v DeathTestControls.tsx — popisuje OBSAH, ne jen soubor, ať je jasné, co si hráč vybírá. */
  label: string;
  src: string;
}

const OBJECT_13_BACKGROUND_PATH = "/object_13/background";

/**
 * Oba obrázky jsou REÁLNÉ, dnes ve hře používané death backgroundy (viz
 * game/visuals/backgroundImages.ts scény `"death"` a `"deathDoorAttack"`,
 * vykreslované přes SceneBackground.tsx na DeathScreen.tsx) — ne
 * placeholder/nesouvisející grafika. `/death-test` je tak laděný na přesně
 * ty samé obrázky, které hráč uvidí při skutečné smrti.
 *
 * `death_bg` — `death_bg_0.webp` — kostlivčí monstrum vstupující dveřmi ke
 * kontrolní místnosti s monitory (výchozí/obecná smrt).
 *
 * `door_open_death` — `door_open_death_0.webp` — monstrum kráčející
 * chodbou (smrt "dveře otevřené při útoku", viz `deathDoorAttack`).
 */
export const DEATH_SEQUENCE_IMAGE_OPTIONS: DeathSequenceImageOption[] = [
  {
    id: "death_bg",
    label: "Image 1 — Death (monstrum ve dveřích kontrolní místnosti)",
    src: `${OBJECT_13_BACKGROUND_PATH}/death_bg_0.webp`,
  },
  {
    id: "door_open_death",
    label: "Image 2 — Door open death (monstrum v chodbě)",
    src: `${OBJECT_13_BACKGROUND_PATH}/door_open_death_0.webp`,
  },
];

export const DEFAULT_DEATH_SEQUENCE_IMAGE_ID: string = DEATH_SEQUENCE_IMAGE_OPTIONS[0].id;

/** `null`, pokud `id` neodpovídá žádné položce (neplatný/starý config) — volající (DeathSequenceOverlay.tsx) na tohle bezpečně spadne zpět na "nezobrazovat žádný obrázek", nikdy nespadne/nezobrazí rozbitý obrázek. */
export function getDeathSequenceImageSrc(id: string): string | null {
  return DEATH_SEQUENCE_IMAGE_OPTIONS.find((option) => option.id === id)?.src ?? null;
}
