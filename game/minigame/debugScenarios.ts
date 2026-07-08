import { DEFAULT_EMERGENCY_MINIGAME_INPUT } from "./config";
import { SERVICE_FLOOR_STORAGE } from "./layouts/serviceFloorStorage";
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

  // ── Layoutové scénáře (viz game/minigame/layoutTypes.ts, layouts/) ────────
  // Stejná mise (battery) na baseline mapě vs. novém skladovém layoutu, +
  // dva různé seedy na stejném layoutu, ať jde na /minihra ověřit, že (1)
  // stejná mise může mít jiný objective slot/monster spawn podle seedu, (2)
  // nová mapa je funkční.
  {
    id: "battery_alpha_default",
    label: "Baterie — service_floor_alpha (výchozí mapa)",
    description: "Stejná baterie mise jako collect_battery, jen výslovně na baseline mapě (service_floor_alpha) s pevným seedem.",
    input: { objective: "collect_item", itemToCollect: "battery", equipment: { hasShotgun: false, ammo: 0 }, layoutId: "service_floor_alpha", seed: "battery_alpha_default" },
  },
  {
    id: "battery_storage_layout",
    label: "Baterie — skladové patro",
    description: "Baterie mise na novém, komplexnějším skladově-servisním layoutu (service_floor_storage).",
    input: {
      objective: "collect_item",
      itemToCollect: "battery",
      equipment: { hasShotgun: false, ammo: 0 },
      layoutId: SERVICE_FLOOR_STORAGE.id,
      seed: "battery_storage_layout",
    },
  },
  {
    id: "battery_storage_layout_seed_1",
    label: "Baterie — skladové patro (seed 1)",
    description: "Stejná mise/mapa jako battery_storage_layout, jiný seed — jiný objective/monster spawn slot.",
    input: {
      objective: "collect_item",
      itemToCollect: "battery",
      equipment: { hasShotgun: false, ammo: 0 },
      layoutId: SERVICE_FLOOR_STORAGE.id,
      seed: "battery_storage_layout_seed_1",
    },
  },
  {
    id: "battery_storage_layout_seed_2",
    label: "Baterie — skladové patro (seed 2)",
    description: "Stejná mise/mapa jako battery_storage_layout, další jiný seed — ověř, že se spawn/objective liší od seed_1.",
    input: {
      objective: "collect_item",
      itemToCollect: "battery",
      equipment: { hasShotgun: false, ammo: 0 },
      layoutId: SERVICE_FLOOR_STORAGE.id,
      seed: "battery_storage_layout_seed_2",
    },
  },
  {
    id: "bulb_storage_layout",
    label: "Žárovka — skladové patro",
    description: "Žárovka mise na skladovém layoutu — vybírá jen ze slotů s tagem bulb.",
    input: {
      objective: "collect_item",
      itemToCollect: "bulb",
      equipment: { hasShotgun: true, ammo: 1 },
      layoutId: SERVICE_FLOOR_STORAGE.id,
      seed: "bulb_storage_layout",
    },
  },
  {
    id: "fuse_storage_layout",
    label: "Pojistka — skladové patro",
    description: "Pojistka mise na skladovém layoutu — vybírá jen ze slotů s tagem fuse.",
    input: {
      objective: "collect_item",
      itemToCollect: "fuse",
      equipment: { hasShotgun: true, ammo: 1 },
      layoutId: SERVICE_FLOOR_STORAGE.id,
      seed: "fuse_storage_layout",
    },
  },
  {
    id: "shotgun_storage_layout",
    label: "Brokovnice — skladové patro",
    description: "Sebrání brokovnice na skladovém layoutu — vybírá jen ze slotů s tagem shotgun. Hráč začíná bez zbraně.",
    input: {
      objective: "collect_item",
      itemToCollect: "shotgun",
      equipment: { hasShotgun: false, ammo: 0 },
      layoutId: SERVICE_FLOOR_STORAGE.id,
      seed: "shotgun_storage_layout",
    },
  },
  {
    id: "no_weapon_storage_layout",
    label: "Návrat bez zbraně — skladové patro",
    description: "Čistá skrývačka (bez brokovnice) na skladovém layoutu — víc místa/tras k obcházení monstra než na baseline mapě.",
    input: {
      objective: "return_to_office",
      equipment: { hasShotgun: false, ammo: 0 },
      layoutId: SERVICE_FLOOR_STORAGE.id,
      seed: "no_weapon_storage_layout",
    },
  },
];

export const DEFAULT_MINIGAME_DEBUG_SCENARIO_ID = MINIGAME_DEBUG_SCENARIOS[0].id;

/** Bezpečný přístup ke scénáři podle id — neznámé/chybějící id spadne na první scénář (nikdy nevrátí undefined). */
export function getMiniGameDebugScenario(id: string): MiniGameDebugScenario {
  return MINIGAME_DEBUG_SCENARIOS.find((scenario) => scenario.id === id) ?? MINIGAME_DEBUG_SCENARIOS[0];
}
