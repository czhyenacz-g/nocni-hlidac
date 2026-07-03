# Tech Design

## Architektura

Next.js App Router aplikace. Herní logika je oddělená od UI:

- `game/` — čistá herní logika a data (žádné React komponenty)
- `components/` — čisté prezentační komponenty (dostávají stav a callbacky přes props)
- `content/` — texty
- `styles/` — CSS pro pixel-art vzhled a atmosférické efekty
- `app/play/page.tsx` — jediné místo, kde žije `useReducer` stav hry a kde se propojuje
  reducer, game loop, audio a atmosféra s obrazovkami

## Oddělení UI od herního stavu

- `GameState` (v `game/core/types.ts`) je čistý datový typ, žádné odkazy na React.
- `gameReducer` (v `game/core/gameReducer.ts`) je čistá funkce `(state, action) -> state`,
  parametrizovaná definicí směny (`NightDefinition`) přes `createGameReducer(night)`.
- Komponenty v `components/` nikdy neupravují stav přímo — dostávají hodnoty a callback
  funkce (`onToggleDoor`, `onSelectCamera`, ...) z `app/play/page.tsx`.

## Definice směny/noci

`game/core/types.ts#NightDefinition` popisuje vše, co dělá směnu unikátní: délku, počáteční
energii, spotřebu energie po systémech, rychlost dobíjení energie když hráč nesleduje
kamery (`rechargePerSecondWhenIdle`), balanc generátoru (`generator: GeneratorDefinition`),
definici nepřítele, seznam kamer a tempo tiku nepřítele. Konkrétní směna
(`game/nights/night01.ts`) je jen konfigurační objekt.

## Výpočet energie

`gameReducer.ts#applyPowerDelta` (volané z `TICK`) rozhoduje mezi dvěma režimy podle
`state.cameraOpen && state.playerView === "desk"`:

- **sleduje kamery** → jen odečet (`idle` + `cameraOpen` sazba z `NightDefinition`)
- **nesleduje** → `rechargePerSecondWhenIdle` mínus případná spotřeba zavřených dveří/
  rozsvíceného světla; výsledek může být kladný (dobíjení) i záporný (spotřeba
  dveří/světla dobíjení přebije)

Když je `state.generatorState === "criticalBeeping"`, k odečtu se v obou režimech
navíc přičte pevná `2 * rates.doorClosed + rates.lightOn` (počítáno ze sazeb v
`NightDefinition`, ne z aktuálního stavu dveří/světla).

Výsledek je vždy oříznutý na `[0, MAX_POWER]`. Celý výpočet je v reduceru — UI
(`PowerMeter.tsx`) jen vykresluje `state.power`, nic nepočítá.

## Definice kamer

`game/cameras/cameras.object13.ts` — pole `CameraDefinition` (`id`, `label`, volitelně
`description`, `order`, `type`, a `enemyVisibleAtStage` — na jaké stage trasy nepřítele je
na dané kameře vidět). Kamery jsou svázané s konkrétním objektem (Objekt 13), další lokace
by měly vlastní soubor v `game/cameras/`.

### Kamery jsou konfigurační, nikdy hardcoded

`CameraPanel.tsx` a `CameraView.tsx` vždy renderují ze seznamu, který dostanou přes props
(`night.cameras`) — nikde v UI není napsaný konkrétní camera id ani jejich počet. Kolik
kamer a v jaké kombinaci má daná směna k dispozici, určuje výhradně
`NightDefinition.cameras` (+ `defaultCameraId` pro přednastavenou kameru při startu). Nová
směna může mít jiný počet i jiné kamery, aniž by se muselo sáhnout do `components/game/`.
`CameraPanel.tsx` řadí kamery podle `order` (kamery bez `order` jdou na konec, v pořadí,
jak přišly z konfigurace) a rozestavuje je do 2sloupcové mřížky podle `CameraDefinition.position`
(`"left"`/`"right"` vedle sebe ve stejné řadě, `"center"`/bez pozice přes celou šířku) — čistě
vizuální hint, žádná herní logika na `position` nestaví.

