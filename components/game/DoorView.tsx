import { useEffect, useRef, useState, type PointerEvent } from "react";
import { COPY } from "@/content/copy";
import { BACKGROUND_SCENES } from "@/game/visuals/backgroundImages";
import { BULB_REPLACE_DURATION_MS, BULB_REPLACE_SUCCESS_MESSAGE_MS } from "@/game/balancing/constants";
import { computeBulbReplacementProgressRatio } from "@/game/core/bulbReplacementProgress";
import DoorSceneFrame from "./DoorSceneFrame";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface DoorViewProps {
  doorClosed: boolean;
  /** viz GameState.doorDeathRevealUntilMs — krátce ukáže monstrum ve dveřích před smrtí. */
  isDoorDeathReveal: boolean;
  /** Prasklá žárovka u dveří (viz game/core/roomBulbs.ts) — jen jemné grayscale navíc na ikonce, o viditelnosti/interaktivitě už nerozhoduje. */
  bulbBroken: boolean;
  /** 0 (prasklá/vybitá) .. 1 (nová) — viz game/core/roomBulbs.ts#computeNearRoomBulbWearRatio. Řídí klidový jas ikonky mimo aktivní výměnu. */
  bulbWearRatio: number;
  /** viz gameReducer.ts#canReplaceBulb — jestli by teď držení ikonky vůbec něco spustilo (dveře otevřené, náhradní žárovka k dispozici, ...). */
  canReplaceBulb: boolean;
  /** viz GameState.bulbReplacement — probíhající ruční výměna. */
  bulbReplacementActive: boolean;
  bulbReplacementProgressMs: number;
  /** viz GameState.bulbReplaceSuccessSeq — zvyšuje se jen při úspěšném dokončení výměny. */
  bulbReplaceSuccessSeq: number;
  onToggleDoor: () => void;
  onLookAtDesk: () => void;
  onStartBulbReplacement: () => void;
  onCancelBulbReplacement: () => void;
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
  bulbWearRatio,
  canReplaceBulb,
  bulbReplacementActive,
  bulbReplacementProgressMs,
  bulbReplaceSuccessSeq,
  onToggleDoor,
  onLookAtDesk,
  onStartBulbReplacement,
  onCancelBulbReplacement,
}: DoorViewProps) {
  const doorScene = BACKGROUND_SCENES.door;
  // Stejné pořadí snímků jako dřív v GameScreen.tsx: 0 = otevřené, 1 = zavřené,
  // 2 = monstrum ve dveřích (jen během doorDeathReveal).
  const activeIndex = isDoorDeathReveal ? 2 : doorClosed ? 1 : 0;
  // Ikonka výměny je v DoorView trvale vidět (na rozdíl od dřívějšího "jen
  // po prasknutí") — jedinou výjimkou je krátký doorDeathReveal (monstrum ve
  // dveřích těsně před smrtí), kde by ikonka jen rušila. Vlastní menší
  // absolutní vrstva MIMO .door-hotspot (stranou, ne přes celý rám dveří), ať
  // klik na ni nikdy nezavře/neotevře dveře. `stopPropagation` je navíc
  // jistota — sourozenecké elementy spolu stejně nebublávají, ale žádné
  // budoucí zanoření to nerozbije.
  const showBulbReplacement = !isDoorDeathReveal;
  const bulbReplacementSeconds = (bulbReplacementProgressMs / 1000).toFixed(1);
  const bulbReplacementPercent = Math.min(100, (bulbReplacementProgressMs / BULB_REPLACE_DURATION_MS) * 100);
  // Mimo aktivní výměnu ukazuje ikonka opotřebení žárovky samotné
  // (bulbWearRatio, viz computeNearRoomBulbWearRatio — 0 prasklá/vybitá, 1
  // nová), během výměny se místo toho postupně rozsvěcí podle progresu ze
  // GameState (computeBulbReplacementProgressRatio) — ne lokální animace.
  const displayRatio = bulbReplacementActive
    ? computeBulbReplacementProgressRatio(bulbReplacementProgressMs)
    : bulbWearRatio;
  const bulbIconStyle = {
    filter: `brightness(${0.35 + displayRatio * 1.2})${bulbBroken && !bulbReplacementActive ? " grayscale(0.6)" : ""}`,
    opacity: 0.55 + displayRatio * 0.45,
    boxShadow:
      displayRatio > 0 ? `0 0 ${8 + displayRatio * 16}px rgba(251, 191, 36, ${0.3 + displayRatio * 0.5})` : undefined,
  };

  // Držení tlačítka řídí progres v reduceru (TICK + START/CANCEL_BULB_REPLACEMENT),
  // ne lokální React state — pointerUp/Leave/Cancel všechny mapují na stejné
  // zrušení, ať výměna nikdy neběží bez toho, aby hráč fyzicky držel tlačítko.
  // `canReplaceBulb` je jen UX zkratka (žádný zbytečný dispatch, když by
  // reducer beztak no-opoval) — autoritativní podmínka zůstává v reduceru.
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    if (!canReplaceBulb) return;
    onStartBulbReplacement();
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onCancelBulbReplacement();
  }

  // Krátká potvrzovací hláška po úspěšném dokončení výměny — čistě kosmetický
  // lokální timeout v komponentě (ne herní stav), spouští se jen na SKUTEČNOU
  // změnu bulbReplaceSuccessSeq (ne na start/cancel/smrt, ty seq vůbec
  // nemění, viz gameReducer.ts#updateBulbReplacement). Ref drží poslední
  // viděnou hodnotu, ať efekt na prvním mountu hlášku nezobrazí.
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const prevSuccessSeqRef = useRef(bulbReplaceSuccessSeq);
  useEffect(() => {
    if (prevSuccessSeqRef.current === bulbReplaceSuccessSeq) return;
    prevSuccessSeqRef.current = bulbReplaceSuccessSeq;
    setShowSuccessMessage(true);
    const timeout = setTimeout(() => setShowSuccessMessage(false), BULB_REPLACE_SUCCESS_MESSAGE_MS);
    return () => clearTimeout(timeout);
  }, [bulbReplaceSuccessSeq]);

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
          <span className="door-hotspot-label">
            {doorClosed ? COPY.game.doorViewHintOpen : COPY.game.doorViewHintClose}
          </span>
        </button>

        {showBulbReplacement && (
          <div
            className="absolute flex flex-col items-center gap-1"
            style={{ left: "84%", top: "48%", transform: "translate(-50%, -50%)" }}
          >
            <button
              type="button"
              className={`tap-target flex items-center justify-center rounded-full border border-amber-400/70 bg-black/70 text-amber-300 touch-none select-none ${canReplaceBulb ? "" : "cursor-not-allowed"}`}
              style={{ width: "64px", height: "64px", ...bulbIconStyle }}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
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

        {showSuccessMessage && (
          // pointer-events-none: čistě informativní hláška, nikdy nesmí bránit
          // klikání na dveře pod ní (i kdyby se pozičně sešla s hotspotem).
          <div
            className="absolute pointer-events-none text-sm text-amber-300 bg-black/70 px-3 py-1 rounded whitespace-nowrap"
            style={{ left: "50%", top: "8%", transform: "translate(-50%, -50%)" }}
          >
            {COPY.game.bulbReplaceSuccessLabel}
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
