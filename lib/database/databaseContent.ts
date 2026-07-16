// Statický ukázkový obsah pro /database (viz zadání) — čistá data, žádná
// herní logika, žádné napojení na GameState/game/core. Slouží jako datová
// příprava budoucí "encyklopedie Objektu 13", zatím ale jen prezentační MVP
// (viz docs/database-mvp.md). Texty jsou úmyslně přímo tady, ne v
// content/copy.ts — copy.ts je pro krátké UI popisky/labely, tohle je
// strukturovaný obsah (karty, manuály, ukázkový report), viz zadání "13.
// DATOVÁ DEFINICE OBSAHU".

import {
  DatabaseEquipmentPreview,
  DatabaseManualPreview,
  DatabasePlannedSubject,
  DatabaseReportFormField,
  DatabaseReportPreview,
  DatabaseSubjectPreview,
} from "./databaseTypes";

// ── Subjekty ────────────────────────────────────────────────────────────

export const DATABASE_SUBJECTS: DatabaseSubjectPreview[] = [
  {
    id: "ghoul",
    code: "G-01",
    name: "GHOUL",
    status: "POTVRZENÝ SUBJEKT",
    classification: "BIOLOGICKÁ HROZBA",
    threatLevel: "VYSOKÁ",
    observations: [
      "pohybuje se mezi venkovním prostorem a chodbami",
      "reaguje na sonické dělo",
      "při použití sonického děla si může všimnout kamery",
      "dokáže vyřadit obraz kamery až do ranního servisu",
      "mikrofon poškozené kamery může zůstat aktivní",
      "po zničení kamery se může stáhnout směrem ven",
    ],
    loadout: [
      { label: "Standardní brokovnice", value: "Předběžný odhad 10 zásahů." },
      { label: "Tříštivá munice", value: "TODO — bude doplněna později." },
      { label: "Průrazná munice", value: "TODO — bude doplněna později." },
      { label: "Experimentální munice", value: "TODO — bude doplněna později." },
    ],
    todos: [],
  },
];

export const DATABASE_PLANNED_SUBJECTS: DatabasePlannedSubject[] = [
  {
    id: "ghost",
    name: "GHOST",
    status: "TODO",
    plannedTraits: [
      "zobrazení převážně jako stín",
      "zvláštní reakce na světlo",
      "možné poškozování žárovek",
      "odlišná obranná taktika",
      "vlastní sada kamerových obrazů",
      "vlastní druh munice",
    ],
  },
  {
    id: "titan",
    name: "TITAN",
    status: "TODO",
    plannedTraits: [
      "těžký a pomalý subjekt",
      "pravidelný výskyt například každou pátou noc",
      "běžný pohyb po mapě",
      "speciální útok na dveře",
      "schopnost prorazit dveře a zabít hráče",
      "obrana pomocí plného výkonu generátoru",
      "energetický impuls do dveří",
      "po zásahu úplný ústup podobný likvidaci subjektu",
    ],
  },
  {
    id: "praetorian",
    name: "PRAETORIÁN",
    status: "BUDOUCÍ KONCEPT",
    plannedTraits: [
      "pozdější těžký nebo obrněný subjekt",
      "vysoká odolnost",
      "zvláštní viditelnost",
      "vlastní munice",
      "vlastní reakce na vybavení",
    ],
  },
];

export const DATABASE_SUBJECTS_TAB_TODO_ITEMS: string[] = [
  "osobní bestiář hráče",
  "odemykání subjektu při prvním spatření",
  "odemykání vlastností při pozorování",
  "potvrzení slabiny po správném použití obrany",
  "statistika počtu střetů",
  "statistika počtu zásahů",
  "statistika počtu likvidací",
  "statistika použité munice",
  "odhad potřebného počtu zásahů",
  "přesné číslo až po potvrzené likvidaci",
  "výzkumné úrovně pro každý druh",
  "tři samostatné výzkumné sloupce podle typu bestie",
  "později více druhů subjektů",
  "veřejné globální statistiky",
  "osobní historie střetů",
  "ilustrace a animace jednotlivých subjektů",
  "odkazy na související incidenty",
  "odkazy na související vybavení",
  "interní označení komor",
  "možné desítky dalších komor a subjektů",
];

// ── Výbava ──────────────────────────────────────────────────────────────

