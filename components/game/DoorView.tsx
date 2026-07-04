import { COPY } from "@/content/copy";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import DoorSceneFrame from "./DoorSceneFrame";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface DoorViewProps {
  doorClosed: boolean;
  /** viz GameState.doorDeathRevealUntilMs — krátce ukáže monstrum ve dveřích před smrtí. */
  isDoorDeathReveal: boolean;
  onToggleDoor: () => void;
  onLookAtDesk: () => void;
}

// Pohled na dveře: jediné místo, odkud jde dveře zavřít/otevřít. Hráč se sem
// musí nejdřív otočit z DeskView (viz gameActions.ts LOOK_AT_DOOR).
//
// Na rozdíl od DeskView/GeneratorView (SceneBackground přes GameScreen.tsx)
// má DoorView vlastní lokální DoorSceneFrame — obrázek dveří jako reálný
// <img> s pevným poměrem stran, ne viewport CSS pozadí. Hotspot se pozicuje
// procentuálně vůči tomuhle wrapperu, takže při zoomu/resize okna zůstane
// přesně na dveřích (viz DoorSceneFrame.tsx pro detailní zdůvodnění).
//
// Klikací plocha (.door-hotspot, styles/pixel.css) je průhledný hotspot —
// žádný neprůhledný panel přes scénu, ať má hráč pocit, že kliká přímo na
// dveře, ne na UI tlačítko. Stav dveří (otevřeno/zavřeno) je vidět přímo v
// obrázku (elektronický zámek vpravo), takže tu není potřeba velký text.
export default function DoorView({ doorClosed, isDoorDeathReveal, onToggleDoor, onLookAtDesk }: DoorViewProps) {
  const doorScene = BACKGROUND_SCENES.door;
  // Stejné pořadí snímků jako dřív v GameScreen.tsx: 0 = otevřené, 1 = zavřené,
  // 2 = monstrum ve dveřích (jen během doorDeathReveal).
  const activeIndex = isDoorDeathReveal ? 2 : doorClosed ? 1 : 0;

  return (
    <div className="flex flex-col gap-3">
      <DoorSceneFrame frames={doorScene.frames} activeIndex={activeIndex} crossfadeMs={doorScene.crossfadeMs}>
        <button
          className="door-hotspot tap-target-critical absolute flex items-end justify-center"
          style={{ left: "30%", top: "14%", width: "40%", height: "70%" }}
          data-active={doorClosed}
          onClick={onToggleDoor}
          aria-label={doorClosed ? "Otevřít dveře" : "Zavřít dveře"}
        >
          <span className="door-hotspot-label">{COPY.game.doorViewHint}</span>
        </button>
      </DoorSceneFrame>

      <ViewSwitchArrow label={COPY.game.lookAtDeskLabel} onClick={onLookAtDesk} align="left" />
    </div>
  );
}
