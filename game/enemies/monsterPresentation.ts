import { CameraId, EnemyStage } from "../core/types";
import { CameraAssetsEntry, MonsterStageCameraPresentation } from "../cameras/cameraAssets.object13";
import { BackgroundSceneId } from "../visuals/backgroundImages";

// Assetová prezentace monstra (viz zadání "první jednoduchá verze assetové
// definice pro Impa", sjednoceno v kroku "sjednoť definici Impa" do
// `MonsterDefinition.presentation`, viz monsterDefinitions.ts#IMP) — typy a
// samotný `IMP_PRESENTATION` objekt zůstávají tady (čistý DAG: tenhle soubor
// importuje jen z core/types.ts, cameras/, visuals/, nikdy z
// monsterDefinitions.ts), ale ŽÁDNÝ vlastní registr/resolver už neexistuje —
// jediný registr hlavních monster je `MONSTER_REGISTRY` v
// monsterDefinitions.ts, přístupný přes `getMonsterDefinition(monsterId).presentation`.
// Pokrývá VÝHRADNĚ to, co zadání vyžaduje: kamerové assety a výsledkové
// sekvence (playerKill.default, volitelně doorAttackFailed a monsterDeath).
// Žádný animační engine, žádný event systém, žádný fallback mezi monstry
// (dnes existuje jen Imp).

export interface MonsterOutcomePresentation {
  /** Smrt hráče (viz zadání "playerKill.default") — dnes jediná varianta, žádné playerKill.openDoor/breachedDoor. */
  playerKill: { default: BackgroundSceneId };
  /**
   * Vizuál pro "útok na zavřené dveře zablokován" — dnes nemá vlastní
   * samostatnou vizuální sekvenci (jen zvuk `monster_door_bang`, viz
   * gameReducer.ts), takže záměrně chybí (viz zadání "nech volitelné,
   * nenapojuj uměle").
   */
  doorAttackFailed?: BackgroundSceneId;
  /** Porážka monstra hráčem (true ending) — existující samostatná sekvence, viz BACKGROUND_SCENES.monsterDefeated. */
  monsterDeath?: BackgroundSceneId;
}

export interface MonsterPresentation {
  /**
   * Kamerové assety monstra podle `CameraId` — vlastní data monstra, ne
   * sdílený univerzální registr (viz zadání "dokončit skutečné vlastnictví
   * kamerových assetů monstrem"). Pro Impa viz `IMP_CAMERA_ASSETS` níže.
   */
  camera: Record<CameraId, CameraAssetsEntry>;
  /**
   * Stage-specific kamerové obrázky monstra pro `EnemyStage` hodnoty, které
   * nemají vlastní `CameraId` (dnes jediný případ: `at_door`, zobrazovaný na
   * kameře `door_hallway` — viz `getCameraImageSrc` v cameraAssets.object13.ts).
   * Nepovinné — monstrum bez speciálních stage assetů ho prostě nemá.
   */
  cameraByEnemyStage?: Partial<Record<EnemyStage, MonsterStageCameraPresentation>>;
  outcomes: MonsterOutcomePresentation;
}

// Impovy vlastní kamerové assety (dřív univerzální `CAMERA_ASSETS` v
// cameraAssets.object13.ts — přesunuto sem, ať kamerový resolver zůstane
// monstrum-agnostický, viz zadání "dokončit skutečné vlastnictví"). Obsah,
// pořadí a fyzické cesty souborů beze změny oproti původnímu `CAMERA_ASSETS`.
export const IMP_CAMERA_ASSETS: Record<CameraId, CameraAssetsEntry> = {
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
      // door_hallway_10_monster_at_door.webp (viz IMP_PRESENTATION.cameraByEnemyStage.at_door
      // níže) — vyřazený odsud, ať se náhodou nevybere pro obyčejný
      // door_hallway monster stav (soubor pod původním názvem už neexistuje).
      monster: [
        "/object_13/camera/door_hallway/door_hallway_06_monster.webp",
        "/object_13/camera/door_hallway/door_hallway_07_monster.webp",
      ],
      fleeing: ["/object_13/camera/door_hallway/door_hallway_fleeing_monster.webp"],
    },
    // Světlo do chodby zapnuté — jiná sada snímků (jasnější chodba), stejné
    // rozdělení normal/monster. Viz resolveAssetSet v cameraAssets.object13.ts.
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

// Titan (viz zadání "9. TITAN CAMERA VISUALS") zatím nemá vlastní kamerový
// art pro žádnou z běžných stage — VŠECHNY čtyři CameraId dostávají prázdné
// sady. `getCameraImageSrc` (cameraAssets.object13.ts) je navržené přesně
// pro tenhle případ: prázdné pole -> `pickCycling`/`pickDeterministic`
// vrátí `null` -> volající (CameraView.tsx) zobrazí základní prázdnou
// kameru bez monstra, hra nikdy nespadne na chybějícím assetu. Titanovy
// DVEŘNÍ vizuály (at_door/breach/attack/overload) jsou samostatné a už plně
// hotové — viz game/visuals/titanDoorAssets.ts, DoorView.tsx — tenhle
// registr se jich netýká (DoorView vůbec nečte `presentation.camera`).
export const TITAN_CAMERA_ASSETS: Record<CameraId, CameraAssetsEntry> = {
  outer_yard: { default: { normal: [], monster: [], fleeing: [] } },
  right_hallway: { default: { normal: [], monster: [], fleeing: [] } },
  left_hallway: { default: { normal: [], monster: [], fleeing: [] } },
  door_hallway: { default: { normal: [], monster: [], fleeing: [] } },
};

export const TITAN_PRESENTATION: MonsterPresentation = {
  camera: TITAN_CAMERA_ASSETS,
  // Žádný cameraByEnemyStage (Titanovo "at_door" na kameře door_hallway
  // zatím taky nemá vlastní obrázek — stejný bezpečný fallback jako výše).
  outcomes: {
    // GameOverReveal (game/death/gameOverReveal.ts) používá pro Titana
    // titan_attacks_broken_door.webp PŘÍMO (mimo BACKGROUND_SCENES), takže
    // playerKill.default tady nikdy nedostane šanci se skutečně vykreslit —
    // pole je ale povinné (viz MonsterOutcomePresentation), takže dostává
    // stejnou hodnotu jako Imp jako bezpečný, nikdy-nepoužitý fallback.
    playerKill: { default: "death" },
  },
};

export const IMP_PRESENTATION: MonsterPresentation = {
  camera: IMP_CAMERA_ASSETS,
  cameraByEnemyStage: {
    // Monstrum fyzicky u dveří (ne jen v chodbě před nimi) — přednost před
    // běžným door_hallway monster/normal cyklováním, viz getCameraImageSrc.
    // Dnes jediná varianta v poli, ale mechanismus (pickDeterministic) je
    // připravený i na víc variant beze změny chování.
    at_door: {
      default: ["/object_13/camera/door_hallway/door_hallway_10_monster_at_door.webp"],
      lightOn: ["/object_13/camera/door_hallway_light/door_hallway_light_10_monster_at_door.webp"],
    },
  },
  outcomes: {
    // Současná smrt hráče (viz DeathScreen.tsx, BACKGROUND_SCENES.death) —
    // beze změny průběhu, jen nově dosažitelná i přes prezentaci.
    playerKill: { default: "death" },
    // Současná porážka monstra (viz MonsterDefeatedScreen.tsx, BACKGROUND_SCENES.monsterDefeated).
    monsterDeath: "monsterDefeated",
    // doorAttackFailed záměrně chybí — viz komentář u typu výše.
  },
};