## Definice nepřítele

`game/enemies/basicIntruder.ts` — `EnemyDefinition` (varianty trasy, šance na postup,
násobitel při sledování, šance na ústup, rozsah čekání u zavřených dveří než se resetuje a
jeho zrychlení světlem). Další typy nepřátel budou další soubory ve stejné složce.

### Varianty trasy (`routeVariants` / `state.enemyRoute`)

`EnemyDefinition.routeVariants: EnemyStage[][]` — víc celých tras (u `basicIntruder` dvě,
pravou a levou chodbou). `gameState.ts#pickRouteVariant` jednu náhodně vylosuje při startu
směny (`createInitialGameState`) a uloží do `state.enemyRoute` — po zbytek směny se používá
jen ona, neřeší se to znovu při každém kroku. Reducer (`ENEMY_ADVANCE`) pracuje výhradně s
`state.enemyRoute`, nikdy s `night.enemy.routeVariants` přímo.

### Pravděpodobnostní pohyb (`retreatChance`)

`ENEMY_ADVANCE` (mimo standoff u dveří, viz níže) vygeneruje jeden náhodný roll a rozhodne
mezi třemi možnostmi porovnáním s kumulativní pravděpodobností:

- `roll < advanceChance` (po zohlednění `watchedAdvanceMultiplier`) → postup o index dál
- `roll < advanceChance + retreatChance` → ústup o index zpět, s `Math.max(currentIndex - 1,
  0)` — na první pozici trasy tedy nemá kam ustoupit a `decision` se přepíše na `"stay"`
- jinak → zůstává na místě

Výsledek (`"advance" | "stay" | "retreat"`, plus `"waiting_at_door"` / `"gave_up"` /
`"attack"` ze standoff větve) se ukládá do `state.lastEnemyDecision` — čistě pro
`DebugPanel.tsx`, žádná další logika na něm nestaví. Retreat i advance sdílí stejné pole
`state.enemyRoute` — funguje to i pro budoucího nepřítele s jinou trasou/kombinací
pravděpodobností beze změny reduceru.

### Standoff u zavřených dveří (`doorHoldRangeMs` / `doorHoldLightAccelMultiplier`)

Tuto větev spouští stage `"at_door"` — samostatný stav trasy, který **není** kamera (na
rozdíl od dřívějšího `"camera_03_door"`, kdy stage a camera id byly stejný string). Vizuálně
je `at_door` doména `DoorView.tsx`, ne kamer — viz "Kamery jsou konfigurační" výše.

`gameReducer.ts#rollDoorHoldTargetMs` vylosuje při prvním příchodu ke dveřím (v
`ENEMY_ADVANCE`, kdy `enemyDoorHoldTargetMs` je ještě `null`) cíl v `enemy.doorHoldRangeMs`
(6000–8000 ms u `basicIntruder`) a uloží ho do `state.enemyDoorHoldTargetMs`. Každý další
tik, dokud jsou dveře zavřené, se `state.enemyDoorHoldProgressMs` zvyšuje o
`night.enemyTickMs * (state.lightOn ? doorHoldLightAccelMultiplier : 1)` — se zapnutým
světlem tedy roste 2× rychleji. Jakmile `progress >= target`, nepřítel se vzdá
(`enemyStage: "outside"`), oboje se vynuluje na `null`/`0`. Díky tomu, že se srovnává
akumulovaný `progress` (ne wall-clock čas), zapnutí/vypnutí světla uprostřed čekání mění
efektivní rychlost okamžitě, ne až při dalším standoffu.

## Game loop

`game/core/gameLoop.ts#useGameLoop` je React hook, který za běhu směny (`isRunning`)
dispatchuje dvě nezávislé smyčky:

