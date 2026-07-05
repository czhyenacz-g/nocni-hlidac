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

### Kamerové assety (`getCameraImageSrc`)

Skutečný obraz v detailu kamery (`CameraView.tsx`, viz "Kamerový panel: overview/detail"
výše — overview mřížka žádný živý obraz nikdy nedostává) je taky konfigurační, ne natvrdo
napsaný v komponentě:

- `game/cameras/cameraAssets.object13.ts` — `CAMERA_ASSETS: Record<CameraId,
  CameraAssetsEntry>`, jeden záznam na kameru. `CameraAssetsEntry = { default:
  CameraAssetSet; lightOn?: CameraAssetSet }`, `CameraAssetSet = { normal: string[];
  monster: string[]; fleeing: string[] }` — `normal` obrázky bez monstra, `monster` obrázky
  se skutečným nebezpečím, `fleeing` obrázky monstra ustupujícího/utíkajícího pryč (viz
  `getCameraImageSrc` níže). Soubory jsou `.webp` (konvertované z `.png` přes `cwebp`, jméno
  se zachovaným `monster`/`fleeing_monster`/`monster_at_door` v názvu) v
  `public/object_13/camera/<kamera>/`, rozdělené po mapě/objektu stejně jako pozadí (viz
  "Struktura assetů podle mapy/objektu" výše). `door_hallway` má navíc `lightOn` variantu
  (`public/object_13/camera/door_hallway_light/`) — jiná sada snímků, když je zapnuté světlo
  do chodby (`state.lightOn`), stejné rozdělení `normal`/`monster`/`fleeing`.
  `resolveAssetSet(cameraId, lightOn)` (stejný soubor) vybere `lightOn` sadu, jen pokud
  existuje a `lightOn === true`, jinak `default`. Prázdné pole u libovolné kamery/kategorie
  je pořád platný stav — `getCameraImageSrc` na to reaguje fallbackem, ne pádem/prázdnou
  obrazovkou.
- `getCameraImageSrc(cameraId, hasMonster, lightOn, elapsedMs, enemyStage?,
  monsterRetreatedTo?, monsterRetreatVerified?)` (stejný soubor) — čistá funkce, žádný React
  state, čtyři priority v pořadí:
  1. **`monster_at_door`** — `cameraId === "door_hallway" && enemyStage === "at_door"` →
     vrátí jeden ze dvou pevných souborů (`DOOR_HALLWAY_AT_DOOR_ASSET`, ne pole/cyklování) —
     `door_hallway_light_10_monster_at_door.webp` při `lightOn`, jinak
     `door_hallway_10_monster_at_door.webp`. Monstrum je fyzicky u dveří (ne jen v chodbě
     před nimi).
  2. **`fleeing_monster`** — `hasMonster && monsterRetreatedTo != null && enemyStage ===
     monsterRetreatedTo && monsterRetreatVerified === false`. `hasMonster` už samo o sobě
     znamená `camera.enemyVisibleAtStage === enemyStage` (spočítané v `CameraView.tsx`), takže
     spolu s `enemyStage === monsterRetreatedTo` je jistota, že tahle kamera je přesně ta, kam
     monstrum po "gave_up" odešlo. `pickDeterministic(set.fleeing, ...)` — chybí-li fleeing
     asset pro danou kameru, propadne se do bodu 3 (fallback na běžný monster snímek, ne
     `null`). Otevření téhle kamery samo o sobě potvrzuje ústup stejně jako dřív —
     `gameReducer.ts` `OPEN_CAMERA` počítá `monsterRetreatVerified` nezávisle na `getCameraImageSrc`
     (stejná podmínka `camera.enemyVisibleAtStage === enemyStage`), žádná změna reduceru
     nebyla potřeba.
  3. **`hasMonster`** (bez podmínek výše) → **deterministický** výběr (hash `cameraId:monster`,
     ne `Math.random()`) z `monster` pole — stejná kamera + stejný stav vždy vrátí stejný
     obrázek. Prázdné `monster` pole → fallback na cyklující `normal` (viz níže), ne `null`.
  4. jinak → **pomalé prostřídání** (`pickCycling`) mezi `normal` obrázky:
     `Math.floor(elapsedMs / CAMERA_IMAGE_CYCLE_MS) % normal.length` (`CAMERA_IMAGE_CYCLE_MS`
     = 4000 ms, `game/balancing/constants.ts`) — čistá funkce `elapsedMs`, ne `setInterval`
     ani React state v komponentě, takže se mění jen jednou za pár sekund (ne animace) a
     neseká se při každém renderu.
  - Prázdné pole i po fallbacku (nebo kamera bez záznamu v `CAMERA_ASSETS`) → `null`,
    `CameraView.tsx` pak zobrazí dosavadní textový/placeholder vzhled beze změny — žádný
    pád, žádná prázdná/rozbitá obrazovka.
- `CameraView.tsx` volá `getCameraImageSrc(camera.id, enemyVisible, lightOn, elapsedMs,
  enemyStage, monsterRetreatedTo, monsterRetreatVerified)` (`enemyVisible` je už existující
  derivovaný stav — `camera.enemyVisibleAtStage === enemyStage`; `monsterRetreatedTo`/
  `monsterRetreatVerified` jsou nové props protažené z `state` přes `DeskView.tsx` →
  `CameraPanel.tsx` → `CameraDetailView.tsx`) a vykreslí vrácený `src` jako `<img>`
  (`absolute inset-0 object-cover`) — nikde v komponentě není napsaný konkrétní název
  souboru. Šum/scanline efekt (`.pixel-screen-static`) je samostatný `<div>` NAD obrázkem,
  ne na stejném elementu — `background-image` z `.pixel-screen-static` by se jinak přepsal
  inline stylem `<img>`u (obojí je stejná CSS vlastnost na jednom elementu, vyhrál by jen
  jeden) a šum by úplně zmizel. Bez obrázku (`imageSrc === null`) je vrstva se šumem jediná,
  vizuálně identické s dřívějším stavem. Textový spoiler "POSTAVA V DOSAHU" / "— žádný
  pohyb —" byl z `CameraView.tsx` odstraněný (playtest: problikával přes fotku, prozrazoval
  monstrum dřív, než ho hráč sám najde) — `enemyVisible` se teď vypisuje jen v
  `DebugPanel.tsx` ("kamera-detekce"), ne v samotné komponentě kamery.

### Kamerový drift (`game/cameras/cameraMotionConfig.ts`)

Velmi jemný "kamera není úplně statická" efekt na `<img>` v `CameraView.tsx` — bezpečný jen
díky kombinaci, kterou `<img>` už měl předtím: `object-cover` (obrázek vždy vyplňuje celý
rám, žádný letterbox) + wrapper `overflow: hidden`. Bez zoom rezervy by jakýkoliv `translate`
hned odkryl reálný okraj obrázku (`cover` sedí na hraně rámu bez vůle) — proto
`CameraMotionConfig.zoom` (výchozí `1.03`) musí být > 1 předtím, než se vůbec uvažuje o panu.

- `CameraMotionConfig = { enabled, zoom, panXPercent, panYPercent, durationMs, easing }`,
  výchozí `CAMERA_MOTION_CONFIG` + volitelné `CAMERA_MOTION_OVERRIDES: Partial<Record<CameraId,
  Partial<CameraMotionConfig>>>` (zatím prázdné) — `resolveCameraMotionConfig(cameraId)` je
  jednoduchý shallow merge, žádná komponenta nezná defaulty natvrdo.
