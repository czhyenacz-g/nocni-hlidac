// Barvy, které zůstávají výrazné i při vysoké desaturaci (nastavují se přes CSS proměnné).
export const PALETTE = {
  warningRed: "#ff3b3b",
  okGreen: "#4ade80",
  hallwayLight: "#ffd166",
  // Panel energie je neutrálně šedý bez ohledu na úroveň (viz zadání
  // "nemá přeskakovat mezi neonově zelenou, žlutou a červenou") — kritický
  // stav místo toho signalizuje text procent v PowerMeter.tsx, ne barva
  // pruhu, takže tahle barva je jen jedna společná hodnota pro celou lištu.
  powerBar: "#d1d5db",
  doorButton: "#38bdf8",
} as const;
