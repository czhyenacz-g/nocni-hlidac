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
      `aspect-video`, `object-contain`, max. šířka `min(100%, 1100px)`) drží obrázek dveří a
      hotspot ve stejném procentuálním souřadnicovém systému, takže hotspot při zoomu
      prohlížeče / resize okna / libovolném poměru stran zůstává přesně na dveřích (dřív se
      mohl rozjet, protože `bg-cover` škáluje obrázek podle celé šířky obrazovky nezávisle na
      vnitřním obsahu). `GameScreen.tsx` pro `playerView === "door"` `SceneBackground` vůbec
      nerenderuje. Ostatní obrazovky (menu/about/win/death/loading/desk/generator) beze změny.
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
- [x] `/dev-sound` — dev stránka se seznamem všech audio eventů (`game/audio/audioEvents.ts`),
      popisem, souborem/fallbackem a tlačítkem přehrát (`app/dev-sound/`, gatované
      `DEBUG_PANEL_ENABLED`)
- [x] Generátor pípání o 30 % tišší (`generator_beep` 0.6/0.8 -> 0.42/0.56)
- [x] Útok u dveří: krok slyšet zřetelně před jumpscare, ne najednou (`enemy_step` ->
      ~220 ms odklad -> `jumpscare`, viz AUDIO_DESIGN.md "Útok u dveří")
- [x] Odstraněna neplatná mobilní hláška „otoč telefon na šířku“ (`MobileLandscapeHint.tsx`
      přestal být použitý, `.mobile-landscape-hint` CSS smazáno — hra je cílená na portrait)
- [x] Footer (`components/Footer.tsx`) s odkazem na `/about`, jen na MainMenuScreen a
      `/about` — ne na herních obrazovkách, ať nic neruší
- [x] `/about` stránka — kdo za projektem stojí, pocta nočním pracovníkům, textová
      avizace budoucí důstojné inzerce/sponzoringu (žádný formulář/backend)
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

## Další kroky po MVP

- Skutečná pixel-art grafika (sprity pro místnost, kamery, nepřítele, generátor)
- Vlastní/kvalitnější audio místo Kenney.nl CC0 placeholderů (zejména `ambience_loop`,
  který teď je jen krátký smyčkovaný efekt, ne skutečná ambientní kompozice); doplnit
  reálné soubory `generator_beep.mp3`, `generator_warning_beep.mp3`,
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

- Platby, Discord login, Patreon
- Databáze
- Editor kampaní, více kampaní
- 3D grafika
- Multiplayer
- Složitý backend
- Velký lore systém
- Pracovní portál / skutečná inzerce nočních provozů — na `/about` je to zatím jen text,
  žádný formulář, výpis nabídek, platby ani administrace; explicitně NENÍ součástí MVP
- Generický engine pro všechno (vznikne postupně z první hratelné směny)
- Složitá procedurální mapa
