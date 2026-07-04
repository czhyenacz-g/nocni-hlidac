import { CameraId } from "../core/types";
import { CAMERA_IMAGE_CYCLE_MS } from "../balancing/constants";

/** normal = kamera bez monstra, monster = kamera s monstrem (viz getCameraImageSrc). */
export interface CameraAssetSet {
  normal: string[];
  monster: string[];
}

interface CameraAssetsEntry {
  /** Výchozí sada obrázků pro danou kameru. */
  default: CameraAssetSet;
  /**
   * Alternativní sada, když je zapnuté světlo do chodby (`state.lightOn`) —
   * zatím jen `door_hallway` (viz `resolveAssetSet`). Ostatní kamery světlo
   * na obraz nemá vliv, žádný `lightOn` záznam nemají.
   */
  lightOn?: CameraAssetSet;
}

// Obrázky pro obsah detailu kamery (CameraView.tsx) — oddělené od
// CameraDefinition (cameras.object13.ts), ať jde snadno přidat/vyměnit sadu
// obrázků bez zásahu do herní konfigurace kamer. Soubory jsou v
// public/object_13/camera/<složka>/ (viz TECH_DESIGN.md "Kamerové assety").
// Prázdné pole = kamera zatím nemá (dostatek) vlastních obrázků — CameraView
// pak spadne zpět na dosavadní textový/placeholder vzhled (viz
// getCameraImageSrc níže).
//
// right_hallway zatím nemá žádný "monster" snímek (CCTV set bez záběru s
// monstrem) — getCameraImageSrc na to reaguje fallbackem na "normal" snímky
// místo pádu/prázdné obrazovky.
export const CAMERA_ASSETS: Record<CameraId, CameraAssetsEntry> = {
  outer_yard: {
    default: {
      normal: [
        "/object_13/camera/outdoor/outdoor_01.webp",
        "/object_13/camera/outdoor/outdoor_02.webp",
        "/object_13/camera/outdoor/outdoor_04.webp",
        "/object_13/camera/outdoor/outdoor_07.webp",
        "/object_13/camera/outdoor/outdoor_09.webp",
        "/object_13/camera/outdoor/outdoor_10.webp",
      ],
      monster: [
        "/object_13/camera/outdoor/outdoor_03_monster.webp",
        "/object_13/camera/outdoor/outdoor_05_monster.webp",
        "/object_13/camera/outdoor/outdoor_06_monster.webp",
        "/object_13/camera/outdoor/outdoor_08_monster.webp",
      ],
    },
  },
  right_hallway: {
    default: {
      normal: [
        "/object_13/camera/right_hallway/right_hallway_01.webp",
        "/object_13/camera/right_hallway/right_hallway_02.webp",
        "/object_13/camera/right_hallway/right_hallway_03.webp",
        "/object_13/camera/right_hallway/right_hallway_04.webp",
        "/object_13/camera/right_hallway/right_hallway_05.webp",
        "/object_13/camera/right_hallway/right_hallway_06.webp",
        "/object_13/camera/right_hallway/right_hallway_07.webp",
        "/object_13/camera/right_hallway/right_hallway_08.webp",
        "/object_13/camera/right_hallway/right_hallway_09.webp",
        "/object_13/camera/right_hallway/right_hallway_10.webp",
      ],
      monster: [],
    },
  },
  left_hallway: {
    default: {
      normal: [
        "/object_13/camera/left_hallway/left_hallway_01.webp",
        "/object_13/camera/left_hallway/left_hallway_02.webp",
        "/object_13/camera/left_hallway/left_hallway_03.webp",
        "/object_13/camera/left_hallway/left_hallway_04.webp",
        "/object_13/camera/left_hallway/left_hallway_05.webp",
        "/object_13/camera/left_hallway/left_hallway_07.webp",
        "/object_13/camera/left_hallway/left_hallway_09.webp",
      ],
      monster: [
        "/object_13/camera/left_hallway/left_hallway_06_monster.webp",
        "/object_13/camera/left_hallway/left_hallway_08_monster.webp",
        "/object_13/camera/left_hallway/left_hallway_10_monster.webp",
      ],
    },
  },
  door_hallway: {
    default: {
      normal: [
        "/object_13/camera/door_hallway/door_hallway_01.webp",
        "/object_13/camera/door_hallway/door_hallway_02.webp",
        "/object_13/camera/door_hallway/door_hallway_03.webp",
        "/object_13/camera/door_hallway/door_hallway_04.webp",
        "/object_13/camera/door_hallway/door_hallway_05.webp",
        "/object_13/camera/door_hallway/door_hallway_08.webp",
        "/object_13/camera/door_hallway/door_hallway_09.webp",
      ],
      monster: [
        "/object_13/camera/door_hallway/door_hallway_06_monster.webp",
        "/object_13/camera/door_hallway/door_hallway_07_monster.webp",
        "/object_13/camera/door_hallway/door_hallway_10_monster.webp",
      ],
    },
    // Světlo do chodby zapnuté — jiná sada snímků (jasnější chodba), stejné
    // rozdělení normal/monster. Viz resolveAssetSet.
    lightOn: {
      normal: [
        "/object_13/camera/door_hallway_light/door_hallway_light_01.webp",
        "/object_13/camera/door_hallway_light/door_hallway_light_02.webp",
        "/object_13/camera/door_hallway_light/door_hallway_light_03.webp",
        "/object_13/camera/door_hallway_light/door_hallway_light_04.webp",
        "/object_13/camera/door_hallway_light/door_hallway_light_05.webp",
        "/object_13/camera/door_hallway_light/door_hallway_light_08.webp",
        "/object_13/camera/door_hallway_light/door_hallway_light_09.webp",
      ],
      monster: [
        "/object_13/camera/door_hallway_light/door_hallway_light_06_monster.webp",
        "/object_13/camera/door_hallway_light/door_hallway_light_07_monster.webp",
        "/object_13/camera/door_hallway_light/door_hallway_light_10_monster.webp",
      ],
    },
  },
};

