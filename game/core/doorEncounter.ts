import { GameState } from "./types";
import { isNearRoomLightActive } from "./roomBulbs";

// Čisté, testovatelné pojmenování pro "monstrum u dveří" rozhodování — žádná
// nová herní logika, jen explicitní jména pro podmínky, které dřív žily jen
// jako anonymní inline výrazy uvnitř gameReducer.ts (ENEMY_ADVANCE,
// updateDoorLightRepel). gameReducer.ts tyhle helpery přímo používá, ať se
// stejná pravidla nikdy nerozejdou na dvou místech (helper vs. inline kopie).

/**
 * Jestli je monstrum fyzicky u dveří — "at_door" i "breach" (viz
 * EnemyStage/isAtDoorStage v gameReducer.ts, "breach" je zatím jen
 * připravená druhá stage se stejným chováním). Beze změny oproti dosavadní
 * `isAtDoorStage`, jen exportovaná pod jasnějším veřejným jménem.
 */
export function isMonsterAtDoor(state: GameState): boolean {
  return state.enemyStage === "at_door" || state.enemyStage === "breach";
}

/**
 * Jestli TENHLE tik u dveří vůbec dojde na vyhodnocení útoku — v současné
 * architektuře (viz ENEMY_ADVANCE) nepřítel u dveří žádný samostatný
 * "útočím / neútočím" hod nemá: pokaždé, když tam je, se útok vyhodnotí, a
 * jeho VÝSLEDEK (smrt vs. zablokováno) závisí jen na tom, jsou-li dveře
 * zavřené. Proto je "would attack" totožné s "is at door" — pojmenováno
 * zvlášť, ať je zadání (isDoorAttackBlockedByClosedDoor/isDoorAttackLethal
 * níže) čitelné jako "kdyby k útoku došlo", ne jako duplicitní podmínka.
 */
export function wouldMonsterAttackAtDoor(state: GameState): boolean {
  return isMonsterAtDoor(state);
}

/**
 * Přesně ten případ, kdy útok NASTANE, ale dveře ho zablokují — jediná
 * podmínka, za které smí zaznít bušení do dveří (monsterDoorBang, viz
 * doorBangSeq v types.ts). Nikdy náhodně/časem — jen jako přímý důsledek
 * téhle podmínky v ENEMY_ADVANCE.
 */
export function isDoorAttackBlockedByClosedDoor(state: GameState): boolean {
  return wouldMonsterAttackAtDoor(state) && state.doorClosed;
}

/**
 * Přesně ten případ, kdy útok NASTANE a dveře ho nezablokují — smrt hráče
 * (viz ENEMY_ADVANCE, deathReason "door_open_at_attack"/"bulb_replacement_attack").
 */
export function isDoorAttackLethal(state: GameState): boolean {
  return wouldMonsterAttackAtDoor(state) && !state.doorClosed;
}

/**
 * Jestli jsou splněné VŠECHNY podmínky pro to, aby světlo u dveří mělo šanci
 * zahnat monstrum — dveře zavřené, světlo skutečně zapnuté (viz
 * `state.lightOn`; prasklá žárovka/vypnutá feature se do `lightOn` promítne
 * dřív, než se sem dostane, takže nefér ústup bez svícení nehrozí), a
 * monstrum fyzicky u dveří. Samotný ústup NENÍ okamžitý — vyžaduje ještě
 * setrvalé splnění týhle podmínky po `night.enemy.doorLightRepelRequiredMs`
 * (viz updateDoorLightRepel v gameReducer.ts), tahle funkce jen říká, jestli
 * odpočet vůbec smí běžet.
 */
export function shouldDoorLightForceRetreat(state: GameState): boolean {
  return isMonsterAtDoor(state) && state.doorClosed && state.lightOn;
}

/**
 * Stejný princip jako `shouldDoorLightForceRetreat`, ale o krok dřív —
 * nepřítel v `door_hallway` (ne ještě u dveří), dveře zavřené, a UV
 * SKUTEČNĚ svítí (`isNearRoomLightActive`, ne jen `state.lightOn` — prasklá
 * žárovka nesmí mít repel efekt, i kdyby vypínač zůstal chybou zapnutý).
 * Stejně jako u `shouldDoorLightForceRetreat`, samotný ústup NENÍ okamžitý —
 * vyžaduje setrvalé splnění týhle podmínky po
 * `night.enemy.doorHallwayUvRepelRequiredMs` (výrazně delší než u dveří —
 * viz `gameReducer.ts#updateDoorHallwayUvRepel`), tahle funkce jen říká,
 * jestli odpočet vůbec smí běžet.
 */
export function shouldDoorHallwayUvForceRetreat(state: GameState): boolean {
  return state.enemyStage === "door_hallway" && state.doorClosed && isNearRoomLightActive(state);
}

/**
 * Jestli běží grace period po návratu z EmergencyMiniGame s aktivní
 * officeThreatOnReturn (viz GameState.enemyDoorAttackGraceUntilMs,
 * gameReducer.ts APPLY_OFFICE_THREAT_ON_RETURN) — jediné místo, kde se tenhle
 * časový check dělá, ať se ENEMY_ADVANCE a případný budoucí kód nikdy
 * nerozejdou. NEOVLIVŇUJE isDoorAttackBlockedByClosedDoor/isDoorAttackLethal
 * výše (ty zůstávají přesně stejné, beze změny běžného door encounter) —
 * volající si grace kontroluje sám, navíc, jen pro OTEVŘENÉ dveře.
 */
export function isDoorAttackGraceActive(state: GameState): boolean {
  return state.enemyDoorAttackGraceUntilMs !== null && state.elapsedMs < state.enemyDoorAttackGraceUntilMs;
}

/** Souhrnný, čistě diagnostický pohled na "door encounter" — viz DebugPanel.tsx, testy. Nic nerozhoduje, jen shrnuje výsledky helperů výše pro jedno místo ke čtení. */
export interface DoorMonsterEncounter {
  atDoor: boolean;
  wouldAttack: boolean;
  blockedByClosedDoor: boolean;
  lethal: boolean;
  lightForcingRetreat: boolean;
  /** Stejné jako `lightForcingRetreat`, ale pro pomalejší hallway UV repel (viz shouldDoorHallwayUvForceRetreat). */
  hallwayUvForcingRetreat: boolean;
}

export function resolveDoorMonsterEncounter(state: GameState): DoorMonsterEncounter {
  return {
    atDoor: isMonsterAtDoor(state),
    wouldAttack: wouldMonsterAttackAtDoor(state),
    blockedByClosedDoor: isDoorAttackBlockedByClosedDoor(state),
    lethal: isDoorAttackLethal(state),
    lightForcingRetreat: shouldDoorLightForceRetreat(state),
    hallwayUvForcingRetreat: shouldDoorHallwayUvForceRetreat(state),
  };
}
