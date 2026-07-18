import { CameraId } from "../core/types";
import { CAMERA_ASSETS, CameraAssetsEntry } from "../cameras/cameraAssets.object13";
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
   * Kamerové assety monstra — STEJNÁ struktura jako dosavadní `CAMERA_ASSETS`
   * (podle `CameraId`), jen dosažitelná přes prezentaci monstra. Reference na
   * existující registr, ne kopie dat.
   */
  camera: Record<CameraId, CameraAssetsEntry>;
  outcomes: MonsterOutcomePresentation;
}

export const IMP_PRESENTATION: MonsterPresentation = {
  camera: CAMERA_ASSETS,
  outcomes: {
    // Současná smrt hráče (viz DeathScreen.tsx, BACKGROUND_SCENES.death) —
    // beze změny průběhu, jen nově dosažitelná i přes prezentaci.
    playerKill: { default: "death" },
    // Současná porážka monstra (viz MonsterDefeatedScreen.tsx, BACKGROUND_SCENES.monsterDefeated).
    monsterDeath: "monsterDefeated",
    // doorAttackFailed záměrně chybí — viz komentář u typu výše.
  },
};
