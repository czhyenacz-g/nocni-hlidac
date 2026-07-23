// Texty hry oddělené od komponent, ať je lze snadno upravovat / lokalizovat
// (viz game/i18n/ — tenhle soubor je teď český překlad, anglický
// ekvivalent stejného tvaru je content/copy.en.ts, oba svázané
// game/i18n/translations.ts).
export const COPY_CS = {
  // Název celé hry/franšízy odděleně od "Objekt 13" (první kampaň, viz
  // campaign.object13 níže) — do budoucna mohou přibýt další kampaně
  // (Objekt 7, Severní stanice, Podzemní laboratoř…), aniž by se tenhle
  // název měnil. Nikdy nepoužívat anglické pořadí "Object 13: Night
  // Watchman" — správné pořadí je vždy "Night Watchman: Object 13".
  franchise: {
    title: "Noční hlídač",
    fullTitleObject13: "Noční hlídač: Objekt 13",
  },
  campaign: {
    object13: {
      title: "Objekt 13",
    },
  },
  menu: {
    title: "Noční hlídač",
    subtitle: "Objekt 13: První směna",
    intro: "Sedíš v malé místnosti. Kamery šumí. Dveře nevydrží věčně. Přežij do rána.",
    // Zobrazí se místo intro výše, jen pro "Zlatého hlídače" (viz zadání,
    // game/core/monsterDefeatReward.ts, MainMenuScreen.tsx) — reward.hasDefeatedMonster
    // nebo reward.doubleBarrelUnlocked. Nahrazuje dřívější samostatný
    // "veteranStatus" panel (Status hlídače/Odměna/Bestie byla poražena),
    // který se pro tyhle hráče teď už vůbec nevykresluje — status "vyhrál jsi
    // to jednou, bestie tě už nemá čím vystrašit" je součástí věty, ne
    // vlastního panelu.
    goldenGuardIntro:
      "Sedíš v malé místnosti. Kamery šumí. Dveře nevydrží věčně. Jenže tentokrát už nejsi ten, kdo má mít strach.",
    startButton: "Nastoupit na směnu",
    // Zobrazí se místo startButton výše, jen když má hráč odemčenou
    // dvouhlavňovku (viz game/core/monsterDefeatReward.ts, MainMenuScreen.tsx)
    // — stejná akce (onStart), jen jiný text pro veterána.
    startButtonVeteran: "Nastoupit na veteránskou směnu",
    // Připojeno za startButton/startButtonVeteran mezerou, jen když má hráč
    // rozehranou Hardcore šňůru (viz MainMenuScreen.tsx#hasActiveHardcoreRun,
    // zadání "hráč hraje hardcore, přežije 4 noci, chce v tlačítku vidět
    // noc, na kterou nastupuje"). {night} nahrazuje MainMenuScreen.tsx.
    startButtonNightSuffix: "(noc {night}.)",
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
  // Sdílené texty pro volitelné "intro" cinematic (viz zadání,
  // content/cinematics.ts#intro) — jedna definice, použitá jak na
  // BriefingScreen.tsx (Noc 1), tak na app/terms/page.tsx, ať nevznikají dvě
  // kopie stejného tlačítka.
  intro: {
    startIntroLabel: "Spustit intro",
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
    statsLocalNote: "Trénink i Hardcore aktivita zatím dohromady — lokální, nekompetitivní přehled.",
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
    // Přejmenováno z "NORMAL" na "TRÉNINK" (na žádost) — viditelný text
    // pouze, interní identifikátor režimu (`GameMode = "normal" |
    // "hardcore"`, game/core/gameMode.ts) zůstává beze změny, včetně
    // server API kontraktu (`gameMode?: "normal" | "hardcore"`).
    normalLabel: "TRÉNINK",
    hardcoreLabel: "HARDCORE",
    // Druhá věta na vlastním řádku (viz zadání "čitelnější, druhá věta na
    // novém řádku") — vykresluje se přes whitespace-pre-line
    // (MainMenuScreen.tsx), stejný vzor jako DeathScreen.tsx/monsterDefeated body.
    normalTooltip: "Trénink: 3 životy.\nVýsledky se nezapisují do Síně slávy.\nObtížnost pro lidi jako je Filip Turek.",
    hardcoreTooltip: "Hardcore: 1 život.\nJen legendy se dostanou do síně slávy!",
    // Zobrazí se při kliknutí na HARDCORE bez Discord přihlášení (viz
    // MainMenuScreen.tsx#handleSelectHardcore) — hráč zůstává v Normal,
    // dokud se nepřihlásí.
    hardcoreLoginPromptText: "Hardcore režim se zapisuje do Síně slávy, proto vyžaduje přihlášení přes Discord.",
    // Zobrazí se, když je hráč přihlášený, ale jeho serverový profil není
    // dostupný (VPS výpadek/ještě se načítá, viz MainMenuScreen.tsx#hardcoreBlockedByProfile)
    // — Hardcore je server-authoritative pro inventář žárovek, nesmí běžet
    // v nejasném offline režimu.
    hardcoreProfileUnavailableText: "Hardcore vyžaduje spojení se serverem (žárovky se ukládají online). Zkus to znovu za chvíli.",
    // Zobrazí se místo normalTooltip, dokud má hráč rozehranou Hardcore
    // šňůru (currentRun > 0, viz MainMenuScreen.tsx#hasActiveHardcoreRun) —
    // Normal je v tu chvíli uzamčený, tenhle text vysvětluje proč (viz
    // zadání "kdyby na něj namířil, ať je vidět popisek").
    normalLockedTooltip: "Tohle není pro tebe, už jsi si vybral cestu drsňáka.",
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
    /** Tooltip po chvíli podržení myši nad LightControl.tsx (viz zadání) — jen atmosférická narážka, nic herně nemění. */
    lightControlTooltip:
      "Za dveřmi je asi největší žárovka, co jsi kdy viděl. Řev monstra ti říká, že to nebude jen UV světlo.",
    /** Krátká hláška po zablokovaném pokusu rozsvítit při otevřených dveřích (viz zadání, LightControl.tsx, GameState.lightToggleBlockedSeq). */
    lightBlockedByOpenDoorMessage: "Nejdřív zavři dveře, ať tě to neuškvaří!",
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
    // Sonické dělo (viz zadání, CameraDetailView.tsx) — tlačítko/přepínač
    // viditelný jen v detailu právě otevřené kamery.
    sonicCannonOffLabel: "ZAPNOUT SONICKÉ DĚLO",
    sonicCannonOnLabel: "SONICKÉ DĚLO: AKTIVNÍ",
    // Kamera vyřazená Ghoulem (viz zadání "systém útoku na kameru",
    // CameraDamageOverlay.tsx) — obraz je pryč, mikrofon zůstává aktivní
    // (poslední řádek to hráči výslovně potvrzuje).
    cameraOfflineSignalLostLabel: "SIGNÁL ZTRACEN",
    cameraOfflineOutOfServiceLabel: "KAMERA MIMO PROVOZ",
    cameraOfflineServiceAtLabel: "SERVIS V 06:00",
    cameraOfflineMicActiveLabel: "MIKROFON: AKTIVNÍ",
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
    // Hotspot během probíhajícího přetížení generátoru (viz
    // GameState.doorGeneratorOverloadUntilMs) — dveře nereagují, hotspot je
    // vizuálně neaktivní (viz DoorView.tsx#doorControlsLocked).
    doorViewHintGeneratorOverload: "Zámek nereaguje...",
    // Hotspot po nevratném zničení dveří (viz GameState.doorDestroyed).
    doorViewHintDestroyed: "Mechanismus je zničen.",
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
    startEmergencyRunLabel: "NOUZOVÁ VÝPRAVA\nDO SKLADOVACÍ ČÁSTI",
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
    // Tlačítko dávkovače munice na LeftWallView (viz zadání "systém
    // brokovnice a přebíjení") — zobrazuje se VŽDY (i bez brokovnice, viz
    // "Preferuji, aby byl dávkovač na stěně viditelný, ale neaktivní"),
    // {ammo}/{max} je 0/0 bez zbraně (game/core/shotgunEquipment.ts#getShotgunMaxAmmo).
    // Žádné automatické dobíjení už neexistuje (viz applyShotgunEmergencyReturn) —
    // tohle je jediná cesta, jak munici doplnit.
    requestAmmoLabel: "ZAŽÁDAT O MUNICI ({ammo}/{max})",
    /** Krátká hláška po kliknutí na dávkovač BEZ brokovnice (viz zadání) — dávkovač je viditelný, ale bez zbraně logicky nemá co vydat. */
    requestAmmoNoWeaponLabel: "Nemáš žádnou zbraň. A to jsi poctivě prohledal celou kancelář. Tady je tedy nenajdeš.",
    // Vedlejší tlačítko na left_wall, vidět jen s brokovnicí (viz zadání,
    // GameState.hasShotgun) — stejný "drž tlačítko" vzor jako
    // startEmergencyRunLabel výše, jen delší (THINK_IT_OVER_WINDUP_DURATION_MS)
    // a bez spuštění minihry na konci.
    startThinkItOverLabel: 'Nechat si to "projít hlavou"',
    /** Text tlačítka během držení (viz GameState.thinkItOverWindup) — {seconds} se nahradí zbývajícím počtem sekund. */
    thinkItOverHoldingLabel: "Přemýšlím… {seconds} s",
    // Posuvník na LeftWallView.tsx, vidět jen s brokovnicí (stejná podmínka
    // jako startThinkItOverLabel výše, viz zadání "kompenzovat horší
    // mobilní ovládání") — nastavuje GameState.officeDoorLockMs (viz
    // game/minigame/config.ts#OFFICE_DOOR_LOCK_MIN_MS/MAX_MS). {seconds}
    // nahrazuje LeftWallView.tsx aktuální hodnotou v sekundách.
    officeDoorLockSliderLabel: "Zamčení dveří kanceláře: {seconds} s",
    officeDoorLockSliderHint: "Jak dlouho zůstanou dveře do kanceláře při výpravě zamčené, než se samy otevřou.",
    // Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — zobrazí se
    // po KAŽDÉM potvrzeném zásahu (ne jen prvním), záměrně beze čísla/postupu
    // ("X/10"), ať mechanismus zůstane skrytý — proto i "9. zásah" dostává
    // stejný text jako kterýkoliv jiný, žádná zvláštní "už jen jednou"
    // hláška (na výslovnou žádost dřívějšího zadání by prozrazovala postup,
    // proti smyslu "skrytý"). Text teď navíc odpovídá tomu, co se skutečně
    // stane (viz gameReducer.ts#CONFIRM_MONSTER_HIT) — monstrum se po
    // potvrzení stáhne zpátky ven, ne jen "zařve někde ve skladu".
    monsterHitConfirmedLabel: "Zásah potvrzen. Bestie ustoupila do tmy.",
    // Opakovaná porážka bestie (viz zadání "bestie je mrtvá, ale nebyla
    // poslední", gameReducer.ts#CONFIRM_MONSTER_HIT) — 10. potvrzený zásah v
    // noci, kdy hráč už bestii porazil dřív (jindy). Na rozdíl od
    // finalMonsterHitLabel/screen "monsterDefeated" (první životní výhra)
    // tahle hláška jen doplňuje monsterHitConfirmedLabel v emergencyRunMessage
    // panelu — směna dál pokračuje, nepřítel je na zbytek noci pryč.
    monsterDefeatedRepeatLabel: "Bestie je mrtvá. Ale nebyla poslední.",
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
    // "PŘETÍŽIT GENERÁTOR" (viz zadání "zničené dveře vlastní chybou hráče")
    // — tlačítko pod restartem, vidět od GENERATOR_OVERLOAD_MIN_NIGHT (admin
    // od noci 1, viz game/difficulty/nightConfig.ts#canOverloadGenerator).
    // Žádný window.confirm — hold-to-activate tlačítko (viz GeneratorView.tsx),
    // stejný mechanismus jako "Jít ven" na LeftWallView.tsx.
    generatorOverloadLabel: "PŘETÍŽIT GENERÁTOR",
    // Trvalé malé varování pod/v tlačítku (viz zadání), ne jen během držení.
    generatorOverloadDangerLabel: "NEBEZPEČÍ — NEVRATNÉ POŠKOZENÍ",
    // Text tlačítka během držení (viz GameState.generatorOverloadWindup) —
    // stejný vzor jako emergencyRunHoldingLabel, {seconds} se nahradí
    // zbývajícím počtem sekund do spuštění samotného přetížení.
    generatorOverloadHoldingLabel: "PŘETÍŽENÍ ZA {seconds} s",
    // Varování v levém horním rohu po dobu držení (viz app/play/page.tsx,
    // stejný emergencyRunMessage slot jako "Jít ven" — žádný nový toast
    // systém). Zmizí stejným 4s auto-timeoutem jako ostatní zprávy v tomhle
    // slotu, i při předčasném puštění tlačítka.
    generatorOverloadWarningLabel: "VAROVÁNÍ: PŘETÍŽENÍ GENERÁTORU\nUvolněním tlačítka akci zrušíte.",
    // Odpočet zobrazený na DoorView.tsx po dobu desetisekundového tavení
    // (viz GameState.doorGeneratorOverloadUntilMs) — {seconds} nahrazuje
    // zaokrouhlený počet zbývajících celých sekund.
    doorGeneratorOverloadCountdownLabel: "PŘETÍŽENÍ: {seconds} s",
    // Zobrazí se na DoorView.tsx po dobu titanOverloadDeathRevealUntilMs
    // (viz gameReducer.ts#updateDoorGeneratorOverload, TITAN_OVERLOAD_DEATH_REVEAL_DURATION_MS)
    // — jen v tom vzácném případě, kdy přetížení generátoru u dveří skutečně
    // zabilo Titana (enemyStage -> "graveyard"). Čistě kosmetické potvrzení,
    // netýká se generického zničení dveří (doorViewHintDestroyed výše).
    titanOverloadDeathTitleLabel: "PŘETÍŽENÍ DOKONČENO",
    titanOverloadDeathBodyLabel: "Kontakt eliminován.\nBezpečnostní dveře byly zničeny.",
    // Zobrazí se, když hráč otevře dveře bez ověření kamerou, kam monstrum
    // odešlo (medium/hard, viz game/difficulty/difficultyConfig.ts
    // monster_check_or_return) — zatím nikde ve UI nenapojeno, jen připraveno.
    monsterReturnedUnverifiedHint: "Nevěděl jsi, kam zmizelo. Než jsi otevřel dveře, bylo zpátky.",
  },
  death: {
    // 4s celoobrazovkový GAME OVER reveal PŘED zbytkem DeathScreen.tsx (viz
    // zadání "vrátit krátký GAME OVER reveal", game/death/gameOverReveal.ts).
    gameOverLabel: "GAME OVER",
    title: "Předčasný konec směny.",
    reasons: {
      door_open_at_attack: "Tvou poslední chybou byly otevřené dveře.",
      // Vybitá energie NENÍ útok konkrétního monstra (viz zadání "Death flow
      // pro minihru a vybitou energii" — dřívější "Ve tmě povolil zámek."
      // zavádějícně naznačovalo vniknutí monstra dovnitř).
      blackout_timeout: "Energie byla vyčerpána. Bez proudu přestaly fungovat všechny bezpečnostní systémy.",
      bulb_replacement_attack: "Jít vyměnit tu žárovku nebylo hrdinství, ale poslední chyba v tvém životě.",
      emergency_run: "Nouzová výprava mimo kancelář byla poslední, kterou jsi kdy podnikl.",
      // Pokus o útěk/minihru během aktivního Titana (viz zadání "Pokus odejít
      // do minihry během Titanova útoku") — DeathScreen.tsx zatím podporuje
      // jen jednu větu na řádek (žádný whitespace-pre-line), proto jedna
      // souvětí varianta místo dvouřádkové z zadání.
      titan_ambush_emergency_run: "Při pokusu o útěk se dveře zasekly a Titan tě zabil.",
      // Titan prorazil bezpečnostní dveře (viz zadání "oprav dvojitý Game
      // Over" — VLASTNÍ text, nesmí zmiňovat "otevřené dveře", to je Impova/
      // Ghoulova příčina smrti, ne Titanova).
      titan_door_breach: "Titan prorazil bezpečnostní dveře. Nic ho nezastavilo.",
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
    // "Normal" -> "Trénink" přejmenováno na žádost, stejná konvence jako
    // COPY.gameMode.normalLabel.
    normalLeaderboardNote: "Trénink se nezapisuje do Síně slávy.",
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
  // Hardcore Noc 30 má dvě alternativní ending větve (viz zadání,
  // game/core/night30Ending.ts#resolveNight30Ending,
  // components/screens/Night30EndingScreen.tsx) — obě nahrazují WinScreen
  // jen pro tenhle jeden přechod. Úvodní část ("intro" fáze) žije jako
  // klikací CinematicScreen scéna v content/cinematics.ts
  // (no_kill_ending/warrior_ending), ne tady — tenhle blok nese jen text
  // pro druhou fázi (ztemnělá obrazovka, volitelný epilog + úmrtní záznam),
  // whitespace-pre-line (stejný vzor jako monsterDefeated.body níže) —
  // prázdné řádky mezi odstavci jsou záměrné.
  night30Ending: {
    noKill: {
      // Bez extra epilogu před úmrtním záznamem (na rozdíl od warrior níže).
      epilogueText: null as string | null,
      recordNoteValue: "Na stole měl pořád první výplatní obálku. Nikdy ji nevyhodil.",
    },
    warrior: {
      epilogueText:
        "O několik dní později\n\nDoma jsi otevřel kufřík znovu.\n\nBylo tam víc peněz, než jsi kdy viděl pohromadě.\n\nNa chvíli tě napadlo, že už nikdy nebudeš muset pracovat.\nMožná deset let.\nMožná víc.\n\nPrvní měsíce byly tiché.\nBez kamer.\nBez dveří.\nBez UV světel.\nBez generátoru.\n\nPak přišla nuda.\n\nA potom obyčejná práce." as string | null,
      recordNoteValue: "V oficiálních záznamech Objekt 13 nikdy neexistoval.\nStejně jako tvoje zásluhy.",
    },
    continueLabel: "Pokračovat",
    recordHeading: "O 15 let později",
    recordTitle: "ÚMRTNÍ ZÁZNAM",
    recordCauseLabel: "Příčina úmrtí:",
    recordCauseValue: "srdeční selhání",
    recordFactorsLabel: "Přidružené faktory:",
    recordFactors: ["obezita", "sedavé zaměstnání", "dlouhodobý nedostatek pohybu"] as const,
    recordWeightLabel: "Hmotnost při úmrtí:",
    recordWeightValue: "178 kg",
    recordTimeLabel: "Čas úmrtí:",
    recordTimeValue: "14:07",
    recordDescendantsLabel: "Potomci:",
    recordDescendantsValue: "žádní",
    recordNoteLabel: "Poznámka:",
    backToMenuLabel: "Zpět do menu",
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
    // První řádek servisního výpisu, jen pro gameMode "normal" (viz zadání,
    // LoadingScreen.tsx) — Hardcore zatím žádnou obdobu nemá, nebyla
    // vyžádaná. "NORMAL" přejmenováno na "TRÉNINK" (na žádost), stejná
    // konvence jako COPY.gameMode.normalLabel — interní gameMode hodnota
    // beze změny.
    difficultyNormalLabel: "Obtížnost TRÉNINK",
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
    // Nadpis sekce nově odemčených achievementů na výsledkových obrazovkách
    // (viz zadání "Napojit achievementy na výsledkové obrazovky",
    // components/achievements/AchievementResultPanel.tsx) — přesný text ze zadání.
    newResultsHeading: "NOVÝ ÚSPĚCH",
  },
  // Veřejná MVP databáze Objektu 13 (/database, viz zadání,
  // docs/database-mvp.md) — jen krátké "chrome" popisky/labely (hlavička,
  // stavy přihlášení, badge, placeholdery). Rozsáhlý strukturovaný obsah
  // (karty subjektů/vybavení/manuálů, ukázkový report) žije v
  // lib/database/databaseContent.ts, ne tady — tohle je UI text, ne
  // databázový obsah.
  database: {
    seoTitle: "Databáze Objektu 13",
    seoDescription: "Interní databáze subjektů, vybavení, incidentů a provozních manuálů Objektu 13.",
    facilityLabel: "OBJEKT 13",
    databaseLabel: "INTERNÍ DATABÁZE",
    accessLevelLabel: "Přístupová úroveň",
    accessLevelPublic: "VEŘEJNÝ NÁHLED",
    accessLevelStaff: "HLÍDACÍ PERSONÁL",
    connectionStatusLabel: "Stav spojení",
    connectionStatusOnline: "ONLINE",
    introText:
      "Tato databáze obsahuje záznamy o testovacích subjektech, obranném vybavení, nočních incidentech a provozních postupech Objektu 13.",
    introTextAuth: "Část informací je dostupná veřejně. Osobní záznamy a postup hráče se zobrazují pouze po přihlášení.",
    /** {name} nahrazuje display name přihlášeného hráče. */
    staffLabel: "Přihlášený pracovník:",
    staffFallback: "AUTORIZOVANÝ UŽIVATEL",

    publicAccessHeading: "VEŘEJNÝ PŘÍSTUP",
    publicAccessIntro: "Prohlížíte veřejnou část databáze Objektu 13.",
    publicAccessFutureIntro: "Po přihlášení zde budou v budoucnu dostupné například:",
    publicAccessFutureItems: [
      "objevené druhy subjektů",
      "osobní statistiky střetů",
      "potvrzené slabiny",
      "vlastní hlášení z nočních směn",
      "historie incidentů",
      "odemčené manuály",
      "statistiky vybavení",
      "postup výzkumu",
    ],
    loginButtonLabel: "PŘIHLÁSIT SE",

    personalRecordsHeading: "OSOBNÍ ZÁZNAMY",
    personalRecordsGuestText: "Přihlaste se pro zobrazení vlastního postupu, hlášení a objevených poznatků.",
    personalRecordHeading: "OSOBNÍ ZÁZNAM",
    highestNightLabel: "Nejvyšší dosažená noc:",
    discoveredSubjectsLabel: "Objevené subjekty:",
    completedReportsLabel: "Dokončená hlášení:",
    confirmedKillsLabel: "Potvrzené likvidace:",
    disabledCamerasLabel: "Vyřazené kamery:",
    notConnectedValue: "ZATÍM NENAPOJENO",
    notTrackedValue: "NEEVIDOVÁNO",
    personalRecordTodo:
      "Později se zde zobrazí skutečná data přihlášeného hráče. Data budou vycházet z centrálního herního postupu, nikoliv z lokálního stavu této stránky.",

    tabSubjectsLabel: "Subjekty",
    tabEquipmentLabel: "Výbava",
    tabReportsLabel: "Hlášení",
    tabManualsLabel: "Manuály",

    todoBadgeTodo: "TODO",
    todoBadgePlanned: "PLÁNOVANÁ FUNKCE",
    todoDefaultDescription: "Tato část je připravena jako návrh budoucí funkce. Zatím není napojena na herní stav ani databázi hráče.",

    backToGameLabel: "← Zpět do hry",
  },
  // Texty klikacích cinematic scén (viz content/cinematics.ts,
  // components/screens/CinematicScreen.tsx) — timing/audio/struktura
  // segmentů (a `id` každého segmentu) zůstává sdílená a jazykově nezávislá
  // v cinematics.ts, tady žije jen samotný text (title/segment text/response
  // label), adresovaný přes `sceneId`/`segment.id` (viz
  // CinematicSegment.id a components/screens/CinematicScreen.tsx). Klíče
  // (scéna/segment id) musí přesně odpovídat CINEMATIC_SCENES v cinematics.ts.
  cinematics: {
    intro: {
      title: "PRACOVNÍ POHOVOR",
      segments: {
        greeting: { text: "Dobrý den. Děkujeme, že jste přišel.", responseLabel: "Pokračovat." },
        profile_match: {
          text: "Váš profil odpovídá tomu, co hledáme. Posledních dvacet let jste pracoval jako noční hlídač v místní chemičce, než závod uzavřeli.",
          responseLabel: "Pokračovat.",
        },
        no_complaints: {
          text: "Za celou dobu na vás nebyla jediná vážná stížnost. Jste spolehlivý, dochvilný a zvyklý pracovat v noci.",
          responseLabel: "Pokračovat.",
        },
        no_dependents: {
          text: "Také vidím, že nemáte děti ani blízké příbuzné, kteří by na vás byli závislí. Pro tuto pozici je to výhoda.",
          responseLabel: "Pokračovat.",
        },
        hired: { text: "Ráda vám oznamuji, že jste přijat.", responseLabel: "Pokračovat." },
        special_place: {
          text: "Půjde o hlídání na velmi speciálním místě. A speciální místo samozřejmě znamená i speciální odměny.",
          responseLabel: "Pokračovat.",
        },
        risk_and_pay: {
          text: "Práce je nadstandardně placená a při dobrých výsledcích můžete získat mimořádné bonusy. Současně vás ale musím upozornit, že pozice je spojena s určitým rizikem.",
          responseLabel: "Pokračovat.",
        },
        duties: {
          text: "Vaším úkolem bude sledovat kamery, kontrolovat vybavení a řídit se služebními postupy.",
          responseLabel: "Pokračovat.",
        },
        welcome: {
          text: "Pokud budete dodržovat pokyny, neměl by nastat žádný problém. Vítejte v Objektu 13.",
          responseLabel: "Rozumím.",
        },
        payday_note: { text: "P.S.: Výplata je standardně každých 30 dní.", responseLabel: "Rozumím." },
      },
    },
    old_guard_first_death_warning: {
      title: null as string | null,
      segments: {
        baf: { text: "Baf.", responseLabel: "..." },
        another_one: { text: "No výborně. Další, co čumí do monitorů a nehlídá si záda.", responseLabel: "Polknu." },
        im_the_tech: { text: "Jsem místní technik. Máš kliku, že jsem to já.", responseLabel: "Mlčím." },
        last_day: { text: "Dneska jsem tu naposledy. Stěhuju se z města.", responseLabel: "Poslouchám." },
        advice_intro: { text: "Tak ti na rozloučenou dám pár rad, nový ucho.", responseLabel: "..." },
        creatures: { text: "Po okolí se tu potulujou divný potvory. Hodně divný.", responseLabel: "Polknu." },
        cameras: { text: "Ty kamery tam máš k čemu, blbečku?", responseLabel: "Mlčím." },
        door_power: { text: "Ty dveře jsou pod proudem. Proud žere energii. To snad chápeš.", responseLabel: "Chápu." },
        dont_panic_close: {
          text: "Nevidíš na kamerách nebezpečí? Tak nezavírej dveře jak vystrašenej králík.",
          responseLabel: "Dochází mi to.",
        },
        watch_hallway: { text: "Vidíš něco v chodbě? Sleduj, kam to jde.", responseLabel: "Dobře." },
        close_the_door: { text: "Je to u dveří? Tak je zavři. To by pochopilo i malý dítě.", responseLabel: "Rozumím." },
        light_tip: {
          text: "A občas ti pomůže rozsvítit za dveřmi. Děti se taky bojí tmy... hahaha.",
          responseLabel: "Polknu.",
        },
        farewell: { text: "Tak přeju pěknou noc.", responseLabel: "Zpátky ke stolu." },
      },
    },
    think_it_over_warning: {
      title: null as string | null,
      segments: {
        dont: { text: "Nedělej to!", responseLabel: "..." },
        not_a_coward: { text: "Myslel jsem, že nejsi slaboch, co se tak snadno vzdá.", responseLabel: "Nejsem." },
        find_warrior: { text: "Najdi v sobě válečníka.", responseLabel: "Zkusím." },
        not_invincible: { text: "Monstrum není nezranitelné — jen je tvrdší, než vypadá.", responseLabel: "Poslouchám." },
        heals: { text: "Ale pamatuj: s ránem se znovu zahojí.", responseLabel: "Chápu." },
        one_night: { text: "Jestli ho chceš položit, musíš to dokázat během jediné noci.", responseLabel: "Dobře." },
        one_two_hits: { text: "Jedna rána ji jen rozzuří, dvě ji možná rozhodí…", responseLabel: "A dál?" },
        ten_hits: {
          text: "…ale DESETKRÁT se postavit strachu a znovu zmáčknout spoušť? To už může být dost na to, aby padla i tahle bestie.",
          responseLabel: "Zpátky ke stolu a vrhnout se do boje.",
        },
      },
    },
    valhala_ending: {
      title: "VALHALA",
      segments: {
        silence: { text: "Ticho.", responseLabel: "..." },
        wood_creaked: { text: "Pak dřevo zavrzalo pod tvýma rukama. Seděl jsi u dlouhého stolu.", responseLabel: "Rozhlížím se." },
        hynek_raises_mug: { text: "Naproti tobě Hynek zvedl půllitr.", responseLabel: "..." },
        close_call: { text: "„Byl jsi blízko.“", responseLabel: "Mlčím." },
        smiled: { text: "Chvíli se usmál.", responseLabel: "..." },
        thirty_or_valhalla: {
          text: "„Nakonec jsem měl pravdu. Buď se potkáme třicátou noc… nebo ve Valhale.“",
          responseLabel: "Poslouchám.",
        },
        pushed_beer: { text: "Přisunul ti pivo.", responseLabel: "..." },
        not_bad_guard: { text: "„A víš co? Na hlídače sis nevedl špatně.“", responseLabel: "Napiju se." },
      },
    },
    warrior_ending: {
      title: "POSLEDNÍ SMĚNA",
      segments: {
        thirtieth_day: { text: "Třicátý den.", responseLabel: "..." },
        hynek_smiling: {
          text: "Hynek stál uprostřed místnosti a usmíval se víc než obvykle.",
          responseLabel: "Sleduju ho.",
        },
        not_just_good_watch: { text: "„Tak jo. Tohle už nebyla jen dobrá hlídka.“", responseLabel: "..." },
        nodded: { text: "Podíval se na tebe a přikývl.", responseLabel: "..." },
        you_became_warrior: { text: "„Stal se z tebe válečník.“", responseLabel: "Mlčím." },
        men_in_suits: {
          text: "Za jeho zády se ozýval kov, kroky a tlumené hlasy mužů v ochranných oblecích.",
          responseLabel: "Poslouchám.",
        },
        thank_you_bait: {
          text: "„A hlavně — děkuju ti. Pomohl jsi mi otestovat vábničku na monstra.“",
          responseLabel: "Cože?",
        },
        points_at_generator: { text: "Ukázal ke generátoru.", responseLabel: "..." },
        your_generator: { text: "„Jo. Přesně tuhle. Tvůj generátor.“", responseLabel: "..." },
        let_it_sink_in: { text: "Chvíli tě nechal pochopit, co právě řekl.", responseLabel: "..." },
        not_out_of_town: { text: "„Popravdě… nebyl jsem mimo město.“", responseLabel: "..." },
        you_bought_time: { text: "„Ty jsi mi jen dal čas. Čas dokončit přípravy.“", responseLabel: "Chápu." },
        lights_on: { text: "Za Hynkem se rozsvítily kontrolky.", responseLabel: "..." },
        maximum_fireworks: {
          text: "„Za chvíli to zapneme na maximum. A připravíme opravdu velký ohňostroj.“",
          responseLabel: "...",
        },
        opened_briefcase: { text: "Podal ti otevřený kufřík s penězi.", responseLabel: "..." },
        your_pay_plus_bonus: { text: "„Tohle je tvoje výplata. A něco navíc za mlčenlivost.“", responseLabel: "Beru." },
        grew_serious: { text: "Pak zvážněl.", responseLabel: "..." },
        thousand_monsters: {
          text: "„Musíme pryč. Až to spustíme, přiláká to možná tisíc monster.“",
          responseLabel: "Utíkám.",
        },
        step_to_door: { text: "Udělá krok ke dveřím.", responseLabel: "..." },
        project_ends: { text: "„Celý projekt tímhle končí. Ty jsi svoji práci odvedl.“", responseLabel: "..." },
        turned_back: { text: "Ještě se otočil.", responseLabel: "..." },
        good_luck_warrior: {
          text: "„Přeju ti všechno nejlepší v nové práci. A díky, válečníku.“",
          responseLabel: "Sbohem.",
        },
      },
    },
    no_kill_ending: {
      title: "PRVNÍ VÝPLATA",
      segments: {
        thirtieth_day: { text: "Třicátý den.", responseLabel: "..." },
        hynek_before_dawn: { text: "Hynek se objevil ve dveřích dřív, než stačil vyjít úsvit.", responseLabel: "..." },
        looked_you_over: { text: "Chvíli si tě jen prohlížel.", responseLabel: "Čekám." },
        thirty_nights: {
          text: "„Třicet nocí. Bez útěku. Bez hrdinství. Bez zbytečných otázek.“",
          responseLabel: "...",
        },
        handed_envelope: { text: "Podal ti obálku.", responseLabel: "..." },
        good_guard: { text: "„Byl jsi dobrý hlídač.“", responseLabel: "Díky." },
        waited_for_truth: {
          text: "Čekal jsi vysvětlení. Čekal jsi pravdu. Čekal jsi, že po třiceti nocích něco skončí.",
          responseLabel: "...",
        },
        lit_cigarette: { text: "Hynek si jen zapálil cigaretu.", responseLabel: "..." },
        see_you_in_a_month: { text: "„Tak se uvidíme zase za měsíc.“", responseLabel: "Zpátky ke stolu." },
      },
    },
  },
  // title/description jednotlivých achievementů (viz content/achievements.ts,
  // klíč = AchievementId) — odděleno od "chrome" textů v COPY.achievements výše.
  achievementDefinitions: {
    meet_hynek: {
      title: "Setkání s Hynkem",
      description: "Úmrtí hned první den.",
    },
  },
  // title/description profilového checklistu achievementů (viz
  // game/core/playerAchievements.ts, klíč = PlayerAchievementId) —
  // nezaměňovat s achievementDefinitions výše (jiný, nezávislý systém).
  playerAchievements: {
    first_shift: { title: "První směna", description: "Nastoupil jsi na první noční službu." },
    first_death: { title: "První konec služby", description: "Objekt 13 ti ukázal, že tohle nebude obyčejná práce." },
    hynek_encounter: { title: "Setkání s Hynkem", description: "Zemřel jsi hned první noc." },
    first_expedition: { title: "Ven z kanceláře", description: "Poprvé jsi opustil bezpečí kanceláře." },
    first_bulb_replaced: { title: "Náhradní žárovka", description: "Poprvé jsi vyměnil prasklou žárovku." },
    first_generator_restart: { title: "Nahodit a modlit se", description: "Poprvé jsi restartoval generátor." },
    first_monster_hit: { title: "První krev", description: "Poprvé jsi potvrdil zásah bestie." },
    not_a_rookie_anymore: { title: "Už nejsi ucho", description: "Porazil jsi bestii poprvé." },
    golden_guard: { title: "Hlídač s dvouhlavňovkou", description: "Odemkl jsi dvouhlavňovou brokovnici." },
    hardcore_night_5: { title: "Tvrdá služba", description: "Dostal ses v Hardcore režimu alespoň k 5. noci." },
    hardcore_night_10: { title: "Začni si zvykat", description: "Dostal ses v Hardcore režimu alespoň k 10. noci." },
    hardcore_night_20: { title: "Běžná rutina", description: "Dostal ses v Hardcore režimu alespoň k 20. noci." },
    hardcore_night_30: { title: "Tvoje první výplata", description: "Dostal ses v Hardcore režimu alespoň k 30. noci." },
    monster_slayer: { title: "Lovec bestií", description: "Zabil jsi bestii podruhé." },
  },
  // Titulky pro monsterDefeated timed-caption cinematic (viz
  // content/monsterDefeatedCinematic.ts, klíč = TimedCaption.id) — timing
  // (atMs) zůstává sdílený/jazykově nezávislý v monsterDefeatedCinematic.ts.
  monsterDefeatedCinematicCaptions: {
    congrats_not_a_rookie: "Blahopřeji a uznávám, že už nejsi ucho!",
    warrior_spirit: "Máš v sobě ducha bojovníka.",
    not_first_not_last: "Věř mi ale, že ta bestie nebyla první, ani poslední.",
    more_will_come: "Přijdou další.",
    reward_for_you: "Za odměnu pro tebe něco mám.",
    left_on_office_wall: "Dal jsem ti to na stěnu v kanceláři.",
    want_to_know_truth: "Chceš vědět, o čem to reálně je?",
    meet_on_day_30: "Potkáme se až nastane 30. den...",
    or_in_valhalla: "...nebo ve Valhale.",
  },
  // Rádiové hlášky (viz game/radio/) — audio/timing/výběr varianty zůstává
  // sdílené a jazykově nezávislé v game/radio/*.ts, tady jen zobrazený text.
  // Klíče cameraDisabledMessages/titanEscapeMessages jsou přesné hodnoty
  // AudioEventId (viz game/audio/audioEvents.ts), ne camelCase název konstanty.
  radio: {
    interceptedTransmissionLabel: "ZACHYCENÝ PŘENOS",
    transmissionStatusLabel: "Přenos probíhá…",
    ghoulCameraAttackWarningText: "To ne! Sonické dělo přilákalo ghoula!",
    cameraDisabledMessages: {
      radio_camera_destroyed_0: "No, tak do rána jsme po tmě.",
      radio_camera_destroyed_1: "Kamera zničena!",
      radio_camera_destroyed_2: "Zbývá už jenom mikrofon.",
    },
    titanEscapeMessages: {
      titan_escape_01: "Sakra, Titan utekl! Dveře ani světla ho nezastaví. Vymyslete něco silnějšího!",
      titan_escape_02: "Titan je venku! Běžná obrana nefunguje. Použijte všechno, co máte!",
      titan_escape_03: "Nezastřelíte ho ani neudržíte za dveřmi. Něco vymyslete, rychle!",
      titan_escape_04: "Titan míří k vám! Zbraně jsou k ničemu. Potřebujete větší sílu!",
      titan_escape_05: "Bože… Titan unikl. Použijte něco, co dokáže vyřadit celý systém!",
    },
  },
  // Drobné samostatné UI texty bez vlastní domovské sekce (viz
  // components/game/MobileLandscapeHint.tsx, components/game/AdminBadge.tsx).
  ui: {
    mobileLandscapeHint: "Pro lepší hraní otoč telefon na šířku.",
    adminBadgeLabel: "Jsi ADMIN!",
  },
  // Servisní hlášky LoadingScreen (viz content/loadingHints.ts, klíč = LoadingHint.id).
  loadingHints: {
    energy_generator_battery: "Starý generátor sotva drží objekt při životě — v noci jedeš z rezervy baterie.",
    doors_magnetic_lock: "Magnetický zámek drží dveře zavřené jen pod proudem. Nenechávej je zavřené zbytečně dlouho.",
    cameras_power_drain: "Kamery spotřebovávají energii. Když je vypneš, baterie se pomalu dobíjí.",
    generator_normal_beep: "Generátor pípá každých pět sekund. Když ztichne, něco je špatně.",
    blackout_lock_release: "Při blackoutu zámek povolí. Dveře už nejsou tvoje jistota.",
    controls_look_at_door: "Na dveře se musíš nejdřív otočit. Teprve potom je můžeš zavřít.",
    enemy_route_variance: "To, co je na kameře, nemusí jít pořád stejnou cestou.",
    lore_day_only_design: "Objekt 13 byl navržen pro denní provoz. Noční režim nikdo nikdy pořádně netestoval.",
  },
} as const;

/** Rekurzivně "rozšíří" literálové typy `COPY_CS` (kvůli `as const`) na `string`/`readonly T[]`, ať `content/copy.en.ts` může nést jiné řetězcové hodnoty se stejným tvarem — jediné místo, které tenhle typ počítá. */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

export type CopyShape = Widen<typeof COPY_CS>;
