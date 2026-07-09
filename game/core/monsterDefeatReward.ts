// Trvalá odměna za poražení monstra (true ending, viz zadání,
// game/core/monsterEnding.ts, components/screens/MonsterDefeatedScreen.tsx) —
// čistě lokální localStorage, stejný vzor jako deathCount.ts/bulbInventory.ts/
// survivedNights.ts, žádný backend/login/databáze. MVP: server profil pro
// tenhle typ trvalé odměny zatím neexistuje (jen Discord identita pro
// leaderboard, viz lib/auth/session.ts) — server persistence (aby odměna
// přežila i smazání prohlížeče, případně šla zobrazit v budoucím profilu) se
// má řešit později, viz report.
const MONSTER_DEFEAT_REWARD_STORAGE_KEY = "nocni-hlidac:object13:monster-defeat-reward";

export interface MonsterDefeatReward {
  /** `true` od prvního true endingu, navždy (žádný "reset"). */
  hasDefeatedMonster: boolean;
  /** `true` od prvního true endingu — odemyká dvouhlavňovku od noci 1 v každém dalším runu (viz shotgunEquipment.ts). */
  doubleBarrelUnlocked: boolean;
  /** Kolikrát celkem hráč monstrum poražil (za všechny runy dohromady) — zvyšuje se při KAŽDÉM true endingu, ne jen prvním. */
  monsterDefeatsCount: number;
}

function createDefaultMonsterDefeatReward(): MonsterDefeatReward {
  return { hasDefeatedMonster: false, doubleBarrelUnlocked: false, monsterDefeatsCount: 0 };
}

function isValidMonsterDefeatReward(value: unknown): value is MonsterDefeatReward {
  if (typeof value !== "object" || value === null) return false;
  const { hasDefeatedMonster, doubleBarrelUnlocked, monsterDefeatsCount } = value as Record<string, unknown>;
  return (
    typeof hasDefeatedMonster === "boolean" &&
    typeof doubleBarrelUnlocked === "boolean" &&
    typeof monsterDefeatsCount === "number"
  );
}

/** Bezpečné i mimo prohlížeč (SSR) nebo bez dostupného localStorage — vrátí výchozí (nic odemčené) stav, hra nespadne. */
export function getMonsterDefeatReward(): MonsterDefeatReward {
  if (typeof window === "undefined") return createDefaultMonsterDefeatReward();
  try {
    const raw = window.localStorage.getItem(MONSTER_DEFEAT_REWARD_STORAGE_KEY);
    if (raw === null) return createDefaultMonsterDefeatReward();
    const parsed: unknown = JSON.parse(raw);
    return isValidMonsterDefeatReward(parsed) ? parsed : createDefaultMonsterDefeatReward();
  } catch {
    return createDefaultMonsterDefeatReward();
  }
}

/**
 * Zaznamená jeden true ending — volat PŘESNĚ jednou, až po dokončení (nebo
 * přeskočení) MonsterDefeatedScreen cinematicu (viz
 * app/play/page.tsx#handleMonsterDefeatedCinematicComplete), NIKDY dřív (ne
 * jen podle `state.screen === "monsterDefeated"` — cinematic ještě může
 * běžet) a nikdy víc než jednou za stejný true ending. Normal i Hardcore
 * odemykají stejnou odměnu (žádné rozlišení podle gameMode, viz zadání).
 * `monsterDefeatsCount` se zvyšuje při KAŽDÉM volání (i druhém, třetím...) —
 * `hasDefeatedMonster`/`doubleBarrelUnlocked` zůstávají `true` beze změny,
 * jakmile jsou jednou nastavené.
 */
export function recordMonsterDefeat(): MonsterDefeatReward {
  const current = getMonsterDefeatReward();
  const next: MonsterDefeatReward = {
    hasDefeatedMonster: true,
    doubleBarrelUnlocked: true,
    monsterDefeatsCount: current.monsterDefeatsCount + 1,
  };
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(MONSTER_DEFEAT_REWARD_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return current;
  }
}

/** Vrátí odměnu zpátky na výchozí (nic odemčené) stav — viz app/profile/page.tsx "Resetovat lokální profil". Dev/debug nástroj, ne herní mechanika. */
export function resetMonsterDefeatReward(): MonsterDefeatReward {
  const defaults = createDefaultMonsterDefeatReward();
  if (typeof window === "undefined") return defaults;
  try {
    window.localStorage.setItem(MONSTER_DEFEAT_REWARD_STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // Ignoruj — i kdyby se nepovedlo zapsat, hra nesmí spadnout.
  }
  return defaults;
}