// Stáhne všechny kamerové snímky do cache prohlížeče na LoadingScreen (stejný
// vzor jako preloadBackgroundImages v game/visuals/backgroundImages.ts) — ať
// se detail kamery při první návštěvě dané kamery/stavu (monstrum/světlo)
// nezobrazí s prodlevou/probliknutím, i na horším připojení.
export function preloadCameraImages(): void {
  if (typeof window === "undefined") return;
  for (const entry of Object.values(CAMERA_ASSETS)) {
    for (const set of [entry.default, entry.lightOn]) {
      if (!set) continue;
      for (const src of [...set.normal, ...set.monster]) {
        const img = new Image();
        img.src = src;
      }
    }
  }
}

function resolveAssetSet(cameraId: CameraId, lightOn: boolean): CameraAssetSet {
  const entry = CAMERA_ASSETS[cameraId];
  if (lightOn && entry.lightOn) return entry.lightOn;
  return entry.default;
}

// Jednoduchý deterministický (ne Math.random) výběr z pole — stejná kamera +
// stejný stav (monstrum) vždy vrátí stejný obrázek, ať se obraz neseká při
// každém renderu detailu kamery. `seed` je jen vstup do hashe, žádný
// skutečný kryptografický požadavek.
function pickDeterministic(list: string[], seed: string): string | null {
  if (list.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return list[hash % list.length];
}

// Pomalé prostřídání mezi "normal" snímky podle uplynulého času směny — ne
// Math.random() (neseskakuje při každém renderu) a ne rychlá animace (mění
// se jen jednou za CAMERA_IMAGE_CYCLE_MS).
function pickCycling(list: string[], elapsedMs: number): string | null {
  if (list.length === 0) return null;
  const index = Math.floor(elapsedMs / CAMERA_IMAGE_CYCLE_MS) % list.length;
  return list[index];
}

/**
 * Vrátí src obrázku pro detail kamery podle toho, jestli je na ní podle
 * `enemyStage` vidět monstrum (viz CameraDefinition.enemyVisibleAtStage), a
 * podle `lightOn` (jen `door_hallway` má na to jinou sadu obrázků, viz
 * `resolveAssetSet`). Volá `CameraView.tsx`. `null` = kamera nemá vhodný
 * obrázek (prázdné pole nebo kamera bez definovaných assetů) — `CameraView`
 * pak zobrazí dosavadní textový/placeholder vzhled.
 */
export function getCameraImageSrc(
  cameraId: CameraId,
  hasMonster: boolean,
  lightOn: boolean,
  elapsedMs: number,
): string | null {
  const assets = CAMERA_ASSETS[cameraId];
  if (!assets) return null;
  const set = resolveAssetSet(cameraId, lightOn);

  if (hasMonster) {
    return pickDeterministic(set.monster, `${cameraId}:monster`) ?? pickCycling(set.normal, elapsedMs);
  }
  return pickCycling(set.normal, elapsedMs);
}
