import { MAX_POWER } from "../balancing/constants";
import { NightFeatureFlags } from "../difficulty/nightConfig";
import { EmergencyMiniGameEquipment, EmergencyMiniGameInput, EmergencyWorldEffect, MiniGameItemId } from "../minigame/types";
import { SERVICE_FLOOR_EVAC_PLAN } from "../minigame/layouts/serviceFloorEvacPlan";

// První tenké napojení EmergencyMiniGame (game/minigame/*) do hlavní hry
// (/play) — viz app/play/page.tsx#handleStartEmergencyRun/
// handleEmergencyMiniGameComplete. Čisté, testovatelné funkce; žádný React,
// žádná znalost GameState celého tvaru (jen `power`/worldEffects), ať se dá
// snadno testovat bez reduceru.

/**
 * Mapa pro skutečný "Jít ven pro baterii" běh z hlavní hry — čte se z
 * layout registru (`SERVICE_FLOOR_EVAC_PLAN.id`), NIKDY jako magic string
 * napsaný přímo tady, ať typo v id nikdy neproklouzne beze změny za
 * kompilace. `service_floor_alpha`/`service_floor_storage` zůstávají
 * nezměněné a dál dostupné jako baseline/debug layouty na `/minihra` (viz
 * game/minigame/debugScenarios.ts) — tahle konstanta mění jen výchozí mapu
 * pro TENHLE jeden konkrétní scénář (battery run), ne layout registr samotný.
 * Až bude potřeba měnit mapu podle noci/obtížnosti/typu mise, je tohle
 * jediné místo, které se bude muset upravit.
 */
export const DEFAULT_BATTERY_RUN_LAYOUT_ID = SERVICE_FLOOR_EVAC_PLAN.id;

/**
 * Vstup pro "Jít ven pro baterii" — první integrovaný scénář. `equipment` je
 * od teď povinný parametr (dřív natvrdo `{ hasShotgun: false, ammo: 0 }`,
 * stealth varianta) — volající (app/play/page.tsx) pošle SKUTEČNOU výbavu
 * hráče (`{ hasShotgun: state.hasShotgun, ammo: state.shotgunAmmo }`, viz
 * zadání "equipment podle hlavního GameState"), ať hráč, který už brokovnici
 * má, není v žádné emergency výpravě bezbranný. `layoutId` je od teď
 * explicitní (viz DEFAULT_BATTERY_RUN_LAYOUT_ID) — chybějící/neplatné id by
 * se v EmergencyMiniGame.tsx bezpečně vrátilo na service_floor_alpha (viz
 * getMiniGameLayout), ale odsud vždy posíláme skutečné `.id` existujícího
 * layoutu, takže tenhle fallback se v praxi nikdy neuplatní.
 */
export function createBatteryEmergencyInput(
  equipment: EmergencyMiniGameEquipment,
  extraLootItems: MiniGameItemId[] = [],
  monsterHitsToday?: number,
  monsterHitsRequiredForFinal?: number,
  officeDoorLockMs?: number,
  monsterAlreadyDefeatedTonight?: boolean,
): EmergencyMiniGameInput {
  return {
    objective: "collect_item",
    itemToCollect: "battery",
    extraLootItems,
    equipment,
    difficulty: "medium",
    startLocation: "office",
    layoutId: DEFAULT_BATTERY_RUN_LAYOUT_ID,
    monsterHitsToday,
    monsterHitsRequiredForFinal,
    officeDoorLockMs,
    monsterAlreadyDefeatedTonight,
  };
}

/**
 * Vstup pro "Jít ven pro brokovnici" — nabídne se místo battery runu, jen
 * když je to podle `canStartShotgunEmergencyRun` (viz níže) skutečně na
 * pořadu (noc 10+, hráč ji ještě nemá). Stejná mapa jako battery run
 * (`service_floor_evac_plan` už má slot otagovaný `"shotgun"`, viz
 * game/minigame/layouts/serviceFloorEvacPlan.ts) — žádná nová mapa zatím
 * není potřeba. `equipment` stejně jako u battery runu: skutečná aktuální
 * výbava hráče, ne natvrdo prázdná.
 */
