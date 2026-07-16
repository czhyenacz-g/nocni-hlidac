import { DatabaseManualPreview } from "@/lib/database/databaseTypes";

interface DatabaseManualCardProps {
  manual: DatabaseManualPreview;
}

/** Jeden provozní manuál — číslo/nadpis/postup, volitelná poznámka/varování a volitelný dílčí TODO seznam. */
export default function DatabaseManualCard({ manual }: DatabaseManualCardProps) {
  return (
    <div className="pixel-panel p-4 sm:p-5">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{manual.number}</p>
      <h3 className="text-sm font-bold text-gray-200 mb-2">{manual.title}</h3>
      <ul className="flex flex-col gap-1 text-[11px] text-gray-400 list-disc list-inside mb-2">
        {manual.instructions.map((instruction) => (
          <li key={instruction}>{instruction}</li>
        ))}
      </ul>
      {manual.note && <p className="text-[10px] text-amber-400 leading-relaxed">{manual.note}</p>}
      {manual.todos && manual.todos.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-[10px] text-gray-600 list-disc list-inside">
          {manual.todos.map((todo) => (
            <li key={todo}>{todo}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
