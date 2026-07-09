import { OfficeBreachPhase } from "@/game/core/officeBreachAftermath";
import { COPY } from "@/content/copy";

interface OfficeBreachBannerProps {
  /** `null` = krize neběží (nebo je vyřešená) — banner se vůbec nevykreslí, viz resolveOfficeBreachPhase. */
  phase: OfficeBreachPhase | null;
}

const PHASE_COPY: Record<OfficeBreachPhase, { headline: string; hint: string }> = {
  close_door: { headline: COPY.game.officeBreachCloseDoorLabel, hint: COPY.game.officeBreachCloseDoorHintLabel },
  restart_generator: {
    headline: COPY.game.officeBreachRestartGeneratorLabel,
    hint: COPY.game.officeBreachRestartGeneratorHintLabel,
  },
  replace_bulb: { headline: COPY.game.officeBreachReplaceBulbLabel, hint: COPY.game.officeBreachReplaceBulbHintLabel },
};

// Trvalý krizový panel po "monster_reached_office" (viz zadání,
// game/core/officeBreachAftermath.ts#resolveOfficeBreachPhase) — sourozenec
// normálního HUD, vidět na VŠECH pohledech (desk/door/generator/left_wall),
// ne jen tam, kde se běžný HUD (čas/zvuk/energie) normálně renderuje, ať
// hráč instrukci nepropásne, ať se dívá kamkoliv (viz GameScreen.tsx —
// renderuje se MIMO `!isWideSceneView` blok). Čistě zobrazovací komponenta —
// VŠECHNO rozhodování (která fáze, kdy zmizet) žije v resolveOfficeBreachPhase,
// tenhle soubor jen mapuje fázi na text.
export default function OfficeBreachBanner({ phase }: OfficeBreachBannerProps) {
  if (phase === null) return null;
  const { headline, hint } = PHASE_COPY[phase];

  return (
    <div
      className="p-3 text-center"
      style={{
        background: "rgba(40, 4, 4, 0.92)",
        border: "1px solid #ef4444",
        boxShadow: "0 0 14px rgba(239,68,68,0.5)",
      }}
    >
      <div className="text-sm font-bold uppercase" style={{ color: "#ff8a8a", textShadow: "0 0 6px rgba(255,92,92,0.7)" }}>
        {headline}
      </div>
      <div className="text-xs mt-1" style={{ color: "#ffb4b4" }}>
        {hint}
      </div>
    </div>
  );
}
