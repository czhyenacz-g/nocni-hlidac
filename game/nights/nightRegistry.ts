import { NightDefinition } from "../core/types";
import { TITAN_NIGHT_NUMBER } from "../balancing/constants";
import { NIGHT_01 } from "./night01";
import { NIGHT_15 } from "./night15";

// Jediné místo, které rozhoduje "kolikátá noc -> která NightDefinition" (viz
// zadání "7. 15. noc... Nedělej hardcode v React komponentě typu if day ===
// 15... Použij současnou architekturu"). Dřív žádný takový registr
// neexistoval — `app/play/page.tsx` byl navždy pevně svázaný s NIGHT_01 (viz
// zadání kontext) — tahle funkce je nový, ale jediný zdroj pravdy, na který
// se `app/play/page.tsx` teď odkazuje místo přímého importu NIGHT_01.
export function resolveNightDefinition(nightNumber: number): NightDefinition {
  if (nightNumber === TITAN_NIGHT_NUMBER) return NIGHT_15;
  return NIGHT_01;
}
