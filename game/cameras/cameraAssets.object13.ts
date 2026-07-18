import { CameraId, EnemyMoveDecision, EnemyStage } from "../core/types";
import { CAMERA_IMAGE_CYCLE_MS } from "../balancing/constants";

/**
 * Poslední rozhodnutí, po kterém monstrum reálně couvlo/uteklo pryč — jak ta
 * "sama si to rozmyslí" 10% šance v běžném ENEMY_ADVANCE (viz zadání "funguje
 * fleeing i při náhodném ústupu?"), tak aktivně vynucené ústupy (standoff u
 * dveří, světlo, UV). Cílevědomě NEZÁVISÍ na `monsterRetreatedTo`/
 * `monsterRetreatVerified` (viz getCameraImageSrc níže) — ty řídí
 * bezpečnost otevření dveří, ne obrázek.
 */
const RETREATING_DECISIONS: EnemyMoveDecision[] = [
  "retreat",
  "gave_up",
  "light_repelled",
  "hallway_light_repelled",
  "monster_hit_confirmed",
];

/**
 * normal = kamera bez monstra, monster = kamera s monstrem (nebezpečí),
 * fleeing = monstrum ustupuje/utíká pryč po "gave_up" standoffu u dveří —
 * hráč tímhle obrázkem vizuálně potvrzuje ústup (viz getCameraImageSrc,
 * monster_check_or_return v difficultyConfig.ts). Prázdné/chybějící pole je
 * pořád platný stav (fallback na "monster", viz getCameraImageSrc).
 */
export interface CameraAssetSet {
  normal: string[];
  monster: string[];
  fleeing: string[];
}

/** Exportované, ať jde referencovat z `game/enemies/monsterPresentation.ts` (Impova prezentace ukazuje na tenhle stejný registr, žádná duplicitní kopie). */
export interface CameraAssetsEntry {
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
// Prázdné/chybějící "monster" pole u libovolné kamery je stále platný stav —
// getCameraImageSrc na to reaguje fallbackem na "normal" snímky místo pádu/
// prázdné obrazovky (right_hallway dřív žádné monster snímky nemělo, teď má).
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
      fleeing: ["/object_13/camera/outdoor/outdoor_fleeing_monster.webp"],
    },
  },
  right_hallway: {
    default: {
      normal: [
        "/object_13/camera/right_hallway/right_hallway_01.webp",
        "/object_13/camera/right_hallway/right_hallway_02.webp",
        "/object_13/camera/right_hallway/right_hallway_04.webp",
        "/object_13/camera/right_hallway/right_hallway_06.webp",
        "/object_13/camera/right_hallway/right_hallway_08.webp",
        "/object_13/camera/right_hallway/right_hallway_09.webp",
      ],
      monster: [
        "/object_13/camera/right_hallway/right_hallway_03_monster.webp",
        "/object_13/camera/right_hallway/right_hallway_05_monster.webp",
        "/object_13/camera/right_hallway/right_hallway_07_monster.webp",
        "/object_13/camera/right_hallway/right_hallway_10_monster.webp",
      ],
      fleeing: ["/object_13/camera/right_hallway/right_hallway_fleeing_monster.webp"],
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
      fleeing: ["/object_13/camera/left_hallway/left_hallway_fleeing_monster.webp"],
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
      // door_hallway_10_monster.webp byl přejmenovaný na
      // door_hallway_10_monster_at_door.webp (viz DOOR_HALLWAY_AT_DOOR_ASSET
      // výše) — vyřazený odsud, ať se náhodou nevybere pro obyčejný
      // door_hallway monster stav (soubor pod původním názvem už neexistuje).
      monster: [
        "/object_13/camera/door_hallway/door_hallway_06_monster.webp",
        "/object_13/camera/door_hallway/door_hallway_07_monster.webp",
      ],
      fleeing: ["/object_13/camera/door_hallway/door_hallway_fleeing_monster.webp"],
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
      // Stejný důvod jako výše — door_hallway_light_10_monster.webp byl
      // přejmenovaný na _at_door variantu.
      monster: [
        "/object_13/camera/door_hallway_light/door_hallway_light_06_monster.webp",
        "/object_13/camera/door_hallway_light/door_hallway_light_07_monster.webp",
      ],
      fleeing: ["/object_13/camera/door_hallway_light/door_hallway_light_fleeing_monster.webp"],
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
      for (const src of [...set.normal, ...set.monster, ...set.fleeing]) {
        const img = new Image();
        img.src = src;
      }
    }
  }
  for (const src of [DOOR_HALLWAY_AT_DOOR_ASSET.default, DOOR_HALLWAY_AT_DOOR_ASSET.lightOn]) {
    const img = new Image();
    img.src = src;
  }
}

// Speciální jednorázový snímek jen pro door_hallway, když je enemyStage
// "at_door" — monstrum je fyzicky přímo u dveří, ne jen v chodbě před nimi.
// Má přednost před běžným monster/normal cyklováním (viz getCameraImageSrc
// níže) — hráč má na kameře dostat jasný vizuální cue "je extrémně blízko",
// ne obyčejný door_hallway monster snímek. Netýká se žádné jiné kamery ani
// jiné enemyStage.
const DOOR_HALLWAY_AT_DOOR_ASSET = {
  default: "/object_13/camera/door_hallway/door_hallway_10_monster_at_door.webp",
  lightOn: "/object_13/camera/door_hallway_light/door_hallway_light_10_monster_at_door.webp",
};