- `TICK` každých `GAME_TICK_MS` (100 ms) — posouvá čas a energii
- `ENEMY_ADVANCE` každých `night.enemyTickMs` — vyhodnocuje postup nepřítele

Obě jsou samostatné `setInterval`, aby tempo nepřítele šlo ladit nezávisle na tempu
odpočtu energie/času.

## Stav hry

`GameState` obsahuje: aktuální obrazovku, čas směny, energii, pohled hráče
(`playerView`), stav dveří/světla/kamer, stage nepřítele a důvod smrti. Vytváří ho
`createInitialGameState(night)`.

## Pohled hráče (DeskView / DoorView / GeneratorView)

`GameState.playerView: "desk" | "door" | "generator"` řídí, co je zrovna
klikatelné — nejde jen o vizuální přepínač: `TOGGLE_DOOR` funguje jen když
`playerView === "door"` a `RESTART_GENERATOR` fakticky jen mění stav (mimo
`"generator"` pohled na to hráč nemá odkud kliknout) — obojí vynuceno přímo v
`gameReducer.ts`, ne jen v UI. Akce `LOOK_AT_DOOR` / `LOOK_AT_GENERATOR` /
`LOOK_AT_DESK` mění `playerView`.

- `components/game/DeskView.tsx` — kamery + světlo + šipky na dveře a na
  generátor (`ViewSwitchArrow`). Dveře ani generátor tu nejsou vůbec vykreslené.
  Šipka na generátor dostává `urgent={state.generatorState !== "normal"}`.
- `components/game/DoorView.tsx` — samotné dveře (klik = `TOGGLE_DOOR`) + šipka
  zpět na stůl.
- `components/game/GeneratorView.tsx` — generátor s vizuální kontrolkou
  (`.pixel-indicator` v `styles/pixel.css`, stav podle `data-state`), klik =
  `RESTART_GENERATOR` + šipka zpět na stůl.
- `components/game/ViewSwitchArrow.tsx` — sdílená malá komponenta pro všechny
  šipky (parametrizovaná textem, směrem a volitelným `urgent` — bliká přes
  `.pixel-button[data-urgent="true"]` v `styles/pixel.css`), místo skoro
  identických souborů.
- `components/screens/GameScreen.tsx` jen vybírá, který z pohledů vykreslit podle
  `state.playerView` — sama žádnou herní logiku neobsahuje.
- `components/game/DoorControl.tsx` (původní jedno tlačítko dveří) je teď DEV-only —
  používá ho jen `DebugPanel.tsx`, který při kliknutí odešle `LOOK_AT_DOOR` a hned
  `TOGGLE_DOOR` za sebou (simuluje běžný dvoukrok, nic v reduceru neobchází).
  Stejný vzor (`LOOK_AT_GENERATOR` + `RESTART_GENERATOR`) má `DebugPanel.tsx` i
  pro generátor.

## Generátor

`GameState.generatorState: "normal" | "silentFault" | "criticalBeeping"` a k
tomu čtyři pomocná pole (`generatorNextBeepAtMs`, `generatorBeepSeq`,
`generatorSilentSinceMs`, `generatorFaultAtMs`, `generatorFaultCount`) — vše v
`game/core/types.ts`. Balanc (intervaly pípání, délka ticha, časové okno
poruchy) je v `NightDefinition.generator` (`game/nights/night01.ts`).

- `game/core/gameState.ts#rollGeneratorFaultAtMs` vylosuje při startu směny
  jeden okamžik poruchy v okně `[faultEarliestAtMs, faultLatestAtMs]` — jediné
  místo, kde se pro tuto mechaniku volá `Math.random()`.
- `game/core/gameReducer.ts#updateGenerator` (volané z `TICK`) je čistá funkce,
  která podle `elapsedMs`: spustí poruchu (nejvýš `generator.faultMaxPerShift`
  za směnu), po `silentGraceMs` přepne ticho na kritické pípání, a plánuje
  další pípnutí (`beepIntervalMs` v `normal`, `criticalBeepIntervalMs` v
  `criticalBeeping`) přes `generatorNextBeepAtMs`. Žádné audio se tu nevolá.
