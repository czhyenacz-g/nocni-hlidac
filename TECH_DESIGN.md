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

Když `power <= 0`, `TICK` už nekončí smrtí — přepne `state.gameStatus` na `"blackout"`
(vynuluje `blackoutElapsedMs`, vynutí `doorClosed: false`, `lightOn: false`,
`cameraOpen: false`) a `applyPowerDelta`/`updateGenerator`/`updateDoorLightRepel` se
od té chvíle vůbec nevolají — viz "Blackout" níže.

## Definice kamer

`game/cameras/cameras.object13.ts` — pole `CameraDefinition` (`id`, `label`, volitelně
`description`, `order`, `type`, a `enemyVisibleAtStage` — na jaké stage trasy nepřítele je
na dané kameře vidět). Kamery jsou svázané s konkrétním objektem (Objekt 13), další lokace
by měly vlastní soubor v `game/cameras/`.

### Kamery jsou konfigurační, nikdy hardcoded

`CameraPanel.tsx`, `CameraMonitorGrid.tsx`, `CameraMonitorTile.tsx`, `CameraDetailView.tsx` a
`CameraView.tsx` vždy renderují ze seznamu, který dostanou přes props (`night.cameras`) —
nikde v UI není napsaný konkrétní camera id ani jejich počet. Kolik kamer a v jaké kombinaci
má daná směna k dispozici, určuje výhradně `NightDefinition.cameras` (+ `defaultCameraId` pro
přednastavenou kameru při startu). Nová směna může mít jiný počet i jiné kamery, aniž by se
muselo sáhnout do `components/game/`. `CameraMonitorGrid.tsx` řadí kamery podle `order`
(kamery bez `order` jdou na konec, v pořadí, jak přišly z konfigurace) a vykresluje je do
jednotné 2sloupcové mřížky (4 kamery → 2×2) — `CameraDefinition.position` se pro tuto mřížku
nekonzumuje (zůstává jen jako připravená dokumentační metadata), viz "Kamerový panel:
overview/detail" níže.

### Kamerový panel: overview/detail (`cameraViewMode`)

Na rozdíl od dřívějších čtyř tlačítek má kamerový panel dva režimy,
`GameState.cameraViewMode: "overview" | "detail"`:

- `CameraPanel.tsx` je čistý wrapper bez vlastní herní logiky — podle
  `cameraViewMode` vykreslí buď `CameraMonitorGrid.tsx` (overview), nebo
  `CameraDetailView.tsx` (detail, obaluje existující `CameraView.tsx` +
  `ViewSwitchArrow` jako tlačítko "Zpět na přehled").
- `CameraMonitorTile.tsx` v overview **nedostává** `enemyStage` ani žádný jiný
  herní stav — schválně zobrazuje jen `camera.label` + statický šum, žádný
  živý obraz. To je záměrné: overview nesmí prozrazovat, kde je nepřítel.
- Klik na monitor dispatchuje existující `OPEN_CAMERA` akci (žádná nová akce
  nebyla potřeba) — `gameReducer.ts` teď navíc nastaví `cameraViewMode: "detail"`
  vedle původního `cameraOpen: true` / `activeCameraId` / `cameraFocusUntilMs`.
- Tlačítko "Zpět na přehled" dispatchuje existující `CLOSE_CAMERAS` — reducer
  teď nastaví `cameraViewMode: "overview"` vedle `cameraOpen: false` a
  `activeCameraId: null`. Stejná úprava (`cameraViewMode: "overview"`) je
  doplněná všude, kde reducer dřív nuceně zavíral kamery: `LOOK_AT_DOOR`,
  `LOOK_AT_GENERATOR`, vstup do blackoutu (`TICK`, `power <= 0`) — po návratu
  na stůl tak hráč vždy uvidí přehled, nikdy zaseknutý detail.
