# TODO

## Checklist pro první MVP

- [x] Hlavní menu
- [x] Spuštění hry
- [x] Jedna hratelná směna (`night01`)
- [x] Jedna místnost hráče (GameScreen)
- [x] 4 kamery, konfigurační (ne hardcoded v UI)
- [x] Jedny dveře
- [x] Jedno světlo do chodby
- [x] Jeden nepřítel (`basicIntruder`)
- [x] Jednoduchý časovač směny
- [x] Jednoduchá energie
- [x] Obrazovka smrti
- [x] Obrazovka vítězství
- [x] Restart aktuální směny po smrti
- [x] Základní lekačka (overlay + zvuk)
- [x] Zvukové efekty pro napětí a smrt (CC0 placeholder z Kenney.nl + fallback při chybějícím souboru)
- [x] Postupná vizuální desaturace podle napětí
- [x] Build a lokální spuštění bez chyb
- [x] Ovládání dveří přes otočení hráče (DeskView/DoorView, dvoukrokové zavírání)
- [x] Dobíjení energie mimo kamerový pohled (~1 %/3 s, nesmí přebít spotřebu dveří/světla)
- [x] Generátor jako zvuková gameplay mechanika (normální pípání, porucha, ticho,
      kritické pípání + extra spotřeba, restart přes GeneratorView)
- [x] enemyTickMs zvýšen na 2 s, blikající hotspot na generátor v DeskView při poruše
- [x] 4. kamera (Chodba před dveřmi) + trasa nepřítele přes ni, `at_door` oddělený od
      kamer, pravděpodobnostní pohyb s `retreatChance` (ústup), `camera_noise` jen
      když je nepřítel na kameře nejblíž hráči
- [x] Náhodná volba strany (pravá/levá chodba) — `routeVariants`, losuje se jednou při
      startu směny
- [x] Mobilní stabilizace — dotykové cíle (`.tap-target`, `.tap-target-critical`,
      `.view-hotspot`), DebugPanel skrytý pod `lg`, viewport meta
      (pozn. `.mobile-landscape-hint`/`MobileLandscapeHint.tsx` byly později odstraněny —
      hláška "hraje se lépe na šířku" nebyla pravdivá, hra je cílená na portrait mobil)
- [x] Oprava `camera_noise` (jednorázový za "návštěvu") a zarovnání kamer podle pozice,
      sbalitelný DebugPanel
- [x] Door-light repel: zavřené dveře + zapnuté světlo + nepřítel u dveří ~1,5 s ->
      řev + silný ústup (`doorLightRepelMs` v TICKu, nezávislé na `enemyTickMs`);
      obecný standoff u dveří (6–8 s) je teď nezávislý na světle
      (`doorHoldLightAccelMultiplier` odstraněn)
- [x] LOOK_AT_DOOR/LOOK_AT_GENERATOR zavírají kamery (žádná nezůstane "otevřená" na
      pozadí), `isEnemyBeingWatched` vyžaduje `playerView === "desk"`
- [x] Generátor: omylem restartovaný funkční generátor teď penalizuje (`restarting`,
      5 s tichý výpadek se stejnou extra spotřebou jako `criticalBeeping`), místo aby
      byl no-op
- [x] Syntetizovaný fallback (Web Audio, bez knihovny) pro `generator_beep`,
      `generator_warning_beep`, `monster_retreat_roar` — slyšet i bez hotových
      audio souborů, doladit hodnoty v `audioConfig.ts`
- [x] Vysvětlení energie ve světě hry (generátor/baterie/solár) jako LoadingScreen hint,
      ne natvrdo v komponentě
- [x] LoadingScreen — falešný briefing mezi menu a startem směny, `content/loadingHints.ts`
      + `selectLoadingHints()` (weighted random, `minNight`/`maxNight` připraveno)
- [x] Kamera focus/šum po přepnutí (`cameraFocusMs` 700 ms, `game/core/cameraFocus.ts`)
- [x] Blackout místo okamžité smrti při `power <= 0` — `gameStatus`, `BlackoutView`,
      4 atmosférické fáze, přežití pokud směna skončí dřív, jinak smrt
      (`deathReason: "blackout_timeout"`)
- [x] Čitelnost blackout smrti — jasný death text odlišený od smrti nepřítelem u dveří,
      audio fáze blackoutu (`blackoutPhaseSeq` v reduceru, `enemy_step`/`enemy_near`/
      `blackout_door_hit` v `app/play/page.tsx`, jumpscare na konci), `BlackoutView` texty
      sladěné se skutečně přehrávaným audiem, `DebugPanel` ukazuje fázi
- [x] Kamerový panel overview/detail (`cameraViewMode`) místo čtyř tlačítek —
      `CameraMonitorGrid`/`CameraMonitorTile` (2×2 mřížka, jen štítek + šum, žádný živý
      obraz) a `CameraDetailView` (zvětšená kamera + "Zpět na přehled"), `CameraPanel` jen
      wrapper podle režimu; aktivní sledování (zpomalení nepřítele, `cameraOpen`) platí jen
      v detailu, stejná mřížka na mobilu i desktopu
