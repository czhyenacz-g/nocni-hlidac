import { CameraDefinition } from "../core/types";

// Definice kamer pro Objekt 13. Oddělené od herní logiky, aby šly rozšiřovat —
// UI (CameraPanel/CameraView) je vždy jen vykresluje, nikdy je nemá natvrdo.
// order řídí pořadí v panelu (nižší = blíž venku, tedy dál od hráče).
export const OBJECT13_CAMERAS: CameraDefinition[] = [
  {
    id: "outer_yard",
    label: "KAM 01 — Venkovní vstup",
    description: "Nejvzdálenější pohled, hlavní vstup na pozemek.",
    order: 1,
    type: "outside",
    enemyVisibleAtStage: "outer_yard",
  },
  {
    id: "right_hallway",
    label: "KAM 02 — Pravá chodba",
    description: "Boční chodba vedoucí ke dveřím zprava.",
    order: 2,
    type: "hallway",
    enemyVisibleAtStage: "right_hallway",
  },
  {
    id: "left_hallway",
    label: "KAM 03 — Levá chodba",
    description: "Boční chodba vedoucí ke dveřím zleva.",
    order: 2,
    type: "hallway",
    enemyVisibleAtStage: "left_hallway",
  },
  {
    id: "door_hallway",
    label: "KAM 04 — Chodba před dveřmi",
    description: "Poslední úsek těsně před dveřmi — nejdůležitější kamera.",
    order: 3,
    type: "door",
    enemyVisibleAtStage: "door_hallway",
  },
];
