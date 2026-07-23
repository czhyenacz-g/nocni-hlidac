import { useCopy } from "@/game/i18n/useTranslation";
import { DatabasePlayerPreview, DatabaseViewer } from "@/lib/database/databaseTypes";
import { formatDatabasePlaceholderValue } from "@/lib/database/databaseViewer";
import DatabaseTodoBlock from "./DatabaseTodoBlock";

interface DatabaseViewerStatusProps {
  viewer: DatabaseViewer;
  playerPreview: DatabasePlayerPreview;
}

/**
 * Globální osobní panel databáze (viz zadání "5. STAV PŘIHLÁŠENÍ", "6.
 * NEPŘIHLÁŠENÁ VERZE", "7. PŘIHLÁŠENÁ VERZE") — nepřihlášenému hráči ukáže
 * jen prezentační náhled budoucích funkcí, přihlášenému skutečně dostupná
 * čísla (currentNight/highestNightReached, viz lib/database/databaseViewer.ts)
 * a placeholder "ZATÍM NENAPOJENO" pro vše, co projekt ještě nesleduje.
 * Nikdy nevytváří vymyšlená čísla jen proto, aby panel vypadal hotový.
 */
export default function DatabaseViewerStatus({ viewer, playerPreview }: DatabaseViewerStatusProps) {
  const COPY = useCopy();
  if (!viewer.isAuthenticated) {
    return (
      <div className="pixel-panel p-5 sm:p-6">
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide mb-2">{COPY.database.publicAccessHeading}</h2>
        <p className="text-xs text-gray-400 mb-3">{COPY.database.publicAccessIntro}</p>
        <p className="text-[11px] text-gray-500 mb-2">{COPY.database.publicAccessFutureIntro}</p>
        <ul className="flex flex-col gap-1 text-[11px] text-gray-500 list-disc list-inside mb-4">
          {COPY.database.publicAccessFutureItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {/* Jen pokud projekt už má bezpečnou existující přihlašovací cestu
            (viz zadání) — stejný endpoint jako AuthStatus.tsx v hlavním menu,
            žádná nová auth stránka. */}
        <a
          href="/api/auth/login"
          className="pixel-button tap-target inline-block px-4 py-2 text-[11px]"
        >
          {COPY.database.loginButtonLabel}
        </a>
      </div>
    );
  }

  return (
    <div className="pixel-panel p-5 sm:p-6">
      <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide mb-3">{COPY.database.personalRecordHeading}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
        <div className="flex justify-between sm:block">
          <dt className="text-gray-500">{COPY.database.highestNightLabel}</dt>
          <dd className="sm:block font-bold text-gray-200">{formatDatabasePlaceholderValue(playerPreview.highestNightReached, COPY.database.notConnectedValue)}</dd>
        </div>
        <div className="flex justify-between sm:block">
          <dt className="text-gray-500">{COPY.database.discoveredSubjectsLabel}</dt>
          <dd className="sm:block font-bold text-gray-200">{formatDatabasePlaceholderValue(playerPreview.discoveredSubjectCount, COPY.database.notConnectedValue)}</dd>
        </div>
        <div className="flex justify-between sm:block">
          <dt className="text-gray-500">{COPY.database.completedReportsLabel}</dt>
          <dd className="sm:block font-bold text-gray-200">{formatDatabasePlaceholderValue(playerPreview.completedReportCount, COPY.database.notConnectedValue)}</dd>
        </div>
        <div className="flex justify-between sm:block">
          <dt className="text-gray-500">{COPY.database.confirmedKillsLabel}</dt>
          <dd className="sm:block font-bold text-gray-200">{COPY.database.notConnectedValue}</dd>
        </div>
        <div className="flex justify-between sm:block">
          <dt className="text-gray-500">{COPY.database.disabledCamerasLabel}</dt>
          <dd className="sm:block font-bold text-gray-200">{COPY.database.notConnectedValue}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <DatabaseTodoBlock
          title={COPY.database.personalRecordHeading}
          description={COPY.database.personalRecordTodo}
          items={["napojení na centrální herní postup"]}
          status="data-not-connected"
        />
      </div>
    </div>
  );
}