- CSS (`styles/pixel.css`): `.camera-image-motion` + `@keyframes camera-slow-pan` čte
  `--camera-motion-zoom`/`--camera-motion-pan-x`/`--camera-motion-pan-y` jako CSS custom
  properties (nastavené inline stylem na `<img>` v `CameraView.tsx`, `animationDuration`/
  `animationTimingFunction` taky inline) — jedna sada keyframes pro všechny kamery, žádná
  per-kamera duplicita v CSS. `animation-direction: alternate` dělá plynulé tam-a-zpátky bez
  trhnutí zpátky na start.
- Aplikuje se jen na `<img>`, ne na wrapper (ten musí zůstat `overflow: hidden` beze změny,
  jinak by drift odkrýval okraj mimo rám). `.pixel-screen-static` šumová vrstva zůstává
  samostatný `<div>` nad obrázkem, drift se jí netýká.
- `CAMERA_MOTION_CONFIG.enabled === false` (jeden vypínač v configu) → žádná třída, žádný
  inline transform, přesně dřívější statické chování.
- Rozšíření na další kameru/objekt je čistě datová změna v `CAMERA_ASSETS` — žádná
  komponenta se kvůli tomu měnit nemusí.

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
`night.enemyTickMs` — **nezávisle na světle**. Jakmile `progress >= target`, nepřítel se vzdá:
`gameReducer.ts#pickMonsterRetreatLocation(route)` vybere náhodně jednu ze stage
`outer_yard`/`left_hallway`/`right_hallway`, které jsou skutečně součástí aktivní
`state.enemyRoute` (fallback `"outside"`, kdyby žádná nebyla — v praxi se nestává,
`outer_yard` je v obou variantách trasy vždy). `enemyStage` se nastaví na tuhle
lokaci, `state.monsterRetreatedTo` na totéž a standoff pole se vynulují na
`null`/`0`. Co dál — jestli je rovnou bezpečné dveře otevřít, nebo musí hráč
nejdřív ověřit kamerou — řeší `state.monsterRetreatVerified` a obtížnost, viz
"Obtížnost" níže.

Tohle je čistě náhodné vzdání se — pomalé (6–8 s) a nezávislé na tom, jestli svítí světlo.
Kombinovaný efekt dveří+světla řeší úplně samostatný mechanismus, viz níže — ten dál
posílá nepřítele na pevné `enemy.monsterRetreatStage` (`"outside"`), NE na
lokaci z `pickMonsterRetreatLocation`, a obtížnost na něj nemá žádný vliv.

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

## Obtížnost (`game/difficulty/difficultyConfig.ts`)

Interní systém, zatím bez UI ani query parametru — schválně, projekt je ve vývoji.
Tři úrovně (`Difficulty = "easy" | "medium" | "hard"`), výchozí `DEFAULT_DIFFICULTY =
"medium"`. Pravidla dané obtížnosti jsou plochý objekt booleanů,
`DIFFICULTY_RULES: Record<Difficulty, DifficultyRules>` — dnes jediné pravidlo,
`monster_check_or_return` (`false` na `easy`, `true` na `medium`/`hard`).

`createGameReducer(night, difficulty = DEFAULT_DIFFICULTY)` přibral druhý parametr;
`rules = DIFFICULTY_RULES[difficulty]` se spočítá jednou při vytvoření reduceru a je
uzavřený (closure) uvnitř vráceného `gameReducer` — **herní logika nikde nemá rozeseté
`if (difficulty === "hard")`**, jen čte `rules.monster_check_or_return` na místech níže.
`app/play/page.tsx` volá `createGameReducer(night)` bez druhého argumentu, takže běží na
výchozí `medium` — přepnutí obtížnosti dnes znamená jen změnu volání na místě.

Pravidlo `monster_check_or_return` používá dvě nová pole `GameState`:

- `monsterRetreatedTo: EnemyStage | null` — kam nepřítel odešel po "vzdání se" u dveří
  (viz `pickMonsterRetreatLocation` výše), `null` mimo tenhle stav.
- `monsterRetreatVerified: boolean` — jestli hráč už tohle místo viděl na kameře.

Tři místa v `gameReducer.ts`, kde se pravidlo projevuje:

1. **`ENEMY_ADVANCE`, větev "gave_up"** — nastaví `monsterRetreatedTo` na vylosovanou
   lokaci a `monsterRetreatVerified: !rules.monster_check_or_return` (na `easy` rovnou
   `true`, ověření není potřeba; na `medium`/`hard` `false`, dokud ho hráč nenajde na
   kameře).
2. **`OPEN_CAMERA`** — pokud `state.monsterRetreatedTo !== null` a vybraná kamera je
   zrovna ta, na které je nepřítel vidět (`camera.enemyVisibleAtStage === state.enemyStage`),
   nastaví `monsterRetreatVerified: true`. Jinak nechává stav beze změny (žádný postih za
   "špatnou" kameru).
3. **`TOGGLE_DOOR`** — otevírání (ne zavírání) dveří, kdy `state.doorClosed` bylo `true`
   a `rules.monster_check_or_return && monsterRetreatedTo !== null &&
   !monsterRetreatVerified`: dveře se otevřou, ale nepřítel se vrátí do `"door_hallway"`
   (`enemyStage: "door_hallway"`, `lastEnemyDecision: "returned_unverified"` — union typ
   neměněný, jen teď znamená konkrétně "vráceno do door_hallway", ne do `at_door`;
   `enemyAtDoorSinceMs` se nastaví na `null`, protože `door_hallway` není `isAtDoorStage`)
   a `monsterRetreatedTo`/`monsterRetreatVerified` se vynulují. **Není** to okamžitý teleport
   rovnou ke dveřím (`at_door`) — playtest: prázdná kamera `door_hallway` matla hráče, který
   pak bez varování skončil v extrémním ohrožení. `door_hallway` dává hráči ještě krátkou
   šanci si všimnout (na téže kameře) a stihnout dveře znovu zavřít, než nepřítel normálním
   `ENEMY_ADVANCE` tempem postoupí až na `at_door`. Je to trest, ne smrt — hráč musí dveře
   znovu zavřít a situaci vyřešit správně. Jakékoliv jiné otevření dveří (bezpečné, nebo na
   `easy`) při té příležitosti taky vynuluje `monsterRetreatedTo`/`monsterRetreatVerified`,
   ať nezůstane "zaseknuté" ověření z předchozího standoffu.

Testy pokrývající tohle pravidlo (výchozí obtížnost, zapnutí/vypnutí per úroveň, celý
easy/medium/hard flow) jsou v `game/core/difficulty.test.ts` (Vitest, `npm run test`).

### Útok u dveří má krátký "reveal" (`doorDeathRevealUntilMs`)

Dřív `ENEMY_ADVANCE` při `isAtDoorStage(state) && !state.doorClosed` nastavilo `screen:
"death"` okamžitě ve stejném dispatchi jako `enemyStage: "attack"`. Teď se smrt nefinalizuje
hned:

- `ENEMY_ADVANCE` reaguje jinak podle `state.playerView` v okamžiku útoku:
  - **`playerView === "door"`** — nastaví `enemyStage: "attack"`,
    `deathReason: "door_open_at_attack"` a `doorDeathRevealUntilMs = state.elapsedMs +
    DOOR_DEATH_REVEAL_DURATION_MS` (700 ms, `game/balancing/constants.ts`).
    `isRunning`/`screen` zůstávají beze změny (`true`/`"playing"`).
  - **jinak (kamery/generátor)** — záměrně beze změny oproti původnímu chování: `screen:
    "death"` se nastaví rovnou, žádný reveal, žádné vynucené přepnutí `playerView` na
    `"door"` (na výslovnou žádost — tenhle případ má do budoucna dostat vlastní obrazovku,
    zatím zůstává klasický instantní death flow).
