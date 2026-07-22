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

- `roll < advanceChance` → postup o index dál
- `roll < advanceChance + retreatChance` → ústup o index zpět, s `Math.max(currentIndex - 1,
  0)` — na první pozici trasy tedy nemá kam ustoupit a `decision` se přepíše na `"stay"`
- jinak → zůstává na místě

`advanceChance`/`retreatChance` jsou buď `night.enemy.advanceChance`/`retreatChance` (běžný
hod), nebo — pokud `game/core/sonicCannon.ts#isSonicCannonAffectingEnemy` vrátí `true` —
`SONIC_CANNON_ADVANCE_CHANCE`/`SONIC_CANNON_RETREAT_CHANCE` (0.08/0.32, viz
balancing/constants.ts) PŘESNĚ pro tenhle jeden hod. Pouhé sledování kamery (bez aktivního
`state.sonicCannonActive`) na tenhle výpočet nemá žádný vliv — dřívější
`watchedAdvanceMultiplier` byl odstraněn.

Než k tomuhle hodu vůbec dojde, `game/core/monsterMinStay.ts#isMonsterMinStayBlocking`
zkontroluje, jestli monstrum ve svém `enemyStage` setrvalo aspoň
`MONSTER_MIN_LOCATION_STAY_MS[enemyStage]` (viz balancing/constants.ts) — pokud ne, hod se
vůbec neprovede (`lastEnemyDecision: "stay"`, žádný roll, žádný sonický rádiový event).
Timestamp posledního skutečného přesunu (`GameState.enemyLocationEnteredAtMs`) se
aktualizuje centrálně ve `withEnemyStageVisitSeed` (stejná funkce, která zvyšuje
`enemyStageVisitSeq`), takže funguje automaticky pro VŠECHNY cesty, které `enemyStage`
nastavují — normální postup i explicitní repely/gave_up/brokovnici/office threat, které
`isMonsterMinStayBlocking` samy nikdy nevolají (nejsou jím blokovatelné).

Sonický výsledek (`retreat`→`"success"`, `stay`→`"stay"`, `advance`→`"fail"`) se zapisuje do
`GameState.lastSonicCannonResult` + `sonicCannonResultSeq` (seq-counter vzor, reducer sám
žádné audio nevolá) — VÝHRADNĚ když `isSonicCannonAffectingEnemy` bylo `true` pro tenhle
konkrétní hod. `game/radio/useMonsterRepelRadioMessage.ts` podle změny seq přehraje náhodnou
variantu z `game/radio/monsterRepelRadioMessages.ts`.

`GameState.sonicCannonActive` (viz `game/core/sonicCannon.ts`) se zapíná/vypíná akcí
`TOGGLE_SONIC_CANNON` (aktivace vyžaduje otevřený DETAIL kamery na stole a `power > 0`) a
automaticky vypíná dvěma nezávislými cestami:
- centrální wrapper `withSonicCannonAutoOff` (stejné místo jako `withEnemyStageVisitSeed`)
  — kdykoliv přestanou platit podmínky (zavření detailu, přepnutí kamery, blackout, konec
  směny/smrt), TICHÝM způsobem (beze změny `sonicCannonToggleSeq`, viz níže);
- PŘÍMO v `ENEMY_ADVANCE`, jako součást `sonicResultUpdate` (viz zadání "doladit
  sonické dělo... automaticky vypnulo po prvním skutečně vyhodnoceném movement decision
  ticku") — pokaždé, když `sonicEffective` bylo `true` (bez ohledu na výsledek
  success/stay/fail), `sonicCannonActive: false` je součástí STEJNÉHO update objektu jako
  `sonicCannonResultSeq`/`lastSonicCannonResult`, takže radio výsledek a vypnutí dorazí do
  UI atomicky spolu, nikdy odděleně.

Energie: `game/core/powerDrain.ts` má drain vázaný na `isSonicCannonRunning(state)` místo
dřívějšího "cameraOpen && playerView desk" — stejná sazba (`idle` + `cameraOpen` rate), jen
přesunutá z pouhého sledování na aktivní dělo.

`GameState.sonicCannonToggleSeq`/`lastSonicCannonToggleReason` ("manual_on" |
"manual_off" | "result_auto_off") rozlišují ZÁMĚRNOU změnu (ruční toggle i auto-off po
výsledku) od tiché `withSonicCannonAutoOff` cesty — zvyšují se JEN u té první. `app/play/page.tsx`
efekt na `sonicCannonToggleSeq` (přes čistou `game/core/sonicCannon.ts#shouldPlaySonicCannonToggleClick`)
podle toho přehraje přesně jedno mechanické cvaknutí (znovupoužitý `AUDIO_EVENTS.lightClick`,
žádný nový click event) — nikdy pro reset/menu (seq zpátky na 0), nikdy pro tiché
auto-off přes kameru/blackout. Samostatný efekt na `sonicCannonActive` (jediný zdroj
pravdy, viz zadání "nevytvářej paralelní lokální boolean") spouští/zastavuje loop
`AUDIO_EVENTS.sonicCannonHum` (`startLoop`/`stopLoop`) — pokrývá tak úplně VŠECHNY cesty k
`false` stejně, plus `unmount` cleanup navíc jako tvrdá pojistka.

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
  (`< 1`, `NaN`, necelé číslo se zaokrouhlí dolů) se bezpečně bere jako noc 1.
  `energyDrainMultiplier` je explicitní tabulka (`NIGHT_ENERGY_DRAIN_MULTIPLIERS` v
  `nightScaling.ts`, ne lineární step/cap výpočet): noc 1 → 1.00, noc 2 → 1.05, noc 3 → 1.10,
  noc 4 → 1.15, noc 5 → 1.25, noc 6 → 1.40, noc 7 → 1.55, noc 8 → 1.70, noc 9 → 1.85, noc 10 a
  dál → capnuté na 2.00. Noc 5 je záměrně první větší skok (ne jen +5 %) — od tamtud má začít
  dávat smysl nouzová obchůzka/baterie (viz "Night config" níže).
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
(`durationMs`, `phaseThresholdsMs`, `canBeSurvivedIfShiftEnds`, `roarLeadMs`) je
`NightDefinition.blackout: BlackoutDefinition` (`game/nights/night01.ts`).

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
  - Nezávisle na fázích výše se stejně porovná `blackoutElapsedMs` proti
    `night.blackout.durationMs - night.blackout.roarLeadMs` — při prvním překročení
    (`state.blackoutElapsedMs < roarThresholdMs && blackoutElapsedMs >= roarThresholdMs`)
    se `blackoutRoarSeq` zvýší o 1, stejný sekvenční-čítač vzor, žádné volání audia z
    reduceru. Nezávislé na `blackoutPhaseSeq`/`getBlackoutPhaseIndex` — roar nemá
    vlastní "fázi" v `BlackoutView`, je to čistě audio signál těsně před smrtí.
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
  jako závislost) přehraje `blackoutStepsFar` (fáze 1) nebo `blackoutStepsNear` (fáze 2) —
  VLASTNÍ eventy, ne znovupoužité `enemyStep`/`enemyNear`; fáze 3 (těsně před koncem) místo
  dalšího zvuku zavolá `audioManager.fadeOutLoop(ambienceLoop, BLACKOUT_FINAL_AMBIENCE_FADE_MS)`
  — ambient plynule doztichne úplně. Další, nezávislý `useEffect` sleduje `blackoutRoarSeq`
  (stejný `useRef`-diffing vzor, žádný vlastní `setTimeout` — časování řídí `TICK`) a při
  změně přehraje `blackoutMonsterRoar`, krátce před finálním `screen === "death"`. Konečný
  `jumpscare` řeší už existující efekt na `screen === "death"`, beze změny.
  Dominantní heartbeat v blackoutu není nový kód — `power` se nastaví na `0` v okamžiku
  vstupu do blackoutu a zůstává tam po celou dobu, takže `computeLowPowerStressBonus`
  (viz "Stres a heartbeat" v AUDIO_DESIGN.md) od prvního tiku dál vždy vrací maximum.
- `DebugPanel.tsx` k `gameStatus`/`blackoutElapsedMs` navíc zobrazuje aktuální fázi
  (`getBlackoutPhaseIndex`), `blackoutPhaseSeq` a `blackoutRoarSeq`.

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
- **`BULB_REPLACE_DURATION_MS`** (10 000 ms, `game/balancing/constants.ts`) — jediné místo s
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
  vizuálně ani klikací plochou nepřekrývá. Pointer eventy mají i tak `event.stopPropagation()`
  pro jistotu (sourozenci by stejně nebublali do sebe, ale žádné budoucí zanoření to
  nerozbije). Během `bulbReplacementActive` ukazuje ikonka uplynulé sekundy + malou progress
  lištu (`bulbReplacementProgressMs / BULB_REPLACE_DURATION_MS`). **Ovládání (klik vs. hold) a
  vizuální rozsvěcení popsané tady jsou od kroku 4 nahrazené — viz "Žárovky — krok 4" níže.**
  Props (`bulbBroken`, `bulbReplacementActive`, `bulbReplacementProgressMs`,
  `onStartBulbReplacement`, `onCancelBulbReplacement`) protažené z `app/play/page.tsx` přes
  `GameScreen.tsx`.

Testy: `game/core/bulbReplacement.test.ts` — `START_BULB_REPLACEMENT` guardy (broken/door
open/playerView/no-double-start), `TICK` progress + oprava po plné době držení, zrušení při
`TOGGLE_DOOR`/`LOOK_AT_DESK`, `bulb_replacement_attack` vs. `door_open_at_attack` death
reason, reset po `RESTART_SHIFT`.

## Žárovky — krok 4: spotřeba, hold-to-replace, rozsvěcení ikonky

Krok 3 dovolil vyměnit prasklou žárovku klikem bez spotřeby náhradního kusu. Krok 4 opravuje
tři věci, beze změny řízení rizika (otevřené dveře, DoorView, žádný blackout/doorDeathReveal)
z kroku 3.

- **`bulbsRemaining` teď žije v `GameState`**, ne jen v localStorage čteném component-level
  React state (`app/play/page.tsx`) — reducer potřebuje spotřebovat kus přímo v `TICK`u, ne
  jen na hranicích směny. Přidáno stejným vzorem jako `roomBulbs`:
  - `GameState.bulbsRemaining: number` (`game/core/types.ts`).
  - `createInitialGameState(night, roomBulbsOverride?, bulbsRemainingOverride?)` — třetí
    volitelný parametr, fallback `BULBS_CONFIG.startingCount` (`game/core/gameState.ts`).
  - `START_SHIFT`/`RESTART_SHIFT` nesou volitelné `bulbsRemaining?: number`
    (`gameActions.ts`) — `app/play/page.tsx` ho posílá z `getBulbsRemaining()` (localStorage).
  - `app/play/page.tsx` už nemá lokální `bulbsRemaining` React state — zobrazuje/persistuje
    přímo `state.bulbsRemaining`. Persistuje se na obou přechodech: `death` (`setBulbsRemaining
    (state.bulbsRemaining)`, i když smrt nemá s výměnou nic společného — spotřeba dřív v týhle
    směně nesmí zmizet) a `win` (`applyDailyBulbService(state.roomBulbs, state.bulbsRemaining)`
    — **záměrně živá hodnota ze `state`, ne stará `getBulbsRemaining()`**, jinak by denní
    servis přebil spotřebu z manuální výměny dokončené dřív v týhle směně).
- **Spotřeba při dokončení** — `BulbReplacementTickResult` (`gameReducer.ts`) má nové
  volitelné pole `bulbsRemaining?: number`, stejný "absent, dokud se nemění" vzor jako
  `roomBulbs` (viz krok 3 výše) — jinak by spread v `TICK`u mohl přebít jinou aktualizaci
  stejného pole. Přítomné jen v completion větvi `updateBulbReplacement`:
  `bulbsRemaining: state.bulbsRemaining - 1` (nemůže jít pod 0, protože start je zagatovaný,
  viz níže).
- **`START_BULB_REPLACEMENT` guarda navíc**: `if (state.bulbsRemaining <= 0) return state;` —
  bez náhradních žárovek výměna vůbec nezačne.
- **Hold-to-replace** — nová akce `CANCEL_BULB_REPLACEMENT` (`gameActions.ts`, bez payloadu):
  no-op mimo aktivní výměnu, jinak reset na `INACTIVE_BULB_REPLACEMENT` (beze změny
  `roomBulbs`/`bulbsRemaining`). `DoorView.tsx` nahradila `onClick`/`disabled` za
  `onPointerDown` (start, `stopPropagation` + `preventDefault`), `onPointerUp` /
  `onPointerLeave` / `onPointerCancel` (všechny → cancel — puštění, odjetí prstu/kurzoru mimo
  tlačítko, i systémové přerušení gesta mají stejný efekt). Tlačítko má `touch-none select-
  none`, ať držení na mobilu nespustí scroll/výběr textu. Progress dál počítá výhradně reducer
  (`TICK` + `active` flag), komponenta žádný lokální timer nemá.
- **Rozsvěcení ikonky** — nová čistá funkce `computeBulbReplacementProgressRatio(progressMs)`
  (`game/core/bulbReplacementProgress.ts`, testováno v `bulbReplacementProgress.test.ts`):
  `progressMs / BULB_REPLACE_DURATION_MS` clampnuté na 0..1. `DoorView.tsx` z ní odvodí inline
  styl ikonky (`brightness(0.35 + ratio*1.2)`, `opacity 0.55 + ratio*0.45`, `box-shadow` glow
  rostoucí s ratio) — mimo aktivní výměnu je ratio vždy 0 (tmavá ikonka). Vychází výhradně z
  `GameState.bulbReplacement.progressMs`, žádná lokální React animace, která by se mohla
  rozjet mimo herní stav.
- **DebugPanel** teď zobrazuje `Náhradní žárovky: {state.bulbsRemaining}` (mimo DoorView je to
  i `PowerMeter`, ale ten se v DoorView neukazuje — DebugPanel je jediné místo viditelné ve
  všech pohledech).

Testy: rozšířené `game/core/bulbReplacement.test.ts` (guard na `bulbsRemaining <= 0`,
nesnížení při startu/progress/cancel/smrti, snížení přesně o 1 při dokončení,
`CANCEL_BULB_REPLACEMENT` no-op mimo aktivní výměnu i reset + restart), nový
`bulbReplacementProgress.test.ts` (0 / 0.5 / 1 / clamp nad 1).

## Žárovky — krok 5: feedback po úspěšné výměně

Krok 4 opravila spotřebu/hold/rozsvěcení, ale úspěšná výměna neměla žádné potvrzení — ikonka
prostě zmizela. Krok 5 přidává zvuk + krátkou textovou hlášku, striktně jen na skutečné
dokončení (ne start, cancel, ani smrt).

- **`GameState.bulbReplaceSuccessSeq: number`** (`game/core/types.ts`) — stejný "seq" vzor
  jako `bulbBreakSeq`: zvyšuje se přesně o 1, `app/play/page.tsx` podle změny (přes
  `useRef` diffing) spustí audio, žádná herní logika na něm nezávisí.
  `createInitialGameState` ho vždy nastaví na 0 (nepřenáší se mezi směnami, stejně jako
  `bulbReplacement`).
- **`updateBulbReplacement`** (`gameReducer.ts`) — completion větev navíc vrací
  `bulbReplaceSuccessSeq: state.bulbReplaceSuccessSeq + 1` jako další volitelné pole na
  `BulbReplacementTickResult` (stejný "absent, dokud se nemění" vzor jako `roomBulbs`/
  `bulbsRemaining` výše). Necompletion větve (progress, `!active`) ho vůbec nevrací, takže
  `CANCEL_BULB_REPLACEMENT` a smrt (které nikdy nedosáhnou téhle větve) ho logicky nemůžou
  zvýšit.
- **Audio** — nový event `bulb_replace_success` (`game/audio/audioEvents.ts`,
  `audioConfig.ts`, `app/dev-sound/soundRegistry.ts` — `Record<AudioEventId, ...>` vynutil
  doplnění všude). Krátké, pozitivní, technické "vzum" — ne hlasitý UI beep, ne hororový
  zvuk. Reálný soubor zatím neexistuje, fallback synth je dvoutónový sine sweep nahoru
  (260 Hz → 520 Hz, ~0.3 s celkem, volume 0.35) — stejná fallback konvence jako
  `monsterRetreatRoar`/`blackoutHowl`/`bulbBreak`. `app/play/page.tsx` má nový
  `prevBulbReplaceSuccessSeqRef` + efekt analogický `bulbBreakSeq`.
- **Text** — `DoorView.tsx` dostala nový prop `bulbReplaceSuccessSeq: number` (protažený z
  `GameScreen.tsx` přímo ze `state`, žádný nový prop na `GameScreenProps` nebyl potřeba).
  Uvnitř komponenty lokální `useState`/`useEffect` + `setTimeout`
  (`BULB_REPLACE_SUCCESS_MESSAGE_MS = 1800 ms`, `game/balancing/constants.ts`) na změnu seq
  zobrazí COPY.game.bulbReplaceSuccessLabel ("Žárovka vyměněna.") na ~1.8 s. Tohle je
  výjimka z "progress v reduceru, ne setTimeout v komponentě" pravidla z kroku 3/4 — tam šlo
  o herní stav (progres výměny ovlivňuje, jestli se žárovka opraví), tady jde o čistě
  kosmetický toast bez vlivu na hru, `ref` navíc hlídá, aby efekt nevystřelil hlášku hned při
  prvním mountu. Hláška je `pointer-events-none` a pozicovaná mimo `.door-hotspot` obdélník
  (`left: 50%, top: 8%`), takže nikdy neblokuje klikání na dveře.

Testy: rozšířené `game/core/bulbReplacement.test.ts` — `bulbReplaceSuccessSeq` se zvýší jen
při dokončení, ne při startu/progress/cancelu/smrti.

## Žárovky — krok 6: preventivní výměna kdykoliv ("zásobníková" mechanika)

Kroky 1–5 dovolily vyměnit žárovku jen PO prasknutí. Krok 6 tenhle práh ruší úplně — výměna
je teď jako výměna zásobníku: jde vyměnit i skoro novou žárovku, stará se vždy zahodí, žádná
zbývající životnost se nešetří ani nevrací.

- **`canReplaceBulb(state)`** — nová exportovaná čistá funkce v `gameReducer.ts`, sdílená
  podmínka mezi `START_BULB_REPLACEMENT` (case teď jen `if (!canReplaceBulb(state)) return
  state;`) a UI (`GameScreen.tsx` ji volá přímo a posílá jako `canReplaceBulb` prop do
  `DoorView.tsx`). Oproti dřívějším guardám **záměrně chybí** `roomBulbs.nearRoom.broken` —
  to je jediná změna oproti předchozí podmínce (`isRunning`/`!blackout`/`!doorDeathReveal`,
  `playerView === "door"`, `!doorClosed`, `!bulbReplacement.active`, `bulbsRemaining > 0`
  zůstávají beze změny).
- **Trvale viditelná ikonka** — `DoorView.tsx`: `showBulbReplacement` už nezávisí na
  `bulbBroken` ani `doorClosed`, jen na `!isDoorDeathReveal` (ikonka zmizí jen na tu krátkou
  chvíli, kdy scéna ukazuje monstrum ve dveřích těsně před smrtí — jinak vždy vidět, i se
  zavřenými dveřmi nebo s žárovkou na 100 % života).
