// Texty hry oddělené od komponent, ať je lze snadno upravovat / později lokalizovat.
export const COPY = {
  menu: {
    title: "Noční hlídač",
    subtitle: "Objekt 13: První směna",
    intro: "Sedíš v malé místnosti. Kamery šumí. Dveře nevydrží věčně. Přežij do rána.",
    startButton: "Nastoupit na směnu",
    // Zobrazí se místo startButton výše, jen když má hráč odemčenou
    // dvouhlavňovku (viz game/core/monsterDefeatReward.ts, MainMenuScreen.tsx)
    // — stejná akce (onStart), jen jiný text pro veterána.
    startButtonVeteran: "Nastoupit na veteránskou směnu",
    termsLinkLabel: "Podmínky noční služby",
    // Přejmenováno ze "Žebříček hlídačů" na žádost — route/link (/leaderboard)
    // zůstává beze změny, mění se jen viditelný text.
    leaderboardLinkLabel: "Síň slávy hlídačů",
    // Odkaz na app/profile/page.tsx (viz zadání "profil hlídače") — stejné
    // umístění/styl jako termsLinkLabel/leaderboardLinkLabel výše, malý
    // nenápadný odkaz, žádný redesign menu.
    profileLinkLabel: "Profil hlídače",
    authorEmail: "hynek@darbujan.com",
  },
  // Status karta po prvním true endingu (viz zadání, game/core/monsterDefeatReward.ts,
  // MainMenuScreen.tsx) — zobrazí se jen když reward.hasDefeatedMonster. Texty
  // přesně podle zadání, drženo stručné/temné (na žádost "nepřehánět texty").
  veteranStatus: {
    statusLabel: "Status hlídače:",
    statusValue: "ZLATÝ HLÍDAČ",
    rewardLabel: "Odměna:",
    rewardValue: "Dvouhlavňová brokovnice odemčena",
    note: "Bestie byla poražena. Objekt 13 ale pořád stojí.",
  },
  // Profil hlídače (viz zadání, app/profile/page.tsx) — první verze budoucího
  // účtu/profilu, čistě lokální localStorage data (game/core/playerProfileStats.ts,
  // game/core/monsterDefeatReward.ts). Texty přesně podle zadání.
  profile: {
    seoTitle: "Profil hlídače | Noční hlídač",
    seoDescription: "Profil hlídače Objektu 13 — status, statistiky a achievementy uložené lokálně v prohlížeči.",
    heading: "Profil hlídače",
    backToMenuLabel: "← Zpět do menu",
    // Sekce 1: Služební karta.
    serviceCardHeading: "Služební karta",
    statusLabel: "Status",
    statusGolden: "ZLATÝ HLÍDAČ",
    statusRookie: "NOČNÍ HLÍDAČ",
    rewardLabel: "Odměna",
    rewardUnlocked: "Dvouhlavňová brokovnice odemčena",
    rewardLocked: "Žádná odměna zatím není odemčena",
    monsterDefeatsLabel: "Porážky bestie",
    noteGolden: "Tenhle hlídač už bestii skolil. Objekt 13 ale pořád stojí.",
    noteRookie: "Zatím jen další jméno na služební kartě.",
    // Serverový Hardcore profil (viz zadání "serverové ukládání profilu
    // hlídače jen pro Hardcore", game/core/hardcorePlayerProfileSnapshot.ts) —
    // jen pro přihlášeného hráče, ProfileScreen.tsx zobrazí jedno ze dvou.
    hardcoreSourceServer: "Zdroj Hardcore dat: server",
    hardcoreSourceLocal: "Zdroj Hardcore dat: lokální profil",
    serverLoadFailedWarning: "Serverový Hardcore profil se nepodařilo načíst. Zobrazuji lokální data.",
    syncButtonLabel: "Synchronizovat Hardcore profil",
    syncButtonSyncing: "Synchronizuji…",
    // Sekce 2: Statistiky.
    statsHeading: "Statistiky",
    // Zadání: "pokud je to moc UI zásah, zatím pouze zobraz Hardcore server
    // source a do reportu napiš, že Normal/casual lokální sekce bude
    // vyčištěna později" — tenhle krátký disclaimer je ten minimální zásah.
    statsLocalNote: "Normal i Hardcore aktivita zatím dohromady — lokální, nekompetitivní přehled.",
    statTotalDeaths: "Celkem smrtí",
    statTotalRunsStarted: "Nastoupené směny",
    statTotalNightsSurvived: "Přežité noci",
    statHardcoreBestNight: "Nejvyšší Hardcore noc",
    statBulbsReplaced: "Vyměněné žárovky",
    statGeneratorsRestarted: "Restartované generátory",
    statExpeditionsStarted: "Výpravy ven",
    statExpeditionsReturned: "Bezpečné návraty",
    statMonsterHitsConfirmed: "Potvrzené zásahy",
    statMonsterKills: "Zabité bestie",
    // Volitelná dlaždice (viz zadání "Uzavřít Hardcore profil a
    // achievementy") — jen 1. noc, celý histogram podle noci přijde později.
    statHardcoreDeathsOnNightOne: "Smrti v 1. noci",
    // Sekce 3: Achievementy.
    achievementsHeading: "Achievementy",
    achievementUnlockedMark: "✓",
    achievementLockedMark: "?",
    // Název/popis NEZÍSKANÉHO achievementu je pro běžného hráče schválně
    // skrytý (viz zadání "zobrazuj názvy a popisy nezískaných achievementů
    // jen adminovi", ProfileScreen.tsx) — admin (lib/auth/adminUsers.ts)
    // vidí i tak skutečný title/description kvůli debugu. Odemčené
    // achievementy zůstávají viditelné úplně pro všechny beze změny.
    achievementHiddenTitle: "Neznámý úspěch",
    achievementHiddenDescription: "Odemkni ho a zjisti, o co jde.",
    // Sekce 4: Výbava.
    loadoutHeading: "Výbava",
    loadoutDoubleBarrelName: "Dvouhlavňová brokovnice",
    loadoutDoubleBarrelNote: "Odměna za první porážku bestie.",
    loadoutEmpty: "Výbava bude doplněna po zásluhách.",
    // Debug/reset.
    resetButtonLabel: "Resetovat lokální profil",
    resetConfirmLabel: "Opravdu smazat lokální profil?",
  },
  // Výběr herního režimu na úvodní obrazovce (viz MainMenuScreen.tsx,
  // game/core/gameMode.ts) — Normal/Hardcore životy a death/leaderboard
  // pravidla jsou teď skutečně zapojené (viz gameReducer.ts, app/play/page.tsx,
  // DeathScreen.tsx), tenhle blok nese jen texty.
  gameMode: {
    normalLabel: "NORMAL",
    hardcoreLabel: "HARDCORE",
    // Druhá věta na vlastním řádku (viz zadání "čitelnější, druhá věta na
    // novém řádku") — vykresluje se přes whitespace-pre-line
    // (MainMenuScreen.tsx), stejný vzor jako DeathScreen.tsx/monsterDefeated body.
    normalTooltip: "Normal: 3 životy.\nVýsledky se nezapisují do Síně slávy.\nObtížnost pro lidi jako je Filip Turek.",
    hardcoreTooltip: "Hardcore: 1 život.\nJen legendy se dostanou do síně slávy!",
    // Zobrazí se při kliknutí na HARDCORE bez Discord přihlášení (viz
    // MainMenuScreen.tsx#handleSelectHardcore) — hráč zůstává v Normal,
    // dokud se nepřihlásí.
    hardcoreLoginPromptText: "Hardcore režim se zapisuje do Síně slávy, proto vyžaduje přihlášení přes Discord.",
    hardcoreLoginPromptStayNormalLabel: "Zůstat v Normal",
  },
  // Nenápadný login box v hlavním menu (viz components/auth/AuthStatus.tsx,
  // lib/auth/session.ts) — základ identity hráče pro budoucí žebříček, hra
  // samotná se přihlášením nijak nemění a jde hrát i bez něj.
  auth: {
    discordLoginLabel: "Přihlásit přes Discord",
    // {name} nahrazuje AuthStatus.tsx (displayName, jinak username).
    verifiedLabel: "Identita hlídače ověřena: {name}",
    logoutLabel: "Odhlásit",
  },
  game: {
    doorClosedLabel: "Dveře: ZAVŘENO",
    doorOpenLabel: "Dveře: OTEVŘENO",
    lightOnLabel: "UV světla za dveřmi: zapnuto",
    lightOffLabel: "UV světla za dveřmi: vypnuto",
    /** Prasklá žárovka u dveří (viz game/core/roomBulbs.ts) — nahrazuje lightOffLabel na LightControl, ať "VYPNUTO" nepůsobí jako by šlo světlo prostě zapnout. */
    lightBrokenLabel: "UV světla za dveřmi: rozbitá žárovka",
    powerLabel: "Energie",
    // Dev-only hodnota vedle energie (viz STRESS_DEV_HUD_ENABLED, PowerMeter.tsx) — časem se skryje.
    stressLabel: "Stres",
    // Zatím jen zobrazení campaign hodnoty (viz game/core/bulbInventory.ts) — nikde se
    // ještě nesnižuje, jen se přenáší mezi nocemi. Není finální design.
    bulbsLabel: "Žárovky",
    // Dev-only stav žárovky u dveří (viz game/core/roomBulbs.ts, PowerMeter.tsx) — přesný
    // debug údaj v sekundách, ne finální atmosférický text.
    nearRoomBulbLabel: "Žárovka u dveří",
    bulbBrokenLabel: "prasklá",
    timeLabel: "Čas do úsvitu",
    // {n} se nahradí ve ShiftTimer.tsx — kolikátou noc v řadě aktuální hlídač slouží.
    nightLabel: "Noc {n}",
    camerasLabel: "Kamery",
    cameraOverviewHint: "Klikni na monitor pro detail.",
    // Šipka byla dřív součástí textu — teď ji kreslí ikonový blok
    // (viz ViewSwitchArrow.tsx#ViewSwitchIcon "arrow-left"), text zůstává čistý.
    backToOverviewLabel: "Zpět na přehled",
    cameraFocusingLabel: "LADÍM SIGNÁL...",
    audioOnLabel: "Zvuk: zapnutý",
    audioOffLabel: "Zvuk: vypnutý",
    // Dominantní navigace v control roomu — šipka dolů, ne doprava, ať
    // odpovídá tomu, že dveře jsou "hlavní směr pohledu" spodní navigace
    // (viz DeskView.tsx, ViewSwitchArrow variant="primary").
    lookAtDoorLabel: "Otočit se ke dveřím",
    lookAtDeskLabel: "Zpět k panelu",
    // Text hotspotu odráží akci, kterou klik provede (ne popis "klikni na
    // dveře") — viz DoorView.tsx, stejná dvojice jako aria-label u hotspotu.
    doorViewHintOpen: "Otevřít dveře",
    doorViewHintClose: "Zavřít dveře",
    // Výraznější varianta doorViewHintClose během "monster_reached_office"
    // krize (viz zadání, resolveOfficeBreachPhase === "close_door") — stejný
    // hotspot/akce (onToggleDoor), jen naléhavější text + pulzování
    // (DoorView.tsx#closeDoorUrgent).
    doorViewHintCloseUrgent: "ZABOUCHNOUT DVEŘE!",
    // Ruční výměna prasklé žárovky (viz DoorView.tsx, gameReducer.ts
    // START_BULB_REPLACEMENT) — jen MVP text, žádný nový obrázkový asset.
    bulbReplaceLabel: "Vyměnit žárovku",
    // {seconds} se nahradí v DoorView.tsx (jedno desetinné místo).
    bulbReplaceInProgressLabel: "Výměna žárovky… {seconds} s",
    /** Kompaktní varianta pro malou ikonku (viz DoorView.tsx). */
    bulbReplaceProgressShortLabel: "{seconds} s",
    /** Krátká hláška po úspěšném dokončení výměny (viz DoorView.tsx, bulbReplaceSuccessSeq). */
    bulbReplaceSuccessLabel: "Žárovka vyměněna.",
    lookAtGeneratorLabel: "Zkontrolovat generátor",
    // Čistě atmosférický pohled bez herní mechaniky (viz LeftWallView.tsx,
    // gameReducer.ts LOOK_AT_LEFT_WALL) — vlastní text návratu na výslovné
    // přání zadání, ne sdílený lookAtDeskLabel.
    lookAtLeftWallLabel: "Podívat se na stěnu vlevo",
    leftWallBackLabel: "Zpět ke stolu",
    // Spustí EmergencyMiniGame (viz LeftWallView.tsx, app/play/page.tsx
    // handleStartEmergencyRunWindup) — první tenké napojení nouzové minihry
    // do hlavní hry, zatím vývojářské tlačítko bez finálního artu. Text
    // záměrně ne "Jít ven" — má znít jako riskantní, nevratné rozhodnutí, ne
    // ležérní odchod.
    startEmergencyRunLabel: "Nouzově opustit místnost",
    // Nahrazuje startEmergencyRunLabel, jakmile hráč monstrum tuhle noc
    // aspoň jednou zranil brokovnicí (viz GameState.monsterHitsToday,
    // game/core/monsterEnding.ts) — hidden true ending loot smyčka, hráč už
    // ví, že jde cíleně "na lov", ne jen nouzově pryč. Stejné tlačítko/
    // mechanika, jen jiný text (viz LeftWallView.tsx).
    startEmergencyRunHuntingLabel: "Vyrazit na lov",
    // Varování zobrazené hned při zahájení držení tlačítka (viz
    // handleStartEmergencyRunWindup, EMERGENCY_RUN_WINDUP_DURATION_MS) —
    // hráč musí tlačítko držet, ne jen kliknout, a tohle mu jasně řekne, že
    // jde o krajní řešení, ne běžnou akci.
    emergencyRunDangerWarningLabel:
      "Chceš opustit kancelář, co máš chránit? TO NENÍ DOBRÝ NÁPAD. Nedělej to, pokud nemáš absolutně jinou možnost.",
    // Text tlačítka během držení (viz GameState.emergencyRunWindup) —
    // {seconds} se nahradí zbývajícím počtem sekund do spuštění minihry.
    emergencyRunHoldingLabel: "PŘIPRAVUJI NOUZOVÉ OPUŠTĚNÍ… {seconds} s",
    // Krátká zpráva po úspěšném návratu z nouzové minihry (viz
    // handleEmergencyMiniGameComplete) — {amount} nahrazuje počet dobité
    // energie z worldEffects (energy_recharged).
    emergencyRunEnergyRechargedLabel: "Baterie přinesena. Energie +{amount}.",
    // Krátká zpráva po návratu z minihry, kdy monstrum pronásledovalo hráče
    // nebo bylo blízko kanceláře (viz EmergencyMiniGameResult.officeThreatOnReturn,
    // handleEmergencyMiniGameComplete) — hráč má hned pochopit "musím zavřít
    // dveře" (viz GameState.enemyDoorAttackGraceUntilMs — grace period mu na
    // to dá pár vteřin reálný čas). Přesný text ze zadání, dvouřádkový (\n) —
    // zobrazovací element (app/play/page.tsx) má whitespace-pre-line, ať se
    // \n skutečně zalomí, ne slibuje okamžitou smrt (ta se tímhle nespustí).
    emergencyRunThreatFollowedLabel: "Zdá se, že se nevracíš sám.\nZavři dveře!",
    // Zpráva po návratu, kdy monstrum zamířilo na kancelář/generátor, protože
    // hráč zůstal venku moc dlouho po otevření dveří (viz zadání "zamčené
    // dveře", EmergencyWorldEffect "monster_reached_office") — nezávislé na
    // emergencyRunThreatFollowedLabel výše (jiný spouštěč), stejný styl/tón.
    emergencyRunMonsterReachedOfficeLabel: "Monstrum se dostalo ke kanceláři.\nRYCHLE ZAVŘI DVEŘE!",
    // Trvalý krizový panel po monster_reached_office (viz
    // game/core/officeBreachAftermath.ts#resolveOfficeBreachPhase,
    // components/game/OfficeBreachBanner.tsx) — tři fáze v pevném pořadí
    // (dveře -> generátor -> žárovka), každá "hlavička" (výrazný pokyn) +
    // "hint" (krátké vysvětlení proč). Texty drženy krátké, ať hráč hned
    // pochopí pořadí kroků.
    officeBreachCloseDoorLabel: "RYCHLE ZAVŘI DVEŘE!",
    officeBreachCloseDoorHintLabel: "Něco je hned za dveřmi.",
    officeBreachRestartGeneratorLabel: "RESTARTUJ GENERÁTOR.",
    officeBreachRestartGeneratorHintLabel: "Dveře drží. Teď generátor.",
    officeBreachReplaceBulbLabel: "Žárovku vyměň, až bude chodba čistá.",
    officeBreachReplaceBulbHintLabel: "Generátor běží. Zbývá vyměnit žárovku.",
    // Tlačítko na LeftWallView (viz zadání "hráč nemá ztrácet čas navigací
    // přes control-room obrazovku") — přepne rovnou na DoorView. Klidový
    // text mimo krizi, výraznější varianta při aktivní krizi (viz
    // resolveOfficeBreachPhase !== null) — LeftWallView.tsx zvolí, který
    // z nich použije.
    turnToDoorLabel: "Otočit se ke dveřím",
    turnToDoorUrgentLabel: "RYCHLE KE DVEŘÍM!",
    // Krátká zpráva po bezpečném návratu, kdy hráč PRVNÍ krát získá brokovnici
    // (viz shotgun_acquired worldEffect, game/core/shotgunEquipment.ts) —
    // stejné místo/styl jako emergencyRunEnergyRechargedLabel výše.
    shotgunAcquiredLabel: "Brokovnice nalezena. Teď máš aspoň šanci se bránit.",
    /** {ammo}/{max} u LeftWallView, jen když hasShotgun === true (viz zadání "nenápadná informace o munici"). */
    shotgunAmmoReadyLabel: "Brokovnice: {ammo}/{max}",
    shotgunAmmoEmptyLabel: "Brokovnice: prázdná",
    // Dvouhlavňovka (viz zadání "true ending odměna" část G,
    // game/core/shotgunEquipment.ts#isDoubleBarrelShotgun) — stejné místo/
    // vzor jako shotgunAmmoReadyLabel/shotgunAmmoEmptyLabel výše, jen jiný
    // název zbraně a vlastní "prázdná" text (na žádost zadání, ne obecné
    // "Náboj: prázdno").
    doubleBarrelAmmoReadyLabel: "Dvouhlavňovka: {ammo}/{max}",
    doubleBarrelAmmoEmptyLabel: "Dvouhlavňovka: prázdná",
    // Vedlejší tlačítko na left_wall, vidět jen s brokovnicí (viz zadání,
    // GameState.hasShotgun) — stejný "drž tlačítko" vzor jako
    // startEmergencyRunLabel výše, jen delší (THINK_IT_OVER_WINDUP_DURATION_MS)
    // a bez spuštění minihry na konci.
    startThinkItOverLabel: 'Nechat si to "projít hlavou"',
    /** Text tlačítka během držení (viz GameState.thinkItOverWindup) — {seconds} se nahradí zbývajícím počtem sekund. */
    thinkItOverHoldingLabel: "Přemýšlím… {seconds} s",
    // Zobrazí se po doběhnutí držení (viz thinkItOverReadySeq) — přesný text ze zadání.
    thinkItOverResultLabel: "Nevzdávej se a bojuj! To monstrum určitě lze nějak zabít. Potřebuješ možná více ran, nebo větší kalibr.",
    // Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — zobrazí se
    // po KAŽDÉM potvrzeném zásahu (ne jen prvním), záměrně beze čísla/postupu
    // ("X/10"), ať mechanismus zůstane skrytý — proto i "9. zásah" dostává
    // stejný text jako kterýkoliv jiný, žádná zvláštní "už jen jednou"
    // hláška (na výslovnou žádost dřívějšího zadání by prozrazovala postup,
    // proti smyslu "skrytý"). Text teď navíc odpovídá tomu, co se skutečně
    // stane (viz gameReducer.ts#CONFIRM_MONSTER_HIT) — monstrum se po
    // potvrzení stáhne zpátky ven, ne jen "zařve někde ve skladu".
    monsterHitConfirmedLabel: "Zásah potvrzen. Bestie ustoupila do tmy.",
    // 10. (finální) zásah — zobrazí se PŘÍMO v EmergencyMiniGame jako overlay
    // po dobu MONSTER_FINAL_DEATH_SCREEN_DELAY_MS (viz
    // EmergencyMiniGame.tsx#fireShot/tick, game/minigame/config.ts). Na
    // rozdíl od monsterHitConfirmedLabel výše tenhle text hráč vidí HNED,
    // uvnitř zamrzlé minihry, ne až v hlavní hře po dispatchi.
    finalMonsterHitLabel: "Bestie padla.",
    // Doplňkový loot v emergency výpravě (viz zadání "sandbox výprava") —
    // {item} nahrazuje EmergencyMiniGame.tsx nominativem (Baterie/Žárovka/
    // Brokovnice — všechny gramaticky ženský rod, proto "sebrána" pevně).
    itemCollectedLabel: "{item} sebrána.",
    // Zpráva po bezpečném návratu se žárovkou (viz worldEffect "bulbs_serviced",
    // GameState.bulbsRemaining) — stejné místo/styl jako emergencyRunEnergyRechargedLabel.
    bulbAcquiredLabel: "Náhradní žárovka uložena do skladu.",
    // Klik na tlačítko se zavřenými dveřmi (viz handleStartEmergencyRunWindup)
    // — hráč nemůže vyběhnout ven zavřenými dveřmi, tlačítko samo o sobě
    // zůstává klikatelné (jen vizuálně ztlumené), tenhle hint vysvětlí proč.
    emergencyRunNeedsOpenDoorLabel: "Nejdřív musíš otevřít dveře.",
    // Statický plánek objektu bez interaktivity (viz ObjectMapView.tsx,
    // gameReducer.ts LOOK_AT_MAP, game/map/objectMap.ts pro data uzlů/hran) —
    // vlastní texty, stejný vzor jako left_wall. Popisky místností samotné
    // žijí v game/map/objectMap.ts (stejná konvence jako CameraDefinition.label
    // v game/cameras/), ne tady.
    lookAtMapLabel: "Podívat se na mapu",
    mapBackLabel: "Zpět ke stolu",
    generatorViewHint: "Klikni pro restart.",
    generatorStateLabels: {
      normal: "Generátor běží.",
      silentFault: "Generátor ztichl.",
      criticalBeeping: "PORUCHA! Restartuj generátor!",
      restarting: "Restartuje se...",
    },
    // Krátká posměšná hláška, když hráč restartuje generátor, co běžel v
    // pořádku (viz GameState.generatorAccidentalRestartSeq, GeneratorView.tsx).
    generatorAccidentalRestartMessage: "To byla pěkný blbost, co jsi udělal...",
    // Zobrazí se, když hráč otevře dveře bez ověření kamerou, kam monstrum
    // odešlo (medium/hard, viz game/difficulty/difficultyConfig.ts
    // monster_check_or_return) — zatím nikde ve UI nenapojeno, jen připraveno.
    monsterReturnedUnverifiedHint: "Nevěděl jsi, kam zmizelo. Než jsi otevřel dveře, bylo zpátky.",
  },
  death: {
    title: "Předčasný konec směny.",
    reasons: {
      door_open_at_attack: "Tvou poslední chybou byly otevřené dveře.",
      blackout_timeout: "Nabíjení selhalo. Nouzová baterie vydržela jen pár sekund. Ve tmě povolil zámek.",
      bulb_replacement_attack: "Jít vyměnit tu žárovku nebylo hrdinství, ale poslední chyba v tvém životě.",
      emergency_run: "Nouzová výprava mimo kancelář byla poslední, kterou jsi kdy podnikl.",
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
    // Podle gameMode/livesRemaining (viz DeathScreen.tsx, game/core/gameMode.ts)
    // — Normal se zbývajícím životem pokračuje ("POKRAČOVAT"), Normal bez
    // životů i Hardcore run definitivně končí ("NOVÁ HRA"). {lives}/{night}
    // nahrazuje DeathScreen.tsx.
    normalContinueLivesLabel: "Zbývající životy: {lives}",
    /** {night} = noc, kterou hráč právě dohrál a bude opakovat. */
    normalContinueNightLabel: "Opakovat noc {night}.",
    normalContinueButton: "POKRAČOVAT",
    normalGameOverLabel: "Životy došly. Směna končí.",
    normalGameOverButton: "NOVÁ HRA",
    // Vidět jen na Normal death screen (viz zadání "Síň slávy je pouze pro
    // Hardcore") — připomínka, proč tahle smrt nikde v žebříčku nepřibyla.
    normalLeaderboardNote: "Normal režim se nezapisuje do Síně slávy.",
    hardcoreGameOverLabel: "Hardcore run končí. Smrt tě vrací na noc 1.",
    hardcoreGameOverButton: "NOVÁ HRA",
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
    backToMenuLabel: "Vrátit se do menu",
    // {count} se nahradí ve WinScreen.tsx — skloňování noc/noci/nocí podle počtu.
    survivedNightsLabel: {
      one: "Aktuální hlídač vydržel: {count} noc",
      few: "Aktuální hlídač vydržel: {count} noci",
      many: "Aktuální hlídač vydržel: {count} nocí",
    },
  },
  // Skrytý true ending (viz zadání, game/core/monsterEnding.ts,
  // components/screens/MonsterDefeatedScreen.tsx) — 10 potvrzených zásahů
  // monstra brokovnicí za jednu noc. Texty přesně podle zadání.
  monsterDefeated: {
    title: "GAME OVER",
    subtitle: "...ale pro monstrum",
    /** Vykreslené s whitespace-pre-line — \n\n je záměrně dvojitý (prázdný řádek mezi "Tentokrát opravdu." a "Zasloužil sis..."). */
    body: "Blahopřeji.\nTentokrát opravdu.\n\nZasloužil sis svoji výplatu :-D",
    backToMenuButton: "ZPĚT DO MENU",
    // Cinematic (viz content/monsterDefeatedCinematic.ts) — přehraje se PŘED
    // title/subtitle/body výše, ne misto nich. Tlačítko přeskočit je jen
    // pohodlnost pro opakované testování/hraní, ne skrytí monologu natrvalo.
    skipCinematicLabel: "Přeskočit",
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
      "Nástupem na směnu v Objektu 13 potvrzujete, že vstupujete do služby dobrovolně, " +
        "při vědomí a na vlastní odpovědnost.",
      "Berete na vědomí, že během směny může dojít k výpadkům proudu, ztrátě orientace, " +
        "pohybu neznámých osob na kamerovém systému, zvukům za dveřmi a dalším jevům, " +
        "které provozovatel nemusí být schopen uspokojivě vysvětlit.",
      "Dále berete na vědomí, že Noční hlídač je hororová hra. Obsahuje napětí, tmu, " +
        "náhlé zvuky, lekačky, znepokojivé obrazy a další prvky, které mohou být nevhodné " +
        "pro citlivé osoby, osoby se srdečními obtížemi, epilepsií, úzkostmi nebo jinou " +
        "zdravotní zátěží.",
      "Pokud trpíte zdravotními obtížemi, hrajete unavení, ve stresu, sami v temné místnosti " +
        "nebo s příliš hlasitými sluchátky, činíte tak na vlastní odpovědnost.",
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
  // Zatím jen mock data (viz lib/leaderboard/mockLeaderboard.ts) — žádné API/DB,
  // připraveno na budoucí náhradu za skutečné výsledky beze změny textů.
  leaderboard: {
    seoTitle: "Síň slávy hlídačů | Noční hlídač",
    seoDescription: "Síň slávy hlídačů Objektu 13 — kdo drží rekord a kdo právě slouží.",
    heading: "Síň slávy hlídačů",
    subheading: "Pozice byla opakovaně obsazena. Někteří vydrželi déle.",
    explanation:
      "Rekord ukazuje nejlepší dosaženou směnu hráče. Aktuální směna ukazuje hlídače, " +
      "který se zatím nevrátil ani nezmizel.",
    columnRank: "Pořadí",
    columnGuard: "Hlídač",
    columnBestRun: "Rekord",
    columnCurrentRun: "Aktuální směna",
    /** currentRun === 0 — hlídač buď ještě nezačal, nebo naposledy zemřel. */
    noActiveRunLabel: "bez aktivní směny",
    backToGameLabel: "← Zpět do hry",
  },
  // Malý toast popup (viz components/game/AchievementToast.tsx) — jen tenhle
  // obecný "chrome" text; název/popis konkrétního achievementu žije v
  // content/achievements.ts (stejná konvence jako CameraDefinition.label
  // v game/cameras/ — obsahová data, ne UI text).
  achievements: {
    unlockedLabel: "Achievement odemčen",
  },
} as const;