- **`cameraOpen` je teď true jen v `cameraViewMode === "detail"`.** Díky tomu
  se nemusela měnit žádná navazující logika: `isEnemyBeingWatched` (sleduje
  `state.cameraOpen && state.activeCameraId`) i `applyPowerDelta`
  (`watchingCameras = state.cameraOpen && state.playerView === "desk"`) fungují
  beze změny — overview automaticky **není** aktivní sledování ani "sledování
  kamer" pro spotřebu energie (chová se jako dřívější `cameraOpen: false`,
  žádná extra spotřeba navíc), zpomalení nepřítele platí jen v detailu.
  Balanc spotřeby energie se tím neměnil, jen se přesně namapoval na nový
  overview/detail model.

### Kamera focus/šum (`cameraFocusMs`)

`game/core/cameraFocus.ts#isCameraFocused(state)` je čistě odvozený stav — žádný vlastní TICK.
`OPEN_CAMERA` v `gameReducer.ts` při každém výběru/přepnutí kamery nastaví
`state.cameraFocusUntilMs = state.elapsedMs + night.cameraFocusMs` (700 ms); `isCameraFocused`
pak jen porovná `state.elapsedMs >= cameraFocusUntilMs`, což se samo posouvá s běžícím `TICK`.
`DeskView.tsx` výsledek spočítá a předá jako `focused` prop do `CameraView.tsx` — ta ho jen
zobrazuje (šum + `COPY.game.cameraFocusingLabel`, dokud `!focused`), žádnou logiku sama
neřeší. `cameraFocusMs` je zatím pevná hodnota v `NightDefinition`, ale je to jediné místo,
které by bylo potřeba změnit na funkci `(state, night) => number`, kdyby měl focus delay
později záviset na napětí/energii/generátoru — CameraView by se nemusela měnit vůbec.

## Definice nepřítele

`game/enemies/basicIntruder.ts` — `EnemyDefinition` (varianty trasy, šance na postup,
násobitel při sledování, šance na ústup, rozsah čekání u zavřených dveří než se resetuje,
konfigurace repelu dveře+světlo). Další typy nepřátel budou další soubory ve stejné složce.

`isAtDoorStage(state)` (helper v `gameReducer.ts`) je jediné místo, které rozhoduje, jestli
je nepřítel "u dveří" — dnes `"at_door"`, plus rezervovaná `"breach"` (žádná trasa ji zatím
nepoužívá, ale standoff i door-light repel na ni reagují stejně, takže funguje beze změny
reduceru, až se jednou objeví v `routeVariants`). Nejde o rozpad `at_door` na jemnější kroky
— je to jedna alternativní stage se stejným významem.

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

### Standoff u zavřených dveří (`doorHoldRangeMs`)

Tuto větev spouští `isAtDoorStage(state)` — samostatný stav trasy, který **není** kamera (na
rozdíl od dřívějšího `"camera_03_door"`, kdy stage a camera id byly stejný string). Vizuálně
je `at_door` doména `DoorView.tsx`, ne kamer — viz "Kamery jsou konfigurační" výše.

`gameReducer.ts#rollDoorHoldTargetMs` vylosuje při prvním příchodu ke dveřím (v
`ENEMY_ADVANCE`, kdy `enemyDoorHoldTargetMs` je ještě `null`) cíl v `enemy.doorHoldRangeMs`
(6000–8000 ms u `basicIntruder`) a uloží ho do `state.enemyDoorHoldTargetMs`. Každý další
tik, dokud jsou dveře zavřené, se `state.enemyDoorHoldProgressMs` zvyšuje o
`night.enemyTickMs` — **nezávisle na světle**. Jakmile `progress >= target`, nepřítel se vzdá
(`enemyStage: "outside"`), oboje se vynuluje na `null`/`0`.

Tohle je čistě náhodné vzdání se — pomalé (6–8 s) a nezávislé na tom, jestli svítí světlo.
Kombinovaný efekt dveří+světla řeší úplně samostatný mechanismus, viz níže.

### Door-light repel (`doorLightRepelRequiredMs` / `monsterRetreatRoarSeq`)

Světlo samo o sobě nemá na standoff výše žádný vliv. Jediný efekt světla je nový, oddělený
mechanismus `gameReducer.ts#updateDoorLightRepel`, volaný z **`TICK`** (ne `ENEMY_ADVANCE`) —
proto reaguje v řádu `action.deltaMs` (~100 ms), ne v hrubých skocích po `enemyTickMs` (~2 s).

