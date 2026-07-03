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
energii, spotřebu energie po systémech, definici nepřítele, seznam kamer a tempo tiku
nepřítele. Konkrétní směna (`game/nights/night01.ts`) je jen konfigurační objekt.

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

`GameState` obsahuje: aktuální obrazovku, čas směny, energii, stav dveří/světla/kamer,
stage nepřítele a důvod smrti. Vytváří ho `createInitialGameState(night)`.

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
