import type { Language } from "../../game/i18n/language";

/**
 * Skloňování počtu nocí podle jazyka (cs: 1 noc, 2-4 noci, 0/5+ nocí; en:
 * 1 night, jinak nights) — čistá pomocná funkce, ne text v `content/copy.ts`,
 * protože jde o gramatickou logiku (pluralizace), ne jen o vyměnitelný text
 * (viz i18n — stejný důvod, proč `COPY.win.survivedNightsLabel` má
 * one/few/many varianty místo jednoho řetězce).
 */
export function formatNights(count: number, language: Language = "cs"): string {
  if (language === "en") {
    return count === 1 ? "1 night" : `${count} nights`;
  }
  if (count === 1) return "1 noc";
  if (count >= 2 && count <= 4) return `${count} noci`;
  return `${count} nocí`;
}