export function createShotgunEmergencyInput(
  equipment: EmergencyMiniGameEquipment,
  extraLootItems: MiniGameItemId[] = [],
  monsterHitsToday?: number,
  monsterHitsRequiredForFinal?: number,
  officeDoorLockMs?: number,
  monsterAlreadyDefeatedTonight?: boolean,
): EmergencyMiniGameInput {
  return {
    objective: "collect_item",
    itemToCollect: "shotgun",
    extraLootItems,
    equipment,
    difficulty: "medium",
    startLocation: "office",
    layoutId: DEFAULT_BATTERY_RUN_LAYOUT_ID,
    monsterHitsToday,
    monsterHitsRequiredForFinal,
    officeDoorLockMs,
    monsterAlreadyDefeatedTonight,
  };
}

/**
 * Doplňkový loot vždy dostupný na mapě NAVÍC k hlavnímu objective (viz
 * zadání "sandbox výprava") — battery/bulb garantované na KAŽDÉ výpravě,
 * shotgun podmíněně podle `canStartShotgunEmergencyRun` (noc 10+, hráč ho
 * ještě nemá). `primaryItemId` (co je zrovna hlavní objective) se z výsledku
 * vynechá, ať se stejná položka nežádá dvakrát (viz
 * game/minigame/layoutPlacement.ts#resolveMiniGamePlacement — dvě položky by
 * si jinak konkurovaly o stejný tag/slot).
 */
export function resolveExtraLootItems(input: {
  primaryItemId: MiniGameItemId;
  nightFeatures: Pick<NightFeatureFlags, "emergencyRunsEnabled" | "shotgunLootEnabled">;
  hasShotgun: boolean;
}): MiniGameItemId[] {
  const items: MiniGameItemId[] = [];
  if (input.primaryItemId !== "battery") items.push("battery");
  if (input.primaryItemId !== "bulb") items.push("bulb");
  if (input.primaryItemId !== "shotgun" && canStartShotgunEmergencyRun(input.nightFeatures, input.hasShotgun)) {
    items.push("shotgun");
  }
  return items;
}

/**
 * Aplikuje worldEffects z returned resultu na aktuální energii hlavní hry —
 * čistá funkce, vrací nový (clampnutý na MAX_POWER) power. Zatím podporuje
 * jen "energy_recharged" (sečte všechny výskyty, kdyby jich bylo víc);
 * `generator_repaired`/`bulbs_serviced` jsou zatím bezpečně no-op — hra kvůli
 * nim nesmí spadnout, jen zatím nic nedělají (napojí se v dalších krocích).
 * `shotgun_acquired`/`ammo_acquired` jsou tady taky no-op, ale NE proto, že by
 * nebyly napojené — brokovnici/náboj řeší samostatná funkce
 * `applyShotgunEmergencyReturn` (viz game/core/shotgunEquipment.ts), volaná
 * vedle tyhle funkce v app/play/page.tsx#handleEmergencyMiniGameComplete, ne
 * uvnitř téhle (jiná část GameState = jiná čistá funkce).
 */
export function applyEmergencyWorldEffects(power: number, effects: EmergencyWorldEffect[] | undefined): number {
  if (!effects || effects.length === 0) return power;

  const rechargeAmount = effects.reduce((total, effect) => {
    return effect.type === "energy_recharged" ? total + effect.amount : total;
  }, 0);

  return Math.min(MAX_POWER, power + rechargeAmount);
}

/**
 * Jestli je "Jít ven pro baterii" tuhle noc vůbec dostupné (viz
 * NightFeatureFlags.emergencyRunsEnabled/batteryRunEnabled v
 * game/difficulty/nightConfig.ts) — vyžaduje OBA flagy, ne jen jeden.
 * Jediné místo, které tohle rozhoduje — LeftWallView (zobrazení tlačítka) i
 * app/play/page.tsx#handleStartEmergencyRun (skutečné spuštění) na něj musí
 * spoléhat, ať se UI a logika nemůžou rozejít.
 */
