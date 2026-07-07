import { useState } from "react";
import { COPY } from "@/content/copy";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface ObjectMapViewProps {
  onLookAtDesk: () => void;
}

const MAP_IMAGE_SRC = "/object_13/views/mapa.webp";

// Čistě informativní pohled bez interaktivity — statický orientační plánek
// objektu jako skutečný obrázek (dodaný asset), žádné klikání na místnosti,
// žádný pohyb (viz gameReducer.ts LOOK_AT_MAP). Dřív se plánek kreslil z
// datového modelu (game/map/objectMap.ts) jako HTML/CSS uzly/hrany — teď se
// místo toho zobrazuje hotový obrázek mapy; datový model zůstává v projektu
// pro budoucí gameplay (pozice hráče/monstra), jen se tady nevykresluje.
export default function ObjectMapView({ onLookAtDesk }: ObjectMapViewProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="pixel-panel p-2 sm:p-3">
        <div className="mb-2 bg-[#2b2718] px-2 py-1.5 text-center">
          <div className="text-xs font-bold tracking-wide text-[#e4dcc4] sm:text-sm">{COPY.game.mapTitle}</div>
          <div className="text-[9px] tracking-wide text-[#b9ae8f] sm:text-[10px]">{COPY.game.mapSubtitle}</div>
        </div>

        <div className="relative w-full" style={{ height: "22rem", background: "#e4dcc4" }}>
          {!imageFailed ? (
            <img
              src={MAP_IMAGE_SRC}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600">
              Chybí obrázek mapy.
            </div>
          )}
        </div>
      </div>

      <ViewSwitchArrow label={COPY.game.mapBackLabel} onClick={onLookAtDesk} align="left" />
    </div>
  );
}
