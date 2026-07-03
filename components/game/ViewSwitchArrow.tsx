interface ViewSwitchArrowProps {
  label: string;
  onClick: () => void;
  align?: "left" | "right";
  /** Bliká, aby na sebe upozornila — např. rozbitý generátor mimo GeneratorView. */
  urgent?: boolean;
}

/** Malý hotspot pro přepnutí pohledu hráče (stůl/kamery <-> dveře/generátor). */
export default function ViewSwitchArrow({ label, onClick, align = "right", urgent = false }: ViewSwitchArrowProps) {
  return (
    <button
      className="pixel-button px-3 py-2 text-xs w-full"
      style={{ textAlign: align === "right" ? "right" : "left" }}
      data-urgent={urgent}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
