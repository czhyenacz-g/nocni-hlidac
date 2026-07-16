import { DatabaseSubjectPreview } from "@/lib/database/databaseTypes";

interface DatabaseSubjectCardProps {
  subject: DatabaseSubjectPreview;
}

/** Jedna potvrzená karta subjektu (zatím jen Ghoul, viz DATABASE_SUBJECTS) — kód/klasifikace/nebezpečnost, pozorované chování a výzbroj proti subjektu. */
export default function DatabaseSubjectCard({ subject }: DatabaseSubjectCardProps) {
  return (
    <div className="pixel-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
        <h3 className="text-base font-bold text-red-400 tracking-wide">
          {subject.code} · {subject.name}
        </h3>
        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">{subject.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
        <div>
          <span className="text-gray-500 block">Klasifikace:</span>
          <span className="text-gray-300 font-bold">{subject.classification}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Nebezpečnost:</span>
          <span className="text-red-400 font-bold">{subject.threatLevel}</span>
        </div>
      </div>

      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Pozorované chování</h4>
      <ul className="flex flex-col gap-1 text-[11px] text-gray-400 list-disc list-inside mb-3">
        {subject.observations.map((observation) => (
          <li key={observation}>{observation}</li>
        ))}
      </ul>

      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Výzbroj</h4>
      <dl className="flex flex-col gap-1 text-[11px] mb-3">
        {subject.loadout.map((line) => (
          <div key={line.label} className="flex flex-wrap justify-between gap-x-2">
            <dt className="text-gray-500">{line.label}:</dt>
            <dd className="text-gray-300 text-right">{line.value}</dd>
          </div>
        ))}
      </dl>

      <div className="pixel-panel p-3 border-amber-800">
        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-1">Poznámka</p>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Číselné údaje jsou zatím pouze ukázkou budoucí databáze. V této fázi nejsou napojené na skutečný výzkum hráče ani na
          dynamickou herní konfiguraci.
        </p>
      </div>
    </div>
  );
}
