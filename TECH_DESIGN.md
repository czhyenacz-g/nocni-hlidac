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

`game/cameras/cameras.object13.ts` — pole `CameraDefinition` (id, popisek, na jaké stage
trasy nepřítele je na dané kameře vidět). Kamery jsou svázané s konkrétním objektem
(Objekt 13), další lokace by měly vlastní soubor v `game/cameras/`.

## Definice nepřítele

`game/enemies/basicIntruder.ts` — `EnemyDefinition` (trasa, šance na postup, násobitel při
sledování, jak dlouho vydrží u zavřených dveří, než se resetuje). Další typy nepřátel budou
další soubory ve stejné složce.

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
- `components/game/DoorView.tsx` — samotné dveře (klik = `TOGGLE_DOOR`) + šipka
  zpět na stůl.
- `components/game/GeneratorView.tsx` — generátor s vizuální kontrolkou
  (`.pixel-indicator` v `styles/pixel.css`, stav podle `data-state`), klik =
  `RESTART_GENERATOR` + šipka zpět na stůl.
- `components/game/ViewSwitchArrow.tsx` — sdílená malá komponenta pro všechny
  šipky (parametrizovaná textem a směrem), místo skoro identických souborů.
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
