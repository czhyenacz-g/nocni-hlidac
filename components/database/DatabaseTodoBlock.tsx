import { useCopy } from "@/game/i18n/useTranslation";
import { DatabaseTodoStatus, resolveDatabaseTodoBadgeKey } from "@/lib/database/databaseTypes";

interface DatabaseTodoBlockProps {
  title: string;
  /** Volitelný doplňující text — bez něj se použije obecný COPY.database.todoDefaultDescription. */
  description?: string;
  items: string[];
  status: DatabaseTodoStatus;
}

/**
 * Znovupoužitelný "tohle ještě nefunguje" blok (viz zadání "12. TODO
 * BLOKY") — jediné místo, které vykresluje badge TODO/PLÁNOVANÁ FUNKCE a
 * seznam plánovaných položek. Používá ho každá záložka databáze pro svůj
 * závěrečný souhrn i jednotlivé karty subjektů/vybavení pro dílčí TODO.
 * Čistě prezentační — žádný stav, žádná logika, jen data dovnitř/render ven.
 */
export default function DatabaseTodoBlock({ title, description, items, status }: DatabaseTodoBlockProps) {
  const COPY = useCopy();
  if (items.length === 0) return null;

  const badgeLabel =
    resolveDatabaseTodoBadgeKey(status) === "planned" ? COPY.database.todoBadgePlanned : COPY.database.todoBadgeTodo;

  return (
    <div className="pixel-panel p-4" data-todo-status={status}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wide">{title}</h3>
        <span className="pixel-panel px-2 py-0.5 text-[9px] uppercase tracking-wide text-gray-400 border-gray-600 whitespace-nowrap">
          {badgeLabel}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 mb-3">{description ?? COPY.database.todoDefaultDescription}</p>
      <ul className="flex flex-col gap-1 text-[11px] text-gray-400 list-disc list-inside">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
