import { CameraDefinition } from "../core/types";

// Definice kamer pro Objekt 13. Oddělené od herní logiky, aby šly rozšiřovat —
// UI (CameraPanel/CameraView) je vždy jen vykresluje, nikdy je nemá natvrdo.
// order řídí pořadí v panelu (nižší = blíž venku, tedy dál od hráče), position
// řídí levo/pravo zarovnání odpovídající fyzickému rozložení chodeb.
// Zobrazený label/description (viz CameraDefinition komentář) žije v
// content/copy.ts#cameras, klíčovaný `id` — tenhle soubor jen jazykově
// nezávislá identita/konfigurace.
export const OBJECT13_CAMERAS: CameraDefinition[] = [
  {
    id: "outer_yard",
    order: 1,
    position: "center",
    type: "outside",
    enemyVisibleAtStage: "outer_yard",
  },
  {
    id: "right_hallway",
    order: 2,
    position: "right",
    type: "hallway",
    enemyVisibleAtStage: "right_hallway",
  },
  {
    id: "left_hallway",
    order: 2,
    position: "left",
    type: "hallway",
    enemyVisibleAtStage: "left_hallway",
  },
  {
    id: "door_hallway",
    order: 3,
    position: "center",
    type: "door",
    enemyVisibleAtStage: "door_hallway",
  },
];
