import { COPY } from "@/content/copy";
import { CameraDefinition, EnemyStage } from "@/game/core/types";
import { getCameraImageSrc } from "@/game/cameras/cameraAssets.object13";

interface CameraViewProps {
  camera: CameraDefinition | null;
  enemyStage: EnemyStage;
  /** Když false, kamera ještě "ladí signál" (šum) — viz game/core/cameraFocus.ts. */
  focused: boolean;
  /** Jen door_hallway má na světlo jinou sadu obrázků — viz cameraAssets.object13.ts. */
  lightOn: boolean;
  /** Pro pomalé prostřídání "normal" snímků (viz getCameraImageSrc), ne pro herní logiku. */
  elapsedMs: number;
}

export default function CameraView({ camera, enemyStage, focused, lightOn, elapsedMs }: CameraViewProps) {
  if (!camera) {
    return (
      <div className="pixel-panel pixel-screen-static h-48 flex items-center justify-center text-gray-500 text-sm">
        Žádná kamera vybrána
      </div>
    );
  }

  if (!focused) {
    return (
      <div className="pixel-panel pixel-screen-static camera-static h-48 flex flex-col items-center justify-center relative overflow-hidden">
        <span className="absolute top-1 left-2 text-[10px] text-gray-500">{camera.label}</span>
        <span className="text-gray-500 text-xs animate-pulse">{COPY.game.cameraFocusingLabel}</span>
      </div>
    );
  }

  const enemyVisible = camera.enemyVisibleAtStage === enemyStage;
  // Konfigurovaný obrázek (viz game/cameras/cameraAssets.object13.ts) — CameraView
  // sama žádné názvy souborů nezná, jen zobrazí, co vrátí getCameraImageSrc.
  // null (kamera bez assetů, nebo prázdné pole pro danou situaci) = dosavadní
  // textový/placeholder vzhled beze změny.
  const imageSrc = getCameraImageSrc(camera.id, enemyVisible, lightOn, elapsedMs);

  return (
    <div className="pixel-panel h-48 flex flex-col items-center justify-center relative overflow-hidden group">
      {imageSrc && (
        <img src={imageSrc} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* Šum/scanline efekt jako samostatná vrstva NAD obrázkem (ne na stejném
          elementu — background-image z .pixel-screen-static by se přepsal
          inline stylem <img>u a šum by úplně zmizel). Bez obrázku (imageSrc
          null) je to jediná vrstva, vizuálně stejné jako dřív. */}
      <div className="absolute inset-0 pixel-screen-static" />
      <span className="absolute top-1 left-2 text-[10px] text-gray-500">
        {camera.label}
        {/* Popis kamery se schová, dokud hráč nenajede myší na obraz — ať
            neplete štítek, ale poradí, když o to zájem je. */}
        {camera.description && (
          <span className="block text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {camera.description}
          </span>
        )}
      </span>
      <span className="absolute top-1 right-2 text-[10px] text-red-500 animate-pulse">● REC</span>
      {/* "POSTAVA V DOSAHU"/"žádný pohyb" textový spoiler byl schovaný ze
          skutečné hry (problikával přes obrázek, prozrazoval monstrum dřív,
          než ho hráč sám najde) — stejná informace (enemyVisible) je teď
          vidět jen v DebugPanel.tsx, ne tady. */}
    </div>
  );
}