export function canStartBatteryEmergencyRun(nightFeatures: Pick<NightFeatureFlags, "emergencyRunsEnabled" | "batteryRunEnabled">): boolean {
  return nightFeatures.emergencyRunsEnabled && nightFeatures.batteryRunEnabled;
}

/**
 * Jestli má "Jít ven" TEĎ nabídnout brokovnici místo baterie — vyžaduje
 * `emergencyRunsEnabled` (zastřešující flag, stejně jako battery run výše),
 * `shotgunLootEnabled` (noc 10+, viz game/difficulty/nightConfig.ts) A
 * hráč ji ještě NEMÁ (viz zadání "po získání se další shotgun run/loot
 * nemá nabízet"). Jediné místo, které tohle rozhoduje — app/play/page.tsx
 * na něj musí spoléhat při výběru, jaký EmergencyMiniGameInput sestavit,
 * ať se výběr mise a případné budoucí UI ("dá se najít brokovnice?") nikdy
 * nerozejdou.
 */
export function canStartShotgunEmergencyRun(
  nightFeatures: Pick<NightFeatureFlags, "emergencyRunsEnabled" | "shotgunLootEnabled">,
  hasShotgun: boolean,
): boolean {
  return nightFeatures.emergencyRunsEnabled && nightFeatures.shotgunLootEnabled && !hasShotgun;
}

/**
 * Jestli má app/play/page.tsx TEĎ (na tenhle konkrétní přechod
 * `emergencyRunReadySeq`) skutečně otevřít EmergencyMiniGame — jen při
 * SKUTEČNÉM nárůstu (`nextSeq > prevSeq`), ne při jakékoliv změně.
 *
 * Důvod: `emergencyRunReadySeq` se vrací na 0 při každé nové směně
 * (START_SHIFT/RESTART_SHIFT, viz createInitialGameState) — pokud hráč v
 * předchozí směně úspěšně dokončil držení "Jít ven" (seq > 0) a pak zemřel
 * uvnitř minihry, prostý `prevSeq !== nextSeq` diff by reset na 0 mylně
 * vyhodnotil jako "windup zrovna doběhl znovu" a EmergencyMiniGame by se
 * po nové hře otevřela hned zase, místo aby se hráč vrátil do kanceláře
 * (viz bug: smrt v minihře -> nová směna -> minihra se otevře znovu).
 */
export function shouldLaunchEmergencyMiniGame(prevSeq: number, nextSeq: number): boolean {
  return nextSeq > prevSeq;
}

/**
 * Kolik náhradních žárovek přibude do skladu (viz GameState.bulbsRemaining,
 * game/core/bulbInventory.ts) za tuhle výpravu — sečte všechny "bulbs_serviced"
 * efekty (v MVP nejvýš jeden, jedna žárovka na mapě, viz resolveExtraLootItems).
 * Používá existující bulbsRemaining sklad (app/play/page.tsx dispatchne
 * ADD_BULBS_REMAINING), ŽÁDNÝ nový paralelní systém — viz zadání "ověřit
 * napojení žárovky do hlavní hry".
 */
export function resolveBulbsGainedFromWorldEffects(effects: EmergencyWorldEffect[] | undefined): number {
  return (effects ?? []).filter((effect) => effect.type === "bulbs_serviced").length;
}

/**
 * Jestli monstrum během tyhle výpravy zamířilo na kancelář/generátor (viz
 * zadání "zamčené dveře", EmergencyWorldEffect "monster_reached_office",
 * EMERGENCY_MONSTER_OFFICE_TARGET_DELAY_MS v game/minigame/config.ts).
 * app/play/page.tsx na `true` reaguje stejně jako na existující
 * `officeThreatOnReturn` — dispatchne APPLY_OFFICE_THREAT_ON_RETURN (vysoká
 * intenzita, posune enemyStage blízko dveří/camera roomu), nikdy nezpůsobí
 * smrt přímo tady.
 */
export function resolveOfficeThreatTriggeredFromWorldEffects(effects: EmergencyWorldEffect[] | undefined): boolean {
  return (effects ?? []).some((effect) => effect.type === "monster_reached_office");
}