- [x] Pozadí úvodního menu (`public/menu_bg.webp`, konvertováno z PNG přes `cwebp`) jako
      CSS `background-image` v `MainMenuScreen.tsx` s tmavým gradientem přes obrázek
- [x] Pozadí win screenu (`public/win1_background.webp`) a fáze DeskView na `/play`
      (`public/play_background.webp`, jen když `playerView === "desk"` a mimo blackout) —
      cesty centralizované v `game/visuals/backgroundImages.ts` (`BACKGROUND_IMAGES`),
      `preloadBackgroundImages()` je natvrdo stáhne do cache prohlížeče při
      `LoadingScreen.tsx`, ať se pak zobrazí okamžitě i při zhoršeném připojení
      (oprava: `.pixel-panel`/`.pixel-button` měly plné neprůhledné pozadí, takže
      prakticky celý DeskView pozadí zakrýval — přepnuto na poloprůhledné `rgba(...)`
      v `styles/pixel.css`, aby bylo skutečně vidět skrz mezery i skrz panely)
- [x] Příprava scénových pozadí pro všechny obrazovky (menu, loading, hraní, smrt, výhra,
      `/about`) — `game/visuals/backgroundImages.ts` (`BACKGROUND_SCENES`,
      `SceneBackgroundConfig`: 1-3 snímky s crossfade + volitelný flicker/dimming),
      `components/SceneBackground.tsx` vykresluje. Čistě datová konfigurace, žádný zásah do
      komponent při přidání/výměně obrázku nebo efektu. Všech 6 obrazovek má teď reálný obrázek.
- [x] Oprava: pozadí bylo na několika obrazovkách prakticky neviditelné —
      (1) `MainMenuScreen`/`WinScreen` měly `bg-gray-900` přímo na `<main>`, které nezakládá
      stacking context, takže vlastní pozadí zakrylo `SceneBackground` potomka s `-z-10`
      (odstraněno, `<body>` má `bg-gray-900` jako fallback); (2) `GameScreen.tsx` mělo
      `SceneBackground` uvnitř `<main className="max-w-md mx-auto">`, takže pozadí pokrývalo
      jen užší centrovaný sloupec, ne celou šířku obrazovky (přesunuto — `<main>` teď na celou
      šířku, herní obsah ve vnitřním `max-w-md` divu); (3) pozadí na `/play` se navíc zobrazovalo
      jen v `DeskView`, teď je stejné (`play`) i v `DoorView`/`GeneratorView`.
- [x] Vlastní pozadí pro `DoorView` (otevřené/zavřené dveře, `door_open_0.webp`/
      `door_closed_0.webp`) — `SceneBackground` dostal nový prop `activeIndexOverride`, který
      přebije automatické cyklení a nechá aktivní snímek řídit `GameScreen.tsx` podle
      herního stavu, ať se obrázky prohodí přesně při přepnutí dveří (crossfade), ne
      časovačem. `door_open_death_0.webp` je i pozadí samotného `DeathScreen`u pro
      `deathReason === "door_open_at_attack"` (`BACKGROUND_SCENES.deathDoorAttack`).
- [x] Krátký "reveal" (~700 ms) před finalizací smrti u dveří — `door_open_death_0` se krátce
      crossfade ukáže (jako 3. snímek `BACKGROUND_SCENES.door`) ještě PŘED `DeathScreen`em,
      místo instantního skoku, ale **jen** když je hráč už v `DoorView` (dveře otevřené) v
      okamžiku útoku (`GameState.doorDeathRevealUntilMs`, `DOOR_DEATH_REVEAL_DURATION_MS` v
      `game/balancing/constants.ts`). Smrt u kamer/generátoru zůstává záměrně beze změny
      (instantní, žádné vynucené přepnutí na `DoorView`) — dostane vlastní řešení později.
- [x] DoorView doladění: velký neprůhledný panel přes dveře nahrazen průhledným hotspotem
      (`.door-hotspot`, opacity ~0.1, procentuální pozice přes samotné dveře v obrázku) —
      hráč má pocit, že kliká přímo na dveře, ne na UI tlačítko. Velký text stavu dveří pryč
      (stav je vidět v obrázku), zůstala jen malá cedulka. Horní HUD (čas/zvuk/energie) se v
      `DoorView` vůbec nerenderuje (ne jen CSS skrytí), "Zpět k panelu" přesunuto dolů pod
      dveře. Desk/generator beze změny.
