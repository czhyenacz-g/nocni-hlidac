// Datový model orientačního plánku Objektu 13 (viz components/game/ObjectMapView.tsx).
// Zatím čistě vizuální/informativní — žádná gameplay logika na něm nestaví.
// Připraveno jako budoucí základ pro pohyb po objektu (pozice hráče/monstra,
// sklad zásob, nouzový výpad), ale nic z toho tenhle soubor dnes neřeší.

export type ObjectMapNodeId = "outside" | "left_hall" | "right_hall" | "door_hall" | "control_room" | "storage";

export type ObjectMapNodeKind = "outside" | "hall" | "room" | "safe" | "storage";

export interface ObjectMapNode {
  id: ObjectMapNodeId;
  label: string;
  /** Volitelný druhý (menší) řádek popisku — ať se `label` neláme přes víc řádků (viz ObjectMapView.tsx, sklad). */
  shortLabel?: string;
  /** Pozice a rozměry v procentech (0–100) vůči mapovému plátnu. */
  x: number;
  y: number;
  width: number;
  height: number;
  kind: ObjectMapNodeKind;
}

export interface ObjectMapEdge {
  from: ObjectMapNodeId;
  to: ObjectMapNodeId;
}

// Rozložení: Venkovní oblast nahoře uprostřed, z ní dvě dlouhé chodby dolů
// (levá/pravá hala), sbíhají se do Chodby před dveřmi a dál do Kontrolní
// místnosti (bezpečný koncový prostor dole). Sklad je boční místnost u levé haly.
export const OBJECT_MAP_NODES: ObjectMapNode[] = [
  { id: "outside", label: "VENKOVNÍ OBLAST", x: 30, y: 2, width: 40, height: 12, kind: "outside" },
  { id: "left_hall", label: "LEVÁ HALA", x: 16, y: 18, width: 16, height: 46, kind: "hall" },
  { id: "right_hall", label: "PRAVÁ HALA", x: 68, y: 18, width: 16, height: 46, kind: "hall" },
  { id: "storage", label: "SKLAD", shortLabel: "spotřební materiál", x: 1, y: 40, width: 13, height: 14, kind: "storage" },
  { id: "door_hall", label: "CHODBA PŘED DVEŘMI", x: 38, y: 68, width: 24, height: 10, kind: "hall" },
  { id: "control_room", label: "KONTROLNÍ MÍSTNOST", x: 32, y: 82, width: 36, height: 14, kind: "safe" },
];

export const OBJECT_MAP_EDGES: ObjectMapEdge[] = [
  { from: "outside", to: "left_hall" },
  { from: "outside", to: "right_hall" },
  { from: "left_hall", to: "door_hall" },
  { from: "right_hall", to: "door_hall" },
  { from: "door_hall", to: "control_room" },
  { from: "left_hall", to: "storage" },
];

export function getObjectMapNode(id: ObjectMapNodeId): ObjectMapNode {
  const node = OBJECT_MAP_NODES.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Unknown ObjectMapNodeId: ${id}`);
  return node;
}