- Podmínka: `isAtDoorStage(state) && state.doorClosed && state.lightOn`. Pokud neplatí,
  `state.doorLightRepelMs` se okamžitě vynuluje.
- Pokud platí, `state.doorLightRepelMs` roste o `action.deltaMs` každý `TICK`.
- Jakmile dosáhne `enemy.doorLightRepelRequiredMs` (1500 ms u `basicIntruder`): `enemyStage`
  se nastaví na `enemy.monsterRetreatStage` (`"outside"`), `state.monsterRetreatRoarSeq` se
  zvýší o 1, standoff pole (`enemyAtDoorSinceMs`/`enemyDoorHoldTargetMs`/
  `enemyDoorHoldProgressMs`) se vynulují a `lastEnemyDecision` se nastaví na `"light_repelled"`.

`updateDoorLightRepel` nikdy nevolá `audioManager` — jen mění `state.monsterRetreatRoarSeq`.
Zvuk (`monster_retreat_roar`) spouští `app/play/page.tsx` diffingem tohoto čítače, stejný vzor
jako `generatorBeepSeq` u pípání generátoru (viz AUDIO_DESIGN.md).

`isEnemyBeingWatched` navíc teď vyžaduje `state.playerView === "desk"` (ne jen `cameraOpen`) —
dřív mohla zůstat "sledovaná" i po odchodu na `DoorView`/`GeneratorView`, pokud `cameraOpen`
zůstalo `true`. Kvůli tomu `LOOK_AT_DOOR`/`LOOK_AT_GENERATOR` teď navíc rovnou zavírají kamery
(`cameraOpen: false, activeCameraId: null`) — při odchodu od stolu nezůstane žádná "otevřená"
na pozadí, ani vizuálně, ani ve výpočtu sledování/energie.

### Útok u dveří má krátký "reveal" (`doorDeathRevealUntilMs`)

Dřív `ENEMY_ADVANCE` při `isAtDoorStage(state) && !state.doorClosed` nastavilo `screen:
"death"` okamžitě ve stejném dispatchi jako `enemyStage: "attack"`. Teď se smrt nefinalizuje
hned:

- `ENEMY_ADVANCE` nastaví `enemyStage: "attack"`, `deathReason: "door_open_at_attack"`,
  vynutí `playerView: "door"` (+ zavře kamery stejně jako `LOOK_AT_DOOR`) a nastaví
  `doorDeathRevealUntilMs = state.elapsedMs + DOOR_DEATH_REVEAL_DURATION_MS` (700 ms,
  `game/balancing/constants.ts`). `isRunning`/`screen` zůstávají beze změny (`true`/`"playing"`).
- `TICK` má na začátku větev pro `doorDeathRevealUntilMs !== null` (před blackout větví) —
  jen počítá `elapsedMs`/`remainingMs` dál, nic jiného (generátor/energie/door-light repel se
  nepočítají, hra je fakticky rozhodnutá). Jakmile `elapsedMs >= doorDeathRevealUntilMs`,
  finalizuje `isRunning: false, screen: "death"` (`deathReason` už je nastavený).
- Dokud `doorDeathRevealUntilMs !== null`, `TOGGLE_DOOR`/`TOGGLE_LIGHT`/`OPEN_CAMERA`/
  `RESTART_GENERATOR`/`LOOK_AT_DOOR`/`LOOK_AT_DESK`/`LOOK_AT_GENERATOR` jsou no-op (stejný
  guard-styl jako existující `blackout` kontroly, přidaný vedle nich, ne místo nich —
  blackoutové chování se nemění). `ENEMY_ADVANCE` je taky no-op (nepřítel je už "attack",
  žádný další postup nedává smysl).
- Vizuálně: `GameScreen.tsx` počítá `doorBackgroundIndex = isDoorDeathReveal ? 2 :
  (state.doorClosed ? 1 : 0)` pro scénu `BACKGROUND_SCENES.door` (3 snímky: otevřené/
  zavřené/monstrum) — protože je pořád stejná scéna/instance `SceneBackground`, přepnutí na
  index 2 crossfade prolne (`crossfadeMs: 350` u téhle scény, kratší než jinde, ať se stihne
  doprolínat během 700 ms revealu). Pokud hráč nebyl v `DoorView` (byl u kamer/generátoru),
  vynucené `playerView: "door"` ho tam ve STEJNÉM renderu přepne — přechod ze desk/generator
  scény na door scénu je tvrdý střih (různé `SceneBackground` instance), jen samotný nástup
  reveal snímku uvnitř door scény je crossfade.
