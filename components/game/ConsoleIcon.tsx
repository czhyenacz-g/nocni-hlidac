export type ConsoleIconId =
  | "arrow-left"
  | "arrow-right"
  | "map"
  | "door"
  | "warn"
  | "light"
  | "power"
  | "shield"
  | "speaker"
  | "speaker-muted"
  | "clock"
  | "battery";

/**
 * Sdílené inline SVG ikony pro konzolové ikonové bloky (viz
 * styles/pixel.css .console-icon-block, ViewSwitchArrow.tsx,
 * LeftWallView.tsx, LightControl.tsx) — žádná nová závislost/asset, jen pár
 * čar. `stroke="currentColor"` ať ikony respektují barvu podle stavu
 * tlačítka (hover/urgent/primary/data-active), stejně jako zbytek textu.
 */
export default function ConsoleIcon({ id }: { id: ConsoleIconId }) {
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
    case "warn":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v6" />
          <circle cx="12" cy="16.3" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "light":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M12 3a6 6 0 0 0-3 11.2c.5.4.9 1 .9 1.8h4.2c0-.8.4-1.4.9-1.8A6 6 0 0 0 12 3Z" />
        </svg>
      );
    case "power":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M12 3v7" />
          <path d="M7 5.5a8 8 0 1 0 10 0" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M12 3 5 6v5.5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6l-7-3Z" />
        </svg>
      );
    case "speaker":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M4 9v6h4l5 4V5L8 9H4Z" />
          <path d="M16.5 9a4.5 4.5 0 0 1 0 6" />
          <path d="M19 7a8 8 0 0 1 0 10" />
        </svg>
      );
    case "speaker-muted":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M4 9v6h4l5 4V5L8 9H4Z" />
          <path d="M16 9l5 6M21 9l-5 6" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    case "battery":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <rect x="2.5" y="8" width="16" height="8" rx="1.5" />
          <path d="M21.5 10.5v3" />
          <path d="M5.5 11v2M8.5 11v2M11.5 11v2" />
        </svg>
      );
  }
}
