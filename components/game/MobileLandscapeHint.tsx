"use client";

import { useCopy } from "@/game/i18n/useTranslation";

// Jemné doporučení otočit telefon na šířku. Čistě CSS-řízené (.mobile-landscape-hint
// v styles/pixel.css) — žádná detekce zařízení v JS, žádná herní logika.
export default function MobileLandscapeHint() {
  const COPY = useCopy();
  return (
    <p className="mobile-landscape-hint" role="status">
      {COPY.ui.mobileLandscapeHint}
    </p>
  );
}