- Je to čistě lokální mezistav pro tenhle jeden případ (`doorDeathRevealUntilMs`), ne
  univerzální "pre-death" obrazovka — `blackout_timeout` (a jakákoli budoucí jiná smrt) přes
  něj vůbec neprochází, `screen: "death"` se pro ně nastavuje přímo jako dřív.

## Game loop

`game/core/gameLoop.ts#useGameLoop` je React hook, který za běhu směny (`isRunning`)
dispatchuje dvě nezávislé smyčky:

- `TICK` každých `GAME_TICK_MS` (100 ms) — posouvá čas a energii
- `ENEMY_ADVANCE` každých `night.enemyTickMs` — vyhodnocuje postup nepřítele

Obě jsou samostatné `setInterval`, aby tempo nepřítele šlo ladit nezávisle na tempu
odpočtu energie/času.

## Stav hry

`GameState` obsahuje: aktuální obrazovku, čas směny, energii, `gameStatus`/
`blackoutElapsedMs`, pohled hráče (`playerView`), stav dveří/světla/kamer (+
`cameraFocusUntilMs`), stage nepřítele a důvod smrti. Vytváří ho
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

`GameState.generatorState: "normal" | "silentFault" | "criticalBeeping" | "restarting"` a k
tomu pomocná pole (`generatorNextBeepAtMs`, `generatorBeepSeq`,
`generatorSilentSinceMs`, `generatorFaultAtMs`, `generatorFaultCount`,
`generatorRestartUntilMs`) — vše v `game/core/types.ts`. Balanc (intervaly pípání, délka
ticha, časové okno poruchy, délka `restarting` penalizace) je v `NightDefinition.generator`
(`game/nights/night01.ts`).

- `game/core/gameState.ts#rollGeneratorFaultAtMs` vylosuje při startu směny
  jeden okamžik poruchy v okně `[faultEarliestAtMs, faultLatestAtMs]` — jediné
  místo, kde se pro tuto mechaniku volá `Math.random()`.
- `game/core/gameReducer.ts#updateGenerator` (volané z `TICK`) je čistá funkce,
  která podle `elapsedMs`: spustí poruchu (nejvýš `generator.faultMaxPerShift`
  za směnu), po `silentGraceMs` přepne ticho na kritické pípání, ukončí
  `restarting` penalizaci po `restartPenaltyMs`, a plánuje další pípnutí
  (`beepIntervalMs` v `normal`, `criticalBeepIntervalMs` v `criticalBeeping`,
  žádné v `silentFault`/`restarting`) přes `generatorNextBeepAtMs`. Žádné audio
  se tu nevolá.
- `generatorBeepSeq` se při každém pípnutí zvýší o 1 — `app/play/page.tsx`
  sleduje jeho změnu přes `useRef` (stejný vzor jako `doorClosed`/`lightOn`) a
  podle aktuálního `generatorState` přehraje `generatorBeep` nebo
  `generatorWarningBeep` (viz `AUDIO_DESIGN.md`).
- `RESTART_GENERATOR`: v `silentFault`/`criticalBeeping` vrátí `normal` a naplánuje
  další normální pípnutí za `beepIntervalMs` od teď (beze změny). V `normal` NENÍ
  no-op — nastaví `generatorState: "restarting"` a `generatorRestartUntilMs:
  elapsedMs + restartPenaltyMs` (extra spotřeba energie stejná jako
  `criticalBeeping`, viz `applyPowerDelta`). V `restarting` je no-op (druhý klik
  penalizaci neprodlužuje).
- `applyPowerDelta`'s `generatorExtraDrain` platí pro `criticalBeeping` i
  `restarting` stejně — jedna podmínka, ne duplicitní výpočet.

## Blackout

