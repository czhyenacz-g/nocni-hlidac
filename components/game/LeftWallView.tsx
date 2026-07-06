import { useState } from "react";
import { COPY } from "@/content/copy";

interface LeftWallViewProps {
  onLookAtDesk: () => void;
}

const LEFT_WALL_IMAGE_SRC = "/object_13/views/empty-shotgun.webp";

// Čistě atmosférický celoobrazovkový pohled bez herní mechaniky — obrázek
// vyplňuje celou dostupnou plochu, jediný další prvek je malé overlay
// tlačítko zpět (viz gameReducer.ts LOOK_AT_LEFT_WALL). Na rozdíl od
// desk/door/generator/object_map je to vlastní fullscreen <main>, ne obsah
// uvnitř GameScreen.tsx wrapperu s HUD/dev panelem — viz GameScreen.tsx, kde
// se pro playerView "left_wall" vrací tahle komponenta rovnou, bez zanoření.
//
// `relative min-h-screen` (ne `fixed inset-0`) — app/play/page.tsx obaluje
// GameScreen do `.atmosphere-root`, které má `filter` (viz
// styles/atmosphere.css). `filter` na předkovi dělá z něj containing block
// pro `position: fixed` potomky (stejně jako `transform`), takže `fixed
// inset-0` by se nepřichytilo k viewportu, ale ke `.atmosphere-root` — pokud
// to je jediný obsah bez vlastní výšky, zkolabuje na 0 px a nic není vidět.
// Normální block layout (`min-h-screen`) tenhle problém nemá.
export default function LeftWallView({ onLookAtDesk }: LeftWallViewProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {!imageFailed && (
        <img
          src={LEFT_WALL_IMAGE_SRC}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      )}

      {imageFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-sm text-gray-400">
          Chybí obrázek stěny.
        </div>
      )}

      <button
        type="button"
        className="pixel-button absolute bottom-4 left-1/2 z-10 -translate-x-1/2 px-3 py-2 text-xs"
        onClick={onLookAtDesk}
      >
        {COPY.game.leftWallBackLabel}
      </button>
    </main>
  );
}