- **Vizuální opotřebení** — nová čistá `computeNearRoomBulbWearRatio(state)`
  (`game/core/roomBulbs.ts`) vrací 0 (prasklá/nulová `maxMs`) až 1 (plná/nová) z
  `remainingMs / maxMs`. `DoorView.tsx` mimo aktivní výměnu použije tenhle poměr jako
  `displayRatio` pro stejný brightness/opacity/glow výpočet, který dřív řídil jen
  `progressRatio` během výměny — nová žárovka svítí jasně, vybitá je tmavá, prasklá má navíc
  jemný `grayscale(0.6)` filtr navrch (drobné odlišení od "jen skoro prázdné"). Během aktivní
  výměny se `displayRatio` přepne zpátky na `computeBulbReplacementProgressRatio` (beze
  změny chování z kroku 4) — ikonka se tedy vždycky rozsvěcí od tmava, bez ohledu na to, jak
  moc byla stará žárovka opotřebená.
- **Stará žárovka se vždy zahodí** — beze změny oproti kroku 4: completion větev
  `updateBulbReplacement` vždy nastaví `remainingMs: maxMs, broken: false` bez ohledu na
  vstupní `remainingMs` (i 90 % života se přepíše na 100 %, ne "zůstane 90 % + zbytek").
  Žádná logika nikde nesčítá/průměruje starou a novou životnost.
- **Spotřeba náhradní žárovky až po dokončení** — beze změny mechanismu z kroku 4 (optional
  `bulbsRemaining` pole na `BulbReplacementTickResult`, přítomné jen v completion větvi) —
  jen teď platí i pro neprasklé žárovky, protože `START_BULB_REPLACEMENT` už na `broken`
  nekouká.
- **Text** zůstává jednotný `COPY.game.bulbReplaceLabel` ("Vyměnit žárovku") bez ohledu na
  stav žárovky — žádný rozdíl mezi "oprava" a "preventivní výměna" v UI textu (na výslovné
  přání, ať hráč nemusí rozlišovat dva různé flow).

Testy: rozšířené `game/core/bulbReplacement.test.ts` — start funguje na prasklé i neprasklé
žárovce (90 % i nízká životnost), completion vždy resetuje `remainingMs` na `maxMs` bez
ohledu na vstupní hodnotu.

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

## Discord login (základ identity hráče pro budoucí žebříček)

**Rozsah tohoto kroku**: přihlásit/odhlásit přes Discord a zobrazit přihlášeného hráče v
menu. **Záměrně NEobsahuje**: DB tabulku `players`, leaderboard, ukládání výsledků směny,
vzkazy hlídačů — to jsou další, samostatné kroky. Hra jde hrát beze změny i bez přihlášení;
game loop/death/win flow/žárovky/kamery/monster logika/difficulty se vůbec nedotkly.

Adaptováno z **osmaliga.cz** (`app/api/auth/{login,callback,logout,me}/route.ts`,
`lib/auth/session.ts`, `components/auth/AuthStatus.tsx`) — vlastní, na knihovnách nezávislý
OAuth + session mechanismus (žádný NextAuth/iron-session), stejná struktura, jen:
- odstraněný krok "upsert do DB" v callbacku (osmaliga.cz to posílá do samostatné
  `project-hub-api` mikroslužby — tady zatím žádná DB tabulka neexistuje),
  `PROJECT_HUB_API_URL`/`PROJECT_HUB_API_KEY` proto nejsou potřeba,
- `redirect_uri` čtený z explicitního `DISCORD_REDIRECT_URI` (ne odvozený z `AUTH_URL`),
  same-origin redirecty (`/`, `?auth=error`) staví na `request.url` (funguje beze změny na
  Vercel preview URL i produkci),
- session payload = přesně `DiscordPlayer` typ ze zadání (`discordUserId`, `username`,
  volitelné `displayName`/`avatarUrl`), ne osmaliga.cz širší `OsmaSession`.

**Session mechanismus** (`lib/auth/session.ts`) — `base64url(JSON.stringify(DiscordPlayer)) +
"." + hex(HMAC-SHA256 podpis)` v httpOnly cookie (`nocni-hlidac-session`, `sameSite: lax`,
`secure` jen v produkci, 30 dní). `decodeSession` ověřuje podpis přes `timingSafeEqual`
(ne prosté `===`). Bez `AUTH_SECRET` v env `encodeSession`/`decodeSession` vrátí `null` —
přihlášení se v tom případě tiše NEprovede (žádná nepodepsaná/padělatelná session), ne pád
aplikace.

**OAuth flow**:
1. `GET /api/auth/login` — vygeneruje náhodný `state` (`crypto.randomBytes(16)`), uloží ho do
   krátkodobé (`300s`) httpOnly cookie `nocni-hlidac-oauth-state`, přesměruje na Discord
   authorize URL se scope jen `identify` (žádný e-mail, žádné guildy).
2. `GET /api/auth/callback` — ověří `state` proti cookie (CSRF ochrana), vymění `code` za
   access token, načte `https://discord.com/api/users/@me`, uloží
   `{ discordUserId, username, displayName?, avatarUrl? }` do podepsané session cookie,
   smaže `oauth-state` cookie, přesměruje na `/`.
3. `POST /api/auth/logout` — smaže session cookie, 303 redirect na `/`. Žádné volání Discord
   API (token se nikde neukládá, není co revokovat).
4. `GET /api/auth/me` — vrátí `{ player: DiscordPlayer | null }`, čte jen cookie
   (`getSession()`), nikdy nevolá Discord API znovu.

Kterákoliv chybějící/špatná config (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
`DISCORD_REDIRECT_URI`, `AUTH_SECRET`) → tichý redirect na `/?auth=config_error`, ne pád
buildu ani runtime chyba — build funguje i s úplně prázdným `.env` (ověřeno).

**UI**: `components/auth/AuthStatus.tsx` — client komponenta (fetch `/api/auth/me` při
mountu), protože `MainMenuScreen.tsx` běží pod `"use client"` stromem `app/play/page.tsx`
(nemůže být async Server Component s přímým `getSession()`). Vykreslená v
`MainMenuScreen.tsx` pod termíny odkazem, jako nenápadný malý text — hlavní CTA "Nastoupit na
směnu" zůstává jediné výrazné tlačítko. Texty v `COPY.auth` (`content/copy.ts`), ne natvrdo
v komponentě.

**Env/config** (`.env.example`, nikdy commitované skutečné hodnoty):
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — z Discord Developer Portal, OAuth2.
- `DISCORD_REDIRECT_URI` — musí přesně sedět na jeden ze zaregistrovaných redirectů v Discord
  Developer Portal (jinak Discord vrátí `Invalid OAuth2 redirect_uri`).
- `AUTH_SECRET` — HMAC podpis session cookie, `openssl rand -base64 32`.
- `DATABASE_URL` zatím NENÍ potřeba — žádná DB tabulka v tomhle kroku neexistuje.

**Co zůstává na další krok** (výslovně mimo rozsah): DB tabulka `players` (id,
discord_user_id, username, display_name, avatar_url, created_at, updated_at,
last_login_at) a upsert v callbacku, leaderboard, ukládání výsledků směny, vzkazy hlídačů,
ochrana/gating jakékoli herní route podle přihlášení (žádná dnes neexistuje, hra je celá
veřejná).

## Žebříček hlídačů (`/leaderboard`) — jen frontend, mock data

