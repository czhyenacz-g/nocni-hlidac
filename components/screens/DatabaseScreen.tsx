"use client";

import { useState } from "react";
import Link from "next/link";
import { useCopy } from "@/game/i18n/useTranslation";
import { DatabasePlayerPreview, DatabaseTabId, DatabaseViewer } from "@/lib/database/databaseTypes";
import DatabaseHeader from "@/components/database/DatabaseHeader";
import DatabaseViewerStatus from "@/components/database/DatabaseViewerStatus";
import DatabaseTabs from "@/components/database/DatabaseTabs";
import DatabaseSubjectsTab from "@/components/database/tabs/DatabaseSubjectsTab";
import DatabaseEquipmentTab from "@/components/database/tabs/DatabaseEquipmentTab";
import DatabaseReportsTab from "@/components/database/tabs/DatabaseReportsTab";
import DatabaseManualsTab from "@/components/database/tabs/DatabaseManualsTab";

interface DatabaseScreenProps {
  viewer: DatabaseViewer;
  playerPreview: DatabasePlayerPreview;
}

const DEFAULT_TAB: DatabaseTabId = "subjects";

/**
 * Klientská část /database (viz app/database/page.tsx, který zůstává Server
 * Component kvůli `metadata` + `getSession()`) — jediný stavový kus je
 * `activeTab` (viz zadání "Nedělej kvůli tomu složitý router... Pro první
 * verzi nemusí mít každá záložka vlastní URL"). `viewer`/`playerPreview`
 * přicházejí HOTOVÉ ze serveru (viz lib/database/databaseViewer.ts) — tahle
 * komponenta ani její potomci nikdy nesahají na session/cookie/DiscordPlayer
 * přímo.
 *
 * Vizuálně záměrně BEZ SceneBackground/fotografického pozadí hry (viz zadání
 * "Nedělej z ní kopii herní obrazovky") — jen tmavý gradient + stejné
 * `.pixel-panel`/`.pixel-button` terminálové komponenty jako zbytek webu.
 */
export default function DatabaseScreen({ viewer, playerPreview }: DatabaseScreenProps) {
  const COPY = useCopy();
  const [activeTab, setActiveTab] = useState<DatabaseTabId>(DEFAULT_TAB);

  return (
    <main
      className="relative min-h-screen p-4 py-8 sm:p-6 sm:py-10"
      style={{ background: "linear-gradient(180deg, #0a0d12 0%, #10141b 100%)" }}
    >
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
        <DatabaseHeader viewer={viewer} />
        <DatabaseViewerStatus viewer={viewer} playerPreview={playerPreview} />

        <DatabaseTabs activeTab={activeTab} onChange={setActiveTab} />

        <div
          role="tabpanel"
          id={`database-tabpanel-${activeTab}`}
          aria-labelledby={`database-tab-${activeTab}`}
          tabIndex={0}
          className="pixel-panel p-4 sm:p-6"
        >
          {activeTab === "subjects" && <DatabaseSubjectsTab viewer={viewer} playerPreview={playerPreview} />}
          {activeTab === "equipment" && <DatabaseEquipmentTab />}
          {activeTab === "reports" && <DatabaseReportsTab viewer={viewer} />}
          {activeTab === "manuals" && <DatabaseManualsTab />}
        </div>

        <Link href="/play" className="block text-center text-xs text-gray-600 hover:text-gray-400">
          {COPY.database.backToGameLabel}
        </Link>
      </div>
    </main>
  );
}
