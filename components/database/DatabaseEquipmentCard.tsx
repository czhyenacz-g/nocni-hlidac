import { COPY } from "@/content/copy";
import { DatabaseEquipmentPreview } from "@/lib/database/databaseTypes";
import DatabaseTodoBlock from "./DatabaseTodoBlock";

interface DatabaseEquipmentCardProps {
  equipment: DatabaseEquipmentPreview;
}

/**
 * Jedna karta vybavení — název/interní označení/popis/stav jsou vždy
 * přítomné, `sections` je generický seznam nadpis+odrážky (Kapacita,
 * Současné chování, Známé riziko, Limity, ...), ať jedna komponenta pokryje
 * jak jednoduché karty (generátor, žárovky, ...), tak podrobné (sonické
 * dělo, dveřní systém, ...) beze změny tvaru. Vlastní TODO blok na konci
 * (viz zadání "Každá karta má mít... TODO blok").
 */
export default function DatabaseEquipmentCard({ equipment }: DatabaseEquipmentCardProps) {
  return (
    <div className="pixel-panel p-4 sm:p-5 flex flex-col gap-3">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm font-bold text-gray-200 tracking-wide">{equipment.name}</h3>
          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">{equipment.status}</span>
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5">Interní označení: {equipment.internalCode}</p>
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{equipment.description}</p>
      </div>

      {equipment.sections.map((section) => (
        <div key={section.heading}>
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{section.heading}</h4>
          {section.lines.length === 1 ? (
            <p className="text-[11px] text-gray-300">{section.lines[0]}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-[11px] text-gray-400 list-disc list-inside">
              {section.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <DatabaseTodoBlock title={COPY.database.todoBadgeTodo} items={equipment.todos} status="planned" />
    </div>
  );
}