`GameState.gameStatus: "normal" | "blackout"` + `blackoutElapsedMs: number`. Balanc
(`durationMs`, `phaseThresholdsMs`, `canBeSurvivedIfShiftEnds`) je `NightDefinition.blackout:
BlackoutDefinition` (`game/nights/night01.ts`).

- `TICK` v `gameReducer.ts` má na začátku samostatnou větev pro `gameStatus === "blackout"` —
  žádné volání `applyPowerDelta`/`updateGenerator`/`updateDoorLightRepel` (mrtvé systémy, nic
  z toho už nemá smysl počítat). Jen `elapsedMs`/`remainingMs` (čas směny běží dál) a
  `blackoutElapsedMs += action.deltaMs`.
  - `remainingMs <= 0` se testuje **před** `blackoutElapsedMs >= durationMs` → výhra má
    přednost, pokud by oboje vyšlo ve stejném ticku (`canBeSurvivedIfShiftEnds`).
  - `blackoutElapsedMs >= night.blackout.durationMs` → smrt, `deathReason: "blackout_timeout"`.
  - Zároveň se v každém ticku porovná `getBlackoutPhaseIndex` pro starý a nový
    `blackoutElapsedMs` (`game/visuals/blackoutPhase.ts`) — pokud se fáze (0–3) posunula,
    `blackoutPhaseSeq` se zvýší o 1. Samotná fáze se nikde duplicitně neukládá, kdykoliv je
    potřeba (BlackoutView, DebugPanel) se spočítá čistou funkcí z `blackoutElapsedMs`.
    `blackoutPhaseSeq` je čistě sekvenční čítač pro edge-detekci v UI, stejný vzor jako
    `generatorBeepSeq`/`monsterRetreatRoarSeq` — reducer sám žádné audio nevolá.
- `ENEMY_ADVANCE` je v blackoutu no-op (`isRunning` zůstává `true`, ale `gameStatus ===
  "blackout"` guard vrátí `state` beze změny) — pozice nepřítele zamrzne, hrozbu dál
  representuje jen `blackoutElapsedMs` odpočet, ne další simulace trasy.
- `TOGGLE_DOOR` / `TOGGLE_LIGHT` / `OPEN_CAMERA` / `RESTART_GENERATOR` mají všechny guard
  `state.gameStatus === "blackout"` → no-op. Dveře byly navíc vynuceny na `doorClosed: false`
  v okamžiku vstupu do blackoutu (viz "Výpočet energie" výše), takže reálně jsou "otevřené"
  po celou dobu.
- `components/game/BlackoutView.tsx` nahrazuje DeskView/DoorView/GeneratorView v
  `GameScreen.tsx`, dokud `state.gameStatus === "blackout"` — žádné dílčí "blackout mód" v
  jednotlivých view komponentách. Fáze textu počítá čistá funkce
  `game/visuals/blackoutPhase.ts#getBlackoutPhaseIndex(blackoutElapsedMs, blackout)`, texty
  jsou v `content/copy.ts` (`COPY.blackout.phaseTexts`).
- `computeTensionLevel` (`game/visuals/atmosphereState.ts`) vrací `1` (maximum) rovnou, pokud
  `input.gameStatus === "blackout"` — nemusí se počítat zbytek vzorce.
- Zvuk: `app/play/page.tsx` sleduje přechod `gameStatus` z `"normal"` na `"blackout"` přes
  `useRef` (stejný vzor jako jinde) a přehraje jednorázové `blackout_howl`. Generátor přestane
  pípat sám od sebe (jeho `TICK` větev se v blackoutu nevolá). Samostatný `useEffect` sleduje
  `blackoutPhaseSeq` (stejný `useRef`-diffing vzor) a podle aktuální fáze
  (`getBlackoutPhaseIndex(state.blackoutElapsedMs, night.blackout)`, přepočítané v efektu, ne
  jako závislost) přehraje `enemyStep` (fáze 1), `enemyNear` (fáze 2) nebo `blackoutDoorHit`
  (fáze 3) — viz AUDIO_DESIGN.md "Blackout". Konečný `jumpscare` řeší už existující efekt na
  `screen === "death"`, nic navíc se pro konec blackoutu nepřidává.
