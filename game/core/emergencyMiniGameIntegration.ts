import { MAX_POWER } from "../balancing/constants";
import { NightFeatureFlags } from "../difficulty/nightConfig";
import { EmergencyMiniGameInput, EmergencyWorldEffect } from "../minigame/types";

// První tenké napojení EmergencyMiniGame (game/minigame/*) do hlavní hry
// (/play) — viz app/play/page.tsx#handleStartEmergencyRun/
// handleEmergencyMiniGameComplete. Čisté, testovatelné funkce; žádný React,
// žádná znalost GameState celého tvaru (jen `power`/worldEffects), ať se dá
// snadno testovat bez reduceru.

/**
 * Vstup pro "Jít ven pro baterii" — první integrovaný scénář, záměrně bez
 * brokovnice/nábojů (stealth varianta). Brokovnici a munici napojíme později
 * (viz zadání).
 */
export function createBatteryEmergencyInput(): EmergencyMiniGameInput {
  return {
    objective: "collect_item",
    itemToCollect: "battery",
    equipment: { hasShotgun: false, ammo: 0 },
    difficulty: "medium",
    startLocation: "office",
  };
}

/**
 * Aplikuje worldEffects z returned resultu na aktuální energii hlavní hry —
 * čistá funkce, vrací nový (clampnutý na MAX_POWER) power. Zatím podporuje
 * jen "energy_recharged" (sečte všechny výskyty, kdyby jich bylo víc);
 * ostatní typy efektů (generator_repaired, bulbs_serviced, shotgun_acquired,
 * ammo_acquired) jsou zatím bezpečně no-op — hra kvůli nim nesmí spadnout,
 * jen zatím nic nedělají (napojí se v dalších krocích).
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
