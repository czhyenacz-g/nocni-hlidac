import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/game/i18n/useTranslation";
import { CRITICAL_POWER_THRESHOLD, POWER_RECHARGE_ANIMATION_MS } from "@/game/balancing/constants";
import ConsoleIcon from "./ConsoleIcon";

interface PowerMeterProps {
  power: number;
  /**
   * Zvyšuje se přesně jednou při každém RECHARGE_POWER (viz
   * GameState.powerRechargeSeq) — jediný účel je spustit delší, postupnou
   * CSS animaci výplně (viz zadání "uspokojivý efekt" po přinesení
   * baterie), místo okamžitého skoku. Volitelné, ať PowerMeter jde použít
   * i bez tohohle propu (vždy rychlá 300ms tranzice jako dřív).
   */
  rechargeSeq?: number;
  /** Dev-only "Stres: X" vedle energie (viz STRESS_DEV_HUD_ENABLED) — undefined = nezobrazovat. */
  stressPercent?: number;
  /** Zatím jen zobrazení (viz game/core/bulbInventory.ts) — undefined = nezobrazovat. */
  bulbsRemaining?: number;
  /**
   * Předformátovaný stav žárovky u dveří, např. "23 s" nebo "prasklá" (viz
   * game/core/roomBulbs.ts) — PowerMeter sama nepočítá sekundy/stav, jen
   * zobrazí, co dostane. `undefined` = nezobrazovat.
   */
  nearRoomBulbLabel?: string;
  /**
   * Jestli `nearRoomBulbLabel` PRÁVĚ TEĎ ukazuje odpočet v sekundách (ne
   * "prasklá") — jen tehdy dostane jemné blikání/záři (viz
   * styles/atmosphere.css#bulb-countdown-flicker, zadání "ať ten text
   * trochu bliká/září"). PowerMeter sama nepočítá `broken`, jen zobrazí.
   */
  nearRoomBulbCountingDown?: boolean;
}

export default function PowerMeter({
  power,
  rechargeSeq,
  stressPercent,
  bulbsRemaining,
  nearRoomBulbLabel,
  nearRoomBulbCountingDown,
}: PowerMeterProps) {
  const COPY = useCopy();
  // Lišta i ikonka baterie jsou vždy neutrálně šedé (viz zadání "nemá
  // přeskakovat mezi neonově zelenou, žlutou a červenou") — kritickou energii
  // signalizuje jen tlumeně červený text procent níže, ne barva pruhu.
  const isCritical = power <= CRITICAL_POWER_THRESHOLD;

  // Normální odčerpávání v TICKu se mění plynule každý snímek samo o sobě
  // (žádná animace navíc potřeba) — jen SKUTEČNÉ dobití (RECHARGE_POWER,
  // viz rechargeSeq) má dostat delší, postupnou tranzici výplně, ať je vidět
  // "uspokojivý efekt", ne okamžitý skok. Ref drží poslední viděnou hodnotu,
  // ať efekt na prvním mountu animaci nespustí (stejný vzor jako
  // DoorView.tsx#showSuccessMessage).
  const [isRecharging, setIsRecharging] = useState(false);
  const prevRechargeSeqRef = useRef(rechargeSeq);
  useEffect(() => {
    if (rechargeSeq === undefined || prevRechargeSeqRef.current === rechargeSeq) return;
    prevRechargeSeqRef.current = rechargeSeq;
    setIsRecharging(true);
    const timeout = setTimeout(() => setIsRecharging(false), POWER_RECHARGE_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [rechargeSeq]);

  return (
    <div className="console-panel p-2 flex items-center gap-2.5">
      <span className="console-icon-block console-icon-block--sm console-icon-block--muted" aria-hidden="true">
        <ConsoleIcon id="battery" />
      </span>
      <div className="flex-1">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>{COPY.game.powerLabel}</span>
          <span className="flex items-center gap-1">
            {isCritical && <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500/80" aria-hidden="true" />}
            <span className={isCritical ? "text-red-400" : undefined}>{Math.round(power)}%</span>
            {stressPercent !== undefined && (
              <span className="text-gray-500"> · {COPY.game.stressLabel}: {stressPercent}</span>
            )}
            {bulbsRemaining !== undefined && (
              <span className="text-gray-500"> · {COPY.game.bulbsLabel}: {bulbsRemaining}</span>
            )}
          </span>
        </div>
        <div className="h-3 bg-gray-800 border border-gray-700">
          <div
            className="h-full bg-gray-300 transition-[width] ease-out"
            style={{
              width: `${power}%`,
              transitionDuration: isRecharging ? `${POWER_RECHARGE_ANIMATION_MS}ms` : "300ms",
            }}
          />
        </div>
        {nearRoomBulbLabel !== undefined && (
          <div className={`text-[10px] text-gray-500 mt-1 ${nearRoomBulbCountingDown ? "bulb-countdown-flicker" : ""}`}>
            {COPY.game.nearRoomBulbLabel}: {nearRoomBulbLabel}
          </div>
        )}
      </div>
    </div>
  );
}