- `generatorBeepSeq` se při každém pípnutí zvýší o 1 — `app/play/page.tsx`
  sleduje jeho změnu přes `useRef` (stejný vzor jako `doorClosed`/`lightOn`) a
  podle aktuálního `generatorState` přehraje `generatorBeep` nebo
  `generatorWarningBeep` (viz `AUDIO_DESIGN.md`).
- `RESTART_GENERATOR` funguje v obou poruchových stavech, vrátí `normal` a
  naplánuje další normální pípnutí za `beepIntervalMs` od teď; v `normal` je
  no-op.

## Mobilní tap targety

Stabilizační vrstva nad existujícím UI, ne nový design — cíl je, aby se na mobilu dalo
pohodlně prstem trefit do všech důležitých prvků, ne aby hra na mobilu vypadala jinak.

- `.tap-target` (min. 44×44 px) — obecné akce: tlačítka kamer, "Zavřít kamery", světlo,
  zvuk, restart/menu/zkusit znovu.
- `.tap-target-critical` (min. 56×56 px) — kritické herní akce: klik na dveře (`DoorView`)
  a na generátor (`GeneratorView`). Obě tyhle plochy jsou navíc `h-48` (192 px), takže
  `.tap-target-critical` je tu jen sémantická pojistka, ne to, co reálně určuje velikost.
- `.view-hotspot` + `.pixel-arrow-button` — šipky pro přepnutí pohledu (`ViewSwitchArrow.tsx`,
  min. 48 px výška). Hotspot je vždy plocha `<button>`, ne jen viditelný text — padding dělá
  klikací zónu větší než sám text.
- `.mobile-landscape-hint` — čistě CSS doporučení otočit telefon (`@media (orientation:
  portrait) and (max-width: 820px)`), žádná JS detekce zařízení. Komponenta
  `MobileLandscapeHint.tsx` jen vykresluje text, CSS řídí kdy je vidět.
- `DebugPanel.tsx` je skrytý pod `lg` breakpointem (Tailwind `hidden lg:block`) — je to dev
  nástroj, na mobilu by jen zabíral místo a mohl překrývat skutečné ovládání. I na desktopu
  je to nativní `<details>`/`<summary>` bez `open` — defaultně sbalené, žádný extra React
  state jen na to, jestli je vidět.
- `viewport` export v `app/layout.tsx` (`width: device-width, initialScale: 1`) — bez něj by
  mobilní prohlížeč mohl stránku defaultně oddálit a tap targety by v praxi vyšly menší, než
  kolik mají v CSS pixelech.

Vše je čisté CSS/Tailwind classes na existujících elementech — žádná herní logika se
nepřesunula do CSS a nevznikla samostatná mobilní verze komponent.

## Restart směny

Akce `RESTART_SHIFT` vytvoří nový `createInitialGameState(night)` (zachová jen nastavení
zvuku — `audioMuted`) a rovnou přepne obrazovku na `playing`.

## Jak přidat další směnu později

1. Vytvoř `game/nights/night02.ts` s vlastní `NightDefinition` (může mít jiné kamery,
   jiného nepřítele, jiný balanc).
2. Případně přidej nového nepřítele do `game/enemies/` a/nebo nové kamery do
   `game/cameras/`.
3. V místě, kde se dnes používá `NIGHT_01` (aktuálně `app/play/page.tsx`), přidej výběr
   směny (např. podle route parametru `app/play/[nightId]/page.tsx`) místo natvrdo
   importované `NIGHT_01`.
4. Reducer (`createGameReducer`) i loop (`useGameLoop`) už jsou parametrizované definicí
   směny — není potřeba je měnit.
