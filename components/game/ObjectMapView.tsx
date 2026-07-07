import { COPY } from "@/content/copy";
import { getObjectMapNode, OBJECT_MAP_EDGES, OBJECT_MAP_NODES, type ObjectMapEdge, type ObjectMapNode } from "@/game/map/objectMap";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface ObjectMapViewProps {
  onLookAtDesk: () => void;
}

// Barvy "starého vyvěšeného papíru" — zašlá bílá/šedobéžová, ne čistá bílá
// (viz zadání "lehce zašlé, špinavé, industriální"). Natvrdo tady, ne přes
// Tailwind bg-*/border-* třídy — plánek je vizuálně úplně mimo zbytek
// pixel-panel/tmavého UI stylu hry, vlastní paleta se hodí líp než
// prohrabávat se přes existující barevnou škálu.
const PAPER_BG = "#e4dcc4";
const ROOM_FILL = "#efe8d2";
const WALL_COLOR = "#3a3428";
const INK_COLOR = "#2b2718";
const FAINT_INK_COLOR = "#6b6350";

function MapRoom({ node }: { node: ObjectMapNode }) {
  const isHere = node.kind === "safe";
  return (
    <div
      className="absolute flex flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center leading-tight"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        width: `${node.width}%`,
        height: `${node.height}%`,
        background: ROOM_FILL,
        border: `2px solid ${WALL_COLOR}`,
        boxShadow: isHere ? "inset 0 0 0 2px #1d4ed8" : undefined,
      }}
    >
      <span className="text-[8px] font-bold tracking-tight sm:text-[10px]" style={{ color: INK_COLOR }}>
        {node.label}
      </span>
      {node.shortLabel && (
        <span className="text-[7px] italic sm:text-[9px]" style={{ color: FAINT_INK_COLOR }}>
          {node.shortLabel}
        </span>
      )}
      {isHere && (
        <span className="mt-0.5 flex items-center gap-1 text-[7px] font-bold text-blue-800 sm:text-[9px]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-700" aria-hidden="true" />
          {COPY.game.mapHereLabel}
        </span>
      )}
    </div>
  );
}

// Spojnice mezi místnostmi jako krátký kus chodby (stejná výplň jako
// místnosti + tenké zdi), ne jako abstraktní grafová hrana — orientace
// (svislá/vodorovná) se odvodí od toho, jestli mezi uzly převažuje rozdíl na
// ose Y nebo X. Nejde o přesnou geometrii, jen o vizuální navázání dvou
// místností na půdorysu.
function MapCorridorLink({ edge }: { edge: ObjectMapEdge }) {
  const from = getObjectMapNode(edge.from);
  const to = getObjectMapNode(edge.to);
  const fromCenterX = from.x + from.width / 2;
  const fromCenterY = from.y + from.height / 2;
  const toCenterX = to.x + to.width / 2;
  const toCenterY = to.y + to.height / 2;
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  const vertical = Math.abs(dy) >= Math.abs(dx);
  const style = vertical
    ? {
        left: `${(fromCenterX + toCenterX) / 2 - 1.5}%`,
        top: `${Math.min(fromCenterY, toCenterY)}%`,
        width: "3%",
        height: `${Math.abs(toCenterY - fromCenterY)}%`,
        borderLeft: `2px solid ${WALL_COLOR}`,
        borderRight: `2px solid ${WALL_COLOR}`,
      }
    : {
        left: `${Math.min(fromCenterX, toCenterX)}%`,
        top: `${(fromCenterY + toCenterY) / 2 - 1.5}%`,
        width: `${Math.abs(toCenterX - fromCenterX)}%`,
        height: "3%",
        borderTop: `2px solid ${WALL_COLOR}`,
        borderBottom: `2px solid ${WALL_COLOR}`,
      };

  return <div className="absolute" style={{ ...style, background: ROOM_FILL }} aria-hidden="true" />;
}

interface EvacArrow {
  /** Střed šipky v procentech vůči plánku. */
  x: number;
  y: number;
  glyph: string;
}

