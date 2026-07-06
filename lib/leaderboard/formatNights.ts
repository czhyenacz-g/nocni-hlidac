/**
 * Správné české skloňování počtu nocí — 1 noc, 2-4 noci, 0/5+ nocí. Čistá
 * pomocná funkce, ne text v `content/copy.ts`, protože jde o gramatickou
 * logiku (pluralizace), ne jen o vyměnitelný text.
 */
export function formatNights(count: number): string {
  if (count === 1) return "1 noc";
  if (count >= 2 && count <= 4) return `${count} noci`;
  return `${count} nocí`;
}
