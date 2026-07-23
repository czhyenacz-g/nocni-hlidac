import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useCopy } from "@/game/i18n/useTranslation";
import { GeneratorState } from "@/game/core/types";
import { GENERATOR_ACCIDENTAL_RESTART_MESSAGE_MS, GENERATOR_OVERLOAD_WINDUP_DURATION_MS } from "@/game/balancing/constants";
import ViewSwitchArrow from "./ViewSwitchArrow";

interface GeneratorViewProps {
  generatorState: GeneratorState;
  /** Zvyšuje se při každém pípnutí (state.generatorBeepSeq) — synchronizuje bliknutí kontrolky se zvukem. */
  beepSeq: number;
  /** Zvyšuje se přesně jednou při zbytečném restartu FUNKČNÍHO generátoru (viz GameState.generatorAccidentalRestartSeq). */
  accidentalRestartSeq: number;
  onRestartGenerator: () => void;
  onLookAtDesk: () => void;
  /**
   * Jestli je "PŘETÍŽIT GENERÁTOR" tuhle noc vůbec vidět (viz zadání
   * "zobrazit od 5. noci", game/difficulty/nightConfig.ts#generatorOverloadEnabled)
   * — jen viditelnost tlačítka, KLIKATELNOST (generatorState/doorDestroyed/
   * probíhající přetížení) řeší canStartGeneratorOverloadWindup v
   * app/play/page.tsx#handleStartGeneratorOverload, ne tenhle prop.
   */
  canOverloadGenerator: boolean;
  /** viz gameReducer.ts#canStartGeneratorOverloadWindup — čistě vizuální ztlumení (stejný vzor jako LeftWallView "Jít ven" + zavřené dveře), autoritativní podmínka zůstává v reduceru/handleru. */
  canStartOverload: boolean;
  /** viz GameState.generatorOverloadWindup — hold-to-activate, žádný window.confirm, stejný pointerDown/Up vzor jako LeftWallView "Jít ven". */
  overloadWindupActive: boolean;
  overloadWindupProgressMs: number;
  /** Zahájí/zruší držení (viz app/play/page.tsx#handleStartGeneratorOverloadWindup/handleCancelGeneratorOverloadWindup) — stejný pár jako onStartEmergencyRunWindup/onCancelEmergencyRunWindup. */
  onStartGeneratorOverloadWindup: () => void;
  onCancelGeneratorOverloadWindup: () => void;
}

