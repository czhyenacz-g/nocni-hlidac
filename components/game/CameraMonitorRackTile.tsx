import { CameraDefinition } from "@/game/core/types";

interface CameraMonitorRackTileProps {
  camera: CameraDefinition;
  onClick: () => void;
  /** Pořadové číslo pro roh monitoru ("CAM-01" atd.) — 1-based, nezávislé na camera.order (ten může chybět). */
  camIndex: number;
  /** "upper" = menší pomocný monitor (horní řada), "lower" = větší hlavní CCTV monitor (spodní řada) — viz CameraMonitorGrid.tsx. */
  size: "upper" | "lower";
  /** Lehké naklopení (viz zadání "trochu fyzicky poskládané") — jen horní řada, pevná sekvence z CameraMonitorGrid.tsx. */
  tiltClassName?: string;
}

// Jeden monitor v DESKTOP "rack" layoutu (viz CameraMonitorGrid.tsx) —
// vizuálně bohatší varianta CameraMonitorTile.tsx (kovový bezel, šrouby,
// LED, CAM-0N tag), záměrně samostatný soubor, ať se mobilní
// CameraMonitorTile ani o chlup nezmění (viz zadání "mobil beze změny").
// Obsah/klikatelnost/aria-label je stejná logika jako mobilní varianta —
// jen vizuální prezentace navíc.
export default function CameraMonitorRackTile({ camera, onClick, camIndex, size, tiltClassName }: CameraMonitorRackTileProps) {
  const sizeClasses = size === "lower" ? "w-40 h-28 xl:w-48 xl:h-32" : "w-32 h-20 xl:w-36 xl:h-24";
  const bezelVariant = size === "lower" ? "camera-monitor-bezel--lower" : "camera-monitor-bezel--upper";

  return (
    <button
      type="button"
      className={`pixel-screen-static camera-monitor-bezel ${bezelVariant} camera-monitor-tile tap-target group ${sizeClasses} ${tiltClassName ?? ""} relative flex flex-col items-center justify-center gap-1 px-2 text-center`}
      onClick={onClick}
      aria-label={`${camera.label} — zvětšit`}
    >
      <span className="camera-monitor-tag" aria-hidden="true">
        CAM-{String(camIndex).padStart(2, "0")}
      </span>
      <span className="camera-monitor-led" aria-hidden="true" />
      <span className="text-[9px] xl:text-[10px] text-gray-400 leading-tight">{camera.label}</span>
      <span className="text-[8px] xl:text-[9px] text-gray-600">⤢</span>
      <span className="camera-monitor-screw" style={{ top: 3, left: 3 }} aria-hidden="true" />
      <span className="camera-monitor-screw" style={{ top: 3, right: 3 }} aria-hidden="true" />
      <span className="camera-monitor-screw" style={{ bottom: 3, left: 3 }} aria-hidden="true" />
      <span className="camera-monitor-screw" style={{ bottom: 3, right: 3 }} aria-hidden="true" />
      {/* Popis kamery (viz CameraDefinition.description) — stejný hover
          reveal jako v mobilní CameraMonitorTile.tsx a v detailu
          (CameraView.tsx), jen jako plovoucí tooltip pod bezelem. */}
      {camera.description && (
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-40 -translate-x-1/2 rounded border border-gray-700 bg-black/90 px-2 py-1 text-[9px] leading-tight text-gray-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {camera.description}
        </span>
      )}
    </button>
  );
}