- `TICK` má na začátku větev pro `doorDeathRevealUntilMs !== null` (před blackout větví) —
  jen počítá `elapsedMs`/`remainingMs` dál, nic jiného (generátor/energie/door-light repel se
  nepočítají, hra je fakticky rozhodnutá). Jakmile `elapsedMs >= doorDeathRevealUntilMs`,
  finalizuje `isRunning: false, screen: "death"` (`deathReason` už je nastavený).
- Dokud `doorDeathRevealUntilMs !== null`, `TOGGLE_DOOR`/`TOGGLE_LIGHT`/`OPEN_CAMERA`/
  `RESTART_GENERATOR`/`LOOK_AT_DOOR`/`LOOK_AT_DESK`/`LOOK_AT_GENERATOR` jsou no-op (stejný
  guard-styl jako existující `blackout` kontroly, přidaný vedle nich, ne místo nich —
  blackoutové chování se nemění). `ENEMY_ADVANCE` je taky no-op (nepřítel je už "attack",
  žádný další postup nedává smysl).
- Vizuálně: `DoorView.tsx` počítá `activeIndex = isDoorDeathReveal ? 2 : (doorClosed ? 1 :
  0)` pro `BACKGROUND_SCENES.door.frames`, vykreslené přes lokální `DoorSceneFrame.tsx`
  (viz "Pohled hráče" níže — DoorView už nepoužívá `SceneBackground`/`GameScreen.tsx` pro
  vlastní obrázek). Protože jsou všechny 3 snímky (otevřené/zavřené/monstrum) pořád součástí
  téhož `DoorSceneFrame`, přepnutí na index 2 plynule crossfade prolne (`crossfadeMs: 350` u
  téhle scény, kratší než jinde, ať se stihne doprolínat během 700 ms revealu).
  `doorDeathRevealUntilMs` se nastavuje jen když je hráč už v `DoorView`, takže `isDoorView`
  je v tu chvíli vždy `true` — žádný přechod mezi pohledy (desk/generator → door) se během
  revealu neděje.
- Je to čistě lokální mezistav pro tenhle jeden případ (`doorDeathRevealUntilMs`), ne
  univerzální "pre-death" obrazovka — `blackout_timeout` (a jakákoli budoucí jiná smrt) přes
  něj vůbec neprochází, `screen: "death"` se pro ně nastavuje přímo jako dřív.

## Night scaling (`game/difficulty/nightScaling.ts`)

Samostatná vrstva vedle `difficultyConfig.ts`, ne uvnitř ní — `Difficulty` (easy/medium/
hard) je zvolený režim hry, night scaling je nezávislý modifikátor podle toho, kolikátou noc
v řadě aktuální hlídač slouží (`survivedNights + 1`). Obojí platí zároveň, jedno druhé
neovlivňuje.

- **`computeNightScaling(currentNight): NightScaling`** — čistá funkce.
  `NightScaling = { currentNight: number; energyDrainMultiplier: number }`. Neplatný vstup
  (`< 1`, `NaN`, necelé číslo se zaokrouhlí dolů) se bezpečně bere jako noc 1. `pressure =
  clamp(safeNight - 1, 0, NIGHT_SCALING_MAX_PRESSURE)` (4), `energyDrainMultiplier = 1 +
  pressure * NIGHT_SCALING_ENERGY_DRAIN_STEP` (0.05) — noc 1 → 1.00, noc 2 → 1.05, ..., noc 5
  a dál → capnuté na 1.20. Obě konstanty v `game/balancing/constants.ts`, ne natvrdo ve
  funkci.
- **Rozšiřitelnost**: `NightScaling` je připravené na další pole (`monsterActivityMultiplier`,
  `generatorFaultTimingMultiplier`, `cameraNoiseMultiplier`, ...), ale žádné z nich zatím
  neexistuje — přidají se, až budou mít skutečné využití, ne jako předem připravené nepoužité
  hodnoty.
- **Napojení na energii**: `gameReducer.ts#applyPowerDelta` dostal čtvrtý parametr
  `nightScaling: NightScaling`. V obou větvích (sledování kamer / idle) se nejdřív spočítá
  `baseDrain` (idle/cameraOpen/doorClosed/lightOn/generatorExtraDrain sečtené jako dřív), pak
  se **jednou** vynásobí `nightScaling.energyDrainMultiplier` — žádné násobení po
  jednotlivých položkách. Dobíjení (`night.rechargePerSecondWhenIdle`) se multiplierem nikdy
  nenásobí, zůstává mimo `baseDrain`/`drain` výpočet úplně.
- **Odkud `currentNight` přichází**: `TICK` (`gameActions.ts`) má nové volitelné pole
  `currentNight?: number` — stejný vzor jako `stressLevel` (viz "Stres zpomaluje odpočet"
  výše). `useGameLoop` (`gameLoop.ts`) ho na rozdíl od `stressLevel` bere jako obyčejnou
  hodnotu v `options`, ne přes ref: `currentNight` se mění jen mezi směnami (win/death), ne
  desetkrát za sekundu jako stres, takže je v pořádku mít ho v dependency poli efektu (žádné
  zbytečné rušení/zakládání intervalu za běhu). `app/play/page.tsx` počítá `const
  currentNight = survivedNights + 1;` na jednom místě — použije ho `useGameLoop` i
  `nightNumber` prop pro `ShiftTimer` (HUD), žádný druhý paralelní výpočet noci.
- Reducer uvnitř `TICK` case spočítá `const nightScaling = computeNightScaling(action.currentNight
  ?? 1);` a předá ho do `applyPowerDelta` — chybějící pole (cokoliv jiného než `useGameLoop`
  dispatchující `TICK`) se chová jako noc 1, žádné ztěžování.