- [x] DoorView přestal používat viewport `SceneBackground`/`bg-cover` pro vlastní obrázek —
      nová lokální komponenta `components/game/DoorSceneFrame.tsx` (reálný `<img>`, pevný
      poměr stran 16:9, `object-contain`) drží obrázek dveří a hotspot ve stejném
      procentuálním souřadnicovém systému, takže hotspot při zoomu prohlížeče / resize okna /
      libovolném poměru stran zůstává přesně na dveřích (dřív se mohl rozjet, protože
      `bg-cover` škáluje obrázek podle celé šířky obrazovky nezávisle na vnitřním obsahu).
      `GameScreen.tsx` pro `playerView === "door"` `SceneBackground` vůbec nerenderuje.
      Ostatní obrazovky (menu/about/win/death/loading/desk/generator) beze změny.
- [x] Dveřní scéna zvětšena na desktopu — `.door-scene-frame` (styles/pixel.css) dopočítává
      velikost podle dostupné šířky/výšky viewportu (`width: min(100%, calc((100vh -
      var(--door-ui-reserved-height, 180px)) * 16/9))` + `aspect-ratio: 16/9`), ne pevná
      `max-width: 1100px`. `GameScreen.tsx` navíc DoorView (na rozdíl od desk/generator)
      nezabaluje do `max-w-md` — scéna tak využije celou dostupnou šířku, tlačítko zpět a
      DebugPanel si svůj úzký `max-w-md` sloupec drží samostatně. Hotspot dál sedí přesně na
      dveřích při zoomu/resize, jen ve výrazně větší ploše.
- [x] Přesun obrázkových assetů z ploché `public/background/` do `public/object_13/background/`
      — příprava na budoucí druhou mapu/objekt (`public/<map>/...`). Cesty přepsané na
      `OBJECT_13_BACKGROUND_PATH` konstantu v `game/visuals/backgroundImages.ts`, žádná
      komponenta se nemusela měnit.
- [x] Skutečné fotky v detailu kamer — `game/cameras/cameraAssets.object13.ts`
      (`CAMERA_ASSETS`, `getCameraImageSrc(cameraId, hasMonster, lightOn, elapsedMs)`) +
      `.webp` soubory (konvertované z `.png` přes `cwebp`, `monster` v názvu zachované) v
      `public/object_13/camera/<kamera>/`. Zapojené všechny 4 kamery (`outer_yard`/
      `right_hallway`/`left_hallway`/`door_hallway`) — `right_hallway` zatím bez "monster"
      fotek, fallback na "normal" funguje. Monstrum = deterministický výběr (stejná kamera +
      stav vždy stejná fotka); bez monstra = pomalé prostřídání mezi "normal" fotkami po
      `CAMERA_IMAGE_CYCLE_MS` (4000 ms, `game/balancing/constants.ts`), ne animace ani
      náhodný výběr. `door_hallway` má navíc `lightOn` variantu
      (`public/object_13/camera/door_hallway_light/`) podle `state.lightOn`. `CameraView.tsx`
      obrázek jen zobrazuje (`.pixel-screen-static` šum je samostatná vrstva nad obrázkem, ne
      na stejném elementu), text "POSTAVA V DOSAHU" beze změny. Overview mřížka pořád bez
      živého obrazu.
- [x] DeathScreen: firemně-cynický tón místo "Game Over" — titulek "Předčasný konec směny.",
      `door_open_at_attack` má text "Tvou poslední chybou byly otevřené dveře.", pod důvodem
      smrti jedna náhodná hláška z `COPY.death.corporateMessages` (vybraná přes `useMemo`
      s prázdnými závislostmi při vstupu na DeathScreen — komponenta se mountuje znovu při
      každé smrti, takže se hláška nemění při rerenderu, ale při další smrti může vyjít jiná).
      Tlačítko restartu přejmenováno na "Přijmout nového hlídače" (dřív "Zkusit znovu").
- [x] Počítadlo "Předchozí hlídači: X" na DeathScreen — `game/core/deathCount.ts`
      (`getDeathCount`/`incrementDeathCount`, localStorage klíč
      `nocni-hlidac:object13:death-count`, bezpečné mimo prohlížeč i bez localStorage —
      spadne na 0, hra nespadne). Zvyšuje se výhradně v `app/play/page.tsx` uvnitř
      existujícího screen-transition efektu (`prevScreenRef` diffing, stejný vzor jako
      jinde) při přechodu na `screen === "death"` — ne při kliknutí na tlačítko restartu,
      ne při výhře, ne opakovaně při rerenderu. Refresh stránky counter nesmaže
      (localStorage přežívá), restart směny ho nesnižuje ani nemaže.
- [x] Win screen: tlačítko "Znovu" -> "Pokračovat další nocí"
- [x] Úvodní tlačítko "Spustit směnu" -> "Nastoupit na směnu" + malý odkaz "Podmínky noční
      služby" pod ním na `/terms`
- [x] `/terms` — "Podmínky noční služby", napůl lore napůl disclaimer (hororová hra, hraní
      dobrovolné a na vlastní odpovědnost, ne skutečný právní dokument). Stejné pozadí jako
      menu (`BACKGROUND_SCENES.menu`), text ve scrollovatelném panelu (`max-h-[55vh]
      overflow-y-auto`), odkaz zpět na `/play`.
