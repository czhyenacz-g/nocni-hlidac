// Revize atmosféry (viz zadání "posun vizuálu od modře nasvíceného
// cyberpunkového UI k průmyslovému analogovému hororu") — čisté funkce, které
// převádí `tensionLevel` (0..1, game/visuals/atmosphereState.ts) na CSS
// filter parametry. Žádná náhodná/CSS logika rozesetá po komponentách —
// app/play/page.tsx jen zavolá `tensionToAtmosphereStyle` a předá výsledek
// jako CSS custom properties na `.atmosphere-root` (viz styles/atmosphere.css).
//
// Nepravidelné probliknutí žárovky (game/visuals/atmosphereFlicker.ts) je
// ZÁMĚRNĚ oddělené odsud — tenhle soubor řeší jen plynulou (transition-based)
// část atmosféry, flicker je vlastní event-driven systém (viz tam, důvod:
// "nesmí resetovat CSS transition").

export interface AtmosphereStyle {
  /** 1 = plná barva, 0 = černobílé. */
  saturation: number;
  /** 1 = normální, vyšší = tvrdší kontrast. */
  contrast: number;
  /** 1 = normální, nižší = tmavší (jemné, ne dramatické — viz zadání "jas má mírně klesat"). */
  brightness: number;
}

/** Jmenovaná pásma napětí (viz zadání "2. Přepiš lineární mapování saturace na pásma") — čistě popisná, pro testy/debug, výpočet samotný na nich nezávisí (viz TENSION_CURVE_POINTS níže, spojité interpolace). */
export type TensionBand = "low" | "medium" | "high" | "critical";

const TENSION_BAND_LOW_MAX = 1 / 3;
const TENSION_BAND_MEDIUM_MAX = 2 / 3;
const TENSION_BAND_HIGH_MAX = 0.9;

/** Do kterého pojmenovaného pásma spadá daný tensionLevel — hranice odpovídají TENSION_CURVE_POINTS níže (0.33/0.66/0.9), ať jsou pásma a skutečná křivka konzistentní. */
export function classifyTensionBand(tensionLevel: number): TensionBand {
  if (tensionLevel < TENSION_BAND_LOW_MAX) return "low";
  if (tensionLevel < TENSION_BAND_MEDIUM_MAX) return "medium";
  if (tensionLevel < TENSION_BAND_HIGH_MAX) return "high";
  return "critical";
}

/**
 * Řídicí body křivky saturace (tensionLevel -> saturation) — po sobě jdoucí
 * body VŽDY sdílí koncový bod se sousedním úsekem, takže je celá křivka
 * spojitá (žádný skok, viz zadání "plynulé interpolace mezi pásmy, ne ostré
 * skoky") a monotónně klesající. Střed každého pásma (viz
 * classifyTensionBand) je zvolený tak, aby ležel PŘESNĚ uvnitř zadaného
 * rozsahu té dané kategorie — testy (visualEffects.test.ts) ověřují hodnotu
 * právě v těchhle reprezentativních bodech, ne na hranicích pásem samotných
 * (hranice jsou nutně jen PŘECHODOVÉ hodnoty mezi dvěma různými rozsahy, viz
 * zadání "3. Kontrast a jas" — nemůžou ležet uvnitř obou sousedních rozsahů
 * zároveň, když se ty rozsahy vzájemně nepřekrývají):
 * - low (0 – 0.33, střed ~0.165): cíl 0.65–0.75
 * - medium (0.33 – 0.66, střed ~0.495): cíl 0.35–0.5
 * - high (0.66 – 0.9, střed ~0.78): cíl 0.08–0.2
 * - critical (0.9 – 1, střed ~0.95): téměř černobílé (< 0.1)
 */
const SATURATION_CURVE_POINTS: readonly [number, number][] = [
  [0, 0.75],
  [0.165, 0.7],
  [TENSION_BAND_LOW_MAX, 0.6],
  [0.495, 0.42],
  [TENSION_BAND_MEDIUM_MAX, 0.25],
  [0.78, 0.14],
  [TENSION_BAND_HIGH_MAX, 0.06],
  [0.95, 0.035],
  [1, 0.02],
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Cubic smoothstep (3x²-2x³) — C1 spojitá (nulová derivace na krajích úseku), ať navazující úseky nedělají viditelný "lom" ve sklonu, ne jen ve hodnotě (viz zadání "plynulé interpolace"). */
function smoothstep(t: number): number {
  const clamped = clamp01(t);
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Po částech spojitá interpolace přes seřazené řídicí body — najde úsek, do
 * kterého `x` spadá, a vrátí smoothstep-interpolovanou hodnotu mezi jeho
 * krajními body. Krajní hodnoty (x <= první bod / x >= poslední bod) se
 * bezpečně přisvojí bez extrapolace.
 */
function interpolatePiecewise(x: number, points: readonly [number, number][]): number {
  if (points.length === 0) return 0;
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];

  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) {
      const span = x1 - x0;
      const localT = span > 0 ? (x - x0) / span : 0;
      return y0 + (y1 - y0) * smoothstep(localT);
    }
  }
  return points[points.length - 1][1];
}

/** Převede tensionLevel na vizuální parametry (viz zadání "3. Kontrast a jas"). Volané z CSS custom properties, ne inline logikou v komponentách. */
export function tensionToAtmosphereStyle(tensionLevel: number): AtmosphereStyle {
  const clampedTension = clamp01(tensionLevel);

  const saturation = interpolatePiecewise(clampedTension, SATURATION_CURVE_POINTS);
  // Kontrast roste s napětím (viz zadání) — o něco výraznější rozsah než
  // dřív (1 -> 1.6, dřív 1 -> 1.5), ať drsnější kontrast doplní nižší
  // saturaci, ne aby ji jen kopíroval.
  const contrast = 1 + clampedTension * 0.6;
  // Jas mírně klesá (viz zadání "jas má mírně klesat") — záměrně JEMNÝ
  // rozsah (1 -> 0.88), ať ovládací prvky zůstanou čitelné i při maximálním
  // napětí (viz zadání "důležité ovládací prvky mohou zůstat o něco
  // čitelnější" — tahle funkce sama neumí cílit jen na scénu/ne na UI, viz
  // TECH_DESIGN.md, takže rozsah zůstává konzervativní pro CELÝ atmosphere-root).
  const brightness = 1 - clampedTension * 0.12;

  return { saturation, contrast, brightness };
}

export function atmosphereStyleToCssVars(style: AtmosphereStyle): Record<string, string> {
  return {
    "--atmosphere-saturation": String(style.saturation),
    "--atmosphere-contrast": String(style.contrast),
    "--atmosphere-brightness": String(style.brightness),
  };
}
