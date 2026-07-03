// Jemné doporučení otočit telefon na šířku. Čistě CSS-řízené (.mobile-landscape-hint
// v styles/pixel.css) — žádná detekce zařízení v JS, žádná herní logika.
export default function MobileLandscapeHint() {
  return (
    <p className="mobile-landscape-hint" role="status">
      Pro lepší hraní otoč telefon na šířku.
    </p>
  );
}