- `DebugPanel.tsx` k `gameStatus`/`blackoutElapsedMs` navíc zobrazuje aktuální fázi
  (`getBlackoutPhaseIndex`) a `blackoutPhaseSeq`.

## LoadingScreen

Falešný briefing mezi menu a startem směny — žádné skutečné technické načítání.

- `ScreenId` má novou hodnotu `"loading"`. Akce `START_LOADING` (dispatchovaná z
  `MainMenuScreen.onStart`) přepne `screen: "loading"` s čerstvým `createInitialGameState`
  (`isRunning` zůstává `false`).
- `app/play/page.tsx` má `useEffect` sledující `state.screen === "loading"`, který po
  `LOADING_SCREEN_DURATION_MS` (`balancing/constants.ts`, 4000 ms) dispatchne `START_SHIFT` —
  časování loading→playing je čistě UI záležitost (`setTimeout`), ne herní pravidlo v reduceru.
- `content/loadingHints.ts` — `LoadingHint` (id, category, text, volitelně `minNight`/
  `maxNight`/`weight`) + `LOADING_HINTS` data + `selectLoadingHints(count, night?)`: jednoduchý
  weighted random bez opakování, `minNight`/`maxNight` filtrování je připravené, ale
  nevyužité (jedna směna zatím). `LOADING_SCREEN_HINT_COUNT` (3) řídí, kolik hintů se vybere.
- `components/screens/LoadingScreen.tsx` si hinty vybere sám (`useState(() =>
  selectLoadingHints(...))`, počítáno jednou při mountu) a postupně je odkrývá vlastním
  `useInterval`-stylem efektem (`LOADING_SCREEN_DURATION_MS / hints.length` na hint) —
  self-contained, `app/play/page.tsx` o výběru hintů nic neví.

## Scénová pozadí (SceneBackground)

Atmosférické pozadí obrazovek (menu, loading, `/play` desk fáze, death, win, `/about`) je
konfigurační, ne natvrdo napsané v jednotlivých screen komponentách:

- `game/visuals/backgroundImages.ts` — `BACKGROUND_SCENES: Record<BackgroundSceneId,
  SceneBackgroundConfig>`, jeden záznam na obrazovku/stav (`"menu" | "loading" | "play" |
  "door" | "death" | "deathDoorAttack" | "win" | "about"`). `SceneBackgroundConfig` =
  `frames: BackgroundFrame[]` (0-3 obrázky), `holdMs`/`crossfadeMs` (časování prolínání mezi
  snímky), volitelný `flicker` (`minBrightness`/`maxBrightness`/`periodMs` — jemné
  blikání/ztlumení nezávislé na počtu snímků) a `overlay` (jemný tmavý gradient přes obrázek).
  Zdrojové obrázky jsou samy o sobě velmi tmavé (záměrná hororová atmoška) a text stojí v
  `.pixel-panel` boxech s vlastním poloprůhledným pozadím — `overlay` proto NENÍ hlavní zdroj
  čitelnosti textu, jen jemné doladění kontrastu (bug: původní `0.55-0.8` opacity overlay
  obrázky prakticky spálil na černo, vypadalo to jako "žádné pozadí"; opraveno na `0.05-0.3`).
- `components/SceneBackground.tsx` (`"use client"`) vykreslí scénu: víc snímků se prolíná
  (crossfade) — každý snímek je vlastní absolutně umístěný `<div>` s `background-image` a
  `opacity` transition (`transition: opacity {crossfadeMs}ms`). Aktivní index řídí buď
  automatický `setInterval` po `holdMs` (menu/play/win — časové cyklení mezi variantami), nebo
  volitelný prop `activeIndexOverride`, který přebije auto-cyklení úplně a nechá index řídit
  rodiče podle herního stavu (`door` scéna — `GameScreen.tsx` nastavuje
  `activeIndexOverride={state.doorClosed ? 1 : 0}`, takže se otevřené/zavřené dveře prohodí
  přesně v okamžiku přepnutí, ne nahodile časovačem). To je nutné, protože CSS neumí
  interpolovat mezi dvěma `background-image` hodnotami na jednom elementu (byl by to tvrdý
  střih) — proto dva reálné DOM elementy nad sebou, ne inline `style.backgroundImage` na
  `<main>`. `flicker` se aplikuje jako `filter: brightness(...)` animace (`@keyframes
  scene-background-flicker` v `styles/pixel.css`) na obalový `div`, nezávisle na prolínání
  snímků — obojí jde kombinovat. Prázdné `frames` → komponenta vrátí `null`.