- [x] Zvuk překvapení na kameře přejmenován/přeznačen na `heartbeat` (tlukot srdce místo
      generického šumu `camera_noise`) — zatím jen syntetizovaný fallback (dvě nízké
      "lub-dub" noty), stejné podmínky spuštění jako dřív (jen jednou za "návštěvu"
      nepřítele na nejbližší kameře).
- [x] WinScreen: "Aktuální hlídač vydržel: X nocí" — `game/core/survivedNights.ts`
      (`getSurvivedNights`/`incrementSurvivedNights`/`resetSurvivedNights`, localStorage
      klíč `nocni-hlidac:object13:survived-nights`, stejný bezpečný vzor jako
      `deathCount.ts`). Zvyšuje se při přechodu na `screen === "win"`, vynuluje se při
      přechodu na `screen === "death"` (aktuální hlídač skončil — `deathCount` tím není
      dotčen, počítá se dál nezávisle) — obojí ve stejném screen-transition efektu v
      `app/play/page.tsx` jako `deathCount`, takže se nezvyšuje/nemaže opakovaně při
      rerenderu. Skloňování noc/noci/nocí řeší malá čistá funkce přímo ve `WinScreen.tsx`.
      DeathScreen: firemní hláška a "Předchozí hlídači" zesvětleny (`gray-500/600` ->
      `gray-300/400`) — byly na tmavém pozadí špatně čitelné.
- [x] Herní HUD: "Čas směny" -> "Čas do úsvitu" a vedle něj "Noc X" (`nightNumber =
      survivedNights + 1`, poslané z `app/play/page.tsx` do `GameScreen.tsx` ->
      `ShiftTimer.tsx`) — kolikátá noc v řadě aktuálního hlídače, stejné číslo jako survival
      streak na WinScreen, jen o jednu dřív (aktuální rozdělaná noc).
- [x] LoadingScreen ukazuje jen 1 hint místo 3 (dřív se do `LOADING_SCREEN_DURATION_MS`
      nestihly zobrazit všechny) — pokud má hint dvě věty, odhalí je postupně
      (`splitSentences`), ne dvě různé hlášky vedle sebe.
- [x] Dveřní hotspot mnohem průhlednější mimo hover/focus (`~0.03-0.05` místo `~0.1-0.18`) —
      v klidu skoro neviditelný, zřetelný až při najetí myší/focusu.
- [x] Generátor v `criticalBeeping`: stejné pípnutí jako `normal` (`generatorWarningBeep`
      zvuk zcela zrušen, byl duplicitní), jen 2×/s (`criticalBeepIntervalMs` 700 -> 500 ms) —
      jediná okamžitá signalizace kromě rychlého poklesu energie. Šipka "Zkontrolovat
      generátor →" bliká hned v `silentFault`, ale v `criticalBeeping` až po
      `GENERATOR_URGENT_BLINK_DELAY_MS` (2 s) od vstupu do stavu
      (`game/core/generatorUrgency.ts#isGeneratorArrowUrgent`, čistá derived-state funkce,
      žádné nové pole v `GameState`).
- [x] Herní sloupec (desk/generator/blackout) o 20 % širší — `GameScreen.tsx`
      `max-w-md` (28rem) -> `max-w-[33.6rem]` — hlavně kvůli detailu kamery, který díky tomu
      může být větší (`CameraView.tsx` `h-40` -> `h-48`, stejný poměr). DoorView (vlastní
      `DoorSceneFrame` šířka) a ostatní obrazovky (menu/about/win/death/loading/terms) beze
      změny.
- [x] `/dev-sound` — dev stránka se seznamem všech audio eventů (`game/audio/audioEvents.ts`),
      popisem, souborem/fallbackem a tlačítkem přehrát (`app/dev-sound/`, gatované
      `DEBUG_PANEL_ENABLED`)
- [x] Generátor pípání o 30 % tišší (`generator_beep` 0.6/0.8 -> 0.42/0.56)
- [x] Generátor pípání znovu o 30 % tišší po dalším playtestu (`generator_beep` 0.42/0.56 ->
      0.294/0.392); ambience loop o 15 % tišší (`ambience_loop` 0.35 -> 0.2975)
- [x] Útok u dveří: krok slyšet zřetelně před jumpscare, ne najednou (`enemy_step` ->
      ~220 ms odklad -> `jumpscare`, viz AUDIO_DESIGN.md "Útok u dveří")
- [x] Odstraněna neplatná mobilní hláška „otoč telefon na šířku“ (`MobileLandscapeHint.tsx`
      přestal být použitý, `.mobile-landscape-hint` CSS smazáno — hra je cílená na portrait)
- [x] Footer (`components/Footer.tsx`) s odkazem na `/about`, jen na MainMenuScreen a
      `/about` — ne na herních obrazovkách, ať nic neruší