Testy: `game/difficulty/nightScaling.test.ts` (čistá funkce, všechny prahové noci + capping +
neplatný vstup), `game/core/tickNightScaling.test.ts` (reducer-level — `TICK` s různým
`currentNight`, ověřuje že recharge zůstává nedotčené).

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
  zpět na stůl. **Na rozdíl od** DeskView/GeneratorView (sdílejí `SceneBackground`
  přes `GameScreen.tsx`, viz "Scénová pozadí" výše) má DoorView vlastní lokální
  `components/game/DoorSceneFrame.tsx` — reálný `<img>` uvnitř wrapperu s pevným
  poměrem stran (16:9, `.door-scene-frame` v `styles/pixel.css`) a `object-contain`,
  ne viewport CSS `background-image` přes `bg-cover`. Důvod: `bg-cover` škáluje/ořezává
  obrázek podle CELÉ šířky obrazovky nezávisle na vnitřním obsahu, takže procentuálně
  pozicovaný hotspot by se při zoomu/resize/jiném poměru stran rozjel od obrázku.
  `DoorSceneFrame` drží obrázek i hotspot ve STEJNÉM souřadnicovém systému (procenta
  vůči vlastnímu wrapperu), takže se škálují vždy spolu. `GameScreen.tsx` proto pro
  `playerView === "door"` `SceneBackground` vůbec nerenderuje (`showPlayBackground =
  gameStatus !== "blackout" && !isDoorView`) — `DoorView` si obrázek řeší sám.
  - **Velikost scény** (`.door-scene-frame`): `width: min(100%, calc((100vh -
    var(--door-ui-reserved-height, 180px)) * 16 / 9))` + `aspect-ratio: 16/9` — šířka je
    to menší ze dvou věcí: dostupná šířka rodiče (`100%`, NE `100vw`, aby nepřetekla přes
    `<main>`'s `p-4` padding), a šířka odpovídající dostupné VÝŠCE (`100vh` mínus rezerva
    na tlačítko zpět/DebugPanel/okraje, přepočtená přes 16:9). `aspect-ratio` z vybrané
    šířky sám dopočítá výšku — nepotřebujeme druhý ruční `min()` na výšku (na rozdíl od
    čistě `%`-based výpočtu, kde `height: X%` váže na výšku rodiče, ne na šířku, takže by
    nešlo spolehlivě odvodit z šířky). `--door-ui-reserved-height` (180 px, orientační) jde
    doladit jako CSS proměnná, kdyby se layout pod scénou změnil.
  - **`GameScreen.tsx`**: DoorView (na rozdíl od desk/generator) NENÍ zabalený v
    `max-w-md mx-auto` — vnější obsahový `<div>` tuhle třídu dostává jen podmíněně
    (`!isDoorView`), ať dveřní scéna může využít celou dostupnou šířku `<main>`u. Aby
    DebugPanel (a jen ten, `ViewSwitchArrow` zpět si to řeší sám v `DoorView.tsx`) i v
    tomhle širším layoutu zůstal stejně úzký/centrovaný jako jinde, obaluje se do vlastního
    `max-w-md mx-auto` divu, jen když `isDoorView`.
  - `DoorSceneFrame` dostává stejná data jako dřív (`BACKGROUND_SCENES.door.frames`,
  3 snímky: otevřené/zavřené/monstrum, `crossfadeMs: 350`) — `DoorView.tsx` počítá
  `activeIndex` podle `doorClosed`/`isDoorDeathReveal` a crossfade mezi snímky (stejný
  princip jako `SceneBackground`, jen na `<img opacity>` místo `background-image`).
  Klikací plocha je `.door-hotspot` (`styles/pixel.css`) — průhledný hotspot (opacity
  ~0.1, jemně viditelnější na hover/focus) posazený inline stylem v procentech
  (`left`/`top`/`width`/`height`) vůči `DoorSceneFrame` wrapperu, ne neprůhledný panel
  přes celou scénu — hráč má mít pocit, že kliká na dveře samotné, ne na UI tlačítko.
  Velký textový popisek stavu dveří je záměrně pryč (stav je vidět přímo v obrázku —
  elektronický zámek vpravo), zůstala jen malá nenápadná cedulka (`.door-hotspot-label`)
  s `COPY.game.doorViewHint`. `.tap-target-critical` (min. 56×56 px) hlídá minimální
  dotykovou plochu, i kdyby procenta na malém displeji vyšla menší. `ViewSwitchArrow`
  zpět na stůl je pod dveřmi (ve vlastním `max-w-md`, ne přes celou šířku), ne nahoře —
  vizuálně méně dominantní než samotné dveře. `GameScreen.tsx` navíc v `DoorView` vůbec
  nerenderuje horní HUD (`ShiftTimer`/
  `AudioToggle`/`PowerMeter`) — `!isDoorView &&` podmínka, ne jen CSS skrytí — ať se
  hráč soustředí na dveře; desk/generator zůstávají beze změny.
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

## Stres a heartbeat (`game/audio/heartbeatStress.ts`, `useHeartbeatStress.ts`)

Záměrně **mimo** `GameState`/`gameReducer.ts` — na rozdíl od herních pravidel (difficulty,
generátor, ...) je tohle čistě audio/dev-vizualizační vrstva, nemá vliv na žádné jiné
rozhodování ve hře, takže nepotřebuje projít reducerem a jeho testy. Dvě části:

1. **`computeHeartbeatTargetStress(input): number`** (`heartbeatStress.ts`) — čistá,
   testovatelná funkce, cílová hodnota 0–100 podle toho, jestli hráč zrovna vidí monstrum v
   detailu kamery. Bere `{ playerView, isCameraDetailOpen, activeCameraId, enemyStage,
   doorClosed, cameras }` — `cameras` je `NightDefinition.cameras`, lookup přes
   `camera.enemyVisibleAtStage === enemyStage` je stejný vzor jako `isEnemyBeingWatched` v
   `gameReducer.ts` (nikdy nepředpokládá, že conkrétní camera id odpovídá konkrétní stage
   nepřítele natvrdo — respektuje, že trasa může vést buď `left_hallway`, nebo
   `right_hallway`). `isCameraDetailOpen` musí volající spočítat jako `state.cameraOpen &&
   state.cameraViewMode === "detail"` — overview mřížka nikdy stres nezvedá (pro první verzi
   se řeší jen detail, žádné rozpoznávání přes overview).
2. **`useHeartbeatStress(state, night): number`** (`useHeartbeatStress.ts`) — React hook,
   jediné místo, které drží plynulou stress hodnotu (0..1) napříč rendery (`useRef` +
   `useState`) a řídí podle ní audio. Spouští se v `app/play/page.tsx` vedle `useGameLoop`,
   efekt běží na stejné frekvenci jako `TICK` (`state.elapsedMs` v dependency array, ~100 ms,
   viz `GAME_TICK_MS`), plus okamžitě na změnu kamery/pohledu/dveří/stage (rychlejší reakce
   než čekání na další tik). Growth/decay je exponenciálně-lineární rampa: `maxStep =
   deltaMs / rateMs`, kde `rateMs` je `HEARTBEAT_STRESS_RISE_MS` (1000 ms) směrem k cíli
   nahoru, `HEARTBEAT_STRESS_FALL_MS` (35000 ms, po playtestu zpomaleno z původních 7000 ms —
   pokles se zdál moc rychlý) dolů (`game/balancing/constants.ts`) — hodnota
   se posune o `maxStep` směrem k `targetStress / 100`, ale nikdy ho nepřestřelí (`Math.abs(diff)
   <= maxStep ? target : current + sign(diff) * maxStep`). Mimo běžící směnu (`!state.isRunning`)
   stress i hlasitosti obou loopů okamžitě spadnou na 0 (žádný heartbeat v menu/death/win).

Audio: dva nové eventy, `AUDIO_EVENTS.heartbeatStressSlow`/`heartbeatStressFast`
(`heartbeat_slow_reverb.mp3`/`heartbeat_fast_reverb.mp3`, CC0 z OpenGameArt.org — viz
`assets/audio/README.md`), `loop: true` v `audioConfig.ts` s `volume: 0` (skutečnou
hlasitost řídí jen `useHeartbeatStress` průběžně). `AudioManager.setVolume(id, volume)`
(nová metoda) mění `audio.volume` na běžícím i zastaveném elementu — hook volá
`audioManager.startLoop(...)` **jen jednou** (guard přes `loopsStartedRef`), pak už jen
`setVolume` každý tik; nikdy `audioManager.play(...)` (to by loop pokaždé restartovalo
zvukem od začátku, přesně čemu se má zabránit).

**`computeHeartbeatVolumes(stress0to100): { slowVolume, fastVolume }`** (`heartbeatStress.ts`)
— dvě nezávislé lineární křivky (`SLOW_VOLUME_CURVE`/`FAST_VOLUME_CURVE`, konkrétní body
podle GAME_DESIGN.md) vynásobené crossfade faktorem: `fadeToFast = clamp01((stress - 60) /
20)` (0 pod 60, 1 nad 80, lineární přechod mezi), `fadeSlow = 1 - fadeToFast`. Pod stresem 60
hraje jen slow, nad 80 jen fast, 60–80 je plynulý přechod — žádné tvrdé cvaknutí mezi
soubory. Výsledek se navíc násobí `HEARTBEAT_VOLUME_MULTIPLIER` (1.2, playtest: heartbeat
byl málo slyšet i po +12dB boostu souborů, viz `assets/audio/README.md`) a capuje na 1.0
přes `clamp01` (`audio.volume` je 0..1, přestřelení by/nemělo žádný efekt navíc).

