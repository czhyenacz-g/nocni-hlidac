// Texty hry oddělené od komponent, ať je lze snadno upravovat / později lokalizovat.
export const COPY = {
  menu: {
    title: "Noční hlídač",
    subtitle: "Objekt 13: První směna",
    intro: "Sedíš v malé místnosti. Kamery šumí. Dveře nevydrží věčně. Přežij do rána.",
    startButton: "Nastoupit na směnu",
    termsLinkLabel: "Podmínky noční služby",
    authorEmail: "hynek@darbujan.cz",
  },
  game: {
    doorClosedLabel: "Dveře: ZAVŘENO",
    doorOpenLabel: "Dveře: OTEVŘENO",
    lightOnLabel: "Světlo: ZAPNUTO",
    lightOffLabel: "Světlo: VYPNUTO",
    powerLabel: "Energie",
    timeLabel: "Čas do úsvitu",
    // {n} se nahradí ve ShiftTimer.tsx — kolikátou noc v řadě aktuální hlídač slouží.
    nightLabel: "Noc {n}",
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
      silentFault: "Generátor ztichl.",
      criticalBeeping: "PORUCHA! Restartuj generátor!",
      restarting: "Restartuje se...",
    },
  },
  death: {
    title: "Předčasný konec směny.",
    retryButton: "Přijmout nového hlídače",
    reasons: {
      door_open_at_attack: "Tvou poslední chybou byly otevřené dveře.",
      blackout_timeout: "Nabíjení selhalo. Nouzová baterie vydržela jen pár sekund. Ve tmě povolil zámek.",
    },
    // Firemně-cynická hláška Objektu 13 po smrti — jedna náhodně vybraná při
    // vstupu na DeathScreen (viz DeathScreen.tsx), stabilní po dobu zobrazení.
    corporateMessages: [
      "Pozice bude obsazena dalším hlídačem.",
      "Zmizení zaměstnance není důvodem k přerušení provozu.",
      "Objekt 13 pokračuje v běžném režimu.",
      "Provoz nebyl incidentem narušen.",
      "Stanoviště je připraveno pro dalšího uchazeče.",
      "Nábor na uvolněnou pozici pokračuje.",
      "Objekt neeviduje žádnou mimořádnou událost.",
      "Další hlídač bude seznámen se stejnými podmínkami.",
    ],
    /** {count} se nahradí ve DeathScreen.tsx. */
    previousGuardsLabel: "Předchozí hlídači: {count}",
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
    retryButton: "Pokračovat další nocí",
    // {count} se nahradí ve WinScreen.tsx — skloňování noc/noci/nocí podle počtu.
    survivedNightsLabel: {
      one: "Aktuální hlídač vydržel: {count} noc",
      few: "Aktuální hlídač vydržel: {count} noci",
      many: "Aktuální hlídač vydržel: {count} nocí",
    },
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
  terms: {
    seoTitle: "Podmínky noční služby | Noční hlídač",
    seoDescription:
      "Podmínky noční služby v Objektu 13 — napůl herní lore, napůl disclaimer k hororové hře Noční hlídač.",
    heading: "Podmínky noční služby",
    paragraphs: [
      "Nástupem na směnu v Objektu 13 potvrzuješ, že vstupuješ do služby dobrovolně, " +
        "při vědomí a na vlastní odpovědnost.",
      "Bereš na vědomí, že během směny může dojít k výpadkům proudu, ztrátě orientace, " +
        "pohybu neznámých osob na kamerovém systému, zvukům za dveřmi a dalším jevům, " +
        "které provozovatel nemusí být schopen uspokojivě vysvětlit.",
      "Hráč dále bere na vědomí, že Noční hlídač je hororová hra. Obsahuje napětí, tmu, " +
        "náhlé zvuky, lekačky, znepokojivé obrazy a další prvky, které mohou být nevhodné " +
        "pro citlivé osoby, osoby se srdečními obtížemi, epilepsií, úzkostmi nebo jinou " +
        "zdravotní zátěží.",
      "Pokud trpíš zdravotními obtížemi, hraješ unavený, ve stresu, sám v temné místnosti " +
        "nebo s příliš hlasitými sluchátky, činíš tak na vlastní odpovědnost.",
      "Provozovatel hry ani společnost odpovědná za provoz Objektu 13 nenese odpovědnost " +
        "za následky vzniklé dobrovolným nástupem na směnu, včetně úleku, ztráty spánku, " +
        "podezřelého pohledu do chodby, náhlé potřeby rozsvítit, ani za rozhodnutí nezavřít " +
        "dveře včas.",
      "Noční hlídač je povinen sledovat kamerový systém, šetřit energii, kontrolovat dveře " +
        "a nevyvozovat unáhlené závěry z toho, že se něco pohnulo tam, kde podle záznamů " +
        "nic být nemělo.",
      "Opuštění stanoviště během směny se nedoporučuje. Opuštění stanoviště bez těla se " +
        "neeviduje jako pracovní úraz.",
      "V případě zmizení, předčasného ukončení směny nebo jiné provozní komplikace může " +
        "být pozice bez zbytečného odkladu obsazena dalším hlídačem.",
      "Tlačítko „Přijmout nového hlídače“ neznamená návrat původního zaměstnance do " +
        "služby. Znamená pouze, že provoz pokračuje.",
      "Veškeré události v Objektu 13 jsou fiktivní. Hra neslouží jako skutečný " +
        "pracovněprávní dokument, lékařské doporučení ani bezpečnostní školení.",
      "Hra je fikce. Noční práce je skutečná. Skuteční lidé pracující v noci si zaslouží " +
        "respekt, světlo, klid a férovou mzdu.",
    ],
    backLabel: "← Zpět na nástup",
  },
} as const;
