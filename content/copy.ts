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
} as const;
