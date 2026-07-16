import { DatabasePlannedSubject } from "@/lib/database/databaseTypes";

interface DatabasePlannedSubjectCardProps {
  subject: DatabasePlannedSubject;
}

/** Lehčí karta pro budoucí/neimplementované subjekty (Ghost, Titan, Praetorián) — jen název, stav a plánované vlastnosti, žádné pozorování/výzbroj (ty ještě neexistují). */
export default function DatabasePlannedSubjectCard({ subject }: DatabasePlannedSubjectCardProps) {
  return (
    <div className="pixel-panel p-4 opacity-80">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-gray-300 tracking-wide">{subject.name}</h3>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{subject.status}</span>
      </div>
      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Plánované vlastnosti</h4>
      <ul className="flex flex-col gap-1 text-[11px] text-gray-500 list-disc list-inside">
        {subject.plannedTraits.map((trait) => (
          <li key={trait}>{trait}</li>
        ))}
      </ul>
    </div>
  );
}