- [x] `/about` stránka — kdo za projektem stojí, pocta nočním pracovníkům, textová
      avizace budoucí důstojné inzerce/sponzoringu (žádný formulář/backend)
- [x] Interní systém obtížnosti (`game/difficulty/difficultyConfig.ts`, zatím bez UI/query
      parametru, výchozí `medium`) — první pravidlo `monster_check_or_return`: na
      `medium`/`hard` musí hráč po "vzdání se" monstra u dveří ověřit kamerou, kam odešlo,
      než je bezpečné dveře otevřít, jinak se monstrum vrátí zpět; na `easy` stačí počkat.
      Testy ve `game/core/difficulty.test.ts` (Vitest, `npm run test`).
- [x] Heartbeat/stres vrstva (`game/audio/heartbeatStress.ts`, `useHeartbeatStress.ts`) —
      stress 0–100 podle toho, jestli hráč vidí monstrum v detailu kamery a jak blízko je
      (venku 20, boční chodba 40, chodba před dveřmi 45/100 podle dveří), plynulý
      růst/pokles, crossfade mezi `heartbeat_slow_reverb`/`heartbeat_fast_reverb` (CC0,
      OpenGameArt). Dev HUD "Stres: X" vedle energie (`STRESS_DEV_HUD_ENABLED`, časem
      schovat). Testy ve `game/audio/heartbeatStress.test.ts`.
- [x] LoadingScreen teď přednačítá i kamerové snímky (`preloadCameraImages` v
      `game/cameras/cameraAssets.object13.ts`), ne jen pozadí obrazovek
- [x] Audio/stres tuning po playtestu: heartbeat o 20 % hlasitěji
      (`HEARTBEAT_VOLUME_MULTIPLIER`), ambient se při vyšším stresu plynule ztišuje až na
      20 % (`MIN_AMBIENT_STRESS_MULTIPLIER`, `computeAmbientStressMultiplier`), vypadlý
      generátor v `criticalBeeping` přidává plochý +20 stresu
      (`BACKUP_POWER_STRESS_BONUS`, `computeGeneratorStressBonus` — odvozené z
      `generatorState`, ne akumulující se čítač)
- [x] Druhé kolo audio tuningu: ambient o dalších 15 % tišší (0.2975 -> 0.252875),
      heartbeat o dalších 30 % hlasitěji (`HEARTBEAT_VOLUME_MULTIPLIER` 1.2 -> 1.56)
- [x] Textový spoiler "POSTAVA V DOSAHU"/"žádný pohyb" odstraněný z `CameraView.tsx`
      (problikával přes fotku) — stejná informace teď jen v `DebugPanel.tsx`
- [x] Horor efekt: stres zpomaluje "Čas do úsvitu" (`game/core/stressTimeScale.ts`,
      `MAX_STRESS_TIME_SLOWDOWN = 0.5`, jde vypnout `STRESS_TIME_SLOWDOWN_ENABLED`) —
      `remainingMs` teď nezávisle ubývá o `deltaMs * timeScale` místo odvození z
      `elapsedMs`, nikdy neskáče nahoru. Testy v `stressTimeScale.test.ts` a
      `tickStressTimeScale.test.ts`.
- [x] `right_hallway` teď má vlastní monster snímky (03/05/07/10 přejmenované,
      `CAMERA_ASSETS` aktualizováno) — dřív mělo prázdné `monster: []`
- [x] Jemný kamerový drift v detailu kamery (`game/cameras/cameraMotionConfig.ts`,
      `.camera-image-motion` v `styles/pixel.css`) — pomalý pan+zoom tam a zpátky,
      vypnutelné/laditelné jedním configem, bezpečné díky `object-cover` + `overflow:
      hidden`, který `CameraView.tsx` už měl
- [x] Nízký konec heartbeat `SLOW_VOLUME_CURVE` zvednutý (stress 20 byl po playtestu úplně
      neslyšitelný, i po HEARTBEAT_VOLUME_MULTIPLIER) — 0.1/0.22/0.42 -> 0.28/0.38/0.5
- [x] Kamerový drift doladěný po playtestu: o 30 % rychlejší (18000 -> 12600 ms na směr) a
      větší horizontální posun (`panXPercent` 1.5 -> 2.2, `zoom` 1.03 -> 1.05, aby zůstala
      zachovaná bezpečná rezerva)
- [x] Night scaling — základ pro ztěžování podle přežitých nocí, nezávislý na difficulty
      (`game/difficulty/nightScaling.ts`, `computeNightScaling`) — první pravidlo: energy
      drain +5 % za noc, capnuté na +20 % od noci 5 dál. Napojené do `applyPowerDelta` přes
      nové volitelné `TICK.currentNight` pole (stejný vzor jako `stressLevel`). Testy v
      `nightScaling.test.ts` a `tickNightScaling.test.ts`.
