import { OfficeBreachPhase } from "@/game/core/officeBreachAftermath";
import { useCopy } from "@/game/i18n/useTranslation";

interface OfficeBreachBannerProps {
  /** `null` = krize neběží (nebo je vyřešená) — banner se vůbec nevykreslí, viz resolveOfficeBreachPhase. */
  phase: OfficeBreachPhase | null;
}

// Trvalý krizový panel po "monster_reached_office" (viz zadání,
// game/core/officeBreachAftermath.ts#resolveOfficeBreachPhase) — sourozenec
// normálního HUD, vidět na VŠECH pohledech (desk/door/generator/left_wall),
// ne jen tam, kde se běžný HUD (čas/zvuk/energie) normálně renderuje, ať
// hráč instrukci nepropásne, ať se dívá kamkoliv (viz GameScreen.tsx —
// renderuje se MIMO `!isWideSceneView` blok). Čistě zobrazovací komponenta —
// VŠECHNO rozhodování (která fáze, kdy zmizet) žije v resolveOfficeBreachPhase,
// tenhle soubor jen mapuje fázi na text.
export default function OfficeBreachBanner({ phase }: OfficeBreachBannerProps) {
  const COPY = useCopy();
  if (phase === null) return null;
  const PHASE_COPY: Record<OfficeBreachPhase, { headline: string; hint: string }> = {
    close_door: { headline: COPY.game.officeBreachCloseDoorLabel, hint: COPY.game.officeBreachCloseDoorHintLabel },
    restart_generator: {
      headline: COPY.game.officeBreachRestartGeneratorLabel,
      hint: COPY.game.officeBreachRestartGeneratorHintLabel,
    },
    replace_bulb: { headline: COPY.game.officeBreachReplaceBulbLabel, hint: COPY.game.officeBreachReplaceBulbHintLabel },
  };
  const { headline, hint } = PHASE_COPY[phase];

  return (
    <div
      className="p-3 text-center"
      style={{
        background: "rgba(40, 4, 4, 0.92)",
        border: "1px solid #b91c1c",
      }}
    >
      <div className="text-sm font-bold uppercase" style={{ color: "#ff8a8a" }}>
        {headline}
      </div>
      <div className="text-xs mt-1" style={{ color: "#ffb4b4" }}>
        {hint}
      </div>
    </div>
  );
}
