import { useEffect, useRef, useState, type PointerEvent } from "react";
import { COPY } from "@/content/copy";
import {
  BACKGROUND_SCENES,
  doorClosedFrameOffsetForStep,
  DOOR_CLOSED_FRAME_HOLD_MS,
  DOOR_CLOSED_FRAME_START_INDEX,
  DOOR_DESTROYED_FRAME_INDEX,
  DOOR_GENERATOR_OVERLOAD_FRAME_INDEX,
  IMP_AT_DOOR_FRAME_INDEX,
} from "@/game/visuals/backgroundImages";
import { BULB_REPLACE_DURATION_MS, BULB_REPLACE_SUCCESS_MESSAGE_MS } from "@/game/balancing/constants";
import { computeBulbReplacementProgressRatio } from "@/game/core/bulbReplacementProgress";
import { TITAN_AT_DOOR_SRC, TITAN_ATTACK_SRC, TITAN_BREACH_SRC, TITAN_OVERLOAD_DEATH_SRC } from "@/game/visuals/titanDoorAssets";
import { resolveDoorMonsterOverlay } from "@/game/visuals/doorMonsterOverlay";
import DoorSceneFrame from "./DoorSceneFrame";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface DoorViewProps {
  doorClosed: boolean;
  /** viz GameState.doorDestroyed — trvale zničené dveře (základ pro přetížení generátoru), navždy otevřené, TOGGLE_DOOR je no-op. */
  doorDestroyed: boolean;
  /** viz GameState.doorGeneratorOverloadUntilMs !== null — probíhající desetisekundové přetížení, dveře zamčené, TOGGLE_DOOR je no-op. */
  doorGeneratorOverloadActive: boolean;
  /** Zbývající celé sekundy přetížení (viz GameScreen.tsx), `null` mimo přetížení — jasná indikace, že fáze skutečně trvá 10 s (viz zadání "zobrazení času přetížení"). */
  doorGeneratorOverloadSecondsRemaining: number | null;
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
  /**
   * `true` jen během "monster_reached_office" krize, dokud dveře ještě
   * nejsou zavřené (viz zadání, game/core/officeBreachAftermath.ts
   * #resolveOfficeBreachPhase === "close_door", GameScreen.tsx) — vymění
   * klidný hotspot label za výraznější, pulzující variantu. Stejný hotspot/
   * akce (onToggleDoor), jen naléhavější prezentace.
   */
  closeDoorUrgent: boolean;
  /**
   * Titan (viz zadání "napoj kompletní dveřní vizuální sekvenci Titana",
   * `night.enemy.id === "titan"`, ŽÁDNÉ nové `isTitan` pole v GameState) je
   * PRÁVĚ TEĎ u dveří v idle fázi probourávání — `at_door` nebo `breach`
   * (`isMonsterAtDoor`, stejná definice jako zbytek hry). Vzájemně se
   * vylučují, oba `false` mimo Titanovu noc nebo mimo tyhle dvě stage.
   */
  isTitanAtDoor: boolean;
  isTitanBreach: boolean;
  /**
   * Non-Titan monstrum (dnes Imp) je fyzicky u dveří (`enemyStage ===
   * "at_door"`) — viz zadání "at_door obrázky". Vzájemně se vylučuje s
   * `isTitanAtDoor` (GameScreen.tsx je počítá podle `night.enemy.id`),
   * DoorView tenhle obrázek použije jen když dveře jsou zrovna OTEVŘENÉ
   * (`!doorClosed`) — zavřené dveře/jiná stage ho nikdy nezobrazí.
   */
  isImpAtDoor: boolean;
  /** Titanova stage je `"attack"` — jen když `isDoorDeathReveal` je `true`, nahrazuje Impovo `deathRevealIndex` snímkem `titan_attacks_broken_door.webp`. */
  isTitanAttack: boolean;
  /**
   * Snímek countdownu přetížení specifický pro Titana (viz
   * resolveTitanOverloadFrameSrc, GameScreen.tsx) — `null`, pokud přetížení
   * neběží NEBO Titan není u dveří (pak zůstává generický
   * DOOR_GENERATOR_OVERLOAD_FRAME_INDEX beze změny, viz zadání).
   */
  titanOverloadFrameSrc: string | null;
  /** viz GameState.titanOverloadDeathRevealUntilMs !== null — 3s "reveal" mrtvého Titana po úspěšném zabití přetížením. */
  isTitanOverloadDeathReveal: boolean;
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
  doorDestroyed,
  doorGeneratorOverloadActive,
  doorGeneratorOverloadSecondsRemaining,
  isDoorDeathReveal,
  bulbBroken,
  bulbWearRatio,
  canReplaceBulb,
  bulbReplacementActive,
  bulbReplacementProgressMs,
  bulbReplaceSuccessSeq,
  closeDoorUrgent,
  isTitanAtDoor,
  isTitanBreach,
  isImpAtDoor,
  isTitanAttack,
  titanOverloadFrameSrc,
  isTitanOverloadDeathReveal,
  onToggleDoor,
  onLookAtDesk,
  onStartBulbReplacement,
  onCancelBulbReplacement,
}: DoorViewProps) {
  const doorScene = BACKGROUND_SCENES.door;
  // Pořadí snímků (viz BACKGROUND_SCENES.door): 0 = otevřené, 1-4 = zavřené
  // (idle animace, viz closedFrameOffset níže), poslední = monstrum ve
  // dveřích (jen během doorDeathReveal).
  const deathRevealIndex = doorScene.frames.length - 1;
  // Pomalé cyklení mezi zavřenými snímky, dokud dveře zůstávají zavřené —
  // řetězec setTimeoutů stejným vzorem jako SceneBackground.tsx#autoIndex
  // (žádný pevný setInterval, ať jde snadno měnit hold jednotlivě, kdyby
  // některý snímek měl v budoucnu vydržet jinak dlouho). `closedFrameStep`
  // je jen monotónní počítadlo kroků — skutečný zobrazený snímek dopočítá
  // `doorClosedFrameOffsetForStep` (ping-pong 0,1,2,3,2,1,0,..., viz zadání).
  // Reset na 0 při otevření/zavření dveří, ať animace vždycky začíná od
  // prvního zavřeného snímku, ne odkudsi uprostřed.
  const [closedFrameStep, setClosedFrameStep] = useState(0);
  useEffect(() => {
    if (!doorClosed || isDoorDeathReveal) {
      setClosedFrameStep(0);
      return;
    }
    const timeout = setTimeout(() => setClosedFrameStep((step) => step + 1), DOOR_CLOSED_FRAME_HOLD_MS);
    return () => clearTimeout(timeout);
  }, [doorClosed, isDoorDeathReveal, closedFrameStep]);
  // Priorita: doorDeathReveal (monstrum u dveří, smrt už rozhodnuta) >
  // titanOverloadDeathReveal (Titan zabitý přetížením, viz zadání) >
  // doorDestroyed (trvale, do konce noci) > probíhající přetížení > zavřeno/
  // otevřeno. doorDestroyed a doorGeneratorOverloadActive se nikdy nesejdou
  // současně (viz gameReducer.ts#updateDoorGeneratorOverload — pole se
  // vzájemně vylučují), pořadí je tu jen pro čitelnost/budoucí jistotu.
  //
  // Monstrum-u-otevřených-dveří obrázek (viz zadání "at_door obrázky") —
  // čistá funkce (game/visuals/doorMonsterOverlay.ts), konzultovaná jen
  // když žádná vyšší priorita (deathReveal/overloadDeathReveal/destroyed/
  // probíhající přetížení) neplatí. `doorMonsterOverlay` je `null` mimo
  // at_door/breach nebo se zavřenými dveřmi (Imp/Titan at_door) — pak se
  // použije obvyklá otevřená/zavřená animace beze změny.
  const doorMonsterOverlay = resolveDoorMonsterOverlay({ doorClosed, isImpAtDoor, isTitanAtDoor, isTitanBreach });
  // `titanOverrideSrc` (jiný obrázek než generický `doorScene.frames`,
  // podle zadání "napoj Titanovu dveřní sekvenci") se, pokud existuje,
  // vykreslí jako JEDINÝ snímek (aktivní index 0) místo generického pole —
  // Titanovy assety nejsou součástí `BACKGROUND_SCENES.door` (viz
  // titanDoorAssets.ts hlavička), takže nejdou vyjádřit jako index do NĚJ.
  const titanOverrideSrc = isDoorDeathReveal
    ? isTitanAttack
      ? TITAN_ATTACK_SRC
      : null
    : isTitanOverloadDeathReveal
      ? TITAN_OVERLOAD_DEATH_SRC
      : doorGeneratorOverloadActive
        ? titanOverloadFrameSrc
        : !doorDestroyed && doorMonsterOverlay === "titan_breach"
          ? TITAN_BREACH_SRC
          : !doorDestroyed && doorMonsterOverlay === "titan_at_door"
            ? TITAN_AT_DOOR_SRC
            : null;
  const activeIndex = isDoorDeathReveal
    ? deathRevealIndex
    : doorDestroyed
      ? DOOR_DESTROYED_FRAME_INDEX
      : doorGeneratorOverloadActive
        ? DOOR_GENERATOR_OVERLOAD_FRAME_INDEX
        : doorClosed
          ? DOOR_CLOSED_FRAME_START_INDEX + doorClosedFrameOffsetForStep(closedFrameStep)
          : doorMonsterOverlay === "imp_at_door"
            ? IMP_AT_DOOR_FRAME_INDEX
            : 0;
  const sceneFrames = titanOverrideSrc !== null ? [{ src: titanOverrideSrc }] : doorScene.frames;
  const sceneActiveIndex = titanOverrideSrc !== null ? 0 : activeIndex;
  // Dveře nereagují na hráče (viz TOGGLE_DOOR guard v gameReducer.ts) —
  // hotspot zůstává vizuálně přítomný (žádný layout skok), ale bez akce a s
  // odlišným textem, ať klik viditelně "nic neudělá" místo tichého no-opu.
  const doorControlsLocked = doorDestroyed || doorGeneratorOverloadActive;
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
      <DoorSceneFrame frames={sceneFrames} activeIndex={sceneActiveIndex} crossfadeMs={doorScene.crossfadeMs}>
        <button
          className={`door-hotspot tap-target-critical absolute flex items-end justify-center ${doorControlsLocked ? "opacity-50 cursor-not-allowed" : ""}`}
          style={{ left: "30%", top: "14%", width: "40%", height: "70%" }}
          data-active={doorClosed}
          onClick={doorControlsLocked ? undefined : onToggleDoor}
          aria-label={
            doorDestroyed
              ? COPY.game.doorViewHintDestroyed
              : doorGeneratorOverloadActive
                ? COPY.game.doorViewHintGeneratorOverload
                : doorClosed
                  ? "Otevřít dveře"
                  : "Zavřít dveře"
          }
        >
          <span
            className="door-hotspot-label"
            style={
              closeDoorUrgent && !doorClosed && !doorControlsLocked
                ? { animation: "pixel-blink 0.6s steps(2) infinite", background: "#ef4444", color: "#fff" }
                : undefined
            }
          >
            {doorDestroyed
              ? COPY.game.doorViewHintDestroyed
              : doorGeneratorOverloadActive
                ? COPY.game.doorViewHintGeneratorOverload
                : doorClosed
                  ? COPY.game.doorViewHintOpen
                  : closeDoorUrgent
                    ? COPY.game.doorViewHintCloseUrgent
                    : COPY.game.doorViewHintClose}
          </span>
        </button>

        {doorGeneratorOverloadActive && doorGeneratorOverloadSecondsRemaining !== null && (
          // Malý stavový text (viz zadání "zobrazení času přetížení") — hráč
          // je sem automaticky přesunutý ze START_GENERATOR_OVERLOAD, takže
          // countdown patří sem, ne jen na (teď opuštěný) generátorový
          // pohled. pointer-events-none: čistě informativní, nesmí bránit
          // hotspotu pod ním (ten je stejně zamčený, viz doorControlsLocked).
          <div
            className="absolute pointer-events-none text-sm font-bold text-red-300 bg-black/70 border border-red-600 px-3 py-1 rounded whitespace-nowrap"
            style={{ left: "50%", top: "6%", transform: "translateX(-50%)" }}
          >
            {COPY.game.doorGeneratorOverloadCountdownLabel.replace("{seconds}", String(doorGeneratorOverloadSecondsRemaining))}
          </div>
        )}

        {isTitanOverloadDeathReveal && (
          // Stejné umístění/styl jako countdown box výše (jen zelený místo
          // červeného — potvrzení úspěchu, ne varování) — viz zadání
          // "PŘETÍŽENÍ DOKONČENO" po úspěšném zabití Titana přetížením.
          <div
            className="absolute pointer-events-none text-center text-sm font-bold text-emerald-300 bg-black/70 border border-emerald-600 px-3 py-1 rounded whitespace-pre-line"
            style={{ left: "50%", top: "6%", transform: "translateX(-50%)" }}
          >
            {COPY.game.titanOverloadDeathTitleLabel}
            {"\n"}
            {COPY.game.titanOverloadDeathBodyLabel}
          </div>
        )}

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
