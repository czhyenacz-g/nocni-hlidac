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
}

/**
 * Hotspot pro přepnutí pohledu hráče (stůl/kamery <-> dveře/generátor).
 * Klikací plocha (`.view-hotspot`, min. 48 px výška + padding) je záměrně
 * větší než viditelný text, ať se dá pohodlně trefit prstem.
 */
export default function ViewSwitchArrow({
  label,
  onClick,
  align = "right",
  urgent = false,
  variant = "default",
}: ViewSwitchArrowProps) {
  const justifyContent = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  const sizeClassName = variant === "primary" ? "px-4 py-3 text-sm font-bold" : "px-3 py-2 text-xs";

  return (
    <button
      className={`pixel-button pixel-arrow-button view-hotspot w-full ${sizeClassName}`}
      // Inline borderColor, ne Tailwind border-* třída — .pixel-panel/.pixel-button
      // (styles/pixel.css) má vlastní `border` shorthand se stejnou specificitou
      // a načítá se až po Tailwind utilities, takže by je jinak potichu přebilo.
      style={{
        justifyContent,
        borderColor: variant === "primary" ? "rgba(245, 158, 11, 0.8)" : undefined,
      }}
      data-urgent={urgent}
      onClick={onClick}
      aria-label={label}
    >
      {label}
    </button>
  );
}
