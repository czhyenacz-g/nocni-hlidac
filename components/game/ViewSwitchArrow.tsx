type ViewSwitchIconId = "arrow-left" | "arrow-right" | "map" | "door";

interface ViewSwitchArrowProps {
  label: string;
  onClick: () => void;
  align?: "left" | "right" | "center";
  /** Bliká, aby na sebe upozornila — např. rozbitý generátor mimo GeneratorView. */
  urgent?: boolean;
  /**
   * "primary" = vizuálně nejvýraznější navigační akce v daném pohledu (viz
   * DeskView.tsx — otočení ke dveřím jako hlavní směr pohledu control roomu).
   * Jen větší/výraznější vzhled, žádná změna chování kliku.
   */
  variant?: "default" | "primary";
  /**
   * Ikona v konzolovém bloku (viz zadání "silnější ikonografie než obyčejný
   * textový znak šipky") — chybí-li, odvodí se z `align`
   * (DEFAULT_ICON_BY_ALIGN), volající ji přepíše jen když výchozí
   * nesedí (viz DeskView.tsx "Otočit se ke dveřím" -> icon="door").
   */
  icon?: ViewSwitchIconId;
}

const DEFAULT_ICON_BY_ALIGN: Record<"left" | "right" | "center", ViewSwitchIconId> = {
  left: "arrow-left",
  right: "arrow-right",
  center: "map",
};

// Malé inline SVG ikony — žádná nová závislost/asset, jen pár čar
// (stroke="currentColor" ať respektují barvu podle stavu tlačítka,
// včetně urgent/hover, viz styles/pixel.css #console-icon-block).
function ViewSwitchIcon({ id }: { id: ViewSwitchIconId }) {
  switch (id) {
    case "arrow-left":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M15 5 7 12l8 7" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M9 5l8 7-8 7" />
        </svg>
      );
    case "map":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
          <path d="M9 4v14M15 6v14" />
        </svg>
      );
    case "door":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M6 9l6 7 6-7" />
        </svg>
      );
  }
}

/**
 * Hotspot pro přepnutí pohledu hráče (stůl/kamery <-> dveře/generátor).
 * Klikací plocha (`.view-hotspot`, min. 48 px výška + padding) je záměrně
 * větší než viditelný text, ať se dá pohodlně trefit prstem. Vizuálně jde o
 * "konzolový modul" (viz zadání, styles/pixel.css .console-button/
 * .console-icon-block) — tmavý kov + samostatný svítící ikonový blok,
 * ne plochý textový box.
 */
export default function ViewSwitchArrow({
  label,
  onClick,
  align = "right",
  urgent = false,
  variant = "default",
  icon,
}: ViewSwitchArrowProps) {
  const isPrimary = variant === "primary";
  const resolvedIcon = icon ?? DEFAULT_ICON_BY_ALIGN[align];
  const sizeClassName = isPrimary ? "px-4 py-3 text-sm font-bold" : "px-3 py-2.5 text-xs";

  const iconBlock = (
    <span className={`console-icon-block ${isPrimary ? "console-icon-block--primary" : ""}`} aria-hidden="true">
      <ViewSwitchIcon id={resolvedIcon} />
    </span>
  );
  const labelSpan = <span className={align === "center" ? "text-center" : "flex-1 text-left"}>{label}</span>;

  return (
    <button
      className={`pixel-button pixel-arrow-button console-button ${isPrimary ? "console-button--primary" : ""} view-hotspot tap-target w-full flex items-center gap-2.5 ${sizeClassName}`}
      style={{ justifyContent: align === "center" ? "center" : undefined }}
      data-urgent={urgent}
      onClick={onClick}
      aria-label={label}
    >
      {align === "right" ? (
        <>
          {labelSpan}
          {iconBlock}
        </>
      ) : (
        <>
          {iconBlock}
          {labelSpan}
        </>
      )}
    </button>
  );
}
