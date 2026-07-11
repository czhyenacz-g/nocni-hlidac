import { CameraDefinition, EnemyStage } from "../core/types";

/**
 * Admin-only rychlý testovací indikátor (viz zadání "rychlejší testování",
 * CameraMonitorRackTile.tsx#camera-monitor-led) — true, když je nepřítel na
 * stage, kterou tahle kamera aktivně sleduje (enemyVisibleAtStage), NEBO je
 * kamera typu "door" a nepřítel je "at_door"/"breach" — tyhle dvě stage samy
 * o sobě žádnou kameru nemají (viz types.ts#EnemyStage komentář "u dveří —
 * stav pro DoorView, ne kamera"), nejbližší/nejrelevantnější kamera je
 * logicky ta u dveří. Nikdy nezávisí na natvrdo napsaném camera id (CLAUDE.md
 * "seznam kamer je vždy konfigurační") — funguje pro libovolnou noc/kamerový
 * setup, jen podle CameraDefinition.type/enemyVisibleAtStage.
 */
export function isCameraDoorAlertActive(camera: CameraDefinition, enemyStage: EnemyStage): boolean {
  if (camera.enemyVisibleAtStage === enemyStage) return true;
  return camera.type === "door" && (enemyStage === "at_door" || enemyStage === "breach");
}
