/**
 * Text rádiové zprávy při prvním vstupu monstra do venkovní lokace (viz
 * radioTypes.ts#RADIO_TRIGGER_STAGE, zadání) — čistá funkce, žádný React ani
 * timer, ať jde otestovat samostatně. `nightNumber` se vkládá tak, jak
 * přijde (currentNight z app/play/page.tsx) — validace/fallback na "noc 1"
 * dělá už volající (getNightConfig i tady), tahle funkce sama nic nekontroluje.
 */
export function buildNightReleaseMessage(nightNumber: number): string {
  return `Testovací subjekt č. ${nightNumber} vypuštěn.`;
}
