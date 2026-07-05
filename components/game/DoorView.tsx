import { COPY } from "@/content/copy";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { BULB_REPLACE_DURATION_MS } from "@/game/balancing/constants";
import DoorSceneFrame from "./DoorSceneFrame";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface DoorViewProps {
  doorClosed: boolean;
  /** viz GameState.doorDeathRevealUntilMs — krátce ukáže monstrum ve dveřích před smrtí. */
  isDoorDeathReveal: boolean;
  /** Prasklá žárovka u dveří (viz game/core/roomBulbs.ts) — řídí, jestli se vůbec zobrazí ikonka výměny. */
  bulbBroken: boolean;
  /** viz GameState.bulbReplacement — probíhající ruční výměna. */
  bulbReplacementActive: boolean;
  bulbReplacementProgressMs: number;
  onToggleDoor: () => void;
  onLookAtDesk: () => void;
  onStartBulbReplacement: () => void;
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
export default function DoorView({
  doorClosed,
  isDoorDeathReveal,
  bulbBroken,
  bulbReplacementActive,
  bulbReplacementProgressMs,
  onToggleDoor,
  onLookAtDesk,
  onStartBulbReplacement,
}: DoorViewProps) {
  const doorScene = BACKGROUND_SCENES.door;
  // Stejné pořadí snímků jako dřív v GameScreen.tsx: 0 = otevřené, 1 = zavřené,
  // 2 = monstrum ve dveřích (jen během doorDeathReveal).
  const activeIndex = isDoorDeathReveal ? 2 : doorClosed ? 1 : 0;
  // Ikonka výměny žárovky se ukáže jen s otevřenými dveřmi (jednodušší
  // varianta než neaktivní ikonka při zavřených, viz GAME_DESIGN.md
  // "Žárovky") — vlastní menší absolutní vrstva MIMO .door-hotspot
  // (stranou, ne přes celý rám dveří), ať klik na ni nikdy nezavře/neotevře
  // dveře. `stopPropagation` je navíc jistota — sourozenecké elementy spolu
  // stejně nebublávají, ale žádné budoucí zanoření to nerozbije.
  const showBulbReplacement = !doorClosed && bulbBroken;
  const bulbReplacementSeconds = (bulbReplacementProgressMs / 1000).toFixed(1);
  const bulbReplacementPercent = Math.min(100, (bulbReplacementProgressMs / BULB_REPLACE_DURATION_MS) * 100);

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

        {showBulbReplacement && (
          <div
            className="absolute flex flex-col items-center gap-1"
            style={{ left: "84%", top: "48%", transform: "translate(-50%, -50%)" }}
          >
            <button
              type="button"
              className="tap-target flex items-center justify-center rounded-full border border-amber-400/70 bg-black/70 text-amber-300"
              style={{ width: "64px", height: "64px" }}
              disabled={bulbReplacementActive}
              onClick={(event) => {
                event.stopPropagation();
                onStartBulbReplacement();
              }}
              aria-label={COPY.game.bulbReplaceLabel}
            >
              {bulbReplacementActive ? (
                <span className="text-[11px] leading-none">
                  {COPY.game.bulbReplaceProgressShortLabel.replace("{seconds}", bulbReplacementSeconds)}
                </span>
              ) : (
                <span className="text-2xl leading-none">💡</span>
              )}
            </button>
            <span className="text-[10px] text-amber-300 bg-black/70 px-1.5 py-0.5 rounded whitespace-nowrap">
              {bulbReplacementActive
                ? COPY.game.bulbReplaceInProgressLabel.replace("{seconds}", bulbReplacementSeconds)
                : COPY.game.bulbReplaceLabel}
            </span>
            {bulbReplacementActive && (
              <div className="w-16 h-1 bg-gray-800 border border-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-150"
                  style={{ width: `${bulbReplacementPercent}%` }}
                />
              </div>
            )}
          </div>
        )}
      </DoorSceneFrame>

      {/* Scéna nahoře smí být přes celou dostupnou šířku (viz GameScreen.tsx,
          DoorView na rozdíl od desk/generator není v max-w-md) — tlačítko
          zpět ale zůstává v úzkém sloupci jako všude jinde, ať není přes
          celou šířku obrazovky a působí jako méně dominantní spodní lišta. */}
      <div className="w-full max-w-md mx-auto">
        <ViewSwitchArrow label={COPY.game.lookAtDeskLabel} onClick={onLookAtDesk} align="left" />
      </div>
    </div>
  );
}
