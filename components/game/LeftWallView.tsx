import { COPY } from "@/content/copy";

interface LeftWallViewProps {
  onLookAtDesk: () => void;
}

// Čistě atmosférický celoobrazovkový pohled bez herní mechaniky — obrázek
// vyplňuje celou dostupnou plochu, jediný další prvek je malé overlay
// tlačítko zpět (viz gameReducer.ts LOOK_AT_LEFT_WALL). Na rozdíl od
// desk/door/generator/object_map je to vlastní fullscreen <main>, ne obsah
// uvnitř GameScreen.tsx wrapperu s HUD/dev panelem — viz GameScreen.tsx, kde
// se pro playerView "left_wall" vrací tahle komponenta rovnou, bez zanoření.
export default function LeftWallView({ onLookAtDesk }: LeftWallViewProps) {
  return (
    <main
      className="fixed inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url(/object_13/views/empty-shotgun.webp)" }}
    >
      <button
        type="button"
        className="pixel-button absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 text-xs"
        onClick={onLookAtDesk}
      >
        {COPY.game.leftWallBackLabel}
      </button>
    </main>
  );
}