export const DATABASE_EQUIPMENT: DatabaseEquipmentPreview[] = [
  {
    id: "single-shotgun",
    name: "JEDNORANOVÁ BROKOVNICE",
    internalCode: "SB-01",
    description: "Základní obranná zbraň hlídacího personálu, pojme jeden náboj.",
    status: "V PROVOZU",
    sections: [],
    todos: ["blueprint zbraně", "osobní statistika výstřelů/zásahů", "odemykání lepších variant"],
  },
  {
    id: "double-shotgun",
    name: "DVOUHLAVŇOVÁ BROKOVNICE",
    internalCode: "DB-02",
    description: "Vylepšená obranná zbraň s dvojnásobnou kapacitou.",
    status: "V PROVOZU",
    sections: [
      { heading: "Kapacita", lines: ["2 náboje"] },
      { heading: "Výdej munice", lines: ["1 náboj na jedno potvrzení žádosti"] },
      {
        heading: "Současné chování",
        lines: [
          "hráč musí ručně požádat o každý náboj",
          "brokovnice se po návratu z lovu automaticky nepřebíjí",
          "hráč může vyrazit ven s 0/2 náboji",
          "po dvou výstřelech se musí vrátit do kanceláře",
          "další dávku získá opakovaným použitím dávkovače",
        ],
      },
    ],
    todos: [
      "různé druhy munice",
      "tříštivá munice",
      "průrazná munice",
      "experimentální nebo leptavá munice",
      "rozdílná účinnost proti jednotlivým subjektům",
      "blueprint zbraně",
      "osobní statistika výstřelů",
      "osobní statistika zásahů",
      "přesnost hráče",
      "počet prázdných výstřelů",
      "odemykání lepších variant",
    ],
  },
  {
    id: "ammo-dispenser",
    name: "DÁVKOVAČ MUNICE",
    internalCode: "AMMO DISPENSER A-13",
    description: "Automat vydávající munici do brokovnice hlídacího personálu.",
    status: "V PROVOZU",
    sections: [
      {
        heading: "Současné chování",
        lines: [
          "jeden klik vydá maximálně jeden náboj",
          "jednoranová brokovnice používá stav 0/1 nebo 1/1",
          "dvouhlavňová brokovnice používá stav 0/2, 1/2 nebo 2/2",
          "bez zbraně nelze munici získat",
          "při plné kapacitě je žádost zamítnuta",
        ],
      },
      {
        heading: "Příběhový význam",
        lines: [
          "Systém přesně kontroluje počet vydaných nábojů a nutí hlídací subjekt opakovaně se vracet do stanoviště.",
        ],
      },
    ],
    todos: [
      "různé druhy munice",
      "omezené dávky podle noci",
      "reakce rádia na výdej munice",
      "statistika vydaných dávek",
      "případné poruchy dávkovače",
      "autorizace munice podle výzkumu",
    ],
  },
  {
    id: "sonic-cannon",
    name: "SONICKÉ DĚLO",
    internalCode: "SR-13",
    description: "Účel: odrazení subjektu pomocí sonického impulzu.",
    status: "V PROVOZU",
    sections: [
      {
        heading: "Známé riziko",
        lines: ["Ghoul může při použití sonického děla identifikovat aktivní kameru a zaútočit na ni."],
      },
      {
        heading: "Aktuální plánované pravidlo",
        lines: [
          "5 procent šance při každém použití na Ghoula",
          "kamera může přijít o obraz do rána",
          "mikrofon zůstane aktivní",
          "počet možných poškozených kamer roste podle čísla noci",
        ],
      },
      {
        heading: "Limity",
        lines: ["Noc 1 až 10: maximálně 1 kamera", "Noc 11 až 19: maximálně 2 kamery", "Noc 20 a více: maximálně 3 kamery"],
      },
    ],
    todos: [
      "blueprint sonického děla",
      "přesné statistiky použití",
      "účinnost podle typu subjektu",
      "selhání",
      "osobní počet odražení",
      "osobní počet způsobených útoků na kameru",
    ],
  },
  {
    id: "door-system",
    name: "DVEŘNÍ OBRANNÝ SYSTÉM",
    internalCode: "D-13",
    description: "Současný účel: uzavření přístupu do kanceláře.",
    status: "V PROVOZU",
    sections: [
      {
        heading: "Budoucí nouzový režim",
        lines: ["Generátor může být spuštěn na plný výkon a krátce poslat extrémní množství energie do dveří."],
      },
      {
        heading: "Plánovaná reakce Titana",
        lines: [
          "Titan buší do dveří",
          "pokud hráč nereaguje, dveře prorazí",
          "při aktivaci plného výkonu dostane Titan elektrický zásah",
          "Titan uteče úplně pryč",
          "výsledek bude podobný odstranění nebo zabití běžného monstra",
        ],
      },
    ],
    todos: [
      "blueprint dveří",
      "elektrické cívky",
      "nouzový impuls",
      "spotřeba energie",
      "poškození dveří",
      "statistika použití",
      "Titanův útok",
      "vizuální animace",
      "servis mezi nocemi",
    ],
  },
  {
    id: "generator",
    name: "GENERÁTOR",
    internalCode: "GEN-13",
    description: "Zdroj energie pro kamery, světla a dveře stanoviště.",
    status: "V PROVOZU",
    sections: [],
    todos: ["historie poruch", "statistiky restartů", "propojení s nouzovým dveřním impulsem"],
  },
  {
    id: "camera-system",
    name: "KAMEROVÝ SYSTÉM",
    internalCode: "CAM-13",
    description: "Sledovací systém pokrývající okolí a chodby Objektu 13.",
    status: "V PROVOZU",
    sections: [],
    todos: ["počet poškozených kamer", "historie útoků na kamery", "statistiky sledování"],
  },
  {
    id: "bulbs",
    name: "ŽÁROVKY",
    internalCode: "LMP-13",
    description: "Osvětlení u dveří stanoviště, omezená životnost.",
    status: "V PROVOZU",
    sections: [],
    todos: ["stav zásoby žárovek", "statistiky spotřeby", "budoucí poškozování jinými subjekty"],
  },
  {
    id: "batteries",
    name: "BATERIE",
    internalCode: "BAT-13",
    description: "Nouzový zdroj energie dohledatelný mimo kancelář.",
    status: "V PROVOZU",
    sections: [],
    todos: ["stav nalezených baterií", "statistiky nouzových výprav"],
  },
];