- Použití: `<SceneBackground scene={BACKGROUND_SCENES.xxx} />` jako první potomek `<main
  className="relative ...">` (rodič musí mít `position: relative`, `SceneBackground` je
  `absolute inset-0 -z-10`, ostatní obsah zůstává v normálním flow nad ním). V `GameScreen.tsx`
  se renderuje pro všechny tři herní pohledy (control_room/desk, doors, generator), jen ne
  během blackoutu (`state.gameStatus !== "blackout"`) — `BlackoutView` má vlastní atmosféru.
  desk/generator sdílí `BACKGROUND_SCENES.play`, `door` má vlastní scénu se 2 snímky
  (otevřené/zavřené dveře, viz výše). `DeathScreen.tsx` navíc vybírá scénu podle
  `deathReason` — `door_open_at_attack` → `deathDoorAttack` (viz "Smrt u dveří má vlastní
  pozadí" níže), cokoliv jiného (`blackout_timeout`) → obecná `death`.

### Smrt u dveří má vlastní pozadí (`deathDoorAttack`)

`ENEMY_ADVANCE` v `gameReducer.ts` nastaví `enemyStage: "attack"` a `screen: "death"` ve
**stejném** dispatchi (viz "Definice nepřítele" výše) — hráč tedy nikdy neuvidí samostatnou
"dveře otevřené, monstrum útočí" fázi vykreslenou v `DoorView.tsx`, jen rovnou `DeathScreen`.
`BACKGROUND_SCENES.deathDoorAttack` (`door_open_death_0.webp`) proto slouží jako pozadí přímo
death screenu pro `deathReason === "door_open_at_attack"`, ne pro nějaký mezikrok v `DoorView`.
Pokud by v budoucnu přibyla skutečná "útok probíhá" fáze (např. krátké zpoždění mezi `at_door`
standoffem a smrtí), obrázek by se dal přesunout/duplikovat tam — zatím to není potřeba.
- **Dvě chyby, na které si dát pozor při použití `SceneBackground` (obě se objevily a byly
  opravené):**
  1. `<main>` nesmí mít VLASTNÍ `bg-*` třídu na stejném elementu jako `SceneBackground`
     potomka. `position: relative` samo o sobě nezakládá nový stacking context (chybí
     `z-index`/`opacity`/`transform`), takže `main`ovo vlastní pozadí by se vykreslilo AŽ PO
     (tedy nad) `-z-10` potomkem a úplně by ho zakrylo. `<body>` má `bg-gray-900` jako
     univerzální fallback, není potřeba ho opakovat na `<main>`.
  2. `SceneBackground` musí být přímým potomkem toho `<main>`, které pokrývá **celou šířku
     obrazovky** — ne uvnitř vnitřního `max-w-md mx-auto` obalu. `GameScreen.tsx` proto má
     `<main className="relative min-h-screen p-4">` bez `max-w-md`, a samotný herní obsah
     (ShiftTimer/PowerMeter/DeskView/atd.) je až ve vnitřním `<div className="max-w-md
     mx-auto ...">` — jinak by pozadí pokrylo jen užší centrovaný sloupec a zbytek širší
     obrazovky by zůstal holý `<body>` background.
- `preloadBackgroundImages()` (stejný soubor) natvrdo stáhne všechny nakonfigurované snímky
  napříč všemi scénami přes `new Image()` — volá se z `LoadingScreen.tsx` při mountu, ať jsou
  hotové v cache prohlížeče, než je hráč reálně potřebuje (viz "LoadingScreen" výše).
- Přidat/vyměnit pozadí nebo přidat efekt (víc snímků, `flicker`) je čistě datová změna v
  `BACKGROUND_SCENES` — žádná komponenta se kvůli tomu měnit nemusí.

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
