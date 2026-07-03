// Texty hry oddělené od komponent, ať je lze snadno upravovat / později lokalizovat.
export const COPY = {
  menu: {
    title: "Noční hlídač",
    subtitle: "Objekt 13: První směna",
    intro: "Sedíš v malé místnosti. Kamery šumí. Dveře nevydrží věčně. Přežij do rána.",
    startButton: "Spustit směnu",
    authorEmail: "hynek@darbujan.cz",
  },
  game: {
    doorClosedLabel: "Dveře: ZAVŘENO",
    doorOpenLabel: "Dveře: OTEVŘENO",
    lightOnLabel: "Světlo: ZAPNUTO",
    lightOffLabel: "Světlo: VYPNUTO",
    powerLabel: "Energie",
    timeLabel: "Čas směny",
    camerasLabel: "Kamery",
    noCameraSelected: "Vyber kameru.",
    cameraFocusingLabel: "LADÍM SIGNÁL...",
    audioOnLabel: "Zvuk: zapnutý",
    audioOffLabel: "Zvuk: vypnutý",
    lookAtDoorLabel: "Otočit se ke dveřím →",
    lookAtDeskLabel: "← Zpět k panelu",
    doorViewHint: "Klikni na dveře.",
    lookAtGeneratorLabel: "Zkontrolovat generátor →",
    generatorViewHint: "Klikni pro restart.",
    generatorStateLabels: {
      normal: "Generátor běží.",
      silentFault: "Generátor mlčí...",
      criticalBeeping: "PORUCHA! Restartuj generátor!",
      restarting: "Restartuje se...",
    },
  },
  death: {
    title: "Konec směny.",
    retryButton: "Zkusit znovu",
    reasons: {
      door_open_at_attack: "Nestihl jsi zavřít dveře.",
      blackout_timeout: "Nouzová baterie padla na nulu. Magnetický zámek povolil.",
    },
  },
  blackout: {
    // Čtyři atmosférické fáze podle game/visuals/blackoutPhase.ts#getBlackoutPhaseIndex.
    phaseTexts: [
      "Monitor problikne. Kamery zčernají.",
      "Dveře cvaknou — magnetický zámek povolil.",
      "Generátor vydá poslední zvuk a utichne.",
      "Odněkud se ozve zavytí. Kroky se blíží.",
    ] as const,
    subtitle: "Nouzová baterie je na nule.",
  },
  win: {
    title: "Přežil jsi směnu.",
    subtitle: "Slunce vychází. Objekt 13 je zatím v klidu.",
    retryButton: "Znovu",
  },
  loading: {
    title: "OBJEKT 13 — SERVISNÍ TERMINÁL",
    subtitle: "Spouštím systémy směny...",
  },
  footer: {
    projectName: "Noční hlídač",
    aboutLinkLabel: "O projektu",
    comingSoonLabel: "Připravujeme: inzerce nočních provozů",
    tagline: "Hororová hra a pocta nočním směnám.",
  },
  about: {
    seoTitle: "O projektu | Noční hlídač",
    seoDescription:
      "Noční hlídač je browserová hororová hra o noční službě a postupně vznikající prostor " +
      "pro důstojnou inzerci nočních provozů.",
    heading: "O projektu Noční hlídač",
    paragraphs: [
      "Noční hlídač je malá browserová hororová hra o noční službě v objektu, který sotva " +
        "drží pohromadě. Hráč sleduje kamery, šetří energii, kontroluje dveře, poslouchá " +
        "generátor a snaží se přežít směnu do rána.",
      "Projekt vzniká jako indie hra, ale zároveň i jako pocta lidem, kteří skutečně pracují " +
        "v noci: hlídačům, vrátným, pracovníkům ostrahy, recepčním, skladníkům, technikům a " +
        "všem, kdo drží provoz, když ostatní spí.",
      "Horor ve hře je fikce. Skutečná noční práce je často tichá, nenápadná a nedoceněná. " +
        "Právě proto chci, aby kolem projektu postupně vznikl i praktický prostor pro noční " +
        "provozy.",
      "Cílem není zaplnit web agresivní reklamou. Cílem je propojit tematickou hru, noční " +
        "atmosféru a užitečné nabídky pro lidi a firmy, kterých se noční provoz opravdu týká.",
    ],
    futureListHeading: "Do budoucna připravuji možnost důstojné inzerce:",
    futureList: [
      "nabídky práce pro noční hlídače, ostrahu, vrátné a recepční",
      "nabídky pro noční sklady, provozy a technické služby",
      "partnerství se službami, které dávají smysl lidem pracujícím v noci",
      "sponzoring hry nebo konkrétních částí webu",
    ],
    closingParagraph:
      "Pokud hledáte netradiční, ale důstojné místo pro inzerci nebo sponzoring, projekt " +
      "Noční hlídač je otevřený spolupráci.",
    ctaHeading: "Máte nabídku práce pro noční provoz?",
    ctaSubheading: "Hledáte partnerství nebo sponzoring?",
    ctaAction: "Ozvěte se.",
    backToGameLabel: "← Zpět ke hře",
  },
} as const;