export const DATABASE_EQUIPMENT_TAB_TODO_ITEMS: string[] = [
  "technické blueprinty",
  "odemykání vybavení",
  "varianty vybavení",
  "osobní statistiky používání",
  "spotřeba energie",
  "historie poruch",
  "propojení s konkrétními subjekty",
  "propojení s manuály",
  "zobrazení aktuálního vybavení hráče",
  "zobrazení nalezené brokovnice",
  "zobrazení dvouhlavňové brokovnice",
  "stav munice",
  "stav žárovek",
  "stav baterií",
  "počet poškozených kamer",
  "odemčené upgrady",
  "budoucí výzkumné bonusy",
];

// ── Hlášení ─────────────────────────────────────────────────────────────

/** Vždy jen demonstrace — NIKDY skutečné hlášení přihlášeného hráče (viz zadání). */
export const DATABASE_SAMPLE_REPORT: DatabaseReportPreview = {
  night: 7,
  subjectCode: "G-07",
  subjectType: "Ghoul",
  events: [
    "subjekt opustil klec",
    "subjekt se objevil ve venkovním prostoru",
    "sonické dělo použito",
    "levá kamera vyřazena",
    "mikrofon kamery zůstal aktivní",
    "subjekt zasažen čtyřikrát",
    "hlídací subjekt přežil směnu",
  ],
  outcome: "SMĚNA DOKONČENA",
};

export const DATABASE_REPORT_FORM_FIELDS: DatabaseReportFormField[] = [
  { label: "Identifikovaný subjekt", options: ["Ghoul", "Ghost", "Titan", "Praetorián", "Neidentifikováno"] },
  {
    label: "Pozorované chování",
    options: [
      "reagoval na světlo",
      "byl vidět pouze jako stín",
      "poškodil osvětlení",
      "poškodil kameru",
      "napadl dveře",
      "reagoval na sonické dělo",
      "vykazoval vysokou odolnost",
      "ustoupil směrem ven",
    ],
  },
  { label: "Stav subjektu", options: ["aktivní", "zraněný", "odražený", "zlikvidovaný", "neznámý"] },
  {
    label: "Stav hlídacího stanoviště",
    options: ["bez poškození", "kamera offline", "vyčerpané žárovky", "kritická energie", "poškozené dveře", "nedostatek munice"],
  },
];

export const DATABASE_REPORTS_TAB_TODO_ITEMS: string[] = [
  "automatické vytvoření reportu po každé noci",
  "ruční označení typu bestie",
  "vyhodnocení správnosti klasifikace",
  "výzkumné body za správné určení",
  "výzkumné body za správné pozorování",
  "bonus za likvidaci",
  "historie všech nocí hráče",
  "filtrování podle subjektu",
  "filtrování podle výsledku",
  "incidenty poškozených kamer",
  "incidenty výpadku energie",
  "spotřebovaná munice",
  "počet zásahů",
  "použitý typ munice",
  "osobní poznámka hráče",
  "export hlášení",
  "veřejné anonymní statistiky",
  "napojení na výzkumné sloupce subjektů",
];

