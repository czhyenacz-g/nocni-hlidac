interface ViewSwitchArrowProps {
  label: string;
  onClick: () => void;
  align?: "left" | "right";
}

/** Malý hotspot pro přepnutí pohledu hráče (stůl/kamery <-> dveře). */
export default function ViewSwitchArrow({ label, onClick, align = "right" }: ViewSwitchArrowProps) {
  return (
    <button
      className="pixel-button px-3 py-2 text-xs w-full"
      style={{ textAlign: align === "right" ? "right" : "left" }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
