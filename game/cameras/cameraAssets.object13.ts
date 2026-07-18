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

/**
 * Obecný, monstrum-agnostický tvar — jeden záznam v kterémkoliv monster
 * `presentation.camera` registru (viz zadání "dokončit skutečné vlastnictví
 * kamerových assetů monstrem"). Tenhle soubor sám žádný konkrétní monster
 * registr (Imp/Titan/...) NEOBSAHUJE ani neimportuje — jen definuje tvar dat
 * a čisté funkce, které je zpracují. Konkrétní data (`IMP_CAMERA_ASSETS`)
 * žijí v `game/enemies/monsterPresentation.ts`.
 */
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

/**
 * Stage-specific kamerový obraz monstra (viz zadání "přesuň at_door asset
 * pod IMP presentation") — pro `EnemyStage` hodnoty, které NEJSOU 1:1
 * `CameraId` (např. `"at_door"` nemá vlastní kameru, jen speciální obraz na
 * kameře `door_hallway`). Pole variant, ne jediný string — dnes má Imp jen
 * jednu variantu pro `at_door`, ale typ počítá s tím, že jich může být víc
 * (stejný `pickDeterministic` mechanismus jako `monster`/`fleeing` výběr).
 */
export interface MonsterStageCameraPresentation {
  default: string[];
  lightOn?: string[];
}

/**
 * Stáhne do cache prohlížeče všechny snímky ZE VSTUPU (stejný vzor jako
 * `preloadBackgroundImages` v `game/visuals/backgroundImages.ts`) — ať se
 * detail kamery při první návštěvě dané kamery/stavu nezobrazí s prodlevou/
 * probliknutím. Obecná funkce, žádná konkrétní monster data — volající
 * (`LoadingScreen.tsx`) jí předá `getMonsterDefinition(monsterId)?.presentation`
 * aktivního monstra, stejně jako `getCameraImageSrc` výše.
 */
export function preloadCameraImages(
  cameraAssets: Record<CameraId, CameraAssetsEntry>,
  cameraByEnemyStage?: Partial<Record<EnemyStage, MonsterStageCameraPresentation>>,
): void {
  if (typeof window === "undefined") return;
  for (const entry of Object.values(cameraAssets)) {
    for (const set of [entry.default, entry.lightOn]) {
      if (!set) continue;
      for (const src of [...set.normal, ...set.monster, ...set.fleeing]) {
        const img = new Image();
        img.src = src;
      }
    }
  }
  if (!cameraByEnemyStage) return;
  for (const stagePresentation of Object.values(cameraByEnemyStage)) {
    if (!stagePresentation) continue;
    for (const src of [...stagePresentation.default, ...(stagePresentation.lightOn ?? [])]) {
      const img = new Image();
      img.src = src;
    }
  }
}

function resolveAssetSet(entry: CameraAssetsEntry, lightOn: boolean): CameraAssetSet {
  if (lightOn && entry.lightOn) return entry.lightOn;
  return entry.default;
}

// Jednoduchý deterministický (ne Math.random) výběr z pole — stejná kamera +
// stejný stav (monstrum) vždy vrátí stejný obrázek, ať se obraz neseká při
// každém renderu detailu kamery. `seed` je jen vstup do hashe, žádný
// skutečný kryptografický požadavek.
function pickDeterministic(list: readonly string[], seed: string): string | null {
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
 * 1. stage-specific obraz aktivního monstra (viz `cameraByEnemyStage`) — jen
 *    pro `cameraId === "door_hallway" && enemyStage === "at_door"` (stejná
 *    dvojpodmínka jako dřívější hardcoded `DOOR_HALLWAY_AT_DOOR_ASSET`
 *    speciál — "at_door" nemá vlastní kameru v `CameraDefinition`/
 *    `enemyVisibleAtStage` systému, je to jen speciální obraz zobrazovaný NA
 *    kameře `door_hallway`, viz `cameras.object13.ts`). Bez tyhle dvojpodmínky
 *    by monstrum "u dveří" tiše přebilo obraz i na ostatních třech kamerách,
 *    kde se nikdy nezobrazovalo — ne obecná "libovolná kamera+stage"
 *    podmínka. Pokud pro tenhle pár žádná stage-specific prezentace NENÍ
 *    (chybí klíč, nebo její pole je prázdné), pokračuje se BĚŽNOU logikou
 *    níže — nikdy se tiše nepoužije jiná (cizí) prezentace jako záskok.
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
 * `fleeing`/stage-specific výběr (`pickDeterministic` níže) — bez něj by
 * seed byl čistě `cameraId`, tedy NAVŽDY stejný index pro danou kameru (viz
 * zadání "pořád ty samé"). S tímhle polem se obrázek vybere znovu při
 * KAŽDÉM novém příchodu monstra na kameru (enemyStage se změnil), ale
 * zůstává stabilní (nebliká), dokud tam beze změny stage zůstává —
 * `pickDeterministic` pořád není `Math.random()`, jen se mění, CO se hashuje.
 *
 * `cameraAssets`/`cameraByEnemyStage` (viz zadání "dokončit skutečné
 * vlastnictví kamerových assetů monstrem") — POVINNÉ parametry, žádný
 * výchozí fallback. Tahle funkce záměrně NEZNÁ žádné konkrétní monstrum
 * (žádný import z game/enemies/) — volající (CameraView.tsx) je získá přes
 * `getMonsterDefinition(monsterId)?.presentation` a předá explicitně. Pokud
 * volající aktivní monstrum/prezentaci nezná, je to JEHO odpovědnost to
 * řešit (fail-fast), ne tichý pád na cizí/výchozí assety tady.
 */
export function getCameraImageSrc(
  cameraId: CameraId,
  hasMonster: boolean,
  lightOn: boolean,
  elapsedMs: number,
  enemyStage: EnemyStage | undefined,
  lastEnemyDecision: EnemyMoveDecision | undefined,
  enemyStageVisitSeq: number,
  cameraAssets: Record<CameraId, CameraAssetsEntry>,
  cameraByEnemyStage?: Partial<Record<EnemyStage, MonsterStageCameraPresentation>>,
): string | null {
  const assets = cameraAssets[cameraId];
  if (!assets) return null;

  if (cameraId === "door_hallway" && enemyStage === "at_door") {
    const stagePresentation = cameraByEnemyStage?.[enemyStage];
    if (stagePresentation) {
      const variants = lightOn && stagePresentation.lightOn ? stagePresentation.lightOn : stagePresentation.default;
      const picked = pickDeterministic(variants, `${cameraId}:${enemyStage}:${enemyStageVisitSeq}`);
      if (picked) return picked;
      // Prázdná/chybějící varianta pro tenhle konkrétní stav — pokračuje se
      // běžnou logikou níže, ne pád/prázdná obrazovka.
    }
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
