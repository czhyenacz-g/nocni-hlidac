import { DatabaseReportPreview as DatabaseReportPreviewData } from "@/lib/database/databaseTypes";

interface DatabaseReportPreviewProps {
  report: DatabaseReportPreviewData;
}

/**
 * Ukázkové hlášení (viz zadání "10. ZÁLOŽKA HLÁŠENÍ") — vždy jen
 * demonstrace budoucího systému hlášení, NIKDY skutečná data přihlášeného
 * hráče (ta případně dostane vlastní, zatím prázdný panel vedle tohohle,
 * viz DatabaseReportsTab.tsx).
 */
export default function DatabaseReportPreview({ report }: DatabaseReportPreviewProps) {
  return (
    <div className="pixel-panel p-4 sm:p-5">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">UKÁZKOVÉ HLÁŠENÍ</p>
      <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
        <div>
          <span className="text-gray-500 block">Noc:</span>
          <span className="text-gray-200 font-bold">{report.night}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Testovací subjekt:</span>
          <span className="text-gray-200 font-bold">{report.subjectCode}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Typ:</span>
          <span className="text-gray-200 font-bold">{report.subjectType}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Výsledek:</span>
          <span className="text-gray-200 font-bold">{report.outcome}</span>
        </div>
      </div>
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Události</h4>
      <ul className="flex flex-col gap-1 text-[11px] text-gray-400 list-disc list-inside mb-3">
        {report.events.map((event) => (
          <li key={event}>{event}</li>
        ))}
      </ul>
      <p className="text-[10px] text-gray-600 italic">Toto je pouze demonstrace budoucího systému. Nejde o skutečné hlášení aktuálního uživatele.</p>
    </div>
  );
}