- [x] Základ pro žárovky — persistentní `bulbsRemaining` (`game/core/bulbInventory.ts`,
      `bulbsConfig.ts`, `startingCount: 10`), přenáší se mezi nocemi/smrtí beze změny; od
      kroku 4 ji dokončená ruční výměna snižuje o 1 (viz níže). Zobrazeno jako "Žárovky: X"
      v `PowerMeter.tsx` a v DEV panelu. Testy v `bulbInventory.test.ts` (fake `localStorage`
      přes `vi.stubGlobal`, projekt zatím nemá jsdom).
- [x] Diagnostika pohybu monstra + rozšířený DebugPanel (viz `docs/monster-movement-debug.md`)
      — nový `game/core/enemyDebugInfo.ts#buildEnemyDebugInfo`, DebugPanel teď ukazuje route/
      branch/watched/verification/door-consequence. Čistě diagnostické, žádná herní logika
      se nezměnila.
- [x] `monster_check_or_return` trest zmírněný: otevření dveří bez ověření teď vrátí
      monstrum do `"door_hallway"` (hráč má ještě šanci zavřít), ne rovnou na `"at_door"`
      (dřív působilo jako nefér teleport). DebugPanel text upraven. Testy v
      `difficulty.test.ts` aktualizované.
- [x] `door_hallway` kamera má speciální snímek pro `enemyStage === "at_door"`
      (`door_hallway_10_monster_at_door.webp` / světlá varianta) — přednost před běžným
      monster/normal cyklováním, viz `getCameraImageSrc` v `cameraAssets.object13.ts`. Testy
      v `cameraAssets.object13.test.ts`.
- [x] `fleeing_monster` kamerový asset — vizuální potvrzení neověřeného ústupu monstra
      (`monsterRetreatedTo`/`monsterRetreatVerified`), na kameře odpovídající retreat
      destinaci se místo obyčejné monster fotky ukáže "monstrum ustupuje", dokud hráč ústup
      neověří (stejná logika ověření jako dřív, beze změny reduceru). Přednost před běžným
      monster snímkem, fallback na něj, chybí-li fleeing asset pro danou kameru. Testy v
      `cameraAssets.object13.test.ts`.
- [ ] Budoucí retreat workflow: při úspěšném door + light repel by mohlo monstrum postupně
      utíkat přes kamery (`door_hallway` fleeing → `left`/`right_hallway` fleeing podle
      aktivní trasy → `outer_yard` fleeing → `outside`), a po dosažení `outside` dostat
      dočasný "safe cooldown" (např. 10 s), kdy se hned nevrací ke dveřím. Zatím
      neimplementováno, jen zapsáno jako návrh — asset kategorizace (`fleeing`) je na tohle
      už připravená.
- [x] Žárovky krok 2 — životnost žárovky u dveří (`game/core/roomBulbs.ts`,
      `roomBulbs.nearRoom`, výchozí 30 s z `BULBS_CONFIG.defaultLifetimeMs`). Ubývá jen při
      reálném svícení (`isNearRoomLightActive`), praskne na 0 (`bulbBreakSeq` audio přes nový
      `bulb_break` event), přenáší se mezi nocemi beze změny (žádné plošné resetování na
      30 s). Denní servis po přežité směně vymění jen SKUTEČNĚ prasklé žárovky
      (`applyDailyBulbService`), ne slabé-ale-neprasklé. Kamera `door_hallway` nikdy
      neukáže osvětlenou variantu s prasklou žárovkou. Ruční výměna hráčem/ikonka/
      4s hold/nákup/sponzoring zatím záměrně chybí (další krok). Testy v
      `roomBulbs.test.ts`, `roomBulbsStorage.test.ts`, `tickRoomBulbs.test.ts`.
- [x] Žárovky krok 3 — ruční výměna prasklé žárovky v `DoorView` (`GameState.bulbReplacement`,
      `START_BULB_REPLACEMENT`, `BULB_REPLACE_DURATION_MS`, 10 s od kroku 4). Jen s otevřenými dveřmi,
      riziko trvá celou dobu (zavření dveří nebo odchod z `DoorView` výměnu zruší beze
      opravy). Smrt během výměny má vlastní `bulb_replacement_attack` death reason/text.
      Nákup žárovek/sponzoring zůstávají mimo rozsah. Testy v `bulbReplacement.test.ts`.
