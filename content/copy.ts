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
      power_depleted: "Došla energie.",
    },
  },
  win: {
    title: "Přežil jsi směnu.",
    subtitle: "Slunce vychází. Objekt 13 je zatím v klidu.",
    retryButton: "Znovu",
  },
} as const;