// ── Manuály ─────────────────────────────────────────────────────────────

export const DATABASE_MANUALS: DatabaseManualPreview[] = [
  {
    id: "manual-01",
    number: "MANUÁL 01",
    title: "Jak přežít první noc",
    instructions: [
      "sledujte pohyb subjektu na kamerách",
      "šetřete energii",
      "nerozsvěcujte bez důvodu",
      "dveře používejte pouze v případě bezprostřední hrozby",
      "poslouchejte zvuky v chodbách",
      "po návratu z venkovní výpravy zkontrolujte stav munice",
    ],
    note: "Tento manuál bude později reagovat na skutečný postup hráče a může zobrazovat jinou radu podle jeho nejčastější příčiny smrti.",
  },
  {
    id: "manual-02",
    number: "MANUÁL 02",
    title: "Použití brokovnice",
    instructions: [
      "jednoranová brokovnice pojme jeden náboj",
      "dvouhlavňová brokovnice pojme dva náboje",
      "dávkovač vydá vždy pouze jeden náboj na kliknutí",
      "návrat do kanceláře automaticky nepřebíjí",
      "před odchodem ven vždy zkontrolujte stav NABITO",
      "do lovecké minihry lze vstoupit i s prázdnou zbraní",
    ],
    note: "Varování: stav 0/2 znamená, že obě hlavně jsou prázdné.",
  },
  {
    id: "manual-03",
    number: "MANUÁL 03",
    title: "Poškozená kamera",
    instructions: [
      "poškozená kamera ztrácí obraz až do 06:00",
      "mikrofon může zůstat aktivní",
      "kroky v místnosti lze stále slyšet",
      "sonické dělo na offline kameře lze použít i bez obrazu",
      "přepněte na jinou kameru a sledujte navazující oblasti",
    ],
  },
  {
    id: "manual-04",
    number: "MANUÁL 04",
    title: "Žárovky",
    instructions: [
      "žárovky mají omezenou životnost",
      "světlo používejte pouze tehdy, když ho potřebujete",
      "při vyčerpání zásoby může být nutné vyrazit ven",
      "další žárovky mohou být umístěny mimo kancelář",
      "některé budoucí subjekty mohou světlo poškozovat",
    ],
  },
  {
    id: "manual-05",
    number: "MANUÁL 05",
    title: "Energie",
    instructions: [
      "kamery, světla, dveře a další systémy spotřebovávají energii",
      "při kritickém stavu omezte nepotřebné systémy",
      "baterie mohou být dostupné v hale",
      "nouzové použití generátoru může spotřebovat výrazné množství energie",
      "některé budoucí obranné mechanismy budou vyžadovat téměř plný výkon",
    ],
  },
  {
    id: "manual-06",
    number: "MANUÁL 06",
    title: "Sonické dělo",
    instructions: [
      "dělo může subjekt odrazit",
      "výsledek není vždy zaručený",
      "Ghoul si může všimnout aktivní kamery",
      "při útoku na kameru dojde k postupnému selhání obrazu",
      "poškození obrazu je opraveno až ráno",
      "každé použití děla představuje malé riziko",
    ],
  },
  {
    id: "manual-07",
    number: "MANUÁL 07",
    title: "Lov subjektu",
    instructions: [
      "lov je dobrovolné riziko",
      "zlikvidovaný subjekt se již do konce noci nevrátí",
      "k zabití Ghoula může být zapotřebí přibližně deset zásahů standardní municí",
      "po vystřílení zbraně se vraťte do kanceláře",
      "ručně doplňte každý náboj",
      "před další výpravou ověřte stav munice",
    ],
  },
];

export const DATABASE_MANUALS_TAB_TODO_ITEMS: string[] = [
  "kontextové rady podle příčiny smrti",
  "rady podle dosažené noci",
  "rady podle vybavení hráče",
  "odemknutí manuálu po prvním problému",
  "doporučení po opakovaném selhání",
  "interaktivní kontrolní seznam",
  "zvýraznění nových manuálů",
  "návody pro Ghoula",
  "návody pro Ghosta",
  "návody pro Titana",
  "návody pro Praetoriána",
  "návody pro různé typy munice",
  "návody pro výměnu žárovek",
  "návody pro hledání baterií",
  "návody pro poškozené kamery",
  "návody pro plný výkon generátoru",
  "propojení manuálů s konkrétními částmi databáze",
  "možnost skrýt spoilery",
  "rozdílné rady pro přihlášené a nepřihlášené hráče",
];
