import { DATABASE_EQUIPMENT, DATABASE_EQUIPMENT_TAB_TODO_ITEMS } from "@/lib/database/databaseContent";
import DatabaseEquipmentCard from "../DatabaseEquipmentCard";
import DatabaseTodoBlock from "../DatabaseTodoBlock";

/** Záložka "Výbava" (viz zadání "9. ZÁLOŽKA VÝBAVA") — devět ukázkových karet vybavení + závěrečný TODO blok. */
export default function DatabaseEquipmentTab() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-200 mb-1">VÝBAVA</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Přehled obranných systémů, zbraní a provozního vybavení dostupného hlídacímu stanovišti Objektu 13.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DATABASE_EQUIPMENT.map((equipment) => (
          <DatabaseEquipmentCard key={equipment.id} equipment={equipment} />
        ))}
      </div>

      <DatabaseTodoBlock title="BUDOUCÍ FUNKCE ZÁLOŽKY VÝBAVA" items={DATABASE_EQUIPMENT_TAB_TODO_ITEMS} status="planned" />
    </div>
  );
}