**`computeGeneratorStressBonus(generatorState): number`** (`heartbeatStress.ts`) — plochý
bonus podle fáze: `BACKUP_POWER_STRESS_BONUS` (20) pro `"criticalBeeping"`,
`GENERATOR_RESTART_STRESS_BONUS` (40) pro `"restarting"` (vlastní chyba, vyšší bonus než
skutečná porucha), jinak 0. Čistě odvozené z aktuálního `state.generatorState` každý tik
(žádný `xStressApplied` flag v `GameState`) — bonus se tím pádem nikdy neakumuluje (zůstává
na stejné hodnotě, dokud fáze trvá) a mizí sám, jakmile fáze skončí (restart dokončen,
`generatorState` zpět na `"normal"`; restart směny přes `createInitialGameState`).
`useHeartbeatStress` ho sečte s `computeHeartbeatTargetStress` (`Math.min(100,
locationStress + generatorBonus)`).

**`computeAmbientStressMultiplier(stressNormalized): number`** (`heartbeatStress.ts`) —
`1 - stress * (1 - MIN_AMBIENT_STRESS_MULTIPLIER)`, lineárně 1.0 (stres 0) až
`MIN_AMBIENT_STRESS_MULTIPLIER` (0.2, stres 1). `useHeartbeatStress` ho každý tik násobí se
`BASE_AMBIENT_VOLUME` (= `AUDIO_CONFIG[AUDIO_EVENTS.ambienceLoop].volume`, čteno jednou při
načtení modulu) a nastaví přes `audioManager.setVolume(ambienceLoop, ...)` — používá stejnou
plynulou hodnotu `next` jako heartbeat, takže duck/návrat ambience je stejně pozvolný jako
samotný stres, ne skokový. Při `!state.isRunning` se ambience volume resetuje zpátky na
`BASE_AMBIENT_VOLUME` (příští spuštění směny nezačne s "duckovanou" hlasitostí od
předchozí) — u smrti tohle běží ve stejném renderu těsně před `fadeOutLoop` (viz "Ticho před
lekačkou" v AUDIO_DESIGN.md), takže fade i tak začíná od plné hlasitosti, ne od zbytku
ducku.

Dev HUD: `useHeartbeatStress` vrací aktuální (ne cílovou) stress hodnotu 0..1,
`app/play/page.tsx` ji předá do `GameScreen` → `PowerMeter` jako `stressPercent =
Math.round(stress * 100)`, zobrazí se jen když `STRESS_DEV_HUD_ENABLED` (`balancing/constants.ts`)
je `true` — jedno místo k vypnutí, až logika bude odladěná, beze změny `PowerMeter.tsx` samotného
(`stressPercent?: number`, `undefined` = nezobrazovat).

Testy: `game/audio/heartbeatStress.test.ts` (Vitest) — `computeHeartbeatTargetStress` pro
všechny lokace/stavy dveří/overview-vs-detail, `computeHeartbeatVolumes` pro crossfade a
boost multiplier, `computeAmbientStressMultiplier` pro duck křivku,
`computeGeneratorStressBonus` pro všechny `GeneratorState` hodnoty.

### Stres zpomaluje odpočet (`game/core/stressTimeScale.ts`)

Na rozdíl od heartbeat/ambient vrstvy výše je tohle v `game/core/`, ne `game/audio/` —
ovlivňuje `GameState.remainingMs` přímo v `gameReducer.ts`, je to herní pravidlo (byť horor
efekt), ne audio side-effect.

- **`computeStressTimeScale(stressLevel: number): number`** — čistá funkce, `stressLevel`
  0..1 (ořízne se, mimo-rozsahový vstup nikdy nevytvoří zápornou/přestřelenou hodnotu).
  `STRESS_TIME_SLOWDOWN_ENABLED === false` vrátí vždy `1` (efekt úplně vypnutý). Jinak `1 -
  stress * MAX_STRESS_TIME_SLOWDOWN`, capnuté na minimum `0` (obrana proti
  špatně nastavené konstantě > 1, ne běžný provozní stav).
- **Zásadní architektonická změna**: `remainingMs` byl dřív čistě odvozený z `elapsedMs`
  (`night.durationMs - elapsedMs`, přepočítáno každý `TICK`). Teď je to nezávisle
  dekrementovaná hodnota (`state.remainingMs - action.deltaMs * stressTimeScale`, clampnuté
  na `[0, night.durationMs]`) — `elapsedMs` samo dál běží čistou reálnou rychlostí
  (`state.elapsedMs + action.deltaMs`, beze změny), pořád řídí generátor
  (`faultEarliestAtMs`/`faultLatestAtMs`), kameru (`CAMERA_IMAGE_CYCLE_MS` cyklení),
  blackout timing atd. — jen "Čas do úsvitu" se odpojil od reálného plynutí. Díky tomu čas
  **nikdy neskáče nahoru**: `remainingMs` se vždy jen odečítá (o víc nebo míň podle stresu),
  nikdy nepřepočítává zpětně z `elapsedMs`, takže žádná náhlá korekce nemůže hodnotu zvýšit.
- **`GameAction`** (`gameActions.ts`): `TICK` má nové volitelné pole `stressLevel?: number` —
  chybí-li, `computeStressTimeScale(0)` vrátí `1` (normální rychlost), stejné chování jako
  dřív pro cokoliv, co `TICK` dispatchuje bez tohoto pole.
- **Propojení bez velkého refaktoru**: `useHeartbeatStress` počítá stress jen uvnitř
  `app/play/page.tsx` (React hook, ne globální stav), zatímco `useGameLoop`
  (`game/core/gameLoop.ts`) dispatchuje `TICK` z `setInterval`, který běží nezávisle na
  React rendery. Řešení: `stressLevelRef` (`MutableRefObject<number>`, volitelný parametr
  `useGameLoop`) — `page.tsx` ho vytvoří (`useRef(0)`), po každém renderu nastaví
  `stressLevelRef.current = heartbeatStress` (obyčejné přiřazení, ne efekt — "latest ref"
  vzor), `gameLoop.ts`'s `tickInterval` čte `stressLevelRef?.current` při každém tiku. Díky
  tomu se `tickInterval` nemusí kvůli měnícímu se stresu (~10×/s) pořád rušit a zakládat
  znovu — `useEffect` v `useGameLoop` má beze změny stejné závislosti
  (`isRunning`/`enemyTickMs`/`dispatch`).

Testy: `game/core/stressTimeScale.test.ts` (čistá funkce, včetně vypnutého efektu přes
`vi.doMock`), `game/core/tickStressTimeScale.test.ts` (reducer-level — `TICK` s různým
`stressLevel`, ověřuje že `remainingMs` nikdy neskočí nahoru a `elapsedMs` běží beze změny).

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
  (`beepIntervalMs` v `normal`, `criticalBeepIntervalMs` v `criticalBeeping`
  **i** `restarting` — playtest: energie mizela stejně rychle jako u
  `criticalBeeping`, ale bylo potichu, matoucí; teď pípá stejně) přes
  `generatorNextBeepAtMs`. Žádné audio se tu nevolá.
- `generatorBeepSeq` se při každém pípnutí zvýší o 1 — `app/play/page.tsx`
  sleduje jeho změnu přes `useRef` (stejný vzor jako `doorClosed`/`lightOn`) a
  vždy přehraje `generatorBeep` (stejný zvuk v `normal`/`criticalBeeping`/
  `restarting`, jen jiné tempo přes `beepIntervalMs`/`criticalBeepIntervalMs`
  — viz `AUDIO_DESIGN.md`).
- Šipka "Zkontrolovat generátor →" v `DeskView.tsx` bliká podle
  `isGeneratorArrowUrgent(state, night.generator)` (`game/core/generatorUrgency.ts`,
  čistá derived-state funkce) — **jen** v `criticalBeeping`, a i tam až
  po `GENERATOR_URGENT_BLINK_DELAY_MS` (2000 ms) od vstupu do stavu (dopočítáno z
  `generatorSilentSinceMs + silentGraceMs`, žádné nové pole v `GameState`). Rychlé
  pípání + rychlý pokles energie mají být jediná okamžitá signalizace, blikající
  tlačítko je až druhotné potvrzení o chvíli později. V `silentFault` (ticho samo
  je signál) ani `restarting` nebliká vůbec.
- `RESTART_GENERATOR`: v `silentFault`/`criticalBeeping` vrátí `normal` a naplánuje
  další normální pípnutí za `beepIntervalMs` od teď (beze změny). V `normal` NENÍ
  no-op — nastaví `generatorState: "restarting"`, `generatorRestartUntilMs:
  elapsedMs + restartPenaltyMs` a `generatorNextBeepAtMs: elapsedMs` (pípnutí
  hned, stejně jako přechod `silentFault` -> `criticalBeeping`) — extra spotřeba
  energie stejná jako `criticalBeeping`, viz `applyPowerDelta`. V `restarting` je
  no-op (druhý klik penalizaci neprodlužuje).
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
  nevyužité (jedna směna zatím). `LOADING_SCREEN_HINT_COUNT` (**1**) řídí, kolik hintů se
  vybere — `LoadingScreen` ukazuje vždy jen JEDEN hint, ne víc různých najednou (dřív 3, ale
  na 4 s `LOADING_SCREEN_DURATION_MS` se dřív stihly zobrazit jen 2, ne všechny 3).
- `components/screens/LoadingScreen.tsx` si hint vybere sám (`useState(() =>
  selectLoadingHints(1)[0])`, počítáno jednou při mountu), přes `splitSentences()` (regex na
  `.!?` + mezera/konec) ho rozdělí na věty a postupně je odkrývá stejným `setInterval`
  efektem jako dřív (`LOADING_SCREEN_DURATION_MS / sentences.length` na větu) — pokud má hint
  dvě věty (většina jich má), nejdřív se objeví první, pak druhá, ne dvě různé hlášky vedle
  sebe. Jedna věta bez tečky uprostřed (např. s pomlčkou) se zobrazí najednou. Self-contained,
  `app/play/page.tsx` o výběru hintu nic neví.
- `LoadingScreen` má ještě jeden `useEffect` (mount, prázdné deps), který zavolá
  `preloadBackgroundImages()` (`game/visuals/backgroundImages.ts`) a
  `preloadCameraImages()` (`game/cameras/cameraAssets.object13.ts`) — obojí jen `new
  Image().src = ...` pro každý soubor (žádné čekání na výsledek, žádný stav), ať je
  prohlížeč stihne stáhnout do cache dřív, než je hráč skutečně potřebuje (kamerový
  detail, pozadí obrazovek). `preloadCameraImages` prochází `CAMERA_ASSETS` (`default` i
  `lightOn` sadu u každé kamery, `normal` i `monster` snímky) — stejný vzor, nová funkce
  vedle existující `preloadBackgroundImages`, ne sloučené do jedné.

## Struktura assetů podle mapy/objektu (`public/<map>/...`)

Obrázkové assety jsou v `public/` rozdělené po mapách/objektech, ne v jedné ploché složce —
připraveno na to, až přibude druhá mapa/směna vedle Objektu 13:

- `public/object_13/background/` — atmosférická pozadí obrazovek (viz "Scénová pozadí" níže),
  `*.png` (zdrojové, z generování) + `*.webp` (skutečně použité, konvertované přes `cwebp`,
  viz CLAUDE.md "Povolení: konverze obrázků do WebP").
- `public/object_13/camera/` — obrázky pro obsah kamer (viz "Kamerové assety" níže).

`game/visuals/backgroundImages.ts` má konstantu `OBJECT_13_BACKGROUND_PATH =
"/object_13/background"`, ze které se skládají všechny `src` cesty šablonovými literály —
až přibude druhá mapa, přibude vlastní `<MAP>_BACKGROUND_PATH` konstanta a vlastní sada scén,
ne přepisování týž `BACKGROUND_SCENES`.

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
  se renderuje pro desk/generator (`BACKGROUND_SCENES.play`), jen ne během blackoutu
  (`state.gameStatus !== "blackout"`) — `BlackoutView` má vlastní atmosféru. **`DoorView`
  je výjimka** — vlastní obrázek řeší lokálně přes `DoorSceneFrame.tsx` (reálný `<img>`,
  ne viewport `bg-cover`), viz "Pohled hráče (DeskView / DoorView / GeneratorView)" níže;
  `GameScreen.tsx` proto pro `playerView === "door"` `SceneBackground` vůbec nerenderuje.
  `DeathScreen.tsx` navíc vybírá scénu podle `deathReason` — `door_open_at_attack` →
  `deathDoorAttack` (viz "Smrt u dveří má vlastní pozadí" níže), cokoliv jiného
  (`blackout_timeout`) → obecná `death`.

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
zvuku — `audioMuted`) a rovnou přepne obrazovku na `playing`. Lore: restart neznamená, že
se hráč "znovu narodil" nebo nahrál save — znamená to, že na stejné místo nastoupil další
noční hlídač (viz DeathScreen "Přijmout nového hlídače" a počítadlo níže).

