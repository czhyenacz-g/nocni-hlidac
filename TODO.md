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
      `.view-hotspot`), `.mobile-landscape-hint`, DebugPanel skrytý pod `lg`, viewport meta
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
      - kamera tlačítka v CameraPanel při 4 kamerách (zalomení na užší obrazovce)
      - `.mobile-landscape-hint` se objeví v portrait a zmizí v landscape
      - žádný hotspot není nalepený na okraj displeje (notch/safe area u `viewportFit: cover`)

## Další kroky po MVP

- Skutečná pixel-art grafika (sprity pro místnost, kamery, nepřítele, generátor)
- Vlastní/kvalitnější audio místo Kenney.nl CC0 placeholderů (zejména `ambience_loop`,
  který teď je jen krátký smyčkovaný efekt, ne skutečná ambientní kompozice); doplnit
  reálné soubory `generator_beep.mp3`, `generator_warning_beep.mp3`,
  `monster_retreat_roar.mp3` a `blackout_howl.mp3` (zatím jen konfigurace +
  syntetizovaný fallback, viz `assets/audio/README.md`)
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
