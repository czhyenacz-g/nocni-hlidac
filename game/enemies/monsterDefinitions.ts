import { EnemyDefinition, MonsterAbilityId, MonsterId } from "../core/types";
import { IMP_PRESENTATION, MonsterPresentation } from "./monsterPresentation";

// JEDINÝ centrální registr hlavních monster (viz zadání "sjednoť definici
// Impa" — zrušen dřívější druhý paralelní `MONSTER_PRESENTATION_REGISTRY" v
// monsterPresentation.ts). `MonsterDefinition` žije tady, ne v
// game/core/types.ts — potřebuje `MonsterPresentation` (monsterPresentation.ts,
// ta sama importuje `CameraId` z core/types.ts), takže by definice v
// types.ts vytvořila cyklický import.

/**
 * Neměnná gameplay konfigurace hlavního monstra — přesně tvar
 * `EnemyDefinition` (game/core/types.ts) MINUS `id` (ten už má
 * `MonsterDefinition` vlastní, žádná duplicita). Šíře odpovídá
 * `EnemyDefinition` samotné: trasa/pravděpodobnosti postupu a ústupu,
 * dveřní encounter, repel časy a forced-retreat pravidla — ne jen "pohyb"
 * (proto `gameplay`, ne `movement`, viz zadání "oprav nepřesný název").
 * Runtime (`NightDefinition.enemy: EnemyDefinition`, viz
 * game/nights/night01.ts) si z ní sestaví kompatibilní objekt — viz
 * `game/enemies/imp.ts#IMP_ENEMY`, jediné místo, které tenhle přechodný
 * tvar vytváří, žádná druhá kopie hodnot.
 */
export type MonsterGameplayDefinition = Omit<EnemyDefinition, "id">;

/**
 * Identita, schopnosti, assetová prezentace A neměnná gameplay konfigurace
 * hlavního monstra — JEDEN zdroj pravdy pro "co Imp je a jak se chová".
 */
export interface MonsterDefinition {
  id: MonsterId;
  /** Zobrazované jméno monstra (dnes nikde v UI nekonzumované — připraveno pro budoucí použití). */
  displayName: string;
  abilities: MonsterAbilityId[];
  presentation: MonsterPresentation;
  gameplay: MonsterGameplayDefinition;
}

export const IMP: MonsterDefinition = {
  id: "imp",
  // Skutečný/interní název typu monstra (dev-facing, viz komentář u
  // displayName výše) — NENÍ totéž co `gameplay.name` níže.
  displayName: "Imp",
  // Ghoul zatím není samostatné hlavní monstrum (viz zadání) — schopnost
  // spustit jeho útok na kameru je v týhle první verzi přiřazená Impovi.
  abilities: ["summon_ghoul_camera_attack"],
  presentation: IMP_PRESENTATION,
  gameplay: {
    // Hráčsky zobrazovaný název, používaný současným EnemyDefinition/runtime
    // API (viz `game/core/types.ts#EnemyDefinition.name`) — schválně
    // NEODHALUJE, že jde o Impa. "Neznámá postava" je záměrný text pro
    // hráče (hlídač na začátku netuší, s čím má tu čest), ne duplicita ani
    // zapomenuté přejmenování `displayName` výše — obě pole existují vedle
    // sebe právě proto, že slouží každé jinému publiku (dev vs. hráč).
    name: "Neznámá postava",
    // Dvě stejně pravděpodobné varianty trasy — pravou nebo levou chodbou —
    // se losují jednou při startu směny (gameState.ts#pickRouteVariant), po
    // zbytek směny platí vylosovaná.
    routeVariants: [
      ["outside", "outer_yard", "right_hallway", "door_hallway", "at_door", "attack"],
      ["outside", "outer_yard", "left_hallway", "door_hallway", "at_door", "attack"],
    ],
    advanceChance: 0.16,
    // Zbytek pravděpodobnosti (1 - 0.16 - 0.10 = 0.74) znamená, že zůstává na místě.
    retreatChance: 0.1,
    // U dveří se vzdá po náhodných 6–8 s — nezávisle na světle (viz doorLightRepelRequiredMs
    // pro kombinovaný efekt zavřených dveří + světla, který je mnohem rychlejší a jasnější).
    doorHoldRangeMs: { min: 6000, max: 8000 },
    // Zavřené dveře + zapnuté světlo + u dveří po sobě 1.5 s -> okamžitý repel s řevem.
    doorLightRepelRequiredMs: 1500,
    // Stejná kombinace o krok dřív (door_hallway, ne až u dveří) je záměrně
    // pomalejší (~7 s) — slabší/pomalejší varovný nástroj, ne náhrada za
    // stejně rychlý at_door repel (viz doorHallwayUvRepelRequiredMs v types.ts).
    doorHallwayUvRepelRequiredMs: 7000,
    // Viditelný útěk po odražení (viz zadání "ať hráč vidí bestii utíkat, ne
    // teleport") — konkrétní čísla: světlo u dveří je nejsilnější a nejjistější
    // (100 % po ~11 s — dost na to, aby stihlo dojít celou trasou až na
    // "outside", 4 kroky po enemyTickMs 2 s, s rezervou), UV v door_hallway o
    // krok dřív je slabší (60 % po ~6.5 s), vzdání se timeoutem bez světla
    // (gave_up) nejslabší (40 % po ~10 s). Všechna okna jsou navíc dost dlouhá,
    // ať hráč stihne mezitím třeba vyměnit žárovku.
    forcedRetreatAfterLightRepel: { durationMs: 11_000, chance: 1 },
    forcedRetreatAfterUvRepel: { durationMs: 6_500, chance: 0.6 },
    forcedRetreatAfterGaveUp: { durationMs: 10_000, chance: 0.4 },
    monsterRetreatStage: "outside",
  },
};

const MONSTER_REGISTRY: Record<MonsterId, MonsterDefinition> = {
  imp: IMP,
};

/**
 * `monsterId` je typicky `night.enemy.id` (viz types.ts komentář u identity
 * monstra) — přijímá obecný `string`, ne jen `MonsterId`, protože volající
 * (např. testy s vymyšleným cizím id) nesmí spadnout na neznámé hodnotě.
 * Neznámé id vrací `undefined`, nikdy nevyhazuje.
 */
export function getMonsterDefinition(monsterId: string): MonsterDefinition | undefined {
  return MONSTER_REGISTRY[monsterId as MonsterId];
}

/** `false` i pro neznámé `monsterId` — stejný "nikdy nespadni na neznámém vstupu" princip jako getMonsterDefinition. */
export function monsterHasAbility(monsterId: string, abilityId: MonsterAbilityId): boolean {
  return getMonsterDefinition(monsterId)?.abilities.includes(abilityId) ?? false;
}
