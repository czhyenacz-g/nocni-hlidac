import { COPY } from "@/content/copy";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface DoorViewProps {
  doorClosed: boolean;
  onToggleDoor: () => void;
  onLookAtDesk: () => void;
}

// Pohled na dveře: jediné místo, odkud jde dveře zavřít/otevřít. Hráč se sem
// musí nejdřív otočit z DeskView (viz gameActions.ts LOOK_AT_DOOR).
//
// Klikací plocha (.door-hotspot, styles/pixel.css) je průhledný hotspot
// posazený procentuálně na samotné dveře ve SceneBackground obrázku (viz
// GameScreen.tsx BACKGROUND_SCENES.door) — žádný neprůhledný panel přes
// scénu, ať má hráč pocit, že kliká přímo na dveře, ne na UI tlačítko.
// Stav dveří (otevřeno/zavřeno) je vidět přímo v obrázku (elektronický
// zámek vpravo), takže tu není potřeba velký textový popisek.
export default function DoorView({ doorClosed, onToggleDoor, onLookAtDesk }: DoorViewProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-64 w-full">
        <button
          className="door-hotspot tap-target-critical absolute flex items-end justify-center"
          style={{ left: "30%", top: "14%", width: "40%", height: "70%" }}
          data-active={doorClosed}
          onClick={onToggleDoor}
          aria-label={doorClosed ? "Otevřít dveře" : "Zavřít dveře"}
        >
          <span className="door-hotspot-label">{COPY.game.doorViewHint}</span>
        </button>
      </div>

      <ViewSwitchArrow label={COPY.game.lookAtDeskLabel} onClick={onLookAtDesk} align="left" />
    </div>
  );
}
