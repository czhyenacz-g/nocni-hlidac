import { DATABASE_MANUALS, DATABASE_MANUALS_TAB_TODO_ITEMS } from "@/lib/database/databaseContent";
import DatabaseManualCard from "../DatabaseManualCard";
import DatabaseTodoBlock from "../DatabaseTodoBlock";

/** Záložka "Manuály" (viz zadání "11. ZÁLOŽKA MANUÁLY") — sedm provozních manuálů + závěrečný TODO blok. */
export default function DatabaseManualsTab() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-red-500 mb-1">MANUÁLY</h2>
        <p className="text-xs text-gray-500 leading-relaxed">Nouzové postupy a základní rady pro hlídací personál.</p>
        <p className="text-xs text-gray-600 leading-relaxed mt-1">
          Tato sekce bude sloužit hráčům, kteří se ve hře ztratili, nerozumějí některé mechanice nebo opakovaně umírají.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DATABASE_MANUALS.map((manual) => (
          <DatabaseManualCard key={manual.id} manual={manual} />
        ))}
      </div>

      <DatabaseTodoBlock title="BUDOUCÍ FUNKCE ZÁLOŽKY MANUÁLY" items={DATABASE_MANUALS_TAB_TODO_ITEMS} status="planned" />
    </div>
  );
}
