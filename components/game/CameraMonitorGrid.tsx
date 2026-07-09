import { COPY } from "@/content/copy";
import { CameraDefinition, CameraId } from "@/game/core/types";
import CameraMonitorTile from "./CameraMonitorTile";
import CameraMonitorRackTile from "./CameraMonitorRackTile";

interface CameraMonitorGridProps {
  cameras: CameraDefinition[];
  onSelectCamera: (id: CameraId) => void;
}

// Lehké střídavé naklopení horní řady desktop racku (viz zadání "trochu
// fyzicky poskládané") — pevná sekvence, NE náhodná (Math.random by se
// přepočítal při každém re-renderu a monitory by "poskakovaly").
const UPPER_TILT_SEQUENCE = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2"];

// Přehled všech kamer dané směny — na mobilu jednotná 2-sloupcová mřížka
// malých monitorů (beze změny oproti dřívějšku, viz zadání "mobil nechat
// prakticky tak, jak je"), na desktopu vizuálně bohatší "monitor rack" (viz
// CameraMonitorRackTile.tsx): menší/naklopená horní řada posazená nad
// větší/robustnější spodní řadou hlavních CCTV monitorů. Funguje i pro
// jiný počet kamer než 4 (viz CLAUDE.md "seznam kamer je vždy
// konfigurační") — půlení řad je obecné (Math.floor(n/2)), ne natvrdo
// "2+2". Klik na monitor v OBOU variantách otevře detail dané kamery
// (OPEN_CAMERA -> cameraViewMode: "detail") — vizuální varianta nemění nic
// na tom, co se stane po kliknutí.
export default function CameraMonitorGrid({ cameras, onSelectCamera }: CameraMonitorGridProps) {
  // Pořadí podle order (kamery bez order jdou na konec) — stejné řazení jako
  // dřív u tlačítek, teď jen bez levo/pravo zarovnání podle position (mřížka
  // monitorů je jednotná 2×2, ne diagram fyzického rozložení chodeb).
  const sortedCameras = [...cameras].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
  const upperCount = Math.floor(sortedCameras.length / 2);
  const upperRow = sortedCameras.slice(0, upperCount);
  const lowerRow = sortedCameras.slice(upperCount);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Mobil — beze změny oproti dřívějšku (viz zadání). */}
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        {sortedCameras.map((camera) => (
          <CameraMonitorTile key={camera.id} camera={camera} onClick={() => onSelectCamera(camera.id)} />
        ))}
      </div>

      {/* Desktop — "monitor rack" (viz zadání): kovový rám kolem celé
          sekce (.camera-rack), horní řada menších naklopených monitorů s
          mírným záporným odsazením dolů (-mt-3), ať vizuálně "sedí" na
          spodní, větší hlavní řadě. */}
      <div className="hidden lg:flex lg:flex-col lg:items-center camera-rack">
        <div className="flex gap-3 relative z-10">
          {upperRow.map((camera, index) => (
            <CameraMonitorRackTile
              key={camera.id}
              camera={camera}
              camIndex={index + 1}
              size="upper"
              tiltClassName={UPPER_TILT_SEQUENCE[index % UPPER_TILT_SEQUENCE.length]}
              onClick={() => onSelectCamera(camera.id)}
            />
          ))}
        </div>
        <div className="flex gap-4 -mt-3">
          {lowerRow.map((camera, index) => (
            <CameraMonitorRackTile
              key={camera.id}
              camera={camera}
              camIndex={upperRow.length + index + 1}
              size="lower"
              onClick={() => onSelectCamera(camera.id)}
            />
          ))}
        </div>
      </div>

      <div className="text-[9px] text-gray-600 text-center">{COPY.game.cameraOverviewHint}</div>
    </div>
  );
}