## Počítadlo předchozích hlídačů (`game/core/deathCount.ts`)

Čistě lokální `localStorage` counter (klíč `nocni-hlidac:object13:death-count`), žádný
backend/login/databáze — `getDeathCount()` / `incrementDeathCount()`, obojí bezpečné mimo
prohlížeč (SSR) i bez dostupného `localStorage` (`try/catch`, fallback na `0`, hra nikdy
nespadne kvůli tomu).

`incrementDeathCount()` se volá výhradně v `app/play/page.tsx`, uvnitř existujícího
screen-transition `useEffect` (ten samý, co spouští jumpscare/audio na `screen === "death"`)
— díky `prevScreenRef` diffingu (stejný vzor jako `generatorBeepSeq`/`blackoutPhaseSeq`
jinde v kódu) firuje přesně jednou za skutečný přechod do `"death"`, ne při každém
rerenderu, ne při kliknutí na tlačítko restartu (`handleRestart` jen dispatchuje
`RESTART_SHIFT`) a ne při výhře. Výsledek se uloží do lokálního `useState<number>`
(inicializovaného lazy `getDeathCount()` při mountu `PlayPage`) a posílá se do
`DeathScreen.tsx` jako `deathCount` prop — `DeathScreen` sám žádný `localStorage` nečte,
jen zobrazuje `COPY.death.previousGuardsLabel` s dosazeným číslem.

## Survival streak aktuálního hlídače (`game/core/survivedNights.ts`)

Stejný vzor jako `deathCount.ts` výše (`localStorage`, klíč
`nocni-hlidac:object13:survived-nights`, bezpečné mimo prohlížeč/bez `localStorage`), ale
**per-hlídač**, ne celkový součet: `getSurvivedNights()` / `incrementSurvivedNights()` /
`resetSurvivedNights()`. `app/play/page.tsx` ve stejném screen-transition efektu jako
`deathCount`:

- `screen === "win"` → `setSurvivedNights(incrementSurvivedNights())`.
- `screen === "death"` → `setSurvivedNights(resetSurvivedNights())` — aktuální hlídač
  skončil, streak jde na 0. `deathCount` (celkový součet) tím není dotčen, počítá se dál
  nezávisle vedle toho.

Stejný `prevScreenRef` diffing zaručuje "přesně jednou za skutečný přechod", ne opakovaně
při rerenderu ani při kliknutí na tlačítko. Výsledek se posílá do `WinScreen.tsx` jako
`survivedNights` prop; skloňování noc/noci/nocí (1 / 2-4 / jinak) řeší malá čistá funkce
`formatSurvivedNights` přímo v `WinScreen.tsx`, ne v `content/copy.ts` (ten drží jen tři
tvary textu s `{count}` placeholderem).

