import { COPY } from "@/content/copy";
import {
  DATABASE_REPORT_FORM_FIELDS,
  DATABASE_REPORTS_TAB_TODO_ITEMS,
  DATABASE_SAMPLE_REPORT,
} from "@/lib/database/databaseContent";
import { DatabaseViewer } from "@/lib/database/databaseTypes";
import DatabaseReportPreview from "../DatabaseReportPreview";
import DatabaseReportFormPreview from "../DatabaseReportFormPreview";
import DatabaseTodoBlock from "../DatabaseTodoBlock";

interface DatabaseReportsTabProps {
  viewer: DatabaseViewer;
}

/**
 * Záložka "Hlášení" (viz zadání "10. ZÁLOŽKA HLÁŠENÍ") — ukázkový report je
 * vidět VŽDY (je to jen demonstrace, ne osobní data, viz
 * DatabaseReportPreview.tsx), osobní panel pod ním se liší podle přihlášení,
 * pak náhled budoucího formuláře (disabled) a závěrečný TODO blok.
 */
export default function DatabaseReportsTab({ viewer }: DatabaseReportsTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-200 mb-1">HLÁŠENÍ</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Evidence nočních směn, incidentů, poškození vybavení a kontaktů s testovacími subjekty.
        </p>
      </div>

      <DatabaseReportPreview report={DATABASE_SAMPLE_REPORT} />

      <div className="pixel-panel p-4 sm:p-5">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-2">
          {viewer.isAuthenticated ? "OSOBNÍ HLÁŠENÍ" : COPY.database.personalRecordsHeading}
        </h3>
        {viewer.isAuthenticated ? (
          <>
            <p className="text-[11px] text-gray-500 mb-2">Zatím nebyla napojena historie osobních směn.</p>
            <p className="text-[10px] text-gray-600">
              TODO: Později zde bude chronologický seznam skutečných směn přihlášeného hráče.
            </p>
          </>
        ) : (
          <p className="text-[11px] text-gray-500">{COPY.database.personalRecordsGuestText}</p>
        )}
      </div>

      <DatabaseReportFormPreview fields={DATABASE_REPORT_FORM_FIELDS} />

      <DatabaseTodoBlock title="BUDOUCÍ FUNKCE ZÁLOŽKY HLÁŠENÍ" items={DATABASE_REPORTS_TAB_TODO_ITEMS} status="planned" />
    </div>
  );
}