**Rozsah tohoto kroku**: statická stránka `/leaderboard` s Top 10 tabulkou a natvrdo napsanými
mock daty v kódu. **Záměrně NEobsahuje**: API endpoint, DB, ukládání výsledků směny po
smrti/výhře, vzkazy hlídačů — to je až další krok, až bude co reálně ukládat (viz "Discord
login" výše, "Další kroky po MVP" v TODO.md).

- **Typ dat**: `GuardLeaderboardEntry` (`lib/leaderboard/types.ts`) — zjednodušeno na
  `guardName`, `bestRun`, `currentRun`. `bestRun` = nejlepší dosažený počet přežitých nocí
  (rekord, nikdy neklesá), `currentRun` = aktuálně rozehraná série (0 = hlídač bez aktivní
  směny). Budoucí (zatím NEIMPLEMENTOVANÉ) herní pravidlo, jen zapsané jako komentář u typu:
  po přežité noci `currentRun += 1; bestRun = max(bestRun, currentRun)`, po smrti
  `currentRun = 0` (bestRun beze změny). Death reason/last run/datum záznamu záměrně
  odstraněné z hlavní tabulky — patří do budoucího `guard_runs`/vzkazů, ne sem. Záměrně BEZ
  `rank` pole — pořadí v tabulce se počítá jako `index + 1` při renderu
  (`app/leaderboard/page.tsx`), ať nemůže vzniknout nesoulad mezi uloženým pořadím a
  skutečným řazením podle `bestRun`.
- **Mock data**: `lib/leaderboard/mockLeaderboard.ts` — 10 pevných záznamů seřazených
  sestupně podle `bestRun`, exportovaná přes jedinou funkci
  `getLeaderboardEntries(): Promise<GuardLeaderboardEntry[]>` (beze změny signatury).
  Návratový typ je záměrně `Promise`, i když teď žádné I/O neprobíhá — až se nahradí
  skutečným fetch/DB dotazem, volající strana (`await getLeaderboardEntries()` v
  `page.tsx`) se nemusí měnit vůbec, jen implementace uvnitř týhle jedné funkce.
- **Skloňování počtu nocí**: `formatNights(count)` (`lib/leaderboard/formatNights.ts`) —
  čistá pomocná funkce pro české skloňování (1 noc, 2-4 noci, 0/5+ nocí), zvlášť od
  `COPY.leaderboard` textů, protože jde o gramatickou logiku, ne o vyměnitelný text.
  `currentRun === 0` se místo `formatNights(0)` zobrazí jako
  `COPY.leaderboard.noActiveRunLabel` ("bez aktivní směny").
- **Sloupce tabulky**: Pořadí, Hlídač, Rekord (`bestRun`), Aktuální směna (`currentRun`).
  Pod podtitulem je krátké vysvětlení (`COPY.leaderboard.explanation`), co která hodnota
  znamená.
- **Stránka** (`app/leaderboard/page.tsx`) — Server Component (stejný vzor jako
  `app/about/page.tsx`/`app/terms/page.tsx`, žádné `"use client"`, žádný stav), stejné
  pozadí jako menu (`BACKGROUND_SCENES.menu`), širší panel (`max-w-2xl` místo `max-w-md`
  u about/terms) kvůli tabulce, ale stejný `pixel-panel`/tmavý styl. Tabulka je zabalená v
  `overflow-x-auto`, ať zůstane čitelná i na mobilu bez rozbití layoutu.
- **Navigace**: nenápadný odkaz `COPY.menu.leaderboardLinkLabel` v `MainMenuScreen.tsx`,
  hned pod odkazem na podmínky služby — stejný vizuální styl (malý šedý text), hlavní CTA
  "Nastoupit na směnu" zůstává jediné výrazné tlačítko beze změny.
- Texty v `COPY.leaderboard` (`content/copy.ts`), ne natvrdo v komponentě — stejná konvence
  jako zbytek projektu.

## VPS API specifikace — online bestRun/currentRun (adaptováno z osmaliga.cz)

**Princip** (stejný jako osmaliga.cz → project-hub-api): Vercel appka NEMÁ přímé DB
připojení. Volá soukromé VPS API (mimo tento repozitář), to teprve mluví s DB. Žádný
`DATABASE_URL` ve Vercelu.

### Co bylo zjištěno v osmaliga.cz

- Žádný sdílený API klient — každý call site duplikuje vlastní `fetch` s
  `x-project-hub-key`/`X-Project-Hub-Key` hlavičkou (nekonzistentní casing, ale HTTP
  hlavičky nejsou case-sensitive). Pro nocni-hlidac je to zbytečná duplikace na jen pár
  endpointů — místo toho jeden sdílený `lib/hubClient.ts`.
  - `app/api/auth/callback/route.ts`: `POST /api/osma-liga/users/discord-upsert` po
    úspěšném Discord loginu — **plně non-blocking**, selhání se tiše ignoruje ("Přihlášení
    pokračuje i bez úspěšného upsert"). Tenhle vzor je převzatý 1:1.
  - Ostatní volání (kluby, zápasy, online hry) jsou specifické pro Osmou ligu a
  **NEBYLA kopírována** — jen obecný princip komunikace.
- Na straně `project-hub-api` (Fastify): `apiKeyAuth` preHandler (constant-time porovnání
  klíče), zod validace requestu, `sendError(reply, status, message)` → vždy `{ error:
  string }` na chybu, čistý objekt/pole na úspěch. Prisma `upsert` pro "založ nebo
  aktualizuj" operace, žádná repository/DAO vrstva navíc.
- **Žádný rate limiting, žádný request timeout, žádný retry nikde** — vlastní vylepšení pro
  nocni-hlidac: `lib/hubClient.ts` přidává `AbortSignal.timeout(3000)`, ať zavěšené VPS API
  nezavěsí i Next.js request.
- Env vzor (`src/config.ts` v project-hub-api): `requireEnv()` helper, co při chybějící
  proměnné rovnou při startu shodí VPS appku (na Vercel straně to nejde stejně — chybějící
  config tam musí být tichý no-op, ne pád, viz "Chování bez configu" níže).

### Env proměnné v nocni-hlidac

- `NOCNI_HLIDAC_API_URL` — base URL VPS API (zvoleno místo obecnějšího
  `PROJECT_HUB_API_URL` z osmaliga.cz, protože jde o samostatnou instanci/appku, ne
  nutně sdílený "hub" mezi víc projekty).
- `NOCNI_HLIDAC_API_TOKEN` — posílá se jako `Authorization: Bearer <token>` (standardní
  bearer schéma místo osmaliga.cz vlastní `x-project-hub-key` hlavičky — funkčně
  ekvivalentní, jen konvenčnější).

### Server-side API klient — `lib/hubClient.ts`

Jediné místo, které zná `NOCNI_HLIDAC_API_URL`/`NOCNI_HLIDAC_API_TOKEN`. `isHubConfigured()`
+ `hubGet<T>(path)`/`hubPost<T>(path, body)` — `null` na cokoliv, co se pokazí (chybějící
config, network chyba, timeout 3s, ne-2xx, chybný JSON), nikdy nevyhodí výjimku. Env
proměnné se čtou při KAŽDÉM volání (ne jednou při načtení modulu), ať jde config
testovat (`vi.stubEnv`) a ať se nikde nezacachuje "chybí" hodnota. Server-only modul —
import jen z Route Handlers a `lib/leaderboard/*`, token se nikdy neposílá do klienta.

### Navržená specifikace VPS endpointů

Implementace samotné VPS appky NENÍ součástí tohoto repozitáře — tohle je přesná
specifikace, kterou musí VPS strana splnit.

**`GET /nocni-hlidac/leaderboard`** — Authorization: Bearer token. Vrátí pole
`GuardLeaderboardEntry[]` (`guardName`, `bestRun`, `currentRun`), seřazené `bestRun` desc,
remízy `currentRun` desc, limit 10 (nocni-hlidac to navíc přeřadí/ořízne defenzivně, viz
`sortLeaderboardEntries.ts` — nespoléhá se naslepo na VPS řazení).

**`POST /nocni-hlidac/player/upsert`** — body `{ discordUserId, username, displayName?,
avatarUrl? }`. Pokud hráč neexistuje, založí ho s `bestRun: 0, currentRun: 0`. Pokud
existuje, aktualizuje jen jméno/avatar/`lastLoginAt` — **nikdy nepřepíše
bestRun/currentRun**. Voláno po Discord loginu (`app/api/auth/callback/route.ts`),
awaitované (ne fire-and-forget — na serverless platformě by nedokončený promise mohl být
zabitý hned po odeslání response), ale selhání nesmí zablokovat/rozbít přihlášení.

**`POST /nocni-hlidac/player/survive-night`** — body `{ discordUserId }`. VPS strana najde
hráče podle `discordUserId` (to smí posílat JEN nocni-hlidac server-side kód po ověření
session, nikdy klient) a provede `currentRun += 1; bestRun = max(bestRun, currentRun)`.
Vrátí aktuální `GuardRunState` (`{ bestRun, currentRun }`). Referenční implementace týhle
přesné logiky (pro VPS stranu, testovaná, ale v nocni-hlidac se nevykonává) je
`lib/leaderboard/guardRunTransitions.ts#applySurviveNight`.

**`POST /nocni-hlidac/player/death`** — body `{ discordUserId }`. `currentRun = 0` (bestRun
beze změny). Vrátí aktuální `GuardRunState`. Referenční logika:
`guardRunTransitions.ts#applyDeath`. Death reason se zatím NEPOSÍLÁ (další krok).

Všechny tři POST endpointy vyžadují stejnou `Authorization: Bearer` autorizaci jako GET.

### Next.js API routes (proxy/adapter mezi hrou a VPS API)

- **`GET /api/leaderboard`** (`app/api/leaderboard/route.ts`) — zavolá
  `getLeaderboardEntries()` (viz níže), vrátí `GuardLeaderboardEntry[]` jako JSON. Zatím ho
  nikdo nevolá (`/leaderboard` stránka volá `getLeaderboardEntries()` přímo, bez HTTP
  zajížďky) — připraveno pro budoucí klientské dotazování.
- **`POST /api/player/survive-night`** a **`POST /api/player/death`**
  (`app/api/player/{survive-night,death}/route.ts`) — načtou `getSession()`, deleguj na
  testovatelnou `handleSurviveNightRequest`/`handleDeathRequest`
  (`lib/leaderboard/guardRunRequestHandlers.ts`, session jako parametr, ne interní
  `getSession()` volání — jde otestovat bez cookies/request mockingu). Bez session → 401.
  Se session, ale VPS API nedostupné/nenakonfigurované → 202 `{ ok: false }`. Úspěch → 200
  `{ ok: true, state }`.

### Napojení `/leaderboard` na budoucí API

`lib/leaderboard/getLeaderboardEntries.ts` — jediné volané místo
(`app/leaderboard/page.tsx`, `app/api/leaderboard/route.ts`), signatura beze změny
(`Promise<GuardLeaderboardEntry[]>`). Zkusí `fetchRemoteLeaderboard()`
(`lib/leaderboard/remoteLeaderboard.ts`, `hubGet`), a když vrátí `null` (nekonfigurováno
nebo selhalo), spadne na `getMockLeaderboardEntries()` (přejmenováno z původního
`getLeaderboardEntries`, aby název odpovídal tomu, čím skutečně je). Výsledek se vždy
proežene `sortLeaderboardEntries()` (bestRun desc, currentRun desc, limit 10) bez ohledu
na zdroj.

### Napojení hry — kde se volá survive-night/death

`app/play/page.tsx`, stejný `useEffect` s `prevScreenRef` diffingem, který už dřív
zvyšoval `deathCount`/`survivedNights` (firuje přesně jednou za skutečný přechod
obrazovky, ne při každém rerenderu ani opakovaně):
- přechod na `screen === "win"` (přežitá směna) → `fetch("/api/player/survive-night", {
  method: "POST" }).catch(() => {})`.
- přechod na `screen === "death"` → `fetch("/api/player/death", { method: "POST"
  }).catch(() => {})`.

Obě volání jsou best-effort fire-and-forget z klienta — žádné `discordUserId` se
neposílá (server si ho vezme ze session), 401/202/network chyba se v `.catch()` tiše
zahodí, hra pokračuje beze změny. Žádné volání při běžném tiku (jen na přechod
obrazovky), takže se nezapisuje "každou sekundu".

### Nepřihlášený hráč

`getSession()` vrátí `null` → route handler vrátí 401 dřív, než by se `discordUserId`
vůbec dostal k `hubPost` volání (viz `handleSurviveNightRequest`/`handleDeathRequest`,
otestováno). Klient na 401 nijak nereaguje (`.catch()` na fire-and-forget fetch).

### Chybějící/selhávající VPS API

Zvoleno přesně podle preferované varianty ze zadání:
- `GET /api/leaderboard` (i přímé volání `getLeaderboardEntries()`) → tichý fallback na
  mock data.
- `POST /api/player/{survive-night,death}` → **202 `{ ok: false }`** (ne 503) při
  nenakonfigurovaném/nedostupném VPS API — 202 "Accepted" věrně popisuje, co se stalo
  (požadavek přijat, ale nezapsán), klient stejně vždy jen `.catch()`-ne/ignoruje response.

### Bezpečnost

- Token (`NOCNI_HLIDAC_API_TOKEN`) žije jen v `lib/hubClient.ts`, čte se ze server-side
  `process.env`, nikdy se neposílá do klienta (žádný `NEXT_PUBLIC_` prefix).
  `app/play/page.tsx` volá jen vlastní `/api/player/*` routes, ne VPS API přímo.
- Discord identita pro zápis (`discordUserId`) pochází VÝHRADNĚ ze server-side
  `getSession()` — route handler ho čte z podepsané cookie, klient ho nikdy neposílá v
  těle requestu (anonymní hráč nemá čím zapsat, viz test "anonymous requests never write
  state" v `guardRunRequestHandlers.test.ts`).
- Žádné secrety commitované, `.env.example` má jen prázdné hodnoty.

## Serverový Hardcore profil (object13_hardcore_player_profile)

Druhé, NEZÁVISLÉ napojení na stejné VPS API jako leaderboard výše (stejný `lib/hubClient.ts`,
žádné nové env proměnné) — trvalý Hardcore profil (status/odměna/statistiky) pro
přihlášeného hráče, oddělený od `bestRun`/`currentRun` leaderboard tabulky. Normal režim
se na server vůbec neukládá (viz zadání "serverové ukládání profilu hlídače pouze pro
Hardcore" — Normal zůstává čistě lokální/localStorage, `game/core/playerProfileStats.ts`/
`game/core/monsterDefeatReward.ts`).

**Implementace VPS appky (routes/DB schema/deploy) žije v project-hub-api (samostatný
repozitář, `src/modules/nocniHlidac/hardcoreProfile*.ts`), NENÍ součástí tohoto
repozitáře.** Na rozdíl od dřívějšího stavu (kdy tahle sekce byla jen "doporučená
specifikace") už VPS strana endpointy skutečně implementuje — kontrakt níže je proto
OVĚŘENÝ, ne navržený. `game/core/hardcorePlayerProfileSnapshot.ts` (typ
`ServerHardcorePlayerProfile` + referenční merge/sanitize logika) je s ním záměrně
sesouhlasený (viz zadání "Srovnat ServerHardcorePlayerProfile typ a client mapping s
reálným project-hub-api contractem").

### DB objekt (VPS strana, project-hub-api)

`Object13HardcorePlayerProfile` (Prisma model, tabulka `Object13HardcorePlayerProfile` —
project-hub-api nepoužívá `@@map`/snake_case, viz jeho `NocniHlidacPlayer`) — samostatná
tabulka, NIKDY stejná jako leaderboard tabulka (žádné sdílené sloupce/migrace/rename
existujících objektů). Sloupce přesně podle
`game/core/hardcorePlayerProfileSnapshot.ts#ServerHardcorePlayerProfile`:

```
discordUserId               text, UNIQUE (primární identifikátor hráče)
displayName                 text, nullable
avatarUrl                   text, nullable

hardcoreHasDefeatedMonster  boolean, default false
hardcoreDoubleBarrelUnlocked boolean, default false
hardcoreMonsterDefeatsCount integer, default 0
hardcoreBestNight           integer, default 0, INDEX
hardcoreDeathsByNight       json, default {}

createdAt                   timestamp
updatedAt                   timestamp
lastSeenAt                  timestamp
```

**Server (zatím) NEUKLÁDÁ** `hardcoreTotalDeaths`/`hardcoreTotalRunsStarted`/
`hardcoreTotalNightsSurvived`/`hardcoreMonsterHitsConfirmed`/`hardcoreMonsterKills` — dřívější
verze tohohle dokumentu (a `ServerHardcorePlayerProfile` typu) je počítala navíc, ale
`game/core/playerProfileStats.ts` dnes NEROZLIŠUJE Normal vs Hardcore u těchhle pěti
counterů (viz "Proč lokální total* countery..." níže), takže by na serveru skončily buď
prázdné, nebo nafouklé o Normal aktivitu. Až vznikne mode-segmentovaný lokální tracking,
přidat je zpátky je jen rozšíření typu + nová append-only migrace, ne redesign.

`hardcoreDeathsByNight` (viz zadání "Uzavřít Hardcore profil a achievementy") JE naproti
tomu bezpečně Hardcore-scoped od začátku — zapisuje se VÝHRADNĚ z
`game/core/playerProfileStats.ts#recordHardcoreDeathOnNight`, které volající
(`app/play/page.tsx`) volá jen když `state.gameMode === "hardcore"` (stejný guard jako u
`recordNightSurvived`/`hardcoreBestNight`). Klíč je noc jako string (`"1"`, `"2"`, ...),
hodnota počet Hardcore smrtí v týhle noci — **Normal smrt tenhle histogram nikdy
nezvyšuje**, žádná cesta v kódu ho z Normal běhu nevolá.

Migrace (project-hub-api):
- `prisma/migrations/20260709214950_add_object13_hardcore_player_profile/` — původní
  append-only `CREATE TABLE` + indexy.
- `prisma/migrations/20260710060553_add_hardcore_deaths_by_night/` — append-only `ALTER
  TABLE "Object13HardcorePlayerProfile" ADD COLUMN "hardcoreDeathsByNight" JSONB NOT NULL
  DEFAULT '{}'`. Žádný `DROP`, žádná změna existující tabulky/leaderboardu/`guard_runs`/
  cokoliv z jiných projektů na stejném VPS.

### Specifikace VPS endpointů (implementováno v project-hub-api)

**`GET /nocni-hlidac/hardcore-profile?discordUserId=...`** — Authorization: Bearer token
(stejná hlavička jako leaderboard endpointy). Pokud hráč pro dané `discordUserId` ještě
nemá záznam, VPS strana ho založí s výchozími hodnotami (stejný "upsert-on-first-request"
princip jako `POST /nocni-hlidac/player/upsert`) a rovnou vrátí — Next.js strana žádný
"vytvoř default" krok sama nedělá, jen předává, co VPS vrátí. GET request nenese
`displayName`/`avatarUrl` (jen `discordUserId` v query), takže je server touhle cestou
neaktualizuje — jen `lastSeenAt`. `hardcoreDeathsByNight` se vrací VŽDY jako objekt (`{}`,
pokud v DB chybí/je `null`/neplatný, nikdy `null`/`undefined`). Vrátí
`ServerHardcorePlayerProfile` JSON (flat, bez `{ ok, ... }` wrapperu — ten přidává až
Next.js route níže).

**`POST /nocni-hlidac/hardcore-profile/sync`** — body `{ discordUserId, displayName,
avatarUrl, hardcoreHasDefeatedMonster, hardcoreDoubleBarrelUnlocked,
hardcoreMonsterDefeatsCount, hardcoreBestNight, hardcoreDeathsByNight }` — `discordUserId`
smí posílat JEN nocni-hlidac server-side kód po ověření session (nikdy klient napřímo, viz
Next.js route níže). VPS strana najde/založí hráče a sloučí ho s příchozím snapshotem podle
přesné referenční specifikace
`game/core/hardcorePlayerProfileSnapshot.ts#mergeHardcoreProfileSnapshot` (testovaná v
tomhle repozitáři, ale sama se tady nevykonává proti žádné databázi — stejný vzor jako
`guardRunTransitions.ts#applySurviveNight`/`applyDeath` pro leaderboard; skutečná
implementace je `project-hub-api`
`src/modules/nocniHlidac/hardcoreProfileMerge.ts#mergeHardcoreProfileSnapshot`):

- `hardcoreHasDefeatedMonster`/`hardcoreDoubleBarrelUnlocked`: OR (`server || local`).
- `hardcoreMonsterDefeatsCount`/`hardcoreBestNight`: `max(server, local)`, NIKDY součet —
  opakovaný sync téhož lokálního snapshotu nesmí zdvojovat počítadla.
- `hardcoreDeathsByNight`: merge PO KLÍČI NOCI, `max(existing[night], incoming[night])` pro
  KAŽDOU noc zvlášť, nikdy součet. Příklad: `existing { "1": 2, "3": 1 }` + `incoming { "1":
  1, "2": 4 }` → `{ "1": 2, "2": 4, "3": 1 }`. Neplatný klíč (noc `<= 0`, `> 10000`,
  nečíselný) se ignoruje; neplatná hodnota (záporná, necelé číslo, `NaN`, ne-`number`) se
  ignoruje; `null`/pole/string místo objektu se bere jako `{}`. Count se clampuje na
  1 000 000.
- `displayName`/`avatarUrl`/`updatedAt`/`lastSeenAt`: vždy přepsány podle requestu/aktuálního
  času.
- Clamp: `hardcoreBestNight` max 10 000, `hardcoreMonsterDefeatsCount` max 100 000 (stejné
  limity jako `sanitizeHardcoreProfileSnapshot` na Next.js straně — VPS strana je dodržuje
  nezávisle, nespoléhá, že Next.js vždy pošle už čisté hodnoty). Neznámá/Normal-like pole
  (`totalDeaths`, `monsterKills`, ...) server tiše ignoruje, nikdy je neuloží ani nevrátí —
  jediný povolený histogram je `hardcoreDeathsByNight`, mode-agnostic `totalDeaths` se do
  něj nikdy nesmí dostat.

Vrátí výsledný `ServerHardcorePlayerProfile` JSON. Obě volání vyžadují stejnou
`Authorization: Bearer` autorizaci jako leaderboard endpointy.

### Next.js API routes

- **`GET /api/player/hardcore-profile`** (`app/api/player/hardcore-profile/route.ts`) —
  `getSession()` → `handleGetHardcoreProfileRequest`
  (`lib/hardcoreProfile/hardcoreProfileRequestHandlers.ts`). Bez session → 401. VPS
  nedostupné/nenakonfigurované/endpoint ještě neexistuje → 502 `{ ok: false, error:
  "hardcore_profile_unavailable" }`. Úspěch → 200 `{ ok: true, profile }`.
- **`POST /api/player/hardcore-profile/sync`**
  (`app/api/player/hardcore-profile/sync/route.ts`) — stejný vzor, tělo requestu (lokální
  Hardcore snapshot z `app/play/page.tsx`/`components/screens/ProfileScreen.tsx`) projde
  `sanitizeHardcoreProfileSnapshot` (whitelist čtyř `hardcore*` polí, typová validace,
  clamp) PŘED odesláním na VPS — neznámá/Normal-like pole (např. omylem poslané
  `totalDeaths` bez `hardcore` prefixu, nebo dřívější `hardcoreTotalDeaths`/
  `hardcoreMonsterKills`, které server dnes vůbec neukládá) se tiše zahodí. Bez session
  → 401. VPS nedostupné → 502 `{ ok: false, error: "hardcore_profile_sync_failed" }`.
  Úspěch → 200 `{ ok: true, profile }`.

### Napojení hry — kdy se sync volá (Hardcore only)

`app/play/page.tsx#handleMonsterDefeatedCinematicComplete` — VÝHRADNĚ když
`state.gameMode === "hardcore"`:
1. lokální reward (`recordMonsterDefeat`) a stats (`recordMonsterKill`) se zapíšou beze
   změny (stejně jako pro Normal),
2. NAVÍC (jen Hardcore): izolovaný lokální counter
   `game/core/hardcorePlayerProfileSnapshot.ts#recordLocalHardcoreMonsterDefeat` (NIKDY
   `monsterDefeatReward.ts`, ten zůstává mode-agnostic) se zvýší,
3. `createHardcoreProfileSnapshotFromLocalState` postaví snapshot,
4. `fetch("/api/player/hardcore-profile/sync", ...)` best-effort, fire-and-forget (stejný
   `.catch()` vzor jako survive-night/death).

Pro `gameMode !== "hardcore"` (Normal true ending) se celý blok od kroku 2 PŘESKOČÍ —
žádný fetch, žádná serverová Hardcore hodnota se nedotkne.

**`hardcoreDeathsByNight` (viz zadání "Uzavřít Hardcore profil a achievementy") se zapisuje
LOKÁLNĚ okamžitě při smrti** (`app/play/page.tsx`, stejné místo jako `recordDeath()`, jen
navíc podmíněné `state.gameMode === "hardcore"`) — **na server se ale nesynchronizuje hned
při smrti**, žádný nový fetch na death moment tenhle krok nepřidává (mimo rozsah zadání,
death má už tak vlastní citlivou audio/vizuální sekvenci). Na server doputuje PŘES
existující sync cesty stejně jako `hardcoreBestNight` dnes: (1) při dalším true endingu
(`handleMonsterDefeatedCinematicComplete` výše, `createHardcoreProfileSnapshotFromLocalState`
ho posílá spolu se zbytkem snapshotu), nebo (2) ručním tlačítkem "Synchronizovat Hardcore
profil" na `/profile`. Stejné omezení jako `hardcoreBestNight` — pokud hráč zemře v Hardcore
a nikdy pak neudělá true ending ani neklikne na sync, server se o téhle smrti nedozví, dokud
k jednomu z těch dvou triggerů nedojde.

### Proč lokální total* countery (deaths/runs/nights/hits) zatím nejdou bezpečně poslat

`game/core/playerProfileStats.ts` dnes NEROZLIŠUJE Normal vs Hardcore u `totalDeaths`/
`totalRunsStarted`/`totalNightsSurvived`/`monsterHitsConfirmed` (volají se bez ohledu na
`gameMode`) — server (project-hub-api) proto tahle pole vůbec neukládá (viz
`ServerHardcorePlayerProfile` výše), `createHardcoreProfileSnapshotFromLocalState` je ani
neposílá. Bezpečně Hardcore-scoped hodnoty dnes jsou `hardcoreBestNight` (mode-gated v
`recordNightSurvived`), `hardcoreMonsterDefeatsCount` z izolovaného
`recordLocalHardcoreMonsterDefeat` počítadla, a nově `hardcoreDeathsByNight` (mode-gated v
`app/play/page.tsx` kolem `recordHardcoreDeathOnNight`, viz výše). `/profile`
(`ProfileScreen.tsx`) zobrazuje
zbytek stat dlaždic (`totalDeaths`, `totalRunsStarted`, ...) i pro přihlášeného hráče se
serverovým profilem dál z lokálního `PlayerProfileStats`
(`serverHardcoreProfileToPlayerProfileStats(server, localStats)` přebírá `...localStats`
jako základ a přepíše jen `hardcoreBestNight`/`monsterKills`) — nikdy `undefined`, jen
zatím ne "opravdu Hardcore-scoped". Follow-up: rozdělit `PlayerProfileStats` na
mode-segmentované countery (např. `hardcoreTotalDeaths`/`normalTotalDeaths` zvlášť), pak
`ServerHardcorePlayerProfile`/tuhle funkci rozšířit o reálné server hodnoty.

### Co zůstává na další krok (výslovně mimo rozsah)

Skutečná implementace VPS appky (routes/DB schema/deploy) pro leaderboard I Hardcore
profil, death reason posílaný na survive-night/death, `guard_runs` historie, vzkazy
hlídačů, admin/moderace, detailní statistiky, mode-segmentované lokální countery (viz
výše), veteránský Hardcore run (dvouhlavňovka) jako oddělený leaderboard track.

## Obecný serverový profil (Object13PlayerProfile) — krok 1B, zatím prázdná infrastruktura

TŘETÍ, nezávislý kanál na stejné VPS API (`lib/hubClient.ts`) vedle leaderboardu a
Hardcore profilu výše — obecný, verzovaný `Object13PlayerProfile` s optimistickým
zamykáním přes `revision`. Na rozdíl od Hardcore profilu tenhle krok **nepřesouvá žádná
skutečná herní data** — `profileData` je zatím prázdný/technický obsah, žárovky, zbraně,
nastavení a veškerá dosavadní persistence (localStorage, `bulbInventory.ts`,
`roomBulbs.ts`, `playerProfileStats.ts`, `survivedNights.ts`, Hardcore profil, leaderboard)
zůstávají beze změny a jsou dál jediným zdrojem pravdy pro herní hodnoty. Tenhle profil je
záměrná dočasná výjimka z pravidla "jeden zdroj pravdy" — souběžný, zatím nevyužitý kanál,
dokud nepřijde další krok s prvním skutečným obsahem `profileData` a migrací žárovek.

DB objekt (`Object13PlayerProfile`, project-hub-api, mimo tento repozitář) a jeho REST
endpointy (`GET`/`PUT /nocni-hlidac/player-profile`) vznikly v předchozím serverovém kroku
(1A) — validace, blokování nebezpečných klíčů (`__proto__`/`constructor`/`prototype`),
32 KB limit velikosti a atomické `updateMany`-based zamykání přes `revision` žijí tam.

### Vrstvy (klientská strana, tento repozitář)

1. **`lib/hubClient.ts`** — sdílený server-to-server HTTP klient k VPS (Bearer token,
   `NOCNI_HLIDAC_API_URL`/`NOCNI_HLIDAC_API_TOKEN`). Přibyl `hubPutDetailed<T>` (a interní
   `hubFetchDetailed`), který vrací `{status, body}` místo dosavadního "zkolabuj na `null`"
   chování `hubGet`/`hubPost` — potřeba k rozlišení 200/409/413/404/500 na volajícím místě.
   `hubFetch` zůstal beze změny (deleguje na `hubFetchDetailed` a zkolabuje na `null`),
   všech 7 původních testů `hubClient.test.ts` prochází beze změny.
2. **`lib/playerProfile/remoteObject13PlayerProfile.ts`** (server-only) —
   `Object13PlayerProfileDto`, `fetchRemoteObject13PlayerProfile(discordUserId)`,
   `putRemoteObject13PlayerProfile(payload)`. Přejmenovává VPS pole `profile` (uvnitř 409
   těla) na `currentProfile`, aby vyšší vrstvy neznaly přesný tvar VPS odpovědi.
3. **`lib/playerProfile/playerProfileRequestHandlers.ts`** (server-only) —
   `handleGetPlayerProfileRequest(session)`/`handlePutPlayerProfileRequest(session, rawBody)`
   berou session jako explicitní parametr (nikdy nevolají `getSession()` samy, stejný vzor
   jako `hardcoreProfileRequestHandlers.ts`/`guardRunRequestHandlers.ts`) — testovatelné bez
   mockování Next.js `Request`/cookies. Mapují VPS chyby na `{error: "profile_unavailable"}`
   (nikdy neprosakuje stack trace/token/interní VPS tělo ven).
4. **`app/api/player/profile/route.ts`** — tenký Next.js proxy (`GET`/`PUT`), čte
   `discordUserId` VÝHRADNĚ ze session (nikdy z query parametru ani z browser payloadu).
5. **`lib/playerProfile/object13PlayerProfileClient.ts`** (client-safe) —
   `fetchObject13PlayerProfile()`/`saveObject13PlayerProfile(payload)`, volá výhradně
   vlastní `/api/player/profile`, nikdy VPS přímo. Typované výsledky, ne generické stringy.
6. **`components/playerProfile/Object13PlayerProfileProvider.tsx`** — `"use client"`
   Provider + `useObject13PlayerProfile()` hook. Načítání a ukládání profilu drží
   `Object13PlayerProfileLoadState`/`Object13PlayerProfileSaveState`
   (`game/core/object13PlayerProfile.ts`), viz "Stavy" níže.
7. **`game/core/object13PlayerProfile.ts`** (pure, žádné React ani server-only importy) —
   `Object13PlayerProfileDto`, validace (`isValidObject13PlayerProfileDto`,
   `validateIncomingObject13PlayerProfilePutBody`), a čisté odvozovací funkce
   `deriveLoadStateFromFetchResult`/`deriveSaveStateFromSaveResult`, které mapují
   fetch/save výsledek na React stav — vytažené mimo komponentu právě proto, aby šly plně
   otestovat i bez jsdom (viz "Testování" níže).

Provider je zapojený jednou v `app/play/page.tsx` (obaluje celý strom
menu/loading/briefing/hraní/smrt/výhra — jeden persistentní React strom, ne oddělené route
mounty), a znovu v `ProfileScreen.tsx` pro `/profile`. Dedup souběžných/Strict-Mode
duplicitních `load()` volání řeší `loadInFlightRef`, `mountedRef` hlídá `setState` po
unmountu (stejný vzor jako `useAuthStatus.ts`).

### Stavy

```
LoadState: idle | loading | ready(profile) | unauthorized | unavailable(error?)
SaveState: idle | saving | saved | conflict(currentProfile) | error(error)
```

Load se spouští jen po přihlášení (`useAuthStatus()` hlásí přihlášeného hráče) — anonymní
hráč nikdy nevyvolá `GET`, zůstává v `unauthorized`, hra běží dál beze změny. Výpadek VPS
→ `unavailable`, lokální data (localStorage) se NIKDY nepřepíšou ani nevynulují,
`unavailable` se nikdy neustanoví jako nový zdroj pravdy.

### 409 konflikt

Klient pošle `expectedRevision`. Pokud server mezitím drží vyšší `revision`, proxy vrátí
`409 {error: "profile_conflict", currentRevision, currentProfile?}`, hook přejde do stavu
`conflict` a **nikdy automaticky nepřepíše ani neopakuje PUT** — lokální stav zůstává
neměnný, dokud si volající explicitně nevyžádá `reloadAfterConflict()` (natáhne aktuální
serverový profil a nahradí jím `ready` stav). Žádné merge UI, žádné vynucené přepsání.

### Dev-only ověření (`DebugPanel.tsx`, `ProfileScreen.tsx`)

Gate `process.env.NODE_ENV !== "production"` (Next.js `NODE_ENV` je vždy inlinovaný do
klientského bundlu, bez potřeby `NEXT_PUBLIC_` prefixu) navíc k existujícímu
`DEBUG_PANEL_ENABLED`/pravému-tlačítku-na-"Noc {n}" mechanismu. Tlačítko "TEST PROFILE
WRITE" (od kroku "profilový kontrakt V1 + inventář žárovek" níže) profil jen ZNOVU ULOŽÍ
BEZE ZMĚNY (stejné `profileData`/`profileVersion`, jen aktuální `expectedRevision`) — ať
ověří celou write cestu bez posílání jakéhokoliv klíče mimo V1 kontrakt (starší
`_devConnectionTest` klíč byl odstraněn, V1 validace by ho stejně odmítla).

### `profileData` má od kroku "profilový kontrakt V1 + inventář žárovek" přesný obsah

Viz samostatná sekce "Profilový kontrakt V1 a inventář žárovek" níže — `profileData` už
NENÍ opaque blob, má přesný validovaný tvar (`Object13PlayerProfileDataV1`).

### Testování

`game/core/object13PlayerProfile.test.ts` (čisté funkce, DTO validace/derivace stavů),
`game/core/object13PlayerProfileInventory.test.ts` (registr/default/validátor V1 tvaru), a
mock-`fetch`-based sady bez potřeby jsdom:
`lib/playerProfile/remoteObject13PlayerProfile.test.ts`,
`lib/playerProfile/playerProfileRequestHandlers.test.ts`,
`lib/playerProfile/object13PlayerProfileClient.test.ts`. Provider/hook samotný
(`Object13PlayerProfileProvider.tsx`) nemá jak být nezávisle otestovaný — repozitář nemá
testing-library/jsdom infrastrukturu — takže Strict-Mode dedup, cleanup po unmountu a
hook-level dedup souběžných `load()` volání jsou správné konstrukcí (stejný ověřený
`cancelled`/ref-guard vzor jako `useAuthStatus.ts`), ne nezávisle ověřené automatickým
testem.

## Profilový kontrakt V1 a inventář žárovek

Navazuje na "Obecný serverový profil" výše — `profileData` (`profileVersion: 1`) má teď
přesný, validovaný obsah místo prázdného `{}`. Server (project-hub-api) i klient
(tenhle repozitář) mají KAŽDÝ svou vlastní kopii stejného kontraktu (žádný sdílený balíček
mezi repozitáři) — server v `src/modules/nocniHlidac/playerProfileInventory.ts`, klient v
`game/core/object13PlayerProfileInventory.ts`. Tvar:

```ts
type Object13InventoryItemId = "bulb"; // budoucí položka = nový klíč v registru
type Object13InventoryItems = Partial<Record<Object13InventoryItemId, number>>;
type Object13PlayerProfileDataV1 = { inventory: { items: Object13InventoryItems } };
```

### Item registry — jediný zdroj default/min/max

`OBJECT13_INVENTORY_ITEM_REGISTRY` (oba repozitáře) — pro `bulb`:
`defaultQuantity`/`minQuantity: 0`/`maxQuantity: 999`. `maxQuantity` je čistě technický
bezpečnostní strop (ochrana proti poškozené hodnotě), NE herní limit — hra sama žádný
inventářový strop nemá. Na klientské straně `defaultQuantity` čte
`BULBS_CONFIG.startingCount` (`game/core/bulbsConfig.ts`) — JEDINÁ centrální definice v
tomhle repozitáři, žádné ručně zkopírované číslo (viz zadání "nevkládej číslo ručně do
více souborů"). Server svou kopii nutně duplikuje staticky (jiný repozitář, žádný
cross-repo import za buildu) — změna výchozí hodnoty žárovek vyžaduje ruční synchronizaci
obou repozitářů, zdokumentováno v `project-hub-api/docs/operations/nocni-hlidac.md`.
`createDefaultObject13PlayerProfileDataV1()` vrací `{inventory: {items: {bulb: 10}}}`,
NIKDY `{}` — nový profil vždy začíná s každou registrovanou položkou na jejím defaultu.
Změna `defaultQuantity` ovlivní jen NOVĚ VYTVOŘENÉ profily, nikdy existující řádky.

### Validace (server i klient, stejná pravidla)

`validateObject13PlayerProfileDataV1` — plně whitelistovaná: jediný top-level klíč
`inventory`, jediný vnořený klíč `items`, klíče `items` musí být ID z registru, hodnoty
celá čísla v `[minQuantity, maxQuantity]`. Cokoliv jiné → odmítnutí, žádný silent
fallback. Server normalizuje starý/neplatný profil (typicky pre-tohohle-kroku `{}`) při
GET a PERZISTUJE opravu (revision +1, jen když se opravdu něco mění) — viz
project-hub-api docs. Klient (`isValidObject13PlayerProfileDto`) validuje CELOU odpověď
znovu nezávisle jako defense-in-depth, ne jako jediný zdroj pravdy.

### Serverové doménové operace — `POST .../inventory/bulb/add|consume`

Běžná herní logika NIKDY nepoužívá obecný `PUT /nocni-hlidac/player-profile`/
`saveObject13PlayerProfile()` pro změnu žárovek — jen tyhle dvě dedikované operace (viz
`lib/playerProfile/object13PlayerProfileClient.ts#addBulbsToProfile`/
`consumeBulbsFromProfile`, proxovány přes `app/api/player/profile/inventory/bulb/add|consume`,
server-side `playerProfileInventoryRoutes.ts`/`playerProfileInventoryService.ts`). Stejný
optimistic-locking princip jako obecný PUT (atomický `updateMany` na
`discordUserId AND revision`). Doménové stavy navíc k `revision_conflict` (409):
`exceeds_maximum` (add by přesáhl registr max) a `insufficient_inventory` (consume by šel
pod nulu) — obojí 409, ale s vlastním `error` kódem, nikdy zaměněné s revision konfliktem.

### `Object13PlayerProfileProvider` — `addBulbs`/`consumeBulbs`

Rozšíření Provideru o `addBulbs(amount)`/`consumeBulbs(amount)` — použijí aktuální
`revision` z `loadState`, po úspěchu nahradí CELÝ profil odpovědí serveru (`nextLoadState`
v `deriveSaveStateFromInventoryOperationResult`, `game/core/object13PlayerProfile.ts`), při
409 revision konfliktu přejdou do `saveState: "conflict"` (stejné chování jako obecný
`save()`), při doménovém 409 do vlastního `saveState.status` (`"exceeds_maximum"` /
`"insufficient_inventory"`) — NIKDY zaměněné za obecnou `"error"`. Žádný slepý retry v
žádném z těchto stavů.

### Training vs Hardcore — `GameModePersistencePolicy`

Rozšíření `GAME_MODE_CONFIG` (`game/core/gameMode.ts`) o `persistInventory`/
`persistRunStats` (`leaderboardEligible` už existovalo, sémanticky odpovídá
"submitLeaderboard" ze zadání). Training (`normal`): obojí `false` — počet žárovek se
načte jako výchozí pracovní stav, ale změny (nález/spotřeba) se na VPS nikdy nezapisují.
Hardcore: obojí `true`. Jediné centrální místo — žádné rozeseté
`if (gameMode === "hardcore")` po `app/play/page.tsx`.

### Zdroj žárovek při startu směny (`resolveStartingBulbsRemaining`)

`game/core/bulbInventory.ts#resolveStartingBulbsRemaining(loadState)` — přihlášený hráč s
`ready` profilem: VPS `profile.inventory.items.bulb` je AUTORITATIVNÍ, localStorage se
nepoužije jako fallback vůbec. Cokoliv jiné (anonymní `unauthorized`, ještě se načítá
`idle`/`loading`, VPS nedostupné `unavailable`) čte lokální `getBulbsRemaining()` — hra
zůstává hratelná v lokálním fallback režimu, ale beze změny se nikdy automaticky
nepropisuje zpátky do profilu (žádný merge). `app/play/page.tsx#handleBeginShift` volá
tuhle funkci místo dřívějšího přímého `getBulbsRemaining()` — viz "kdy se žárovky
zapisují" níže pro přesný mechanismus potvrzení.

### Hardcore start vyžaduje `ready` profil

`MainMenuScreen.tsx#handleSelectHardcore` — přihlášený hráč, jehož
`useObject13PlayerProfile().loadState.status !== "ready"`, dostane
`hardcoreProfileUnavailableText` prompt místo přepnutí na Hardcore (`gameMode` zůstává
beze změny). `hardcoreBlockedByProfile` navíc blokuje i samotné START tlačítko, kdyby se
profil stal nedostupným PO výběru Hardcore (např. přes automatický přepnutí na Hardcore u
rozehrané šňůry, viz `hasActiveHardcoreRun`). Training a anonymní hra zůstávají dostupné
beze změny — důvod: Hardcore je server-authoritative pro inventář, nesmí běžet v nejasném
offline režimu (žádná offline sync queue).

### Kdy se žárovky zapisují na VPS — KAŽDÁ trvalá změna se potvrzuje V OKAMŽIKU, kdy nastane

**Architektonická oprava** (nahrazuje dřívější "souhrnný delta commit na konci směny" —
viz zadání "profilový kontrakt V1 + inventář žárovek", krok 2: "Toto nechci... Ne na konci
směny. Ne souhrnnou deltou. Ne odvozením z konečného počtu."). V Hardcore se KAŽDÁ trvalá
inventářová změna potvrzuje serverem přesně v okamžiku, kdy nastane — `death`/`win` samy o
sobě už žádný inventory request neposílají (ověřeno testem, viz
`app/play/bulbInventoryArchitecture.test.ts`).

**Reducer zůstává synchronní a čistý** — `game/core/gameReducer.ts` nemá žádný fetch/await.
Ruční výměna žárovky u dveří (`bulbReplacement`) je teď DVOUFÁZOVÁ:
1. `TICK` zvedá `bulbReplacement.progressMs`, ale po dosažení `BULB_REPLACE_DURATION_MS` ho
   jen CLAMPNE na maximum a `active` zůstane `true` — `updateBulbReplacement` už sám
   žárovku neopravuje ani nespotřebovává (viz `gameReducer.ts`, dřívější přímé
   dokončení bylo přesně ta věc, kterou tenhle krok opravuje).
2. `isBulbReplacementReadyToConfirm(state)` (exportovaná čistá funkce) řekne orchestrační
   vrstvě "výměna je fyzicky hotová, čeká na potvrzení". Zavření dveří/odchod od dveří/smrt
   uprostřed PROGRESU pořád výměnu zruší beze spotřeby (`isBulbReplacementCancelableByViewChange`
   vrátí `false`, jakmile je `readyToConfirm` — fyzicky dokončená akce se navigací pryč
   už neruší, jen čeká na potvrzení).
3. Teprve explicitní `CONFIRM_BULB_REPLACEMENT` akce (gameActions.ts) skutečně sníží
   `bulbsRemaining` a opraví `roomBulbs` — no-op, pokud výměna není `readyToConfirm`.
   `CANCEL_BULB_REPLACEMENT` (existující akce) slouží i jako "server odmítl" zamítnutí.

**Orchestrace** (`app/play/page.tsx` + `game/inventory/bulbInventoryController.ts`, čistá
rozhodovací vrstva bez Reactu/fetch):
- `resolveBulbInventoryPersistenceMode(gameMode, loadState)` → `"local"` (Training/anonymní
  — potvrdí se OKAMŽITĚ, žádné čekání) nebo `"server"` (Hardcore + `ready` profil).
- `decideBulbReplacementConfirmAction({readyToConfirm, operationPending, needsReload, gameMode, loadState})`
  → `"none"` / `"confirm_immediately"` / `"cancel_blocked_needs_reload"` / `"call_server"` —
  VEŠKERÁ větvící logika `useEffect` v `app/play/page.tsx` je v týhle jedné čisté funkci,
  testovatelné bez jsdom (viz `game/inventory/bulbInventoryController.test.ts`).
- Efekt v `app/play/page.tsx` sleduje `isBulbReplacementReadyToConfirm(state)` a podle
  `decideBulbReplacementConfirmAction` buď rovnou dispatchne `CONFIRM_BULB_REPLACEMENT`
  (Training/anonymní), nebo zavolá `object13Profile.consumeBulbs(1)` a dispatchne
  `CONFIRM_BULB_REPLACEMENT` teprve po úspěchu (`deriveBulbInventoryConfirmOutcome`
  mapuje `insufficient_inventory`/`exceeds_maximum`/`conflict`/`unavailable` na
  `CANCEL_BULB_REPLACEMENT` — výměna se nedokončí, žárovka se nevymění).

**Denní servis** (`applyDailyBulbService`, přežitá směna) je SAMOSTATNÁ, TŘETÍ explicitní
inventářová událost (vedle ruční výměny u dveří a — zatím nevyužité — akvizice), NE
souhrnná synchronizace/delta na konci směny: spotřebovává náhradní žárovku stejně jako
ruční výměna, takže je v Hardcore stejně potvrzená serverem, jen svázaná s přechodem na
`win`, ne s dveřmi. `RoomBulbsState` má dnes jediný klíč (`nearRoom`), takže jde vždy
nejvýš o JEDNO `consumeBulbs(1)` volání; kód je záměrně NAPSANÝ jako jedna větev, ne obecná
smyčka.

**Důležité pro budoucí rozšíření na víc místností**: pokud denní servis bude jednou opravovat
víc než jednu žárovku najednou, správné řešení je JEDNA atomická operace
`consumeBulbs(amount = počet skutečně opravených žárovek)` — NE `N` samostatných
`consumeBulbs(1)` volání s mezilehlými revisemi. Sekvenční N volání by muselo řešit
čerstvou revizi mezi jednotlivými kroky (Provider ji zpřístupňuje jen přes re-render), což
je zbytečná komplikace navíc k tomu, že už dnešní `POST .../inventory/bulb/consume`
endpoint (`amount` parametr, viz "Serverové doménové operace" výše) přesně tohle umí v
jednom requestu. Denní servis dnes posílá `amount: 1` jen proto, že dnes může spravit
nejvýš jednu žárovku — až přibude druhá místnost, je to změna JEDNOHO čísla
(`amount: brokenCount`), ne architektury.

**Pending stav a blokování** (`BulbInventoryOperationState`, `game/inventory/bulbInventoryController.ts`):
`{status: "idle"|"consuming"|"adding"|"error"}`. `bulbInventoryPendingRef` (ref, ne state)
blokuje druhou operaci, dokud první neskončí — `decideBulbReplacementConfirmAction` vrátí
`"none"`, pokud `operationPending`. `bulbInventoryNeedsReloadRef` — po `unavailable`
výsledku (nejasné selhání, mohlo/nemuselo se serverem uspět) se DALŠÍ operace zablokuje
(`"cancel_blocked_needs_reload"`) až do `object13Profile.reload()`, ať nedojde k dvojí
spotřebě, pokud první request server ve skutečnosti zpracoval a jen se ztratila odpověď —
ŽÁDNÝ automatický retry.

**Runtime === server invariant**: po úspěšném potvrzení musí platit
`state.bulbsRemaining === profileData.inventory.items.bulb` — obě strany se mění o STEJNOU
jednotku (1) ve STEJNÉM okamžiku (reducer `CONFIRM_BULB_REPLACEMENT` až po úspěšné serverové
odpovědi), takže nemůže dojít k rozjetí (viz
`game/inventory/bulbInventoryRuntimeServerInvariant.test.ts`).

Aktivní nainstalovaná žárovka (`GameState.roomBulbs`, životnost/prasklá) je od inventáře
(počet náhradních kusů) záměrně oddělená — `roomBulbs` zůstává čistě lokální
(`setRoomBulbs`/`getRoomBulbs`, `game/core/roomBulbs.ts`), NIKDY se neposílá na VPS.

### localStorage — kdy se čte, kdy se ignoruje

Starý klíč `nocni-hlidac:object13:bulbs-remaining` (`bulbInventory.ts`) zůstal v kódu
(nebyl odstraněn), ale přestal být autoritativní pro přihlášeného hráče: čte se JEN když
`resolveStartingBulbsRemaining` vrátí non-"ready" stav (anonymní/loading/unavailable).
Zapisuje se jen na dvou místech — anonymní hráč při `death`/denním servisu na `win`
(`object13Profile.loadState.status === "unauthorized"`) a nikde jinde. Přihlášený hráč
(ready i not-ready) do něj nikdy nezapisuje — žádná stará hodnota se automaticky
nemigruje do VPS profilu, žádné dlouhodobé souběžné držení dvou zdrojů pravdy pro tutéž
věc.

### `createInitialGameState` — objektový parametr

`game/core/gameState.ts#createInitialGameState(night, options?)` — dřívějších 11
pozičních parametrů (identifikované riziko záměny pořadí) nahrazeno jedním volitelným
`CreateInitialGameStateOptions` objektem. Všechna pole zůstala stejná
(`roomBulbs`/`bulbsRemaining`/`nightFeatures`/`gameMode`/`livesRemaining`/`hasShotgun`/
`shotgunAmmo`/`hasDoubleBarrelShotgun`/`officeDoorLockMs`/`monsterKilledThisRun`), jen
pojmenovaná místo poziční. Všechna volání v `gameReducer.ts`
(`SHOW_BRIEFING`/`START_SHIFT`/`RESTART_SHIFT`) i testech přepsána na objektovou formu.

## Profilový kontrakt V2 a equipment (vlastnictví zbraní)

Navazuje na "Profilový kontrakt V1 a inventář žárovek" výše — řeší bug, kdy Hardcore hráč,
který si vysloužil brokovnici (běžnou nebo dvouhlavňovku), o ni přišel hned v příští misi.
Příčina: vlastnictví zbraně existovalo JEN jako runtime `GameState` booleany
(`hasShotgun`/`hasDoubleBarrelShotgun`) plus tři nezávislé, nesynchronizované lokální
signály (`MonsterDefeatReward.doubleBarrelUnlocked` — mode-agnostic localStorage,
zapisovaný i Normal true endingem; `LocalHardcoreMonsterProgress.doubleBarrelUnlocked`;
`ServerHardcorePlayerProfile.hardcoreDoubleBarrelUnlocked` — jen pro zobrazení na
`/profile`). `app/play/page.tsx#handleBeginShift` četl při startu nového runu VÝHRADNĚ
`getMonsterDefeatReward().doubleBarrelUnlocked` (čistě lokální, ne server-synced) — nová
`GameState` instance každé mise runtime booleany vždy resetovala na výchozí "bez
brokovnice", pokud tenhle jeden konkrétní lokální flag nebyl `true`. Řešení: vlastnictví
zbraně je od teď DLOUHODOBÝ profilový stav (`ownedWeapons`/`equippedWeaponId` v
`Object13PlayerProfile.profileData.equipment`) se stejnou server-confirmed architekturou
jako inventář žárovek — nabité náboje/probíhající střelba/lovecká minihra zůstávají v
runtime `GameState`, ty se NEUKLÁDAJÍ nikam jinam.

### Tvar (`profileVersion: 2`)

Server (`src/modules/nocniHlidac/playerProfileEquipment.ts`,
`playerProfileContractV2.ts`) i klient (`game/core/object13PlayerProfileEquipment.ts`,
`object13PlayerProfileContractV2.ts`) mají KAŽDÝ svou vlastní kopii stejného kontraktu —
stejný princip jako V1 inventář, žádný sdílený balíček mezi repozitáři:

```ts
type WeaponId = "single_shotgun" | "double_barrel_shotgun";
interface Object13EquipmentState {
  ownedWeapons: WeaponId[];      // trvale vlastněné zbraně, bez duplicit
  equippedWeaponId: WeaponId | null; // aktuálně vybavená — musí být buď null, nebo prvek ownedWeapons
}
type Object13PlayerProfileDataV2 = {
  inventory: { items: Object13InventoryItems }; // beze změny oproti V1
  equipment: Object13EquipmentState;
};
```

`createDefaultObject13PlayerProfileDataV2()` vrací `{inventory: {items: {bulb: 10}},
equipment: {ownedWeapons: [], equippedWeaponId: null}}` — nový profil vždy začíná bez
zbraně, stejně jako dřív.

### Weapon registry — jediný zdroj kapacity munice

`WEAPON_REGISTRY` (oba repozitáře, `WeaponDefinition = {id, ammoCapacity}`):
`single_shotgun` → kapacita `1`, `double_barrel_shotgun` → kapacita `2`. Jediné místo,
které tahle dvě čísla definuje — `game/core/shotgunEquipment.ts`
(`SHOTGUN_MAX_AMMO`/`DOUBLE_BARREL_SHOTGUN_MAX_AMMO`) je s registrem hodnotově shodné, ale
zůstává nezávislou konstantou (runtime munice je pojmově oddělená od profilu, viz níže) —
žádný modul kapacitu nepočítá vlastní duplicitní podmínkou (`LeftWallView.tsx` dřív měla
přesně tenhle duplikát, opraveno na `getShotgunMaxAmmo({hasShotgun, hasDoubleBarrelShotgun})`).
Přidání třetí zbraně = nový klíč v `WEAPON_REGISTRY` (oba repozitáře) + rozšíření
`deriveShotgunEquipmentFromWeaponId`/`getShotgunMaxAmmo`, žádná další architektonická změna.

### Validace (server i klient, stejná pravidla)

`validateEquipmentState` — plně whitelistovaná, stejný vzor jako V1 inventář: jediné
top-level klíče `ownedWeapons`/`equippedWeaponId`, `ownedWeapons` musí být pole známých
`WeaponId` bez duplicit, `equippedWeaponId` musí být `null` nebo prvek `ownedWeapons`.
Cokoliv jiné → odmítnutí s konkrétním chybovým kódem (`unknown_weapon_id`,
`duplicate_weapon_id`, `equipped_weapon_not_owned`, ...), žádný silent fallback.
`validateObject13PlayerProfileDataV2` (nahrazuje V1 validátor jako aktivní kontrakt)
skládá inventářovou i equipment validaci do jednoho výsledku.

### V1 → V2 migrace (server, lazy na GET)

Stejný princip jako dřívější "`{}` → V1" oprava: `getOrCreateObject13PlayerProfile`
(project-hub-api) při GETu profilu s `profileVersion === 1` migruje na V2 — zachová
PŘESNÝ počet žárovek, přidá prázdný `equipment: {ownedWeapons: [], equippedWeaponId:
null}`, `revision + 1` (jen jednou, další GET už je no-op). Migrace je idempotentní,
type-safe, nikdy neztrácí žárovky. Klient NIKDY sám nemigruje — V1 tvar odpovědi (bez
`equipment`) se na klientovi nepovažuje za platný/`ready` V2 profil
(`isValidObject13PlayerProfileDto`), i kdyby k němu klient měl přístup.

### Serverová doménová operace — `POST .../equipment/weapon/unlock`

Běžná herní logika NIKDY nepoužívá obecný `PUT`/`saveObject13PlayerProfile()` pro
odemykání zbraně — jen tuhle jednu dedikovanou operaci (`{weaponId, expectedRevision}`,
proxováno přes `app/api/player/profile/equipment/weapon/unlock`, server-side
`playerProfileEquipmentRoutes.ts`/`playerProfileEquipmentService.ts`). Stejný
optimistic-locking princip jako inventář (atomický `updateMany` na `discordUserId AND
revision`). Pravidla auto-equipu (`unlockWeapon`, pure funkce, `playerProfileEquipment.ts`):
- odemčení `single_shotgun` přidá do `ownedWeapons` a vybaví ho JEN pokud nic není
  vybavené (`equippedWeaponId === null`) — nepřepíše už vybavenou dvouhlavňovku;
- odemčení `double_barrel_shotgun` přidá do `ownedWeapons` a VŽDY ho rovnou vybaví;
  `single_shotgun` v `ownedWeapons` zůstává (historie), jen přestává být vybavený.

**Idempotence beze zbytečné revision churny**: pokud je zbraň už vlastněná A správně
vybavená, `unlockWeapon` vrátí STEJNOU referenci vstupního objektu (žádná mutace) — service
vrstva na tom pozná no-op a vrátí `outcome: "unchanged"` BEZ zápisu do DB a BEZ inkrementu
`revision`. Druhé (i N-té) volání se stejným výsledkem tak nikdy zbytečně nezvyšuje
revision. Klientská vrstva `outcome: "updated"` a `"unchanged"` mapuje na STEJNÉ chování
(nahradit `loadState` čerstvým profilem) — rozdíl má smysl jen na serveru.

### `Object13PlayerProfileProvider` — `unlockWeapon(weaponId)`

Rozšíření Provideru o `unlockWeapon(weaponId)` — stejný tvar jako `addBulbs`/`consumeBulbs`:
použije aktuální `revision` z `loadState`, po úspěchu (`updated` i `unchanged`) nahradí CELÝ
profil odpovědí serveru, při 409 přejde do `saveState: "conflict"`, při `unavailable`/chybě
NEDOKONČÍ lokální trvalou změnu. Žádný slepý retry.

### Odvození runtime `hasShotgun`/`hasDoubleBarrelShotgun` z profilu

`game/core/shotgunEquipment.ts#deriveShotgunEquipmentFromWeaponId(weaponId)` — JEDINÉ místo,
které mapuje profilový `equippedWeaponId` na starou runtime dvojici booleanů
(`null` → nic, `"single_shotgun"` → `hasShotgun` bez dvouhlavňovky, `"double_barrel_shotgun"`
→ obojí `true`). `createFreshRunShotgunEquipmentFromWeaponId(weaponId)` z toho navíc odvodí
plně nabitou výchozí výbavu nového runu (stejná "vždy nabito na strop aktuální zbraně"
konvence jako dřívější `createFreshRunShotgunEquipment`). Booleany samotné v `GameState`
zůstaly beze změny (žádný širší refactor na `weaponId: WeaponId | null` uvnitř běžícího
runu — riziko/rozsah takové změny nebyl úměrný přínosu, dokud v UI/minihře není potřeba
rozlišit VÍC než "má/nemá" a "je/není dvouhlavňovka"), ale JSOU od teď odvozené výhradně
odsud pro nový run, nikdy zapsané nezávisle jinou cestou.

### Mise vždy startuje z profilu, ne z runtime deltы předchozí mise ani ze staré lokální odměny

`game/equipment/weaponAcquisitionController.ts#resolveFreshRunShotgunEquipment(gameMode,
loadState, localDoubleBarrelUnlocked)` — JEDINÉ místo, které rozhoduje výchozí výbavu
nového runu:
- Hardcore + `ready` profil → čte VÝHRADNĚ `equippedWeaponId` z profilu
  (`getEquippedWeaponId`), přes `createFreshRunShotgunEquipmentFromWeaponId`. Profil je
  jediná autorita — stará lokální odměna (`localDoubleBarrelUnlocked`) se v tomhle případě
  vůbec nečte.
- Cokoliv jiné (Training, anonymní, Hardcore bez `ready` profilu — poslední případ
  `MainMenuScreen.tsx#hardcoreBlockedByProfile` normálně vůbec nepustí spustit) → lokální
  fallback, stejný jako dřív (`createFreshRunShotgunEquipment(localDoubleBarrelUnlocked)`).

`app/play/page.tsx#handleBeginShift` volá tuhle funkci na OBOU fresh-run větvích
(`START_SHIFT` z menu i `RESTART_SHIFT` po vyčerpání životů) — to je přesně oprava
nahlášeného bugu. Regresní test proti návratu starého přímého čtení:
`app/play/weaponEquipmentArchitecture.test.ts`.

### Server-confirmed akvizice zbraně (Hardcore) — stejný princip jako žárovky

`resolveWeaponAcquisitionPersistenceMode(gameMode, loadState)` → `"local"`
(Training/anonymní — potvrdí se OKAMŽITĚ v runtime) nebo `"server"` (Hardcore + `ready`
profil — vlastnictví se projeví v runtime AŽ PO potvrzení serverem).

- **Běžná brokovnice** (`app/play/page.tsx#handleEmergencyMiniGameComplete`, přechod
  `hasShotgun: false → true` po `shotgun_acquired` worldEffectu z nouzové minihry): v
  Hardcore se `APPLY_SHOTGUN_EFFECTS` dispatch ODLOŽÍ, dokud nedoběhne
  `object13Profile.unlockWeapon("single_shotgun")`. `weaponAcquisitionPendingRef` (ref, ne
  state) blokuje druhé souběžné volání. Selhání (`conflict`/`unavailable`) = zbraň se
  NEPROJEVÍ v runtime, žádný automatický retry — hráč zůstává bez brokovnice v týhle
  směně, i když ji fyzicky sebral v minihře (další emergency run se dřív jen nespustí,
  protože `canStartShotgunEmergencyRun` čeká na `!hasShotgun`, takže situace není trvale
  zaseknutá, jen odložená). Munice (`shotgunAmmo`) se aplikuje SPOLU se zbraní ve stejném
  dispatchi — nemá smysl bez potvrzeného vlastnictví.
- **Dvouhlavňovka** (`app/play/page.tsx#handleMonsterDefeatedCinematicComplete`, true
  ending): volá se `unlockWeapon("double_barrel_shotgun")` VÝHRADNĚ uvnitř existující
  `if (state.gameMode !== "hardcore") return;` větve — Normal true ending zůstává čistě
  lokální (`recordMonsterDefeat()` beze změny). Žádný lokální dispatch navíc netřeba (běžící
  run tímhle screenem stejně končí) — projeví se až v PŘÍŠTÍ misi přes
  `resolveFreshRunShotgunEquipment` výše.

### Existující hráč se starou (čistě lokální) dvouhlavňovkovou odměnou

`game/equipment/existingPlayerWeaponMigration.ts#resolveExistingPlayerWeaponMigrationAction`
— jednorázová bezpečná migrace, VÝHRADNĚ `double_barrel_shotgun` (přes reálný `unlockWeapon`
endpoint, nikdy PUT). `single_shotgun` se NEODHADUJE — `MonsterDefeatReward` nikdy
netrackoval "hráč má běžnou brokovnici", jen dvouhlavňovku, takže by šlo o čistou spekulaci.
Podmínky (VŠECHNY musí platit): profil je `ready`, `ownedWeapons.length === 0` (jakmile má
cokoliv, migrace se už nikdy nespustí znovu — nikdy nepřepíše existující vlastnictví),
`getMonsterDefeatReward().doubleBarrelUnlocked === true`. `app/play/page.tsx` volá tenhle
resolver v efektu vázaném na `object13Profile.loadState`, `existingPlayerWeaponMigrationAttemptedRef`
zaručí NEJVÝŠ JEDEN pokus za mount (i po neúspěchu) — žádný automatický retry v rámci
stejné session; nová session/reload to zkusí znovu jen proto, že `ownedWeapons` je pořád
prázdné (přirozený, ne smyčkový retry).

### Training vs Hardcore vs anonymní — shrnutí

Stejná `GAME_MODE_CONFIG[gameMode].persistInventory` konfigurace jako u žárovek (žádné
druhé, equipment-specifické pole) — vlastnictví zbraně je stejně "trvalý profilový stav"
jako počet žárovek. Training: profil SMÍ číst existující vlastněnou výbavu jako výchozí
loadout (přes stejný `resolveFreshRunShotgunEquipment`, jen s `gameMode === "normal"`, což
ho pošle na lokální větev — Training tedy zatím startovní výbavu z profilu NEČTE, jen
zůstává neregresní vůči dřívějšímu chování; čtení coby budoucí vylepšení, ne bug), nové
odemčení se NIKDY neukládá na VPS. Hardcore: profil je autorita, nový unlock je
server-confirmed událost, run bez `ready` profilu se vůbec nespustí. Anonymní: čistě
lokální, beze změny oproti stavu před týmhle krokem.

### Stará paralelní autorita — co zůstalo, co přestalo být autoritou

`MonsterDefeatReward.doubleBarrelUnlocked` (localStorage, mode-agnostic) zůstává jako
zdroj pro Training/anonymní fallback a pro `existingPlayerWeaponMigration` vstup — u
PŘIHLÁŠENÉHO Hardcore hráče už NIKDY nerozhoduje, kterou zbraň mise nastartuje.
`ServerHardcorePlayerProfile.hardcoreDoubleBarrelUnlocked` (`game/core/hardcorePlayerProfileSnapshot.ts`)
zůstává výhradně jako HISTORICKÁ statistika pro `/profile`
(`serverHardcoreProfileToReward`) — nikdy nebyla a dál není konzultovaná při rozhodování o
zbrani (ověřeno, jediné volací místo je `ProfileScreen.tsx`). Žádné pole nebylo z DB
odstraněno (menší rozsah migrace) — jen přestalo být autoritou pro rozhodování o vybavení.

## Power drain diagnostika (audit podezřele rychlého vybití energie)

Podnět: hlášení "brutálně rychlého" vybití energie s debug logem, který v okamžiku snímku
vypadal neškodně (`playerView: desk`, dveře otevřené, světlo vypnuté, generátor `normal`,
žádná otevřená kamera). Závěr auditu: **žádný bug v samotném výpočtu power** — viz
`game/core/powerDrain.ts` a jeho testy (`powerDrain.test.ts`, 14 testů) pro ověření všech
podmínek níže. Skutečné vysvětlení a nový diagnostický nástroj popsané dál.

### Kompletní seznam drain/recharge složek (`applyPowerDelta`/`computePowerDrainBreakdown`)

Dvě neslučitelné větve, přesně jedna platí každý tik:

- **`watchingCameras`** (`state.cameraOpen && state.playerView === "desk"`) — jen drain, žádné
  dobíjení: `idle` (`night.powerDrainPerSecond.idle`, night01: 0.15/s) + `cameraOpen`
  (0.2/s) + generátor extra (níže).
- **jinak** (dveře/pohled na dveře či generátor, nebo desk bez otevřené kamery) — drain jen
  z toho, co je SKUTEČNĚ aktivní: `doorClosed` (1.4/s, jen když `state.doorClosed`) +
  `lightOn` (1.0/s, jen když `state.lightOn`) + generátor extra (níže), proti tomu
  `night.rechargePerSecondWhenIdle` (night01: 1/12 %/s).
- **Generátor extra drain** — pevná spotřeba `2 × doorClosed + lightOn` (night01: 3.8/s),
  aplikovaná v OBOU větvích výše, jen když `generatorState` je `"criticalBeeping"` nebo
  `"restarting"` — bez ohledu na to, jestli jsou dveře/světlo skutečně zavřené/zapnuté.
  `"silentFault"` (prvních 10 s po poruše, `silentGraceMs`) žádnou extra spotřebu nemá.
- **Night scaling multiplikátor** (`computeNightScaling`, explicitní tabulka, cap 2.0× od
  noci 10) — násobí součet drainu přesně JEDNOU, nikdy recharge, nikdy dvakrát (ověřeno testem
  "applies... exactly once, never compounded").

Sčítají se ANO — door + light + generátor extra se sečtou, pokud platí víc podmínek
najednou (např. zavřené dveře SOUČASNĚ se zapnutým světlem během door-light repelu proti
monstru = 2.4/s, ne jen jedna z hodnot).

### Odpovědi na konkrétní otázky z auditu

1. **Drain při `playerView: desk`?** Ano, pokud je otevřený DETAIL kamery
   (`watchingCameras`) — ale ne jinak. Bez otevřené kamery na desk platí stejná pravidla
   jako v door/generator pohledu (jen door/light/generátor extra).
2. **Počítá se overview jako aktivní kamera?** Ne — `cameraOpen` je `true` JEN v
   `cameraViewMode: "detail"` (nastaveno výhradně v `OPEN_CAMERA`), overview ho vždy
   nastavuje na `false` (`LOOK_AT_DOOR`/`LOOK_AT_GENERATOR`/`CLOSE_CAMERAS`/blackout).
   Overview tedy nikdy nedrénuje jako detail.
3. **Může kamera vypadat zavřená v UI, ale žrát energii?** Ne — `watchingCameras` čte přímo
   `state.cameraOpen`/`state.playerView`, žádný jiný lokální/UI stav se nepoužívá.
4. **Ovlivňuje blackout/tension drain dál?** Blackout má vlastní, úplně oddělenou větev
   `TICK`u (`gameStatus === "blackout"`) — `applyPowerDelta` se v blackoutu vůbec nevolá.
   `tension`/`atmosphereState.ts` čte `power`, nikdy obráceně (ověřeno gremem přes
   `game/core/*.ts`/`game/visuals/*.ts` — jediná reference na `state.power` je čtecí, v
   `atmosphereState.ts`).

### Skutečné vysvětlení nahlášeného stavu

Debug log byl zachycen `blackoutElapsedMs: 6101`, tedy **6 sekund PO** vstupu do blackoutu —
`gameStatus === "blackout"` větev `TICK`u přitom force-nuluje `doorClosed`/`lightOn`/
`cameraOpen` na bezpečné hodnoty (viz `power <= 0` větev). Snímek proto nutně vypadá
neškodně bez ohledu na to, co energii spotřebovalo PŘED blackoutem — debug panel v tu chvíli
neukazoval příčinu, jen důsledek. Ze zbytku logu (`faults: 1`, `generatorState: normal` — tedy
porucha už byla vyřešena restartem; `roars: 1` — door-light repel proti monstru už jednou
proběhl) je nejpravděpodobnější příčina kombinace:
- neošetřená porucha generátoru v `criticalBeeping` (3.8/s × až 1.2 multiplikátor = až
  4.56/s), která podle designu (viz GAME_DESIGN.md "Generátor") běží, DOKUD ji hráč
  nerestartuje — čím déle si jí nevšimne, tím větší ztráta,
- plus náklad na úspěšný door-light repel (zavřené dveře + světlo současně, ~2.4/s po dobu
  standoffu).

Obojí je záměrný design (cena za ignorování generátoru / za obranu proti monstru), ne bug —
problém byl v tom, že to nešlo z debug panelu OKAMŽITĚ vidět, protože panel neukazoval
rozpad drainu, jen aktuální `power` číslo.

### Oprava: sdílený `computePowerDrainBreakdown` + DebugPanel sekce

`game/core/powerDrain.ts` — nová čistá funkce, jediné místo pravdy pro rozpad drainu,
použitá jak reducerem (`applyPowerDelta` teď jen `state.power + netPerSecond * seconds`,
beze změny chování — 146 existujících testů beze změny prošlo po refaktoru), tak
`DebugPanel.tsx` (nová sekce "Power drain" hned pod `power:` — idle/camera/door/light/
generátor extra/night scaling multiplier/total drain/recharge/net, barevně net
kladné/záporné). Diagnostika je tak MATEMATICKY nemožná odchýlit od skutečného chování hry
(žádná duplicitní kopie vzorce). `DebugPanel` dostal nový volitelný prop `nightNumber` (viz
`GameScreen.tsx`), ať multiplier v breakdownu odpovídá skutečně běžící noci, ne vždy noci 1.

Testy: `game/core/powerDrain.test.ts` (14 testů) — bezpečný idle stav (recharge, ne drain),
overview vs. detail kamera, izolace door/light drainu, generátor critical/restarting vs.
normal/silentFault (a že extra drain po opravě zmizí), night scaling aplikovaný přesně
jednou a nikdy na recharge.

## Diagnostika: přihlášený hráč chybí na `/leaderboard`

Podnět: hráč viděl v menu "Identita hlídače ověřena: czhyenacz" (session/Discord login
funguje), ale na `/leaderboard` se nezobrazoval. Audit (VPS DB dotaz, přímý curl na
produkční `/nocni-hlidac/player/upsert`, kontrola `listNocniHlidacLeaderboard` řazení,
kontrola cache hlaviček produkční stránky) ukázal:

- **Skutečná příčina**: hráčova session cookie vznikla PŘED commitem, který do
  `app/api/auth/callback/route.ts` přidal `await upsertHubPlayer(player)` (Discord login
  `b369a7e` běžel v produkci dřív, VPS wiring `e47fdda` až později týž den). Session je
  pořád platná (`getSession()` jen dekóduje cookie, nikdy se neptá VPS), takže UI dál hlásí
  přihlášeného hráče — ale upsert do VPS DB se pro tenhle konkrétní login nikdy nespustil,
  protože ten kód v době jeho přihlášení ještě neexistoval. Ověřeno přímým dotazem do
  produkční `NocniHlidacPlayer` tabulky (czhyenacz tam skutečně chybí) a přímým externím
  curl na `POST /nocni-hlidac/player/upsert` (funguje, 200, založí záznam) — VPS endpoint
  není rozbitý, jen se pro tuhle session nikdy nezavolal. **Náprava beze změny kódu: nové
  přihlášení (odhlásit/znovu přes Discord) spustí aktuální callback a hráče založí.**
- `listNocniHlidacLeaderboard` (project-hub-api) nefiltruje `bestRun = 0` (ověřeno testovacím
  záznamem s `0/0`, který se v odpovědi objevil) — žádný bug v řazení/limitu.
- **Vedlejší zjištění, opraveno**: `app/leaderboard/page.tsx` neměl `export const dynamic`
  — lokální build bez `NOCNI_HLIDAC_API_*` proměnných vyšel jako `○ Static` (stránka by se
  v takovém buildu zamrazila na mock datech z okamžiku buildu). Na produkci (Vercel má env
  proměnné při buildu, `fetch(..., {cache:"no-store"})` uvnitř `getLeaderboardEntries()`
  správně spustil dynamické renderování — ověřeno `x-vercel-cache: MISS` na každý request)
  se to zatím neprojevovalo, ale spoléhat na tenhle nepřímý signál je křehké. Přidáno
  `export const dynamic = "force-dynamic";` — teď je dynamické vždy, bez ohledu na stav env
  proměnných v okamžiku posledního buildu.
- **Vedlejší zjištění, opraveno**: `lib/hubClient.ts#hubFetch` úplně tiše polykal chyby
  (žádný `console.error` na ne-2xx odpověď ani na network/timeout chybu) — do Vercel logu by
  se selhání upsertu vůbec nedostalo. Přidán `console.error` s cestou a
  statusem/chybou (nikdy hlavičky/token), ať jde budoucí podobné selhání dohledat.

## Self-healing upsert — `ensureHubPlayer` (oprava "starou session hráč nikdy nevznikne")

Krok výše diagnostikoval příčinu ("re-login nutný"), ale spoléhat na to, že si to hráč sám
neuvědomí a nikdy se znovu nepřihlásí, je špatné UX i špatná spolehlivost. Tenhle krok dělá
zápis hráče robustní: **platná Discord session sama o sobě stačí** k tomu, aby hráč vznikl v
DB, ne jen samotný OAuth callback.

- **`lib/leaderboard/ensureHubPlayer.ts`** — nový `ensureHubPlayer(player: DiscordPlayer,
  context: string): Promise<void>`. Zabalí `upsertHubPlayer` (viz níže) do vlastního
  try/catch (defense-in-depth — `upsertHubPlayer`/`hubPost` samy o sobě už nikdy nevyhodí,
  ale tohle je poslední pojistka), na neúspěch (upsert vrátil `false`, nebo nastala
  neočekávaná chyba) zaloguje `console.warn`/`console.error` s `context` (odkud se volalo)
  a `discordUserId` (veřejné Discord ID, ne token — bezpečné logovat). Nikdy nevyhazuje,
  nikdy neposílá token do klienta.
- **`upsertHubPlayer`** (`lib/leaderboard/remotePlayer.ts`) teď vrací `Promise<boolean>`
  (dřív `Promise<void>`) — `true`, jen když `hubPost` skutečně dostal úspěšnou odpověď, ať
  `ensureHubPlayer` může rozlišit úspěch od tichého selhání.
- **Volá se na třech místech**, ne jen v OAuth callbacku:
  1. `app/api/auth/callback/route.ts` — beze změny místa volání, jen přejmenováno na
     `ensureHubPlayer(player, "auth/callback")` (stejné logování jako zbytek).
  2. `app/api/auth/me/route.ts` — **nové**: kdykoliv `getSession()` vrátí platného hráče,
     než se odpoví klientovi. Protože `AuthStatus.tsx` volá `/api/auth/me` při každém
     mountu hlavního menu, tohle je vlastně hlavní "samoopravný" mechanismus — i STARÁ
     session (vytvořená před tím, než callback vůbec začal volat VPS) se tímhle při
     příštím zobrazení menu sama založí v DB.
  3. `lib/leaderboard/guardRunRequestHandlers.ts` — **nové**: `handleSurviveNightRequest`/
     `handleDeathRequest` teď volají `ensureHubPlayer(session, "survive-night"|"death")`
     TĚSNĚ PŘED samotným `recordSurvivedNight`/`recordDeath` voláním. I kdyby se hráč nikdy
     nezobrazil v menu (`/api/auth/me` se nezavolalo), první survive-night/death ho stejně
     založí — `ensureHubPlayer` je idempotentní upsert, ne drahá kontrola existence, takže
     se dá volat před KAŽDÝM požadavkem bez obav z duplicit nebo přepsání `bestRun`/
     `currentRun`.
- **Response shape** (`GuardRunResponse` v `guardRunRequestHandlers.ts`), přesně podle
  zadání — čitelné i při ručním curl testu:
  - 401 nepřihlášený: `{ ok: false, error: "not_authenticated" }`
  - 202 API nedostupné/nenakonfigurované: `{ ok: false, stored: false }`
  - 200 úspěch: `{ ok: true, stored: true, player: GuardRunState }`
- **Logy** (nikdy token/Authorization/cookie, jen `discordUserId` — veřejné Discord ID):
  `console.warn` když survive-night/death přijde bez session; `console.warn`/`console.error`
  z `ensureHubPlayer` na neúspěšný upsert; `console.warn` z `guardRunRequestHandlers.ts`,
  když `recordSurvivedNight`/`recordDeath` vrátí `null` (API nedostupné i PO úspěšném
  ensure, nebo pořád nenakonfigurované).

Testy: `lib/leaderboard/ensureHubPlayer.test.ts` (nikdy nevyhodí, loguje jen na neúspěch,
nikdy neloguje token), rozšířené `guardRunRequestHandlers.test.ts` (nové response shape,
ensure se volá před survive-night/death — ověřeno přes fetch spy na obě cesty, bezpečné
chování i když samotný ensure selže).

## Nouzová minihra — datové mapové layouty

Mapa `EmergencyMiniGame` (viz `app/minihra/page.tsx`) PŮVODNĚ byla jedna natvrdo zadaná
sada konstant přímo v `game/minigame/config.ts` (`WALLS`, `EXIT_ZONE`, `ITEM_SPAWN_POSITION`,
pevná start/enemy pozice). Teď je mapa **datově definovaná** (`MiniGameLayout`, viz
`game/minigame/layoutTypes.ts`) — NENÍ to procedurální generování (to zůstává v TODO.md
"Explicitně odložené věci"), jen ruční data místo natvrdo psaného kódu v komponentě.

- **`MiniGameLayout`** (`layoutTypes.ts`): `id`/`name`/`description`, `world: {width, height}`,
  `rooms: MiniGameLayoutRoom[]` (id/name/kind/bounds), `walls: MiniGameLayoutWall[]`
  (id/x/y/width/height/kind — strukturální nadmnožina `Wall`, jde předat rovnou do
  `circleIntersectsAnyWall`/`moveWithWallSliding`/`hasLineOfSight` beze změny tvaru), a
  `slots: MiniGameLayoutSlot[]` (id/roomId/x/y/tags/weight/debugName). Tagy
  (`MiniGameLayoutSlotTag`) = `"player_start" | "player_exit" | "monster_spawn" |
  "generic_loot" | MiniGameItemId` (battery/bulb/fuse/shotgun/ammo/key/toolbox).
- **`validateMiniGameLayout(layout)`** (`layoutValidation.ts`) — čistá strukturální validace:
  id/name, kladné rozměry světa, unikátní room/wall/slot id, sloty odkazující na existující
  `roomId`, sloty/zdi uvnitř world bounds, sloty ne uvnitř zdi/překážky, a povinná přítomnost
  aspoň jednoho `player_start`/`player_exit`/`monster_spawn` slotu. **Neověřuje** dosažitelnost
  start → objective → exit (pathfinding) — záměrně ponecháno jako TODO (viz TODO.md), validace
  je čistě geometrická/strukturální. Test `layoutValidation.test.ts` prohání validátor přes
  KAŽDÝ layout v `MINIGAME_LAYOUTS` registru.
- **`createSeededRandom(seed)`** (`seededRandom.ts`) — deterministický RNG (xmur3 hash +
  mulberry32 stream), stejný seed = stejná sekvence. `createRandomSeed()` generuje
  nedeterministický seed jen pro skutečnou hru bez explicitně zadaného seedu.
- **`resolveMiniGamePlacement(layout, input, seed)`** (`layoutPlacement.ts`) — vybere
  KONKRÉTNÍ sloty (player_start/player_exit/monster_spawn/objective podle
  `input.itemToCollect` pro `collect_item`) váhovaným losem (`slot.weight`, default 1) přes
  `createSeededRandom(seed)`, v pevném pořadí (start, exit, monster spawn, objective) —
  stejný `(layout, input, seed)` vrací vždy stejný výsledek. Chybí-li v layoutu slot s
  potřebným tagem, vyhodí `MiniGamePlacementError` — NIKDY tiché spadnutí na náhodnou pozici.
  `getRoomBoundsForSlot(layout, slotId)` vrátí bounds místnosti obsahující daný slot — použito
  jako "exit zóna" (obdélník pro E/return interakci), datově z layoutu, ne natvrdo.
- **`game/minigame/layouts/`** — `serviceFloorAlpha.ts` (baseline, 1:1 převod PŮVODNÍ natvrdo
  psané mapy, world 1000×650, jeden univerzální item slot se všemi item tagy — přesně
  zachovává starou "jeden item spot pro cokoliv" hratelnost) a `serviceFloorStorage.ts` (nová
  komplexnější servisně-skladová mapa, world 1400×900, 8 místností kolem centrální vertikální
  chodby s dveřními mezerami — ne jednou dlouhou zdí — na každé sdílené hranici, regálové/
  strojní překážky uvnitř místností, 2 sloupy přímo v chodbě, plný sady slotů podle zadání).
  `layouts/index.ts` je registr (`MINIGAME_LAYOUTS`, `getMiniGameLayout(id)` s fallbackem na
  `service_floor_alpha` pro neznámé id, stejný vzor jako `getMiniGameDebugScenario`).
- **`config.ts`** teď WALLS/EXIT_ZONE/ITEM_SPAWN_POSITION/WORLD_WIDTH/WORLD_HEIGHT/
  `MINIGAME_WORLD_SCALE` odvozuje z `SERVICE_FLOOR_ALPHA` (přes jeden pevný interní
  `resolveMiniGamePlacement` volání), ne obráceně — zpětně kompatibilní re-export, beze změny
  číselných hodnot, ať `config.test.ts`/`logic.test.ts` (`createInitialPlayer(equipment)`,
  `createInitialEnemy(player)` beze změny signatury pro staré 1-argumentové volání) projdou
  dál beze změny. Nová funkce `computeMiniGameWorldScale(worldWidth, worldHeight)` počítá
  JEDNOTNÉ měřítko (`Math.min(CANVAS_WIDTH/w, CANVAS_HEIGHT/h)`), kterým se libovolně velký
  layout vejde do stejného `CANVAS_WIDTH×CANVAS_HEIGHT` panelu — pro `service_floor_alpha`
  vychází přesně 0.8 (stejně jako dřívější pevná konstanta).
- **`EmergencyMiniGame.tsx`** — `createInitialState(input)` zvolí layout
  (`input.layoutId ?? DEFAULT_MINIGAME_LAYOUT_ID`), seed (`input.seed ?? createRandomSeed()`),
  zavolá `resolveMiniGamePlacement`, a z výsledku postaví `player`/`enemy`
  (`createInitialPlayer(equipment, placement.playerStart)`,
  `createInitialEnemy(player, placement.monsterSpawn, layout.walls, layout.world.width,
  layout.world.height)`), `exitZone` (`getRoomBoundsForSlot`), `itemPosition`
  (`placement.objectivePosition`) a `scale` (`computeMiniGameWorldScale`). Tick/draw/fireShot
  čtou tyhle hodnoty z `gameRef.current` (walls/worldWidth/worldHeight/exitZone/itemPosition/
  scale/enemyAiConfig), ne z module-level konstant — libovolný layout tak funguje beze změny
  zbytku komponenty. Debug HUD panel navíc zobrazuje `layoutId`/name/seed/vybrané sloty (viz
  zadání "Debug UI").
- **`EmergencyMiniGameInput`** má dvě nová volitelná pole: `layoutId?: string` (fallback na
  baseline) a `seed?: string` (fallback na nedeterministický `createRandomSeed()`) — debug
  scénáře (`debugScenarios.ts`) je nastavují explicitně, ať jsou reprodukovatelné.
- **`game/minigame/mapVisuals.ts`** — čisté helpery pro "evakuačně-plánový" vzhled mapy
  (viz zadání "vizuální/design pass"), použité generčně pro libovolný layout, ne jen
  `service_floor_evac_plan`: `getMiniGameRoomDisplayLabel(room)` (= `room.name.toUpperCase()`),
  `shouldShowRoomLabelByDefault(kind)` (jen `storage`/`technical`/`maintenance`/`loading`/
  `office` — chodby/utility/service popisek v BĚŽNÉM zobrazení nedostanou, ať mapa nepůsobí
  přeplácaně), `getMiniGameWallRenderStyle(wall)` (= `wall.kind ?? "wall"`, bezpečný fallback).
  `EmergencyMiniGame.tsx#draw` teď VŽDY (ne jen v dev overlayi) kreslí jemné obrysy/výplň
  místností (chodby mají odlišný nádech od skladů/technických místností) + popisky
  identifikujících místností, a rozlišuje styl zdí/překážek podle `kind`
  (`shelf` = vnitřní příčky/police, `machine` = vnitřní panel/rozvaděč, `obstacle` =
  menší tlumenější blok bez glow, `wall`/`door_block` = klasická zeď beze změny). Žádné
  z tohohle nemění collision/gameplay — `MiniGameRefState.walls` je teď typu
  `MiniGameLayoutWall[]` místo `Wall[]` (strukturální nadmnožina, beze změny chování
  `moveWithWallSliding`/`castVisionCone`/`isEnemyHit` apod.), jen aby `draw()` měl přístup
  ke `kind`. Debug layoutId/seed/slot id zůstávají výhradně v dev overlayi (`devOverlay.ts`,
  skrytý Shift + pravý klik) — room labels na mapě se nepovažují za debug údaj.
- **`service_floor_evac_plan.ts` — redesign překážek**: Sklad A má 3 rovnoběžné regálové
  řady se sdílenou centrální uličkou (x 280–320) navazující na horní vchod z
  `loading_access`, plus volný pruh podél pravé stěny až ke dveřím do `central_corridor` —
  žádný regál neblokuje žádnou z existujících cest. Sklad B má menší/hustší 2×2 uspořádání
  kratších regálů s jedním širokým (160px) centrálním křížovým průchodem. Rozvodna dostala
  2 další strojní bloky (celkem 4) u stěn, dílna 1 další pracovní stůl (celkem 3), nakládací
  zóna 2 další bedny (celkem 3 — servisní/nakládací dojem, ne prázdná aréna). Jména místností
  zkrácena na krátké, VELKÝMI PÍSMENY čitelné tvary (`"Rozvodna"`, `"Údržba"`, `"Servisní
  vstup"`, `"Sklad B"`) — jen `room.name`, žádný nový "display name" field. Jediný slot, který
  bylo nutné přesunout kvůli nové geometrii, byl `ammo_storage_a_01` (do centrální uličky
  skladu A, mimo nový regál) — všechny ostatní sloty zůstaly na původních souřadnicích a
  prošly beze změny stejnou validací (`validateMiniGameLayout`) i testy
  (`serviceFloorEvacPlan.test.ts`, `layoutPlacement.test.ts`).
- **Omezená viditelnost hráče / fog of war** (`game/minigame/playerVision.ts`) — dvě
  vrstvy, obě odvozené z `CONE_RANGE` (dostřel brokovnice), NE vlastní škála: periferní
  kruh (`MINIGAME_PLAYER_PERIPHERAL_VISION_RANGE_PX` = `CONE_RANGE × 1`, všechny směry) a
  směrová výseč před hráčem (`MINIGAME_PLAYER_DIRECTIONAL_VISION_RANGE_PX` = `CONE_RANGE × 3`,
  úhel `MINIGAME_PLAYER_VISION_ANGLE_DEG` = 170°, mnohem širší než útočná výseč
  `CONE_ANGLE_DEG`=70° — vidění a dostřel/zásah jsou záměrně oddělené, hit-detekce se
  neměnila). `getPlayerVisibilityAtPoint(point, walls, config)` = (periferní NEBO
  směrová) A ZÁROVEŇ `hasLineOfSight` (stejný LOS helper jako enemy vidění/shotgun,
  žádná vlastní přepsaná verze) — vrací `{ visible, reason }`
  (`peripheral`/`directional`/`blocked`/`out_of_range`). Facing úhel = `DIRECTION_ANGLES[player.direction]`,
  stejný jako pro existující útočnou výseč.
  `EmergencyMiniGame.tsx#draw` počítá `game.enemyVisibleToPlayer` jednou za tik (ne
  opakovaně v draw()) a mimo viditelnost NEKRESLÍ monstrum vůbec (dot, vision cone,
  wounded prstenec) — hlavní hororový efekt. Item marker (`collect_item`) se stejně
  kreslí jen ve viditelnosti; existující "office marker" (exit zóna) zůstává vždy
  viditelný beze změny (orientační bod pro návrat, ne "objective"). Fog samotný se
  vykresluje do vlastního offscreen `fogCanvas` (world-space, přerenderovaný KAŽDÝ
  frame, na rozdíl od statické `gridCanvas`) — tmavá výplň + `globalCompositeOperation
  = "destination-out"` vyříznutí viditelných polygonů (`castVisionCone`, STEJNÝ
  raycasting helper jako enemy vision cone rendering, žádný nový systém), `ctx.filter =
  "blur(10px)"` na vyříznutí pro měkký okraj zdarma. Dev overlay (`devOverlayEnabled`)
  fog úplně přeskočí a monstrum/item kreslí vždycky — dev lišta navíc ukazuje vision
  angle/peripheral/directional dosah a jestli je monstrum TEĎ viditelné
  (`isMonsterVisibleToPlayer`, počítáno jen když je dev overlay zapnutý).
- **Neřešeno/TODO**: dosažitelnost start → objective → exit (pathfinding/flood-fill) se
  neověřuje automaticky — nová mapa byla ručně prověřená (žádný slot uvnitř zdi/mimo bounds,
  viz testy), ale žádný test negarantuje, že cesta MEZI nimi vždy existuje. Přidat jako
  budoucí krok, pokud se ukáže potřeba (např. flood-fill přes hrubou mřížku volných buněk).

## Nouzová minihra — hrozba přenesená zpět do kanceláře ("threat on return")

Úspěšný návrat z EmergencyMiniGame (`outcome: "returned"`) může nést informaci, že
monstrum hráče v minihře pronásledovalo nebo bylo blízko kanceláře — "donesl jsem
baterii, ale přivedl jsem si to za sebou". Nikdy nezpůsobuje okamžitou smrt.

- **`game/minigame/officeThreat.ts#evaluateOfficeThreatOnReturn`** — čistá funkce,
  volaná z `EmergencyMiniGame.tsx#handleObjectiveKey` přesně v okamžiku úspěšného
  návratu (ne dřív). Vstup: `enemy.mode`, pozice enemy/player, `exitZone` (bounds
  místnosti "office"), dva dosahy (`OFFICE_THREAT_NEAR_PLAYER_RADIUS_PX`/
  `OFFICE_THREAT_NEAR_OFFICE_RADIUS_PX`, `config.ts`). `undefined` = žádná hrozba.
  Aktivní, když platí aspoň jedno: `enemyMode === "chasing"`, vzdálenost enemy↔player
  ≤ near-player dosah, nebo vzdálenost enemy↔officeZone ≤ near-office dosah (bod-k-
  obdélníku, stejný "closest point" vzor jako `circleIntersectsWall`). Intenzita:
  honička ZÁROVEŇ blízko kanceláře → `"high"`; jen jedno z toho → `"medium"`; jen
  blízkost hráči (bez honičky/blízkosti kanceláři) → `"low"`.
- **`EmergencyMiniGameResult`** (`"returned"` varianta) má nové volitelné pole
  `officeThreatOnReturn?: OfficeThreatOnReturn` (`{ active, reason, intensity }`).
  `createReturnedResult()` ho jen předá dál, pokud `active` — `game/minigame/*` samo
  o sobě o hlavní hře nic neví (stejná nezávislost jako zbytek minihry).
- **`app/play/page.tsx#handleEmergencyMiniGameComplete`** přečte jen `intensity` (ne
  celý objekt) a dispatchne novou akci `APPLY_OFFICE_THREAT_ON_RETURN` — překlad mezi
  `game/minigame`'s `OfficeThreatIntensity` a `game/core`'s vlastní `"low"|"medium"|
  "high"` union je záměrně bezobslužný (stejné literály), `game/core/gameActions.ts`
  ale typ z `game/minigame/*` NIKDY neimportuje (viz komentář v souboru). Zároveň
  přidá krátkou zprávu (`COPY.game.emergencyRunThreatFollowedLabel`, "Něco se vrátilo
  za tebou.") do stejného transient `emergencyRunMessage` stavu jako recharge hlášku
  (spojené jedním řetězcem, pokud nastanou obě najednou) — žádný nový audio event:
  existující `enemyStep`/`enemyNear` efekt (`useEffect` na `state.enemyStage`) se
  spustí automaticky, protože akce mění `enemyStage` stejně jako normální postup.
- **`gameReducer.ts` `APPLY_OFFICE_THREAT_ON_RETURN`** — stejné guardy jako
  `ENEMY_ADVANCE` (`isRunning`/blackout/doorDeathReveal). `pickOfficeThreatStage(route,
  intensity)` vybere první kandidát z `OFFICE_THREAT_STAGE_CANDIDATES[intensity]`
  (`low`: right_hallway/left_hallway/outer_yard; `medium`: door_hallway; `high`:
  at_door/breach), který je SKUTEČNĚ v `state.enemyRoute` (stejný "nikdy
  `route.indexOf(...) === -1`" důvod jako `MONSTER_RETREAT_CANDIDATES`) — bez
  kandidáta bezpečný no-op. Nastaví `enemyStage`, `lastEnemyDecision:
  "office_threat_on_return"`, resetuje door-hold časovač i
  `monsterRetreatedTo`/`monsterRetreatVerified` (stejný reset jako normální posun v
  ENEMY_ADVANCE) — **NIKDY** samo nevyhodnocuje/nezpůsobuje útok. `OFFICE_THREAT_STAGE_CANDIDATES.high`
  je `["at_door", "breach", "door_hallway"]` — `at_door` má přednost před `breach`
  (pole se prochází v pořadí, `.find()` vrátí první shodu), `breach` je jen fallback,
  pokud `at_door` v aktuální trase není.
- **Grace period po návratu** (`GameState.enemyDoorAttackGraceUntilMs`,
  `doorEncounter.ts#isDoorAttackGraceActive`) — `APPLY_OFFICE_THREAT_ON_RETURN` navíc
  nastaví `enemyDoorAttackGraceUntilMs: state.elapsedMs + OFFICE_THREAT_GRACE_*_MS`
  (`balancing/constants.ts`: low 1000 ms, medium 1800 ms, high 1500 ms). `ENEMY_ADVANCE`
  ve větvi "dveře otevřené + monstrum u dveří" nejdřív zkontroluje
  `isDoorAttackGraceActive(state)` (`enemyDoorAttackGraceUntilMs !== null &&
  elapsedMs < enemyDoorAttackGraceUntilMs`) — pokud běží, vrátí jen
  `lastEnemyDecision: "office_threat_grace"`, **žádnou smrt**, monstrum dál čeká u
  dveří. Grace se **vůbec neptá** na zavřené dveře — `isDoorAttackBlockedByClosedDoor`
  (běžné bušení/door bang) se vyhodnocuje úplně stejně jako dřív, grace ovlivňuje
  jen výsledek OTEVŘENÝCH dveří. Po vypršení (`elapsedMs >= enemyDoorAttackGraceUntilMs`)
  se `isDoorAttackGraceActive` vrátí `false` samo (žádné explicitní "ukončení" v
  reduceru potřeba) a `ENEMY_ADVANCE` pokračuje běžnou smrtovou větví beze změny.
  Pole se nastavuje VÝHRADNĚ v `APPLY_OFFICE_THREAT_ON_RETURN` — běžný door encounter
  mimo návrat z minihry (`enemyDoorAttackGraceUntilMs` zůstává `null` z
  `createInitialGameState`) je beze změny, ověřeno beze změny existujícími testy
  (`doorAttack.test.ts`, `doorEncounter.test.ts`).
- **Hláška při aktivní hrozbě** — `COPY.game.emergencyRunThreatFollowedLabel`
  (přesný text ze zadání, dvouřádkový přes `\n`: "Zdá se, že se nevracíš sám.\nZavři
  dveře!") se zobrazí ve stejném transient `emergencyRunMessage` boxu jako recharge
  hláška; box teď má `whitespace-pre-line`, ať se `\n` skutečně zalomí. Víc zpráv
  najednou (recharge + threat) se spojí `\n` (`messages.join("\n")`), ne mezerou.

## Brokovnice — munice bez automatického dobíjení (`game/core/shotgunEquipment.ts`)

Jediný zdroj pravdy pro nabitou munici je `GameState.shotgunAmmo` — kapacita se NIKDY
neukládá zvlášť, vždy se odvozuje z `hasShotgun`/`hasDoubleBarrelShotgun` přes
`getShotgunMaxAmmo()`. Dřívější chování ("po každém bezpečném návratu se munice dobije na
max") bylo záměrně odstraněno — `getRechargedShotgunAmmo()` zůstává v kódu jen pro dobíjení
na ZAČÁTKU noci (`app/play/page.tsx#handleBeginShift`, `RESTART_SHIFT`/`START_SHIFT` fresh
run větev), na návrat z minihry se už nepoužívá.

Munice zůstává čistě runtime stav aktuální mise (beze změny tímhle odstavcem) — SAMOTNÉ
vlastnictví zbraně (`hasShotgun`/`hasDoubleBarrelShotgun` na začátku nového runu) je od
kroku "profilový kontrakt V2 a equipment" (viz sekce výše) odvozené z
`Object13PlayerProfile.profileData.equipment`, ne z lokální odměny — viz
`game/equipment/weaponAcquisitionController.ts#resolveFreshRunShotgunEquipment` a
`game/core/shotgunEquipment.ts#createFreshRunShotgunEquipmentFromWeaponId`.

- **`canRequestAmmo(state)`** / **`requestSingleAmmo(state)`** — čisté funkce, `false`/beze
  změny bez brokovnice nebo na plné kapacitě, jinak `shotgunAmmo + 1` (nikdy víc, dvouhlavňovku
  je tak potřeba dvěma kliknutími). Jediné místo, které rozhoduje, jestli dávkovač smí přidat
  náboj — reducer (`REQUEST_AMMO` case) i `app/play/page.tsx#handleRequestAmmo` (pro výběr
  zvuku PŘED dispatchem) je volají, žádná duplicitní logika.
- **`gameReducer.ts` `REQUEST_AMMO`** — guard `isRunning && canRequestAmmo(state)`, jinak
  no-op (`return state`), stejný "pure helper rozhoduje, reducer jen zapíše" vzor jako zbytek
  souboru. Bez zvuku — o tom rozhoduje volající (`app/play/page.tsx`), protože jde vždy jen o
  přímý klik, nikdy o vedlejší efekt jiné akce (na rozdíl od `TOGGLE_SONIC_CANNON`, které
  potřebovalo `xSeq` vzor kvůli auto-off z reduceru).
- **`LeftWallView.tsx`** — tlačítko "ZAŽÁDAT O MUNICI" je vidět VŽDY (i bez brokovnice,
  `{ammo}/{max}` = `0/0`), jen vizuálně ztlumené (`opacity-50`), NE HTML `disabled` — stejná
  "klik dá zpětnou vazbu, ne ticho" konvence jako emergency-run tlačítko se zavřenými dveřmi.
- **`applyShotgunEmergencyReturn(current, shotgunAmmoBeforeRun, shotsUsed, effects)`** — nový
  parametr `shotsUsed` (z `EmergencyMiniGameResult["returned"].shotsUsed`, minihra ho už dřív
  počítala pro true ending, teď se použije i tady). Výsledná munice:
  `clamp(shotgunAmmoBeforeRun - shotsUsed + ammoAcquired, 0, capacity aktuální zbraně)`, kde
  `ammoAcquired` je součet `amount` ze všech `ammo_acquired` worldEffects (existující, dřív
  nevyužitý loot typ — `game/minigame/logic.ts#worldEffectsForItem("ammo")`, zatím se nikde
  reálně nespawnuje, ale efekt teď má skutečný dopad, kdyby se objevil v budoucím loot layoutu).
  Nová brokovnice (`shotgun_acquired` bez předchozí `hasShotgun`) tak začíná PRÁZDNÁ (`0/1`),
  ne nabitá — pokud hráč cestou nesebral i `ammo_acquired`.
- **Minihra (`EmergencyMiniGame.tsx`)** — vstupní `equipment.ammo` je vždy `state.shotgunAmmo`
  (`app/play/page.tsx`, žádná samostatná ammo evidence), `applyShot`/`canFireWeapon`
  (`game/minigame/logic.ts`, beze změny) už dřív správně odečítaly náboj za výstřel a
  odmítaly střelbu na nule — jediné chybějící propojení bylo, že se výsledek při návratu
  zahazoval (blunt recharge). `fireShot()` teď navíc při `!result.fired` (a `status ===
  "playing"`) přehraje `AUDIO_EVENTS.weaponEmptyClick` ("cvak naprázdno") — dřív bylo ticho.
- **Nové audio eventy** (`game/audio/audioEvents.ts`/`audioConfig.ts`, zatím jen fallback
  synth, žádné reálné soubory): `ammoDispenseClick` (úspěšné dávkování), `ammoRequestRejected`
  (sdílený pro OBA odmítací případy — plná zbraň i žádná zbraň zatím nenalezená),
  `weaponEmptyClick` (prázdná zbraň v minihře).

## Útok Ghoula na kameru (`game/core/cameraDamage.ts`, `game/core/cameraDamageConfig.ts`)

Hod proběhne PŘI KAŽDÉM použití sonického děla na Ghoula (`sonicEffective` v
`gameReducer.ts#ENEMY_ADVANCE`), nezávisle na `sonicResult` — 5% šance
(`GHOUL_CAMERA_ATTACK_CHANCE`). Zasáhne-li útok, PŘEVEZME kontrolu nad výsledným pohybem
tohohle hodu (Ghoul ustoupí přesně o jeden krok přes existující `stepBackOneStage`, nikdy
dvojitý retreat), nastaví "forced retreat" okno se `chance: 0` na
`GHOUL_CAMERA_ATTACK_RETREAT_PAUSE_MS` (7 s) — znovupoužitý mechanismus z light/UV repelu,
jen s nulovou šancí = čisté čekání.

- **Stav** — `GameState.cameraDamage: CameraDamageState { disabledCameraIds: CameraId[];
  activeAttack: { cameraId, startedAtMs, animationId } | null; lastAttackAtMs: number | null;
  lastFootstepsAtMs: number | null }`. Víc vyřazených kamer za noc, limit podle čísla noci
  (`getMaxDisabledCamerasForNight`, `MAX_DISABLED_CAMERAS_BY_NIGHT`: noc 1–10 → 1, 11–19 → 2,
  20+ → 3, nikdy uložené v GameState). `CAMERA_ATTACK_COOLDOWN_MS` (15 s) mezi útoky.
  `activeAttack` drží nejvýš jeden útok najednou — nový útok nemůže začít, dokud
  `activeAttack !== null` (přechod trvá jen 5 s, kratší než cooldown, ale kontrola je
  navíc explicitní). Reset na `INACTIVE_CAMERA_DAMAGE` při každém `createInitialGameState`
  (nová/opakovaná noc) — starší uložený stav bez těchhle polí se tak vždy bezpečně načte.
- **Seq countery** (`cameraAttackStartedSeq`, `cameraOfflineSeq`, `disabledCameraFootstepsSeq`)
  — stejný "reducer nikdy nevolá audio" vzor jako zbytek projektu, `app/play/page.tsx`
  podle změny přehraje zvuk.
- **Mikrofon zůstává funkční** — `withDisabledCameraFootsteps` (centrální wrapper na konci
  `gameReducer.ts`, stejný vzor jako `withEnemyStageVisitSeed`/`withSonicCannonAutoOff`)
  detekuje přechod "Ghoul je na lokaci offline kamery" z `false` na `true` (pokrývá JAK
  vstup Ghoula do už offline lokace, TAK dokončení vyřazení kamery, na které Ghoul už
  stojí, jedním sjednoceným porovnáním, `findDisabledCameraIdForEnemyStage`) a nastaví
  `disabledCameraFootstepsSeq` + `lastDisabledCameraFootstepsCameraId` (KTERÁ konkrétní
  kamera, ne jen "nějaká"), respektuje `DISABLED_CAMERA_FOOTSTEPS_COOLDOWN_MS` (10 s).
  Přehrání v `app/play/page.tsx` je navíc gatované přes `isWatchingDisabledCameraFootstepsSource`
  (`game/core/cameraDamage.ts`, čistá odvozená funkce) — hraje JEN, když hráč v okamžiku
  události sleduje detail PŘESNĚ té kamery (`cameraOpen && cameraViewMode === "detail" &&
  playerView === "desk" && activeCameraId === lastDisabledCameraFootstepsCameraId); jinak
  se seq jen "spotřebuje" beze zvuku, žádné doplnění při pozdějším přepnutí. Druhý efekt
  sleduje tutéž podmínku a při přechodu `true -> false` (přepnutí kamery, zavření
  kamerového systému, opuštění desk pohledu) zavolá `audioManager.stopLoop(...)` — pauza +
  `currentTime = 0`, ať se při návratu nedohrává stará událost (bezpečné i na `loop: false`
  zvuk). `DEBUG_PLAY_DISABLED_CAMERA_FOOTSTEPS` váže `lastDisabledCameraFootstepsCameraId`
  na aktuálně otevřenou kameru (`activeCameraId`), respektuje tak stejné pravidlo.
- **Sonické dělo na offline kameře** — funguje normálně (`isSonicCannonAffectingEnemy`
  nikdy nezávisel na `cameraDamage`, jen dřívější `TOGGLE_SONIC_CANNON` guard aktivaci
  blokoval — guard byl odstraněn, mikrofon offline kamery Ghoula prozradí i bez obrazu).
- **Viditelný ústup po sonickém odražení** (`GameState.sonicCannonPendingRetreat`,
  `SONIC_CANNON_RETREAT_REVEAL_MS` = 1500ms v `balancing/constants.ts`) — na rozdíl od
  gave_up/light/UV repelů (ty přesouvají Ghoula NA kamerou viditelnou stage, takže
  `getCameraImageSrc#isFleeingRetreat` "náhodou" funguje) sonický ústup posouvá Ghoula PRYČ
  ze sledované kamery, takže by okamžitá změna `enemyStage` nikdy nebyla vidět. `ENEMY_ADVANCE`
  s `sonicEffective && decision === "retreat"` proto `enemyStage` NEZMĚNÍ — jen bump
  `monsterRetreatRoarSeq` (existující roar→kroky sekvence) a nastaví
  `sonicCannonPendingRetreat: { targetStage, revealUntilMs }`. `ENEMY_ADVANCE` je zamrzlé
  (stejný vzor jako `doorDeathRevealUntilMs`), dokud pending běží. `TICK` po `revealUntilMs`
  (`resolveSonicCannonPendingRetreat`) skutečně přesune `enemyStage` na `targetStage` a
  spustí stejné "viditelný útěk" okno jako po útoku na kameru (`enemyForcedRetreatUntilMs`
  s `chance: 0`, `GHOUL_CAMERA_ATTACK_RETREAT_PAUSE_MS` = 7s).
- **Obrázková animace** (`game/cameras/cameraAttackAnimation.ts` obecný typ +
  `cameraAttackAnimation.object13.ts` konkrétní data) — 5 sekvencí, jedna na kameru
  (`outer_yard`/`left_hallway`/`right_hallway`/`door_hallway`/`door_hallway_light`, vybrané
  `game/core/cameraDamage.ts#resolveGhoulCameraAttackAnimationId` podle kamery + světla
  V OKAMŽIKU spuštění, zamrzlé do `activeAttack.animationId`). 26 snímků ve čtyřech
  hallway/door sekvencích (25 původních + 1 dodatečně přidaný jako nový poslední snímek,
  viz report), 4 snímky ve `outer_yard` (dodáno později — počet snímků se smí lišit,
  `frameDurationMs` se odvozuje z délky pole, takže přidání/ubrání snímku nikdy nemění
  celkovou délku sekvence). `CameraDamageOverlay.tsx` má i tak CSS ztmavnutí/zrnění
  fallback pro případ chybějící/prázdné sekvence.
  `resolveGhoulCameraAttackFrameState` čistě odvozuje index snímku z `nowMs - startedAtMs`
  (žádný lokální timer) — `frameDurationMs = GHOUL_CAMERA_ATTACK_FRAMES_DURATION_MS /
  frames.length` (2500ms / 26 ≈ 96ms), po `GHOUL_CAMERA_ATTACK_LAST_FRAME_HOLD_MS`
  (2000ms) drží poslední snímek, nikdy smyčka. Snímky zdrojově PNG → WebP převedeny
  skriptem `scripts/convert-ghoul-camera-attack-assets.py` (numerické řazení podle čísla
  v názvu, ne lexikografické), PNG i WebP koexistují ve stejné složce (stejná konvence
  jako zbytek `public/object_13/camera/`). Preload všech sekvencí na `LoadingScreen.tsx`
  (`preloadGhoulCameraAttackAnimations`).
- **Debug** (`DebugPanel.tsx`) — ruční spuštění útoku (i s vybranou konkrétní sekvencí),
  reset stavu poškození, teleport Ghoula na offline kameru (test mikrofonu), ruční
  přehrání zvuku kroků, override efektivní šance na 100 % (`debugGhoulCameraAttackChanceOverride`,
  produkční `GHOUL_CAMERA_ATTACK_CHANCE` beze změny), skok na poslední snímek, skok rovnou
  do offline stavu.
- **Rádiová hláška "kamera zničena"** (`game/radio/cameraDisabledRadioMessage.ts`,
  `useCameraDisabledRadioMessage.ts`) — tři skutečně namluvené varianty
  (`camera_destroid_full_1.wav`, dodaný zdroj), náhodně vybraná jedna při každém
  dokončeném vyřazení kamery (`cameraOfflineSeq`), přehrává se přes `audioManager` a
  overlay text odpovídá přesně přehrávané variantě (na rozdíl od repel/release hlášek,
  kde je text jen obecný status — tady máme ověřený přepis). Přepis zajištěn nástrojem
  **Whisper** (OpenAI, model `medium`, lokálně přes `pip install openai-whisper` do
  virtuálního prostředí) — spuštěno na celém souboru i na jednotlivě vyříznutých
  segmentech pro ověření shody. Čtvrtý segment ve zdrojové nahrávce zůstal
  nesrozumitelný i po opakovaných pokusech (různé ořezy/denoising/prompty) a byl na
  žádost vynechán — pool má tři varianty, ne čtyři.

## Titanovo zamrznutí u dveří během generátorového přetížení (oprava race condition)

Titanův postup mezi route stage řídí `ENEMY_ADVANCE` na vlastním, NEZÁVISLÉM intervalu
(`night.enemyTickMs`), zatímco desetisekundové generátorové přetížení
(`GENERATOR_OVERLOAD_DOOR_DURATION_MS`) se vyhodnocuje přes `TICK` na jiném, kratším
intervalu. Protože `at_door`+`breach` dohromady trvají jen ~2s
(`TITAN_DOOR_BREACH_STAGE_STAY_MS × 2`), i platně spuštěné přetížení mohlo dřív "prohrát
závod" — Titanův vlastní časovač ho stihl posunout do `"attack"`/smrti dřív, než přetížení
doběhlo, zatímco hráč mezitím viděl jen obecnou countdown/tavicí animaci overloadu (ta má
v `DoorView.tsx` vizuální prioritu nad breach snímky).

Oprava: `resolveTitanAdvance.ts` má hned na začátku (před dwell-time kontrolou) guard —
dokud `state.doorGeneratorOverloadUntilMs !== null` A Titan je právě `isMonsterAtDoor`
(`"at_door"`/`"breach"`), funkce vrátí jen `{ lastEnemyDecision: "stay" }` a Titanův postup
se ÚPLNĚ zastaví. Titan tak zůstane `isMonsterAtDoor === true` po celou dobu přetížení,
takže `updateDoorGeneratorOverload` (`gameReducer.ts`) při vypršení garantovaně najde
podmínku pro `enemyStage: "graveyard"` splněnou — přesně JEDEN autoritativní výsledek, nikdy
souběžně kill-sekvence a Game Over. Guard používá výhradně existující pole
(`doorGeneratorOverloadUntilMs`, `isMonsterAtDoor`) — žádné nové `GameState` pole, žádný
paralelní generation/token systém. Neovlivňuje Titanovu trasu/rychlost mimo dveře, délku
`at_door`/`breach` dwellu, ani samotné trvání/sílu přetížení.

## Oprava: kamery během Titana zobrazovaly jen Titana, klasické záběry chyběly

`TITAN_CAMERA_ASSETS` (`game/enemies/monsterPresentation.ts`) mělo prázdné `normal` pole pro
každou kameru — `getCameraImageSrc` tak na kamerách BEZ Titana spadalo na `pickCycling([])`
→ `null` (prázdná kamera), a jediná kamera, kde Titan zrovna byl, ukázala jen samotný Titan
obrázek bez okolního kontextu. Oprava: `normal` teď sdílí stejná pole jako `IMP_CAMERA_ASSETS`
pro danou `CameraId` (stejná fyzická lokace/kamera, nezávislá na aktivním monstru), takže
kamera vždy zobrazí aspoň základní záběr. Titanovy `monster` obrázky (ověřeno vizuálně) jsou
kompletní kompozitní záběry (celé prostředí + Titan), ne průhledný overlay, takže se dál
používají jako CELÁ scéna, ne jako vrstva nad `normal` — žádná nová kompozitní/overlay
renderovací vrstva nebyla potřeba.

## at_door obrázky, bezpečnostní pravidlo světla, Titan rozbíjí žárovku, kratší overload hold

- **`at_door` obrázky u OTEVŘENÝCH dveří** (viz zadání "Nové obrázky pro stav at_door") —
  `game/visuals/doorMonsterOverlay.ts#resolveDoorMonsterOverlay` je čistá funkce se čtyřmi
  vstupy (`doorClosed`, `isImpAtDoor`, `isTitanAtDoor`, `isTitanBreach`), kterou DoorView.tsx
  konzultuje AŽ PO vyloučení vyšší priority (deathReveal/overloadDeathReveal/destroyed/
  probíhající přetížení). Imp: nový snímek `imp_at_door.webp` vložený do
  `BACKGROUND_SCENES.door.frames` (`IMP_AT_DOOR_FRAME_INDEX`, PŘED death-reveal snímkem, ať
  `deathRevealIndex = frames.length-1` zůstane platné). Titan: `TITAN_AT_DOOR_SRC` teď
  ukazuje na VLASTNÍ `titan_at_door.webp` (dřív sdílel `breakthrough[0]` s neaktivní breach
  sekvencí) — `breach` obrázek (`TITAN_BREACH_SRC`) zůstává beze změny a nezávisí na
  `doorClosed`. Obojí platí VÝHRADNĚ při otevřených dveřích — zavřené dveře se propadnou na
  běžnou zavřenou idle animaci.
- **Nelze rozsvítit při otevřených dveřích** (viz zadání) — `TOGGLE_LIGHT` v gameReducer.ts
  blokuje jen ZAPNUTÍ (`!state.lightOn`) při `!state.doorClosed`; vypnutí zůstává vždy možné.
  Blokovaný pokus nemění `lightOn`, jen zvýší `GameState.lightToggleBlockedSeq` — stejný "seq
  counter, komponenta si sama hlídá krátké zobrazení" vzor jako
  `generatorAccidentalRestartSeq`. `LightControl.tsx` na změnu ukáže krátké bliknutí +
  hlášku (`LIGHT_TOGGLE_BLOCKED_MESSAGE_MS`), žádné nové dialogové okno.
- **Titan rozbíjí žárovku u dveří** (viz zadání) — `resolveTitanAdvance.ts`, PŘESNĚ při
  přechodu `nextStage === "at_door"` (jednorázová větev, stejný vzor jako breach-transition
  auto-view-switch), pokud `isNearRoomLightActive(state)` byla v tu chvíli `true`. Použije
  stejný `roomBulbs`/`bulbBreakSeq` mechanismus jako zbytek hry (žádný nový systém) — bez
  podmínky by se žárovka mohla "rozbít" i podruhé, ale `isNearRoomLightActive` je po prvním
  rozbití vždy `false`, takže se větev sama neopakuje.
- **Kratší držení pro přetížení generátoru** — `GENERATOR_OVERLOAD_WINDUP_DURATION_MS` už
  není odvozené od `EMERGENCY_RUN_WINDUP_DURATION_MS` (3000ms), ale VLASTNÍ nezávislá
  hodnota 1500ms — emergency run/"Nechat si to projít hlavou" beze změny.

## Death flow pro minihru a vybitou energii — žádný Ghoul/Imp/Titan reveal

Smrt v nouzové minihře (`deathReason: "emergency_run"`) a smrt vybitím energie
(`"blackout_timeout"`) NEJSOU útokem konkrétního monstra — obě dřív spadaly do generického
`BACKGROUND_SCENES.death` fallbacku (Ghoulova animace) jak pro 4s GAME OVER reveal
(`game/death/gameOverReveal.ts#resolveGameOverImageSrc`, dřív rozhodoval podle
`activeMonsterId`), tak pro druhou fázi DeathScreen.tsx. Obě místa teď rozhodují PRIMÁRNĚ
podle `deathReason` (ne `monsterId` — `monsterId` je jen fallback pro skutečný útok
monstra, kde `deathReason` sám nerozlišuje mezi monstry), sdílí novou statickou scénu
`BACKGROUND_SCENES.genericDeath` (`death_bg_0.webp`, stejný soubor pro reveal i druhou fázi,
nulová šance na probliknutí). Výběr druhé fáze je vyňatý do čisté funkce
`game/death/deathScreenScene.ts#resolveDeathScreenScene`, stejný "žádná komponenta nepočítá
odvozený stav sama" vzor jako `doorMonsterOverlay.ts`. `DeathScreen.tsx`'s `skipReveal`
(žádné čekání na doběhnutí animace, dialog se objeví hned po 4s reveal fázi) teď zahrnuje i
`blackout_timeout` (stejný důvod jako `titan_door_breach` — statická scéna, stejný obrázek
už byl vidět v reveal fázi). `deathReason` samo o sobě je stabilní pole `GameState` (nikdy se
po smrti nepřepisuje) a `activeMonsterId` už byl snapshotovaný dřívější Titan opravou —
žádný nový snapshot mechanismus nebyl potřeba.

## at_door dostal vlastní (delší) dobu setrvání než breach

`resolveTitanStageStayMs` (`game/enemies/resolveTitanAdvance.ts`) dřív používal STEJNOU
`TITAN_DOOR_BREACH_STAGE_STAY_MS` (1000ms) pro `at_door` i `breach`. Na žádost "zvyš at_door
na 7s" má teď `at_door` vlastní `TITAN_AT_DOOR_STAGE_STAY_MS` (7000ms, `game/balancing/constants.ts`)
— víc reálného času všimnout si Titana u dveří a zareagovat (zavřít, spustit přetížení), než
začne samotné prorážení. `breach` zůstává beze změny (`TITAN_DOOR_BREACH_STAGE_STAY_MS`,
1000ms) — celkový čas od vstupu do `at_door` do útoku je teď ~8s místo dřívějších ~2s, pokud
mezitím neběží generátorové přetížení (to Titana u dveří úplně zamrzne, viz výše). Bušení na
dveře (`titanDoorPounding`, viz `computeTitanAudioTrack` v `game/audio/titanFootsteps.ts`)
hraje po celou dobu `at_door` i `breach` beze změny, takže teď pokrývá celých ~8s místo ~2s.

## Titanovo pevné první setkání v noci 5 + posunuté přetížení generátoru + rádiové ticho 1-4

- **Noc 5 = vždy Titan** — `TITAN_FIRST_ENCOUNTER_NIGHT` (`game/core/titanEncounterNights.ts`,
  hodnota 5) je PEVNÉ první setkání, nezávislé na `TITAN_ENCOUNTER_RANGES`/
  `rollTitanEncounterNights`. `game/nights/nightRegistry.ts#resolveNightDefinition` vrací
  `NIGHT_15` (Titan) i pro `nightNumber === TITAN_FIRST_ENCOUNTER_NIGHT`, nezávisle na
  losované `titanNights` trojici — run tak má celkem ČTYŘI Titanova setkání (1 pevné + 3
  losovaná z `[11,15]`/`[16,21]`/`[22,30]`, beze změny), ne tři.
- **`GENERATOR_OVERLOAD_MIN_NIGHT`** (`game/difficulty/nightConfig.ts`) posunuto z 5 na 4 —
  hráč má funkční "PŘETÍŽIT GENERÁTOR" hotové ještě PŘED prvním (pevným) Titanovým setkáním.
- **Rádiové "vypuštění monstra" ticho v nocích 1-4** — `RELEASE_MONSTER_MESSAGE_MIN_NIGHT`
  (`game/radio/releaseMonsterMessages.ts`, hodnota 5, schválně stejná jako
  `TITAN_FIRST_ENCOUNTER_NIGHT`) přidává druhou podmínku do `RadioMessageOverlay.tsx`'s
  `useRadioMessage(...)` `enabled` argumentu vedle existující `monsterId !== "titan"` — obě
  podmínky společně zajišťují, že Impovo hlášení mlčí noci 1-4 A na Titanově pevné noci 5
  (kde by ho `monsterId !== "titan"` samo o sobě stejně vyloučilo).

## Revize atmosféry — průmyslový analogový horor místo cyberpunkového UI

Cíl (viz zadání): posunout globální barevný vzhled hry pryč od modře nasvíceného
cyberpunku k tlumenému, industriálnímu vizuálu. Šlo výhradně o globální barevné efekty
(`game/visuals/`, `styles/atmosphere.css`), NE o redesign jednotlivých komponent/Tailwind
tříd.

- **`game/visuals/visualEffects.ts`** — `tensionToAtmosphereStyle(tensionLevel)` teď mapuje
  napětí na saturaci PÁSMOVĚ (`low`/`medium`/`high`/`critical`, viz `classifyTensionBand`),
  ne jedním lineárním vzorcem. Devět řídicích bodů (`SATURATION_CURVE_POINTS`) prochází
  přesně středem každého zadaného rozsahu (low 0.65–0.75, medium 0.35–0.5, high 0.08–0.2,
  critical < 0.1) a mezi sousedními body interpoluje `smoothstep` (C1 spojitá, ne lineární
  lom) — křivka je tak spojitá a monotónně klesající po celém rozsahu 0–1, nikdy neskáče.
  Základní saturace při `tensionLevel = 0` je 0.75, ne 1 (nikdy plná barva). Přibyl nový
  `brightness` parametr (1 → 0.88, jemný pokles), `contrast` beze změny principu (1 → 1.6,
  jen širší rozsah než dřív).
- **`styles/atmosphere.css`** — `.atmosphere-root`'s filter dostal navíc pevné
  `sepia(0.12)` (na tensionLevel nezávislé) — jemně potlačuje výchozí modrý/neonový nádech
  Tailwind palety globálně, bez zásahu do jednotlivých komponent.
- **`game/visuals/atmosphereFlicker.ts` + `useAtmosphereFlicker.ts`** — probliknutí žárovky
  nahrazuje starý pravidelný `@keyframes … infinite` CSS loop. Nový systém je čistě
  event-driven: `rollNextFlickerDelayMs`/`rollFlickerEvent` (injektovatelný `random`, stejný
  vzor jako `rollTitanEncounterNights`) losují KAŽDÉ probliknutí zvlášť — interval (8–20s v
  klidu, 0.7–2.2s v kritickém stavu), délku (60–220ms), intenzitu a jestli půjde o
  dvojité probliknutí (pravděpodobnost roste s napětím). Hook řetězí `setTimeout` (nikdy
  `setInterval`), takže žádné dva flickery nejsou stejně daleko od sebe.
- **Oddělení "pomalé" a "okamžité" vrstvy** — `.atmosphere-root` (saturace/kontrast/jas,
  `transition: filter 0.6s`) a vnořená `.atmosphere-flicker-layer` (jen `brightness`, BEZ
  transition) jsou dva samostatné DOM elementy s vlastním `filter`, ne jedna sdílená
  vlastnost. Důvod: kdyby probliknutí měnilo STEJNOU `filter` vlastnost jako pomalá tension
  tranzice, každý rychlý pokles jasu by se protransitionoval přes těch 0.6s místo aby byl
  okamžitý — CSS `filter` na vnořeném elementu se přirozeně skládá s filtrem rodiče, takže
  vizuálně fungují jako jeden efekt i přes dvě nezávislé CSS vlastnosti.
- **`game/visuals/atmosphereFlicker.ts#computeAtmosphereFlickerActive`** — čistá gate funkce
  (`screen`/`activeMiniGame`/`thinkItOverCinematicActive`/`prefersReducedMotion` →
  `boolean`), kterou `app/play/page.tsx` používá jako `enabled` pro `useAtmosphereFlicker`.
  Probliknutí běží JEN v `screen === "playing"`, mimo aktivní nouzovou minihru (ta má
  vlastní vizuální stav) a mimo "Nechat si to projít hlavou" cinematiku — menu/briefing/
  death/win/monsterDefeated ho tak nikdy nespustí. Pomalá saturace/kontrast/jas na
  `.atmosphere-root` (bez flickeru) zůstávají aplikované na všech obrazovkách beze změny
  (nešlo o cíl týhle revize je vypínat).
- **`game/visuals/usePrefersReducedMotion.ts`** — `matchMedia("(prefers-reduced-motion:
  reduce)")` + `change` listener; `computeAtmosphereFlickerActive` na to reaguje okamžitě.
  Druhá, čistě obranná pojistka je přímo v CSS (`@media (prefers-reduced-motion: reduce) {
  .atmosphere-flicker-layer { filter: none !important; } }`).
- Filter-based efekt (`saturate`/`contrast`/`brightness`/`sepia`) nikdy nemění layout
  (žádný `transform`/`width`/`height`), takže flicker ani tension tranzice nezpůsobují
  layout shift. Flicker taky nikdy nepřidává overlay/pointer-events blokující interakci —
  je to čistě `filter` na wrapperu, klikatelnost pod ním se nemění.