`app/play/page.tsx` počítá `const currentNight = survivedNights + 1;` na jednom místě a
posílá ho jako `nightNumber` do `GameScreen.tsx` → `ShiftTimer.tsx` (i do night scalingu, viz
"Night scaling" výše) — "kolikátá noc" zobrazená vedle odpočtu za směny je tak stejné číslo
jako "za kolik nocí přijde WinScreen", jen o jednu dřív (aktuální rozdělaná noc). `ShiftTimer`
sám o sobě žádnou logiku nepočítá, jen zobrazí `COPY.game.nightLabel` s dosazeným číslem.

## Žárovky — krok 1: persistentní campaign počet (`game/core/bulbInventory.ts`)

Persistentní počet, zatím se nikde nesnižuje ve smyslu spotřeby (viz krok 2 níže, kde ho
poprvé opravdu snižuje denní servis). Stejný `localStorage` vzor jako
`deathCount.ts`/`survivedNights.ts`, ale záměrně **bez** reset volání nikde v kódu — na
rozdíl od `survivedNights` (reset při smrti) se `bulbsRemaining` musí přenášet mezi nocemi
**beze změny**, dokud ho nějaké pravidlo výslovně nesníží.

- `game/core/bulbsConfig.ts` — `BULBS_CONFIG = { startingCount: 10, defaultLifetimeMs: 30_000 }`,
  jediné místo s výchozími hodnotami pro novou kampaň. Žádná per-difficulty odlišnost (viz
  `difficultyConfig.ts`) zatím není potřeba — obě hodnoty musí odpovídat výchozí (medium)
  obtížnosti.
- `getBulbsRemaining()` — bez uloženého záznamu (nová kampaň) vrátí
  `BULBS_CONFIG.startingCount`, jinak uloženou hodnotu. `setBulbsRemaining(count)` — teď
  volané denním servisem (viz krok 2).
- `app/play/page.tsx`: `const [bulbsRemaining, setBulbsRemainingState] = useState(() =>
  getBulbsRemaining());` — lazy initializer, stejný vzor jako `deathCount`/`survivedNights`;
  setter teď použitý v efektu na `screen === "win"` (denní servis).
- UI: `PowerMeter.tsx` má volitelný prop `bulbsRemaining?: number` (stejný vzor jako
  `stressPercent`) — `"Žárovky: X"` vedle Energie/Stresu, ne finální design.

Testy: `game/core/bulbInventory.test.ts` — `typeof window === "undefined"` větev nejde
otestovat s reálným `localStorage` bez jsdom (projekt zatím žádné nemá), takže testy
simulují `window.localStorage` přes `vi.stubGlobal` (fake in-memory `Map`) — ověřují nová
kampaň = 10, uložená hodnota přežije opakované čtení (simulace přechodu mezi nocemi), a že
se nikdy sama neresetuje zpátky na 10.

## Žárovky — krok 2: životnost v místnosti (`game/core/roomBulbs.ts`)

Na rozdíl od kroku 1 (jednoduché číslo v localStorage) tohle **musí žít i uvnitř
`GameState`** — životnost ubývá kontinuálně během běžící směny podle toho, jestli světlo
zrovna svítí, což vyžaduje mutaci v `TICK`u (`applyPowerDelta`-like), ne jen čtení/zápis na
hranicích směny.

- **Typy** (`game/core/types.ts`): `RoomBulbState = { remainingMs, maxMs, broken }`,
  `RoomBulbsState = { nearRoom: RoomBulbState }` — `Record`-like tvar, připravený na další
  místnosti beze změny shape. `GameState` má nové `roomBulbs: RoomBulbsState` a
  `bulbBreakSeq: number` (sekvenční čítač pro audio, stejný vzor jako
  `generatorBeepSeq`/`monsterRetreatRoarSeq`).
- **`game/core/roomBulbs.ts`** — čtyři věci v jednom souboru (stejné seskupení jako u
  jednodušších campaign hodnot):
  - `createDefaultRoomBulbs()` — nová kampaň, `{ nearRoom: { remainingMs:
    BULBS_CONFIG.defaultLifetimeMs, maxMs: BULBS_CONFIG.defaultLifetimeMs, broken: false } }`.
  - `getRoomBulbs()`/`setRoomBulbs()` — `localStorage` (JSON, s validací tvaru při čtení,
    fallback na default při čemkoliv neplatném) — stejný `typeof window === "undefined"`
    SSR-safe vzor jako `bulbInventory.ts`.
  - **`isNearRoomLightActive(state): boolean`** — `state.lightOn && !bulb.broken &&
    bulb.remainingMs > 0`. Jediné místo pravdy pro "svítí opravdu", používá ho
    `gameReducer.ts` (drain životnosti) i `DeskView.tsx` (výběr osvětleného snímku kamery) —
    nikde jinde se tahle podmínka nepočítá zvlášť.
  - **`applyDailyBulbService(roomBulbs, bulbsRemaining)`** — čistá funkce, iteruje genericky
    přes `Object.keys(roomBulbs)` (ne natvrdo jen `nearRoom`), vymění za náhradní kus jen
    SKUTEČNĚ prasklé žárovky (dokud `bulbsRemaining > 0`), slabou-ale-neprasklou nechává
    beze změny.
- **Propojení do reduceru bez velkého refaktoru** (stejný problém a stejné řešení jako
  `currentNight`/`stressLevel` v `TICK` dřív, ale tady je potřeba mutace přes hranici směny,
  ne jen čtení): `START_SHIFT`/`RESTART_SHIFT` (`gameActions.ts`) mají nové volitelné pole
  `roomBulbs?: RoomBulbsState`. `createInitialGameState(night, roomBulbsOverride?)` ho použije
  místo `createDefaultRoomBulbs()`, pokud je předané. `app/play/page.tsx` čte `getRoomBulbs()`
  při každém dispatchi `START_SHIFT`/`RESTART_SHIFT` a posílá ho jako součást akce.
- **`gameReducer.ts#updateRoomBulbs(state, deltaMs)`** (volané z `TICK`, stejné místo jako
  `updateGenerator`/`updateDoorLightRepel`) — dokud `isNearRoomLightActive(state)` (PŘED-tikový
  stav, stejná konvence jako `applyPowerDelta`), `remainingMs -= deltaMs`; jakmile klesne na
  0: `broken: true`, `bulbBreakSeq + 1` (přesně jednou — `isNearRoomLightActive` už je `false`
  v následujících ticích, takže se větev znovu nespustí), a `lightOn: false` (vypínač sám
  cvakne, viz níže). Spread `...roomBulbsUpdate` je ve všech třech `TICK` return větvích
  (blackout/win/normal) stejně jako `generatorUpdate`/`doorLightRepelUpdate`.
- **`TOGGLE_LIGHT` guard** — `if (state.roomBulbs.nearRoom.broken) return state;` před
  přepnutím `lightOn`. Bez týhle guardy by šlo "zapnout" vypínač i s prasklou žárovkou, což
  by porušilo invariant, na kterém stojí `isNearRoomLightActive` (že `lightOn === true`
  nikdy nenastane spolu s `broken === true`).
- **`applyPowerDelta`/`updateDoorLightRepel` beze změny** — dál čtou syrové `state.lightOn`,
  ne `isNearRoomLightActive`. Bezpečné díky výše popsanému invariantu: `lightOn` se vždy
  vynuluje ve stejném ticku, kdy žárovka praskne, takže `state.lightOn` je vždy pravdivé
  samo o sobě, jakmile `TICK`/`TOGGLE_LIGHT` doběhnou.
