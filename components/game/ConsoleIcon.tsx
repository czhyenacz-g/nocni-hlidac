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
  | "battery"
  | "skull"
  | "discord";

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
    case "skull":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M12 3a7 7 0 0 0-7 7c0 2.4 1.1 4 2.5 5.3V18a1 1 0 0 0 1 1H10v1.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5V19h1.5a1 1 0 0 0 1-1v-2.7c1.4-1.3 2.5-2.9 2.5-5.3a7 7 0 0 0-7-7Z" />
          <circle cx="9.3" cy="11" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="14.7" cy="11" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    // Discord "Clyde" mark (viz AuthStatus.tsx/MainMenuScreen.tsx login
    // tlačítko) — jediná plněná (ne obrysová) ikona v sadě, stejně jako
    // fillované detaily u "skull"/"warn" výše, jen tady celá, ať zůstane
    // rozpoznatelná i v malém console-icon-block.
    case "discord":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-4 w-4">
          <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.079.037c-.21.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.618-1.25.077.077 0 0 0-.078-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.042-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.099.246.198.373.292a.077.077 0 0 1-.007.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.33c-1.182 0-2.157-1.086-2.157-2.42 0-1.333.956-2.418 2.157-2.418 1.211 0 2.176 1.095 2.157 2.419 0 1.333-.956 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.955-2.418 2.157-2.418 1.21 0 2.175 1.095 2.157 2.419 0 1.333-.946 2.419-2.157 2.419Z" />
        </svg>
      );
  }
}
