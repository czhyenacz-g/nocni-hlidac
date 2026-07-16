"use client";

import { useRef } from "react";
import { COPY } from "@/content/copy";
import { DatabaseTabId } from "@/lib/database/databaseTypes";

interface DatabaseTabsProps {
  activeTab: DatabaseTabId;
  onChange: (tab: DatabaseTabId) => void;
}

const TAB_ORDER: DatabaseTabId[] = ["subjects", "equipment", "reports", "manuals"];

const TAB_LABELS: Record<DatabaseTabId, string> = {
  subjects: COPY.database.tabSubjectsLabel,
  equipment: COPY.database.tabEquipmentLabel,
  reports: COPY.database.tabReportsLabel,
  manuals: COPY.database.tabManualsLabel,
};

/**
 * Čtyři přepínatelné záložky databáze (viz zadání "3. ČTYŘI ZÁLOŽKY") —
 * standardní WAI-ARIA "tabs" vzor (`role="tablist"`/`"tab"`, `aria-selected`,
 * roving `tabIndex`), šipky doleva/doprava (+ Home/End) přepínají fokus i
 * aktivní záložku, myš/klik funguje stejně. Žádný router/URL zásah (viz
 * zadání "Nedělej kvůli tomu složitý router") — aktivní záložka je čistě
 * `useState` v rodiči (DatabaseScreen.tsx), tahle komponenta je jen ovládání.
 */
export default function DatabaseTabs({ activeTab, onChange }: DatabaseTabsProps) {
  const tabRefs = useRef<Partial<Record<DatabaseTabId, HTMLButtonElement | null>>>({});

  function focusAndSelect(tab: DatabaseTabId) {
    onChange(tab);
    tabRefs.current[tab]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAndSelect(TAB_ORDER[(index + 1) % TAB_ORDER.length]);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAndSelect(TAB_ORDER[(index - 1 + TAB_ORDER.length) % TAB_ORDER.length]);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusAndSelect(TAB_ORDER[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      focusAndSelect(TAB_ORDER[TAB_ORDER.length - 1]);
    }
  }

  return (
    <div role="tablist" aria-label={COPY.database.databaseLabel} className="flex gap-1.5 overflow-x-auto pb-1">
      {TAB_ORDER.map((tab, index) => {
        const selected = tab === activeTab;
        return (
          <button
            key={tab}
            ref={(el) => {
              tabRefs.current[tab] = el;
            }}
            type="button"
            role="tab"
            id={`database-tab-${tab}`}
            aria-selected={selected}
            aria-controls={`database-tabpanel-${tab}`}
            tabIndex={selected ? 0 : -1}
            data-active={selected}
            className="pixel-button console-button tap-target px-3 py-2 text-xs whitespace-nowrap"
            onClick={() => onChange(tab)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