- [x] Žárovky krok 4 — oprava tří nedostatků ruční výměny: (1) `bulbsRemaining` teď žije v
      `GameState` (viz `createInitialGameState`/`START_SHIFT`/`RESTART_SHIFT` override, stejný
      vzor jako `roomBulbs`) a `updateBulbReplacement` v `gameReducer.ts` ho při úspěšném
      dokončení sníží o 1 (optional pole na `BulbReplacementTickResult`, stejný "absent dokud
      se nemění" vzor jako `roomBulbs`, jinak by spread v `TICK`u klobůčkoval jinou aktualizaci
      — viz komentář u typu). `START_BULB_REPLACEMENT` navíc odmítne start s `bulbsRemaining
      <= 0`. (2) Výměna teď vyžaduje držení tlačítka — `DoorView.tsx` používá
      `onPointerDown`/`onPointerUp`/`onPointerLeave`/`onPointerCancel` místo `onClick`, nová
      akce `CANCEL_BULB_REPLACEMENT` (no-op mimo aktivní výměnu) resetuje progress na 0 beze
      změny `bulbsRemaining`/`broken`. (3) Ikonka se podle `progressRatio` (nová čistá
      `computeBulbReplacementProgressRatio` v `game/core/bulbReplacementProgress.ts`, testy v
      `bulbReplacementProgress.test.ts`) postupně rozsvěcí (`brightness`/`opacity`/`box-shadow`
      inline styl). `app/play/page.tsx` teď čte/persistuje `bulbsRemaining` ze `state`, ne z
      lokálního React state — win-service (`applyDailyBulbService`) bere živou `state.
      bulbsRemaining`, ne stará data z localStorage, ať nepřebije spotřebu z týhle směny.
      Testy rozšířené v `bulbReplacement.test.ts`.
- [x] Doba držení pro výměnu žárovky prodloužena z 5 s na 10 s (`BULB_REPLACE_DURATION_MS`,
      `game/balancing/constants.ts`) — jediná číselná konstanta, žádná další logika se
      neměnila. Testy s pevnými `progressMs` hodnotami přepsané na `BULB_REPLACE_DURATION_MS -
      1000`, ať dál sedí na jakoukoliv budoucí délku.
- [x] Žárovky krok 5 — feedback po úspěšné výměně: nový `GameState.bulbReplaceSuccessSeq`
      (stejný "seq" vzor jako `bulbBreakSeq`), zvyšuje ho výhradně completion větev
      `updateBulbReplacement` (ne start, cancel, ani smrt). `app/play/page.tsx` na jeho změnu
      přehraje nový audio event `bulb_replace_success` (`game/audio/audioEvents.ts`,
      `audioConfig.ts` — krátký pozitivní "vzum" sine sweep fallback, ~0.3 s, žádný reálný
      soubor zatím neexistuje). `DoorView.tsx` na stejnou změnu (lokální React
      timeout, `BULB_REPLACE_SUCCESS_MESSAGE_MS = 1800`) na chvíli zobrazí "Žárovka
      vyměněna." (`content/copy.ts`, `bulbReplaceSuccessLabel`) jako `pointer-events-none`
      hlášku mimo door hotspot. Testy rozšířené v `bulbReplacement.test.ts`.
- [x] Žárovky krok 6 — preventivní výměna kdykoliv, ne jen po prasknutí (`gameReducer.ts`
      `canReplaceBulb`, nová sdílená podmínka bez `roomBulbs.nearRoom.broken` guardy —
      "zásobníková" mechanika, stará žárovka se vždy zahodí, žádná zbývající životnost se
      nešetří). Ikonka v `DoorView.tsx` je teď trvale viditelná (mizí jen během
      `doorDeathReveal`) a mimo aktivní výměnu ukazuje opotřebení přes novou
      `computeNearRoomBulbWearRatio` (`game/core/roomBulbs.ts`, 0 prasklá/vybitá .. 1 nová).
      Text zůstává jednotný "Vyměnit žárovku" bez ohledu na stav. Testy rozšířené v
      `bulbReplacement.test.ts` (start na neprasklé žárovce při vysoké i nízké životnosti,
      completion vždy resetuje na `maxMs`).
- [x] Reálné audio doplněno: `monster_retreat_roar.mp3`, `bulb_break.mp3`, `blackout_howl.mp3`
      (uživatelem dodané soubory, zesílené/zkonvertované) nahradily syntetizované fallbacky.
      Poslední fáze blackoutu (dřív `blackout_door_hit`) teď místo nového zvuku jen plynule
      doztiší ambient úplně (`BLACKOUT_FINAL_AMBIENCE_FADE_MS`) — `blackoutDoorHit` event
      odstraněný z `AUDIO_EVENTS`/`audioConfig.ts`/`soundRegistry.ts` (nepoužitý).
- [x] Generátor `restarting` (omylem restartovaný funkční generátor) teď pípá stejně
      rychle jako `criticalBeeping` (dřív potichu) a přidává vyšší stres bonus (+40,
      `GENERATOR_RESTART_STRESS_BONUS`) než skutečná porucha (+20) — vlastní chyba bolí víc
- [ ] Playtest a doladění balancu (šance postupu nepřítele, retreatChance, spotřeba
      energie, rychlost dobíjení, časové okno poruchy generátoru, tempo kritického
      pípání, rozsah doorHoldRangeMs, doorLightRepelRequiredMs, restartPenaltyMs,
      délka blackoutu a jeho fází, LOADING_SCREEN_DURATION_MS)
