import { COPY } from "@/content/copy";
import { getObjectMapNode, OBJECT_MAP_EDGES, OBJECT_MAP_NODES, type ObjectMapEdge, type ObjectMapNode } from "@/game/map/objectMap";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface ObjectMapViewProps {
  onLookAtDesk: () => void;
}

// Zvýrazní kontrolní místnost (bezpečný koncový prostor) jemně jiným
// rámečkem — jen vizuální odlišení, žádná herní logika na "kind" nestaví.
// Inline style, ne Tailwind border-* třída — .pixel-panel (styles/pixel.css)
// má vlastní `border` shorthand se stejnou specificitou a načítá se až po
// Tailwind utilities, takže by ji jinak potichu přebilo (viz layout.tsx
// import order).
const NODE_BORDER_COLOR_BY_KIND: Record<ObjectMapNode["kind"], string | undefined> = {
  outside: undefined,
  hall: undefined,
  room: undefined,
  storage: undefined,
  safe: "rgba(245, 158, 11, 0.7)",
};

function MapNodeBox({ node }: { node: ObjectMapNode }) {
  const borderColor = NODE_BORDER_COLOR_BY_KIND[node.kind];
  return (
    <div
      className="pixel-panel absolute flex items-center justify-center text-center leading-tight px-1 text-[9px] sm:text-[10px]"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        width: `${node.width}%`,
        height: `${node.height}%`,
        borderColor,
      }}
    >
      {node.label}
    </div>
  );
}

// Jednoduchý axis-aligned spojovací pruh mezi středy dvou uzlů — orientace
// (svislá/vodorovná) se odvodí od toho, jestli mezi uzly převažuje rozdíl na
// ose Y nebo X. Nejde o přesnou geometrickou spojnici (žádná rotace/SVG),
// jen o vizuální naznačení návaznosti podle dat, viz zadání "stačí naznačit
// prostorovou návaznost rozložením boxů".
function MapEdgeConnector({ edge }: { edge: ObjectMapEdge }) {
  const from = getObjectMapNode(edge.from);
  const to = getObjectMapNode(edge.to);
  const fromCenterX = from.x + from.width / 2;
  const fromCenterY = from.y + from.height / 2;
  const toCenterX = to.x + to.width / 2;
  const toCenterY = to.y + to.height / 2;
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  const style =
    Math.abs(dy) >= Math.abs(dx)
      ? {
          left: `${(fromCenterX + toCenterX) / 2}%`,
          top: `${Math.min(fromCenterY, toCenterY)}%`,
          width: "2px",
          height: `${Math.abs(toCenterY - fromCenterY)}%`,
        }
      : {
          left: `${Math.min(fromCenterX, toCenterX)}%`,
          top: `${(fromCenterY + toCenterY) / 2}%`,
          width: `${Math.abs(toCenterX - fromCenterX)}%`,
          height: "2px",
        };

  return <div className="absolute bg-gray-500" style={style} aria-hidden="true" />;
}

// Čistě informativní pohled bez interaktivity — statický orientační plánek
// objektu vykreslený z datového modelu (game/map/objectMap.ts), žádné
// klikání na místnosti, žádný pohyb (viz gameReducer.ts LOOK_AT_MAP). Model
// je připravený jako budoucí základ pro pohyb po objektu, ale tahle
// komponenta zatím jen vykresluje uzly/hrany, nic víc.
export default function ObjectMapView({ onLookAtDesk }: ObjectMapViewProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="pixel-panel p-3">
        <div className="text-sm font-bold mb-1">{COPY.game.mapTitle}</div>
        <div className="text-[10px] text-gray-400 mb-3">{COPY.game.mapSubtitle}</div>

        <div className="relative w-full" style={{ height: "22rem" }}>
          {OBJECT_MAP_EDGES.map((edge) => (
            <MapEdgeConnector key={`${edge.from}-${edge.to}`} edge={edge} />
          ))}
          {OBJECT_MAP_NODES.map((node) => (
            <MapNodeBox key={node.id} node={node} />
          ))}
        </div>
      </div>

      <ViewSwitchArrow label={COPY.game.mapBackLabel} onClick={onLookAtDesk} align="left" />
    </div>
  );
}
