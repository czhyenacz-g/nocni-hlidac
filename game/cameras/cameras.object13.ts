import { CameraDefinition } from "../core/types";

// Definice kamer pro Objekt 13. Oddělené od herní logiky, aby šly rozšiřovat.
export const OBJECT13_CAMERAS: CameraDefinition[] = [
  {
    id: "camera_01_far",
    label: "KAM 01 — Venkovní dvůr",
    enemyVisibleAtStage: "camera_01_far",
  },
  {
    id: "camera_02_hall",
    label: "KAM 02 — Chodba, vzdálený úsek",
    enemyVisibleAtStage: "camera_02_hall",
  },
  {
    id: "camera_03_door",
    label: "KAM 03 — Chodba u dveří",
    enemyVisibleAtStage: "camera_03_door",
  },
];
