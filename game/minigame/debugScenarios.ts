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
    label: "Návrat — brokovnice + 1 náboj",
    description: "Dojdi ven a vrať se zpět do kanceláře. Máš brokovnici a 1 náboj. V exit zóně stiskni E.",
    input: DEFAULT_EMERGENCY_MINIGAME_INPUT,
  },
  {
    id: "return_no_weapon",
    label: "Návrat — bez brokovnice",
    description: "Návrat do kanceláře. Nemáš brokovnici — mezerník nic neudělá, jde jen o skrývačku.",
    input: { objective: "return_to_office", equipment: { hasShotgun: false, ammo: 0 }, difficulty: "medium" },
  },
  {
    id: "return_no_ammo",
    label: "Návrat — brokovnice bez nábojů",
    description: "Návrat do kanceláře. Brokovnici máš, ale 0 nábojů — mezerník nevystřelí.",
    input: { objective: "return_to_office", equipment: { hasShotgun: true, ammo: 0 }, difficulty: "medium" },
  },
  {
    id: "collect_fuse",
    label: "Pojistka — brokovnice + 1 náboj",
    description: "Sebrat věc nestačí. Najdi a seber pojistku (E), pak se vrať do kanceláře a znovu stiskni E. Máš brokovnici a 1 náboj.",
    input: { objective: "collect_item", itemToCollect: "fuse", equipment: { hasShotgun: true, ammo: 1 }, difficulty: "medium" },
  },
  {
    id: "collect_fuse_no_weapon",
    label: "Pojistka — bez brokovnice",
    description: "Sebrat věc nestačí. Najdi a seber pojistku (E), pak se vrať do kanceláře. Nemáš brokovnici.",
    input: { objective: "collect_item", itemToCollect: "fuse", equipment: { hasShotgun: false, ammo: 0 }, difficulty: "medium" },
  },
  {
    id: "collect_fuse_no_ammo",
    label: "Pojistka — brokovnice bez nábojů",
    description: "Sebrat věc nestačí. Najdi a seber pojistku (E), pak se vrať do kanceláře. Brokovnici máš, ale 0 nábojů.",
    input: { objective: "collect_item", itemToCollect: "fuse", equipment: { hasShotgun: true, ammo: 0 }, difficulty: "medium" },
  },
  {
    id: "collect_bulb",
    label: "Sebrat žárovku a vrátit se",
    description: "Sebrat věc nestačí. Najdi a seber žárovku (E), pak se vrať do kanceláře a znovu stiskni E.",
    input: { objective: "collect_item", itemToCollect: "bulb", equipment: { hasShotgun: true, ammo: 1 }, difficulty: "medium" },
  },
  {
    id: "collect_toolbox",
    label: "Sebrat nářadí a vrátit se",
    description: "Sebrat věc nestačí. Najdi a seber nářadí (E), pak se vrať do kanceláře a znovu stiskni E.",
    input: { objective: "collect_item", itemToCollect: "toolbox", equipment: { hasShotgun: true, ammo: 1 }, difficulty: "medium" },
  },
  {
    id: "collect_battery",
    label: "Sebrat baterii a vrátit se",
    description: "Dojdi pro baterii, seber ji pomocí E a vrať se do kanceláře. Výsledek dobije energii hlavní hry.",
    input: { objective: "collect_item", itemToCollect: "battery", equipment: { hasShotgun: false, ammo: 0 }, difficulty: "medium" },
  },
  {
    id: "collect_battery_with_shotgun",
    label: "Sebrat baterii — brokovnice + 1 náboj",
    description: "Dojdi pro baterii, seber ji pomocí E a vrať se do kanceláře. Máš brokovnici a 1 náboj. Výsledek dobije energii hlavní hry.",
    input: { objective: "collect_item", itemToCollect: "battery", equipment: { hasShotgun: true, ammo: 1 }, difficulty: "medium" },
  },
  {
    id: "survive",
    label: "Přežít",
    description: "Volný test přežití proti monstru — exit zóna misi v tomhle scénáři nekončí.",
    input: { objective: "survive", equipment: { hasShotgun: true, ammo: 1 }, difficulty: "medium" },
  },
];

export const DEFAULT_MINIGAME_DEBUG_SCENARIO_ID = MINIGAME_DEBUG_SCENARIOS[0].id;

/** Bezpečný přístup ke scénáři podle id — neznámé/chybějící id spadne na první scénář (nikdy nevrátí undefined). */
export function getMiniGameDebugScenario(id: string): MiniGameDebugScenario {
  return MINIGAME_DEBUG_SCENARIOS.find((scenario) => scenario.id === id) ?? MINIGAME_DEBUG_SCENARIOS[0];
}
