// Servisní hlášky pro LoadingScreen — obsahový soubor, ne natvrdo v komponentě
// (viz components/screens/LoadingScreen.tsx). Zatím jedna směna, ale
// minNight/maxNight a weight jsou tu připravené pro filtrování podle
// budoucích směn/mechanik.

export type LoadingHintCategory =
  | "energy"
  | "doors"
  | "cameras"
  | "generator"
  | "blackout"
  | "enemy"
  | "controls"
  | "lore";

export interface LoadingHint {
  id: string;
  category: LoadingHintCategory;
  /** Hint se nabízí jen od téhle směny dál (číslováno od 1) — zatím nevyužito, jen připraveno. */
  minNight?: number;
  /** Hint se nabízí jen do téhle směny — zatím nevyužito, jen připraveno. */
  maxNight?: number;
  /** Vyšší váha = vyšší šance na výběr při weighted randomu (výchozí 1). */
  weight?: number;
}

// Každý hint drž pod ~15 slovy — LoadingScreen je krátký briefing, ne odstavec
// na čtení. Klidně dvě krátké věty (viz generator_normal_beep), jen ne dlouhé
// souvětí jako byl původně energy_generator_battery.
export const LOADING_HINTS: LoadingHint[] = [
  {
    id: "energy_generator_battery",
    category: "energy",
    weight: 2,
  },
  {
    id: "doors_magnetic_lock",
    category: "doors",
  },
  {
    id: "cameras_power_drain",
    category: "cameras",
  },
  {
    id: "generator_normal_beep",
    category: "generator",
  },
  {
    id: "blackout_lock_release",
    category: "blackout",
  },
  {
    id: "controls_look_at_door",
    category: "controls",
  },
  {
    id: "enemy_route_variance",
    category: "enemy",
  },
  {
    id: "lore_day_only_design",
    category: "lore",
  },
];

// Jednoduchý weighted random bez opakování — zatím čistě náhodný výběr z
// dostupných hintů, filtrování podle noci je připravené (minNight/maxNight).
export function selectLoadingHints(count: number, night?: number): LoadingHint[] {
  const eligible = LOADING_HINTS.filter((hint) => {
    if (night === undefined) return true;
    if (hint.minNight !== undefined && night < hint.minNight) return false;
    if (hint.maxNight !== undefined && night > hint.maxNight) return false;
    return true;
  });

  const pool = [...eligible];
  const picked: LoadingHint[] = [];
  const n = Math.min(count, pool.length);

  for (let i = 0; i < n; i++) {
    const totalWeight = pool.reduce((sum, hint) => sum + (hint.weight ?? 1), 0);
    let roll = Math.random() * totalWeight;
    let index = 0;
    while (index < pool.length - 1) {
      roll -= pool[index].weight ?? 1;
      if (roll <= 0) break;
      index += 1;
    }
    picked.push(pool[index]);
    pool.splice(index, 1);
  }

  return picked;
}
