import { DatabaseReportFormField } from "@/lib/database/databaseTypes";

interface DatabaseReportFormPreviewProps {
  fields: DatabaseReportFormField[];
}

/**
 * Návrh budoucího formuláře hlášení incidentu (viz zadání "Tento formulář
 * zatím nebude funkční. Vizuálně jej zobraz jako disabled nebo preview.") —
 * všechny prvky jsou `disabled`, žádný `<form>`/submit handler, nic se
 * nikam neodesílá. Čistě vizuální náhled budoucí funkce.
 */
export default function DatabaseReportFormPreview({ fields }: DatabaseReportFormPreviewProps) {
  return (
    <div className="pixel-panel p-4 sm:p-5 opacity-70" aria-disabled="true">
      <h3 className="text-sm font-bold text-gray-300 mb-1">HLÁŠENÍ NOČNÍHO INCIDENTU</h3>
      <p className="text-[10px] text-gray-600 mb-3 italic">Náhled — formulář zatím není funkční.</p>
      <div className="flex flex-col gap-3">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="text-[11px] text-gray-500 block mb-1">{field.label}</label>
            <select disabled className="pixel-button w-full px-2 py-1.5 text-[11px] cursor-not-allowed">
              {field.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        ))}
        <button type="button" disabled className="pixel-button px-4 py-2 text-[11px] mt-1 cursor-not-allowed opacity-60">
          Odeslat hlášení
        </button>
      </div>
    </div>
  );
}