// Čistě dekorativní evakuační šipky (žádná herní logika, viz zadání) — směr
// ven z Kontrolní místnosti přes Chodbu před dveřmi k Venkovní oblasti.
// Souřadnice natvrdo (ne z OBJECT_MAP_EDGES) — je to jen dojem požárního
// plánu, ne odvozený gameplay stav.
const EVAC_ARROWS: EvacArrow[] = [
  { x: 48, y: 77, glyph: "↑" },
  { x: 48, y: 40, glyph: "↑" },
  { x: 48, y: 15, glyph: "↑" },
];

// Čistě informativní pohled bez interaktivity — statický orientační plánek
// objektu vykreslený z datového modelu (game/map/objectMap.ts), žádné
// klikání na místnosti, žádný pohyb (viz gameReducer.ts LOOK_AT_MAP). Model
// je připravený jako budoucí základ pro pohyb po objektu, ale tahle
// komponenta zatím jen vykresluje uzly/hrany, nic víc — jen jako starý
// požární/evakuační plán vyvěšený v objektu, ne moderní diagram.
export default function ObjectMapView({ onLookAtDesk }: ObjectMapViewProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="pixel-panel p-2 sm:p-3">
        {/* Horní pruh plánku — jako popisný štítek na vyvěšeném papíru. */}
        <div className="mb-2 bg-[#2b2718] px-2 py-1.5 text-center">
          <div className="text-xs font-bold tracking-wide text-[#e4dcc4] sm:text-sm">{COPY.game.mapTitle}</div>
          <div className="text-[9px] tracking-wide text-[#b9ae8f] sm:text-[10px]">{COPY.game.mapSubtitle}</div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          {/* Samotný plánek — zašlý papír v tenkém vnitřním rámu. */}
          <div
            className="relative w-full flex-1"
            style={{
              height: "22rem",
              background: PAPER_BG,
              border: `1px solid ${WALL_COLOR}`,
              boxShadow: "inset 0 0 18px rgba(43, 39, 24, 0.35)",
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(43,39,24,0.035) 0px, rgba(43,39,24,0.035) 1px, transparent 1px, transparent 3px)",
            }}
          >
            {OBJECT_MAP_EDGES.map((edge) => (
              <MapCorridorLink key={`${edge.from}-${edge.to}`} edge={edge} />
            ))}
            {OBJECT_MAP_NODES.map((node) => (
              <MapRoom key={node.id} node={node} />
            ))}
            {EVAC_ARROWS.map((arrow, index) => (
              <span
                key={index}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-green-700 sm:text-base"
                style={{ left: `${arrow.x}%`, top: `${arrow.y}%` }}
                aria-hidden="true"
              >
                {arrow.glyph}
              </span>
            ))}

            {/* Drobná dekorativní poznámka — atmosféra starého vyvěšeného
                papíru, žádná herní informace. */}
            <div
              className="absolute bottom-0.5 right-1 text-[6px] italic sm:text-[7px]"
              style={{ color: FAINT_INK_COLOR }}
            >
              {COPY.game.mapFlavorNote}
            </div>
          </div>

          {/* Legenda — malá, čitelná, pod plánkem na mobilu (flex-col),
              vedle plánku na širší obrazovce (sm:flex-row výše). */}
          <div
            className="w-full shrink-0 px-2 py-1.5 text-[9px] leading-snug sm:w-28 sm:text-[9px]"
            style={{ background: PAPER_BG, border: `1px solid ${WALL_COLOR}`, color: INK_COLOR }}
          >
            <div className="mb-1 font-bold" style={{ color: INK_COLOR }}>
              {COPY.game.mapLegendTitle}
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-700" aria-hidden="true" />
              {COPY.game.mapLegendHereLabel}
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-green-700" aria-hidden="true">
                →
              </span>
              {COPY.game.mapLegendExitLabel}
            </div>
            <div className="flex items-center gap-1">
              <span aria-hidden="true">▧</span>
              {COPY.game.mapLegendStorageLabel}
            </div>
            <div className="flex items-center gap-1">
              <span aria-hidden="true">⚡</span>
              {COPY.game.mapLegendElectricLabel}
            </div>
          </div>
        </div>
      </div>

      <ViewSwitchArrow label={COPY.game.mapBackLabel} onClick={onLookAtDesk} align="left" />
    </div>
  );
}
