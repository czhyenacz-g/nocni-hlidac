import { useEffect, useState } from "react";
import { useCopy } from "@/game/i18n/useTranslation";
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
  const COPY = useCopy();
  const [imageFailed, setImageFailed] = useState(false);
  // Lightbox: klik na náhled mapu zvětší přes celou obrazovku (zpět na klik
  // na zvětšený obrázek/pozadí/Escape) — čistě vizuální UI stav téhle
  // komponenty, žádná herní logika/GameState na tom nestaví.
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (!isZoomed) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsZoomed(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomed]);

  return (
    <div className="flex flex-col gap-3">
      <div className="pixel-panel p-2 sm:p-3">
        <div className="relative w-full" style={{ height: "22rem", background: "#e4dcc4" }}>
          {!imageFailed ? (
            <button
              type="button"
              className="absolute inset-0 h-full w-full cursor-zoom-in"
              onClick={() => setIsZoomed(true)}
              aria-label="Zvětšit mapu"
            >
              <img src={MAP_IMAGE_SRC} alt="" className="h-full w-full object-contain" onError={() => setImageFailed(true)} />
            </button>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600">
              Chybí obrázek mapy.
            </div>
          )}
        </div>
      </div>

      <ViewSwitchArrow label={COPY.game.mapBackLabel} onClick={onLookAtDesk} align="left" />

      {isZoomed && !imageFailed && (
        // Lightbox overlay — přes celou obrazovku, tmavé pozadí, obrázek cca
        // 2× větší než náhled (viz zadání), zavře se klikem kamkoliv
        // (pozadí i obrázek samotný) nebo Escape.
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
          aria-label="Zavřít zvětšenou mapu"
        >
          <img src={MAP_IMAGE_SRC} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" />
        </button>
      )}
    </div>
  );
}
