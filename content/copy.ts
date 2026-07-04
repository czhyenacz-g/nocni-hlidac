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
    cameraOverviewHint: "Klikni na monitor pro detail.",
    backToOverviewLabel: "← Zpět na přehled",
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
      blackout_timeout: "Nabíjení selhalo. Nouzová baterie vydržela jen pár sekund. Ve tmě povolil zámek.",
    },
  },
  blackout: {
    // Čtyři atmosférické fáze podle game/visuals/blackoutPhase.ts#getBlackoutPhaseIndex.
    // Každý text odpovídá zvuku, který se v dané fázi skutečně přehraje (viz
    // app/play/page.tsx#blackoutPhaseSeq efekt) — text nesmí slibovat zvuk, který nezní.
    phaseTexts: [
      "Nouzová baterie převzala napájení.",
      "Zámek slábne. Odněkud se ozvaly vzdálené kroky.",
      "Chodba utichla. Kroky se zrychlují.",
      "Něco je za dveřmi.",
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
      "Noční hlídač je malá browserová hororová hra o noční směně a pocta lidem, " +
      "kteří opravdu pracují v noci.",
    heading: "O projektu Noční hlídač",
    paragraphs: [
      "Noční hlídač je malá browserová hororová hra o noční směně v rozpadajícím se objektu. " +
        "Hráč sleduje kamery, hlídá energii, kontroluje dveře a snaží se přežít do rána.",
      "Projekt je zároveň poctou lidem, kteří opravdu pracují v noci — hlídačům, ostraze, " +
        "vrátným, recepčním, skladníkům, technikům a dalším.",
      "Horor ve hře je fikce. Skutečná noční práce je často tichá, nenápadná a nedoceněná.",
      "Do budoucna chci web propojit i s užitečnými nabídkami pro noční provozy: prací, " +
        "službami, partnerstvím nebo sponzoringem.",
    ],
    ctaHeading: "Máte nabídku práce, nápad na spolupráci nebo zájem o sponzoring?",
    ctaAction: "Ozvěte se:",
    backToGameLabel: "← Zpět ke hře",
  },
} as const;