function resolveAssetSet(entry: CameraAssetsEntry, lightOn: boolean): CameraAssetSet {
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
 * Vrátí src obrázku pro detail kamery — priorita podle GAME_DESIGN.md
 * "Odchod monstra od dveří":
 *
 * 1. `monster_at_door` — `door_hallway` + `enemyStage === "at_door"`
 *    (monstrum je fyzicky u dveří, ne jen v chodbě před nimi) — přednost
 *    před vším ostatním, viz `DOOR_HALLWAY_AT_DOOR_ASSET` výše.
 * 2. `fleeing_monster` — monstrum se právě couvlo/uteklo pryč (poslední
 *    rozhodnutí je jedno z `RETREATING_DECISIONS` výše — jak vynucené ústupy
 *    (standoff u dveří, světlo, UV, potvrzený zásah), TAK obyčejná náhodná
 *    10% šance v ENEMY_ADVANCE, viz zadání "funguje fleeing i při náhodném
 *    ústupu?" — ANO, od teď). NEZÁVISÍ na `monsterRetreatedTo`/
 *    `monsterRetreatVerified` (ty řídí jen bezpečnost otevření dveří, viz
 *    zadání "ad2) fleeing monster i bez confirm loginu" z dřívějška) —
 *    obrázek zůstává, dokud příští `ENEMY_ADVANCE` nezmění `lastEnemyDecision`
 *    na něco jiného (advance/stay/atd.), ne dokud ho hráč "neověří". Chybí-li
 *    `fleeing` asset pro danou kameru, spadne zpět na běžný `monster` snímek.
 * 3. běžný `monster` — `hasMonster` bez podmínek výše (skutečné nebezpečí).
 * 4. `normal` — pomalé cyklování, žádné relevantní monstrum na kameře.
 *
 * `lightOn` mění jen sadu pro `door_hallway` (viz `resolveAssetSet`). `null`
 * = kamera nemá vhodný obrázek (prázdné pole/kamera bez assetů) —
 * `CameraView` pak zobrazí dosavadní textový/placeholder vzhled.
 *
 * `enemyStageVisitSeq` (viz GameState) je součástí seedu pro `monster`/
 * `fleeing` výběr (`pickDeterministic` níže) — bez něj by seed byl čistě
 * `cameraId`, tedy NAVŽDY stejný index pro danou kameru (viz zadání "pořád
 * ty samé"). S tímhle polem se obrázek vybere znovu při KAŽDÉM novém
 * příchodu monstra na kameru (enemyStage se změnil), ale zůstává stabilní
 * (nebliká), dokud tam beze změny stage zůstává — `pickDeterministic` pořád
 * není `Math.random()`, jen se mění, CO se hashuje.
 *
 * `cameraAssets` (viz zadání "první jednoduchá verze assetové definice
 * monster") — volitelný poslední parametr, výchozí hodnota je stejný
 * `CAMERA_ASSETS` registr jako dřív, takže VŠECHNA existující volání (testy,
 * `CameraView.tsx` bez předaného monstra) mají identický výstup jako před
 * touhle změnou. Volající, který zná aktivní `monsterId`
 * (`night.enemy.id`), mu předá `getMonsterDefinition(monsterId)?.presentation.camera`
 * (viz `game/enemies/monsterDefinitions.ts`) — to je jediné místo, kde se
 * "kamerový resolver napojuje na Impovu definici", žádná změna algoritmu
 * výběru samotného.
 */
export function getCameraImageSrc(
  cameraId: CameraId,
  hasMonster: boolean,
  lightOn: boolean,
  elapsedMs: number,
  enemyStage?: EnemyStage,
  lastEnemyDecision?: EnemyMoveDecision,
  enemyStageVisitSeq: number = 0,
  cameraAssets: Record<CameraId, CameraAssetsEntry> = CAMERA_ASSETS,
): string | null {
  const assets = cameraAssets[cameraId];
  if (!assets) return null;

  if (cameraId === "door_hallway" && enemyStage === "at_door") {
    return lightOn ? DOOR_HALLWAY_AT_DOOR_ASSET.lightOn : DOOR_HALLWAY_AT_DOOR_ASSET.default;
  }

  const set = resolveAssetSet(assets, lightOn);

  const isFleeingRetreat = hasMonster && lastEnemyDecision !== undefined && RETREATING_DECISIONS.includes(lastEnemyDecision);

  if (isFleeingRetreat) {
    const fleeing = pickDeterministic(set.fleeing, `${cameraId}:fleeing:${enemyStageVisitSeq}`);
    if (fleeing) return fleeing;
    // Chybějící fleeing asset pro tuhle kameru — fallback na běžný monster
    // snímek níže, ne pád/prázdná obrazovka.
  }

  if (hasMonster) {
    return pickDeterministic(set.monster, `${cameraId}:monster:${enemyStageVisitSeq}`) ?? pickCycling(set.normal, elapsedMs);
  }
  return pickCycling(set.normal, elapsedMs);
}