- [ ] Ověřit, jestli `enemy_near` (hraje globálně při `at_door`/`attack`, nezávisle na
      tom, kterou kameru zrovna sleduješ) je záměr, nebo má být vázané na aktivní kameru
- [ ] Ruční test na skutečném mobilu (ne jen zmenšené okno v desktop prohlížeči):
      - přepínání desk → door → desk a desk → generator → desk prstem
      - klik na dveře/generátor v DoorView/GeneratorView
      - kamerová mřížka monitorů (`CameraMonitorGrid`) při 4 kamerách, klik na monitor a
        zpět na přehled (`CameraDetailView`)
      - žádný hotspot není nalepený na okraj displeje (notch/safe area u `viewportFit: cover`)

- [x] Discord login — základ identity hráče pro budoucí žebříček (viz TECH_DESIGN.md
      "Discord login"). Adaptováno z osmaliga.cz (`lib/auth/session.ts` — vlastní HMAC session
      cookie, žádná knihovna). `app/api/auth/{login,callback,logout,me}/route.ts`,
      `components/auth/AuthStatus.tsx` (nenápadný login box v `MainMenuScreen.tsx`). Zatím
      NENÍ: DB tabulka `players`, leaderboard, ukládání výsledků směny, vzkazy hlídačů — to
      jsou samostatné další kroky. Hra jde hrát beze změny i bez přihlášení; chybějící
      Discord/AUTH_SECRET config login tiše no-opne (`?auth=config_error`), build/typecheck
      beze změny.
- [x] `/leaderboard` — první verze žebříčku hlídačů, jen frontend + mock data (viz
      TECH_DESIGN.md "Žebříček hlídačů"). `GuardLeaderboardEntry`
      (`lib/leaderboard/types.ts`), 10 pevných záznamů v `lib/leaderboard/mockLeaderboard.ts`
      za `getLeaderboardEntries()` (async signatura, ať pozdější náhrada za API nevyžaduje
      změnu volajícího `app/leaderboard/page.tsx`). Nenápadný odkaz v `MainMenuScreen.tsx`.
      Žádné API, DB, ani ukládání výsledků směny zatím nepřibylo.

## Další kroky po MVP

- Discord login krok 2 — DB tabulka `players` (id, discord_user_id, username, display_name,
  avatar_url, created_at, updated_at, last_login_at), upsert v `app/api/auth/callback/route.ts`
  (dnes jen podepsaná cookie, žádná perzistence hráče)
- Žebříček krok 2 — API endpoint + DB tabulka pro skutečné výsledky směn, náhrada
  `lib/leaderboard/mockLeaderboard.ts` za reálný dotaz, ukládání runu po smrti/výhře, vzkazy
  hlídačů — všechno explicitně mimo rozsah prvních dvou kroků (viz TECH_DESIGN.md "Discord
  login" a "Žebříček hlídačů")
- Skutečná pixel-art grafika (sprity pro místnost, kamery, nepřítele, generátor)
- Vlastní/kvalitnější audio místo Kenney.nl CC0 placeholderů (zejména `ambience_loop`,
  který teď je jen krátký smyčkovaný efekt, ne skutečná ambientní kompozice); doplnit
  reálné soubory `generator_beep.mp3`, `heartbeat.mp3`,
  `monster_retreat_roar.mp3`, `blackout_howl.mp3` a `blackout_door_hit.mp3` (zatím jen
  konfigurace + syntetizovaný fallback, viz `assets/audio/README.md`)
- Druhá směna (`night02.ts`) s jiným nepřítelem/balancem
- Dynamická vrstvená ambience podle `tensionLevel`
- Vylepšený jumpscare (delší/výraznější sekvence, ne jen barevný flash)
- Ukládání nejlepšího výsledku / progressu do localStorage
- Nastavení hlasitosti (ne jen mute/unmute)
- Přeskočitelný LoadingScreen
- `cameraFocusMs` počítaný podle napětí/energie/generátoru místo pevné hodnoty
- Vizuálně dopracované fáze blackoutu (dnes jen text, žádná speciální animace/efekt navíc)
- Skutečná vrstva inzerce nočních provozů (nabídky práce, partnerství, sponzoring) —
  `/about` zatím jen textově avizuje, žádný formulář/portál/databáze
- Skutečný kontaktní formulář na `/about` místo `mailto:` odkazu

## Explicitně odložené věci

- Platby, Patreon
- Databáze (Discord login zatím jen v podepsané cookie, žádná DB tabulka — viz "Další kroky po MVP")
- Editor kampaní, více kampaní
- 3D grafika
- Multiplayer
- Složitý backend
- Velký lore systém
- Pracovní portál / skutečná inzerce nočních provozů — na `/about` je to zatím jen text,
  žádný formulář, výpis nabídek, platby ani administrace; explicitně NENÍ součástí MVP
- Generický engine pro všechno (vznikne postupně z první hratelné směny)
- Složitá procedurální mapa