// Pohled na generátor: jediné místo, odkud jde restartovat po poruše (a od
// GENERATOR_OVERLOAD_MIN_NIGHT/admin i vědomě přetížit, viz zadání "zničené
// dveře vlastní chybou hráče"). Hráč se sem musí nejdřív otočit z DeskView
// (viz gameActions.ts LOOK_AT_GENERATOR). Vizuální stav je jen pomocný —
// hlavní signál poruchy je zvuk (ticho, pak rychlé pípání), viz AUDIO_DESIGN.md.
export default function GeneratorView({
  generatorState,
  beepSeq,
  accidentalRestartSeq,
  onRestartGenerator,
  onLookAtDesk,
  canOverloadGenerator,
  canStartOverload,
  overloadWindupActive,
  overloadWindupProgressMs,
  onStartGeneratorOverloadWindup,
  onCancelGeneratorOverloadWindup,
}: GeneratorViewProps) {
  const COPY = useCopy();
  // Kontrolka v "normal" stavu je jinak statická zelená — key na beepSeq ji
  // při každém pípnutí remountne, což znovu spustí jednorázovou pixel-flash
  // animaci (viz styles/pixel.css) přesně v okamžiku zvuku.
  const indicatorKey = generatorState === "normal" ? beepSeq : generatorState;

  // Krátká posměšná hláška po zbytečném restartu — čistě kosmetický lokální
  // timeout v komponentě (ne herní stav), spouští se jen na SKUTEČNOU změnu
  // accidentalRestartSeq, stejný vzor jako showSuccessMessage v DoorView.tsx.
  const [showAccidentalRestartMessage, setShowAccidentalRestartMessage] = useState(false);
  const prevAccidentalRestartSeqRef = useRef(accidentalRestartSeq);
  useEffect(() => {
    if (prevAccidentalRestartSeqRef.current === accidentalRestartSeq) return;
    prevAccidentalRestartSeqRef.current = accidentalRestartSeq;
    setShowAccidentalRestartMessage(true);
    const timeout = setTimeout(() => setShowAccidentalRestartMessage(false), GENERATOR_ACCIDENTAL_RESTART_MESSAGE_MS);
    return () => clearTimeout(timeout);
  }, [accidentalRestartSeq]);

  // Stejný výpočet jako LeftWallView.tsx#windupSeconds/windupPercent — jen
  // jiná konstanta (GENERATOR_OVERLOAD_WINDUP_DURATION_MS).
  const overloadWindupSeconds = Math.max(0, (GENERATOR_OVERLOAD_WINDUP_DURATION_MS - overloadWindupProgressMs) / 1000).toFixed(1);
  const overloadWindupPercent = Math.min(100, (overloadWindupProgressMs / GENERATOR_OVERLOAD_WINDUP_DURATION_MS) * 100);

  // Hold-to-activate — stejný pointerDown/Up/Leave/Cancel vzor jako
  // LeftWallView.tsx#handlePointerDown/handlePointerUp (žádný window.confirm,
  // žádné kliknutí). `onCancelGeneratorOverloadWindup` je no-op v reduceru,
  // pokud žádné držení zrovna neběží, takže je bezpečné ho volat i z
  // pointerLeave/Cancel, které mohou dorazit bez předchozího pointerDown.
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    onStartGeneratorOverloadWindup();
  }

  function handlePointerUp() {
    onCancelGeneratorOverloadWindup();
  }

  return (
    <div className="flex flex-col gap-3">
      <ViewSwitchArrow label={COPY.game.lookAtDeskLabel} onClick={onLookAtDesk} align="left" />

      {/* Stejný "terminál" obal jako MainMenuScreen/LoadingScreen/BriefingScreen
          (viz zadání "udělej ve stejným stylu jako úvodní stránka") — kovový
          rám + 4 šrouby kolem, samotné tlačítko restartu dostane navíc třídu
          .menu-terminal-screen (zapuštěná tmavší obrazovka, neutrální šedý
          nádech), beze změny klikatelnosti/obsahu. `data-fault` (ne obecné
          `data-active`) — generátor v poruše je jediný "aktivní" stav v GUI,
          který skutečně znamená nebezpečí, proto má vlastní tlumeně červenou
          variantu (viz styles/pixel.css). */}
      <div className="menu-terminal-frame">
        <span className="camera-monitor-screw" style={{ top: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ top: 5, right: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, left: 5 }} aria-hidden="true" />
        <span className="camera-monitor-screw" style={{ bottom: 5, right: 5 }} aria-hidden="true" />

        <button
          className="pixel-button pixel-screen-static menu-terminal-screen tap-target-critical h-48 w-full flex flex-col items-center justify-center gap-3 text-sm relative"
          data-fault={generatorState !== "normal"}
          onClick={onRestartGenerator}
          aria-label="Restartovat generátor"
        >
          <span
            key={indicatorKey}
            className="pixel-indicator"
            data-state={generatorState}
            data-flash={generatorState === "normal"}
          />
          <span>{COPY.game.generatorStateLabels[generatorState]}</span>
          <span className="text-[10px] text-gray-400">{COPY.game.generatorViewHint}</span>

          {showAccidentalRestartMessage && (
            // pointer-events-none: čistě informativní hláška, nesmí bránit
            // dalším kliknutím na tlačítko pod ní.
            <div
              className="absolute pointer-events-none text-sm text-gray-300 bg-black/70 px-3 py-1 rounded whitespace-nowrap"
              style={{ left: "50%", top: "8%", transform: "translate(-50%, -50%)" }}
            >
              {COPY.game.generatorAccidentalRestartMessage}
            </div>
          )}
        </button>
      </div>

      {/* "PŘETÍŽIT GENERÁTOR" — přes celou šířku, výrazně nebezpečně vypadající
          (silný červený rámeček + tmavě rudé pozadí, BEZ neonového glow —
          jen fyzická výstražná barva na štítku, viz zadání "ne neonovou, bez
          velkých glow efektů"), jasně odlišené od klidného šedého
          restart-terminálu nad ním. Hold-to-activate, ne klik —
          pointerDown/Up/Leave/Cancel, stejný fyzický vzor jako LeftWallView.tsx
          "Jít ven". Progress se plní ZLEVA DOPRAVA jako poloprůhledná vrstva
          uvnitř tlačítka (ne samostatný bar pod ním jako u "Jít ven") — na
          přání "plnění tlačítka zleva doprava". */}
      {canOverloadGenerator && (
        <button
          type="button"
          className={`pixel-button tap-target-critical relative w-full overflow-hidden flex flex-col items-center justify-center gap-0.5 px-3 py-3 text-sm border-4 border-red-700 bg-red-950/80 text-red-100 touch-none select-none ${
            !overloadWindupActive && !canStartOverload ? "opacity-50" : ""
          }`}
          style={
            overloadWindupActive
              ? {
                  animation: "pixel-blink 0.35s steps(2) infinite",
                  borderColor: "#b91c1c",
                }
              : undefined
          }
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={COPY.game.generatorOverloadLabel}
        >
          {/* Vyplnění zleva doprava podle overloadWindupPercent — čistá
              prezentační vrstva, nikdy nezachytává pointer eventy. */}
          <div
            className="absolute inset-y-0 left-0 bg-red-600/50 pointer-events-none"
            style={{ width: `${overloadWindupActive ? overloadWindupPercent : 0}%` }}
            aria-hidden="true"
          />
          <span className="relative z-10 font-bold tracking-widest">
            {overloadWindupActive
              ? COPY.game.generatorOverloadHoldingLabel.replace("{seconds}", overloadWindupSeconds)
              : COPY.game.generatorOverloadLabel}
          </span>
          <span className="relative z-10 text-[10px] text-red-300">{COPY.game.generatorOverloadDangerLabel}</span>
        </button>
      )}
    </div>
  );
}
