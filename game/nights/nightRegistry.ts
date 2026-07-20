import { NightDefinition } from "../core/types";
import { NIGHT_01 } from "./night01";
import { NIGHT_15 } from "./night15";

// Jediné místo, které rozhoduje "kolikátá noc -> která NightDefinition" (viz
// zadání "7. 15. noc... Nedělej hardcode v React komponentě typu if day ===
// 15... Použij současnou architekturu"). `titanNights` (viz
// game/core/titanEncounterNights.ts) je persistovaná trojice náhodně
// vylosovaných čísel PRO AKTUÁLNÍ PRŮCHOD — `night15.ts`/`NIGHT_15` zůstává
// jediná Titanova `NightDefinition` (název souboru je teď jen historický,
// stejná definice se použije pro KTEROUKOLIV ze tří vylosovaných nocí, ne
// jen pro noc 15 doslova).
export function resolveNightDefinition(nightNumber: number, titanNights: number[]): NightDefinition {
  if (titanNights.includes(nightNumber)) return NIGHT_15;
  return NIGHT_01;
}
