import { useCopy } from "@/game/i18n/useTranslation";
import {
  DATABASE_PLANNED_SUBJECTS,
  DATABASE_SUBJECTS,
  DATABASE_SUBJECTS_TAB_TODO_ITEMS,
} from "@/lib/database/databaseContent";
import { DatabasePlayerPreview, DatabaseViewer } from "@/lib/database/databaseTypes";
import { formatDatabasePlaceholderValue } from "@/lib/database/databaseViewer";
import DatabaseSubjectCard from "../DatabaseSubjectCard";
import DatabasePlannedSubjectCard from "../DatabasePlannedSubjectCard";
import DatabaseTodoBlock from "../DatabaseTodoBlock";

interface DatabaseSubjectsTabProps {
  viewer: DatabaseViewer;
  playerPreview: DatabasePlayerPreview;
}

/**
 * Záložka "Subjekty" (viz zadání "8. ZÁLOŽKA SUBJEKTY") — potvrzené
 * subjekty (zatím jen Ghoul), osobní výzkumný panel (guest/auth varianta),
 * plánované subjekty (Ghost/Titan/Praetorián) a závěrečný TODO blok.
 */
export default function DatabaseSubjectsTab({ viewer, playerPreview }: DatabaseSubjectsTabProps) {
  const COPY = useCopy();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-200 mb-1">SUBJEKTY</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Evidence biologických a experimentálních subjektů zaznamenaných v prostorách Objektu 13.
        </p>
        <p className="text-xs text-gray-600 leading-relaxed mt-1">
          Veřejná verze databáze ukazuje základní podobu plánované encyklopedie. Přihlášený hráč zde později uvidí vlastní objevy,
          potvrzené vlastnosti a výsledky střetů.
        </p>
      </div>

      {DATABASE_SUBJECTS.map((subject) => (
        <DatabaseSubjectCard key={subject.id} subject={subject} />
      ))}

      <div className="pixel-panel p-4 sm:p-5">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-2">OSOBNÍ VÝZKUM</h3>
        {viewer.isAuthenticated ? (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div>
              <dt className="text-gray-500">Střety:</dt>
              <dd className="font-bold text-gray-200">{COPY.database.notConnectedValue}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Zásahy:</dt>
              <dd className="font-bold text-gray-200">{COPY.database.notConnectedValue}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Likvidace:</dt>
              <dd className="font-bold text-gray-200">{COPY.database.notConnectedValue}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Výzkumná úroveň:</dt>
              <dd className="font-bold text-gray-200">{COPY.database.notConnectedValue}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-[11px] text-gray-500">
            Přihlaste se, abyste zde v budoucnu viděli vlastní počet střetů, zásahů, likvidací a potvrzených slabin.
          </p>
        )}
        {/* Discovered subject count je jediná hodnota z DatabasePlayerPreview
            relevantní přímo pro tuhle záložku — zbytek panelu výše je zatím
            čistě prezentační, dokud výzkum subjektů vůbec neexistuje. */}
        {viewer.isAuthenticated && playerPreview.discoveredSubjectCount !== undefined && (
          <p className="text-[10px] text-gray-600 mt-2">
            Objevené subjekty: {formatDatabasePlaceholderValue(playerPreview.discoveredSubjectCount, COPY.database.notConnectedValue)}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">PLÁNOVANÉ SUBJEKTY</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DATABASE_PLANNED_SUBJECTS.map((subject) => (
            <DatabasePlannedSubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      </div>

      <DatabaseTodoBlock title="BUDOUCÍ FUNKCE ZÁLOŽKY SUBJEKTY" items={DATABASE_SUBJECTS_TAB_TODO_ITEMS} status="planned" />
    </div>
  );
}
