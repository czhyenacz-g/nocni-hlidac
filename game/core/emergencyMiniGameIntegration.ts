import { MAX_POWER } from "../balancing/constants";
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
