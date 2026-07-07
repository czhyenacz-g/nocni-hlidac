import { DEFAULT_EMERGENCY_MINIGAME_INPUT } from "./config";
import { EmergencyMiniGameInput } from "./types";

// Vývojářské scénáře pro debug stránku /minihra (viz app/minihra/page.tsx)
// — čistě dev nástroj pro ruční přepínání EmergencyMiniGameInput bez úprav
// kódu. Nemá nic společného s hlavní hrou (/play) ani s tím, jak bude
// minihra jednou spuštěná odtamtud (to bude posílat vlastní input, ne
// vybírat z tohohle seznamu).

export interface MiniGameDebugScenario {
  id: string;
  label: string;
  description: string;
  input: EmergencyMiniGameInput;
}

export const MINIGAME_DEBUG_SCENARIOS: MiniGameDebugScenario[] = [
  {
    id: "return_to_office",
    label: "Návrat do kanceláře",
    description: "Dojdi ven a vrať se zpět do kanceláře. V exit zóně stiskni E.",
    input: DEFAULT_EMERGENCY_MINIGAME_INPUT,
  },
  {
    id: "collect_fuse",
    label: "Sebrat pojistku",
    description: "Najdi a seber pojistku pomocí E.",
    input: { objective: "collect_item", itemToCollect: "fuse", shots: 1, difficulty: "medium" },
  },
  {
    id: "collect_bulb",
    label: "Sebrat žárovku",
    description: "Najdi a seber žárovku pomocí E.",
    input: { objective: "collect_item", itemToCollect: "bulb", shots: 1, difficulty: "medium" },
  },
  {
    id: "collect_toolbox",
    label: "Sebrat nářadí",
    description: "Najdi a seber nářadí pomocí E.",
    input: { objective: "collect_item", itemToCollect: "toolbox", shots: 1, difficulty: "medium" },
  },
  {
    id: "survive",
    label: "Přežít",
    description: "Volný test přežití proti monstru.",
    input: { objective: "survive", shots: 1, difficulty: "medium" },
  },
  {
    id: "return_no_shot",
    label: "Bez náboje — návrat",
    description: "Návrat do kanceláře bez možnosti vystřelit.",
    input: { objective: "return_to_office", shots: 0, difficulty: "medium" },
  },
  {
    id: "collect_fuse_no_shot",
    label: "Bez náboje — pojistka",
    description: "Sebrání pojistky bez možnosti vystřelit.",
    input: { objective: "collect_item", itemToCollect: "fuse", shots: 0, difficulty: "medium" },
  },
];

export const DEFAULT_MINIGAME_DEBUG_SCENARIO_ID = MINIGAME_DEBUG_SCENARIOS[0].id;

/** Bezpečný přístup ke scénáři podle id — neznámé/chybějící id spadne na první scénář (nikdy nevrátí undefined). */
export function getMiniGameDebugScenario(id: string): MiniGameDebugScenario {
  return MINIGAME_DEBUG_SCENARIOS.find((scenario) => scenario.id === id) ?? MINIGAME_DEBUG_SCENARIOS[0];
}
