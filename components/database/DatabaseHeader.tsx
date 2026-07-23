import { useCopy } from "@/game/i18n/useTranslation";
import { DatabaseViewer } from "@/lib/database/databaseTypes";

interface DatabaseHeaderProps {
  viewer: DatabaseViewer;
}

/**
 * Horní databázový panel (viz zadání "4. HLAVIČKA STRÁNKY") — jen
 * identita/stav spojení a krátký úvodní text, žádná osobní data (ta jsou v
 * DatabaseViewerStatus.tsx). Přístupová úroveň a "přihlášený pracovník" se
 * mění podle `viewer.isAuthenticated`, displayName nikdy nezobrazuje e-mail
 * ani jiný citlivý identifikátor — bez displayName spadá na obecné
 * "AUTORIZOVANÝ UŽIVATEL" (viz zadání).
 */
export default function DatabaseHeader({ viewer }: DatabaseHeaderProps) {
  const COPY = useCopy();
  const accessLevel = viewer.isAuthenticated ? COPY.database.accessLevelStaff : COPY.database.accessLevelPublic;

  return (
    <div className="pixel-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-lg sm:text-xl font-bold text-gray-200 tracking-wide">{COPY.database.facilityLabel}</h1>
        <span className="text-[11px] text-gray-500 uppercase tracking-widest">{COPY.database.databaseLabel}</span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
        <div className="flex justify-between sm:block">
          <span className="text-gray-500">{COPY.database.accessLevelLabel}</span>
          <span className="sm:block font-bold text-gray-200 tracking-wide">{accessLevel}</span>
        </div>
        <div className="flex justify-between sm:block">
          <span className="text-gray-500">{COPY.database.connectionStatusLabel}</span>
          <span className="sm:block font-bold text-gray-300 tracking-wide">{COPY.database.connectionStatusOnline}</span>
        </div>
        {viewer.isAuthenticated && (
          <div className="flex justify-between sm:block sm:col-span-2">
            <span className="text-gray-500">{COPY.database.staffLabel}</span>
            <span className="sm:block font-bold text-gray-200 tracking-wide break-words">
              {viewer.displayName ?? COPY.database.staffFallback}
            </span>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400 leading-relaxed">{COPY.database.introText}</p>
      <p className="mt-2 text-xs text-gray-500 leading-relaxed">{COPY.database.introTextAuth}</p>
    </div>
  );
}
