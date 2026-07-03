interface ViewSwitchArrowProps {
  label: string;
  onClick: () => void;
  align?: "left" | "right";
  /** Bliká, aby na sebe upozornila — např. rozbitý generátor mimo GeneratorView. */
  urgent?: boolean;
}

/**
 * Hotspot pro přepnutí pohledu hráče (stůl/kamery <-> dveře/generátor).
 * Klikací plocha (`.view-hotspot`, min. 48 px výška + padding) je záměrně
 * větší než viditelný text, ať se dá pohodlně trefit prstem.
 */
export default function ViewSwitchArrow({ label, onClick, align = "right", urgent = false }: ViewSwitchArrowProps) {
  return (
    <button
      className="pixel-button pixel-arrow-button view-hotspot px-3 py-2 text-xs w-full"
      style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}
      data-urgent={urgent}
      onClick={onClick}
      aria-label={label}
    >
      {label}
    </button>
  );
}