- **Denní servis** (`app/play/page.tsx`, efekt na `screen === "win"`, NIKDY na `"death"`):
  `applyDailyBulbService(state.roomBulbs, getBulbsRemaining())` → `setRoomBulbs(...)` +
  `setBulbsRemaining(...)` (localStorage) + `setBulbsRemainingState(...)` (React state).
  Na `"death"` se místo servisu jen uloží `state.roomBulbs` verbatim (`setRoomBulbs(state.roomBulbs)`)
  — žárovka je vlastnost objektu, ne hlídače, restart pokračuje přesně odtud.
- **Audio** — nový event `AUDIO_EVENTS.bulbBreak` (`"bulb_break"`, `audioConfig.ts` +
  `soundRegistry.ts`), přehraje se v efektu na `state.bulbBreakSeq` (stejný vzor jako
  `monsterRetreatRoarSeq`).
- **UI** — `PowerMeter.tsx` dostal čtvrtý volitelný prop `nearRoomBulbLabel?: string`
  (předformátovaný text, PowerMeter sama nepočítá sekundy) — `GameScreen.tsx` počítá
  `Math.ceil(remainingMs / 1000) + " s"` nebo `COPY.game.bulbBrokenLabel`. `DebugPanel.tsx`
  navíc ukazuje syrové `remainingMs`/`maxMs`/`broken`/`isNearRoomLightActive`/`bulbBreakSeq`.

Testy: `game/core/roomBulbs.test.ts` (čisté funkce — `createDefaultRoomBulbs`,
`isNearRoomLightActive` pro všechny kombinace, `applyDailyBulbService`),
`game/core/roomBulbsStorage.test.ts` (`vi.stubGlobal` perzistence, stejný vzor jako
`bulbInventory.test.ts`), `game/core/tickRoomBulbs.test.ts` (reducer-level — drain jen při
reálném světle, prasknutí, `bulbBreakSeq` se nezvyšuje podruhé, `TOGGLE_LIGHT` guard),
`game/cameras/cameraAssets.object13.test.ts` (rozšířeno o test, že `door_hallway` nikdy
neukáže osvětlenou variantu, když je žárovka prasklá).

## Žárovky — krok 3: ruční výměna (`GameState.bulbReplacement`)

Na rozdíl od kroků 1–2 je tohle **riskantní hráčská akce řízená reducerem**, ne jen
persistentní/derivovaný stav — musí jít testovat bez `setTimeout` v komponentě.

- **`BulbReplacementState`** (`game/core/types.ts`) — `{ active: boolean; startedAtMs:
  number | null; progressMs: number }`. Nikdy se nepřenáší mezi směnami (na rozdíl od
  `roomBulbs`) — `createInitialGameState` ho vždy nastaví na neaktivní
  (`{ active: false, startedAtMs: null, progressMs: 0 }`), žádný override parametr jako u
  `roomBulbsOverride`.
- **`BULB_REPLACE_DURATION_MS`** (5000 ms, `game/balancing/constants.ts`) — jediné místo s
  délkou výměny.
- **`START_BULB_REPLACEMENT`** (`gameActions.ts`, nová akce bez payloadu) —
  `gameReducer.ts` case s guardy v pořadí: `isRunning`/`!blackout`/`!doorDeathReveal` (stejné
  jako ostatní akce), pak `playerView === "door"`, `!doorClosed`, `roomBulbs.nearRoom.broken`,
  `!bulbReplacement.active`. Kterákoliv podmínka neplatí → beze změny (tichý no-op, ne
  chyba) — druhý klik během už běžící výměny tak nikdy nezaloží druhou paralelní.
- **`updateBulbReplacement(state, deltaMs)`** (volané z `TICK`, stejné místo jako
  `updateGenerator`/`updateRoomBulbs`) — dokud `active`, `progressMs += deltaMs`; po dosažení
  `BULB_REPLACE_DURATION_MS` vrátí `{ bulbReplacement: <neaktivní>, roomBulbs: <nearRoom
  opravené na maxMs, broken: false> }`. **Důležitá past**: `roomBulbs` pole v návratovém typu
  je `volitelné`, ne vždy přítomné — kdyby funkce vždycky vracela `roomBulbs` (i beze změny =
  `state.roomBulbs`), spread `...bulbReplacementUpdate` v `TICK` by přebil skutečně spočítaný
  drain z `updateRoomBulbs` (ten běží nad původním `state`, ne nad už-updatovaným), protože
  by v object spreadu přišel až po něm. Tenhle bug se skutečně objevil při první
  implementaci (3 padající testy) — oprava: `roomBulbs` klíč se v návratu vůbec neobjeví,
  pokud výměna tenhle tik nekončí.
- **Riziko musí trvat celou dobu, ne jen na startu** — dva další guardy zajišťují, že se
  výměna zruší (bez opravy, `roomBulbs` beze změny), kdykoliv přestane platit "otevřené dveře
  + DoorView":
  - `TOGGLE_DOOR`: když se dveře PRÁVĚ zavírají (`!state.doorClosed` před přepnutím) a
    `bulbReplacement.active`, nastaví `bulbReplacement` na neaktivní.
  - `LOOK_AT_DESK`/`LOOK_AT_GENERATOR`: totéž, když hráč odejde z `DoorView`.
  - Blackout (`TICK`, `power <= 0` větev) taky force-nuluje `bulbReplacement` — systémy
    umírají, výměna se nedokončí.
- **Smrt během výměny** — `ENEMY_ADVANCE`, větev `atDoorStage && !doorClosed &&
  playerView === "door"` (jediná, kde `bulbReplacement.active` může vůbec být `true`, díky
  guardám výše): `deathReason: state.bulbReplacement.active ? "bulb_replacement_attack" :
  "door_open_at_attack"`. Zbytek sekvence (doorDeathReveal, jumpscare timing) beze změny.
  `DeathReason` má nový člen `bulb_replacement_attack`; `DeathScreen.tsx` pro něj používá
  stejné pozadí jako `door_open_at_attack` (`BACKGROUND_SCENES.deathDoorAttack`), jen jiný
  text z `content/copy.ts` `death.reasons`. `game/jumpscares/jumpscares.object13.ts`
  (nepoužitá připravená data, `Record<DeathReason, ...>`) musela dostat odpovídající záznam,
  jinak by typecheck spadl na chybějící klíč.
- **UI** (`DoorView.tsx`) — ikonka (💡 + label, MVP bez nového obrázkového assetu) se
  zobrazí jen `!doorClosed && bulbBroken`, jako **samostatná absolutní vrstva** uvnitř
  `DoorSceneFrame` — sourozenec `.door-hotspot`, ne jeho potomek, umístěná mimo hotspotův
  obdélník (`left: 30–70%, top: 14–84%`) na `left: 84%, top: 48%`, takže se s ním nikdy
  vizuálně ani klikací plochou nepřekrývá. `onClick` má i tak `event.stopPropagation()` pro
  jistotu (sourozenci by stejně nebublali do sebe, ale žádné budoucí zanoření to nerozbije).
  Během `bulbReplacementActive` je tlačítko `disabled` a místo ikonky ukazuje uplynulé
  sekundy + malou progress lištu (`bulbReplacementProgressMs / BULB_REPLACE_DURATION_MS`).
  Props (`bulbBroken`, `bulbReplacementActive`, `bulbReplacementProgressMs`,
  `onStartBulbReplacement`) protažené z `app/play/page.tsx` přes `GameScreen.tsx`.

Testy: `game/core/bulbReplacement.test.ts` — `START_BULB_REPLACEMENT` guardy (broken/door
open/playerView/no-double-start), `TICK` progress + oprava po 5 s, zrušení při
`TOGGLE_DOOR`/`LOOK_AT_DESK`, `bulb_replacement_attack` vs. `door_open_at_attack` death
reason, reset po `RESTART_SHIFT`.

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
