# Game Design — Objekt 13: První směna

## Základní herní smyčka

1. Hráč spustí směnu z hlavního menu — nejdřív krátký falešný briefing
   (LoadingScreen, viz níže), pak samotná směna.
2. Sleduje kamery ze stolního pohledu, aby věděl, kde se nepřítel nachází.
3. Zapíná/vypíná světlo ze stolního pohledu; když je potřeba zavřít dveře, musí se
   nejdřív otočit do pohledu na dveře a teprve tam na ně kliknout — obojí (dveře i
   světlo) spotřebovává energii, viz "Pohled hráče" a "Energie" níže.
4. Když je nepřítel u dveří a dveře jsou otevřené, spustí se jumpscare a smrt.
5. Pokud energie dojde, baterie nesplaskne rovnou ve smrt — nastane blackout
   (viz "Blackout" níže), kritických posledních pár vteřin, které se dají přežít.
6. Pokud hráč přežije celou délku směny, vyhrává (i uprostřed blackoutu).
7. Po smrti může okamžitě restartovat aktuální směnu.

## Obrazovky

- **MainMenuScreen** — název, podtitul, úvodní text, tlačítko "Spustit směnu"
- **LoadingScreen** — falešný servisní briefing mezi menu a startem směny (viz níže)
- **GameScreen** — energie, časovač směny a aktuální pohled hráče (DeskView, DoorView
  nebo GeneratorView) — v blackoutu je místo nich přes celou obrazovku BlackoutView
- **DeathScreen** — krátký jumpscare overlay, důvod smrti, tlačítko "Zkusit znovu"
- **WinScreen** — text o přežití směny, tlačítko "Znovu"

## LoadingScreen — falešný briefing

Po kliknutí na "Spustit směnu" se ~4 sekundy (`LOADING_SCREEN_DURATION_MS`) zobrazí
servisní terminál Objektu 13, který postupně vypíše 2–4 náhodně vybrané hlášky
(`content/loadingHints.ts#selectLoadingHints`) — kombinace vysvětlení mechanik
("Magnetický zámek drží dveře zavřené jen pod proudem...") a lehkého lore
("Objekt 13 byl navržen pro denní provoz..."). Není to skutečné technické
načítání, jen atmosférická pauza a rychlokurz mechanik. Zatím se nedá přeskočit.

## Pohled hráče

Hráč se v místnosti dívá jedním ze tří směrů (`playerView`):

- **DeskView** (výchozí) — kamerový/stolní panel: kamery, světlo, šipky na dveře
  a na generátor. Odsud nejdou dveře ani generátor vidět ani ovládat přímo.
- **DoorView** — pohled přímo na dveře. Klik na dveře přepíná otevřeno/zavřeno.
  Šipka "Zpět k panelu" vrací do DeskView.
- **GeneratorView** — pohled na generátor. Klik na generátor ho restartuje po
  poruše (viz "Generátor" níže). Šipka "Zpět k panelu" vrací do DeskView.

Zavření dveří i restart generátoru jsou tak záměrně dvoukrokové (otočit se →
kliknout), ne jedno tlačítko — cílem je klaustrofobie: hráč při práci s kamerami
dveře ani generátor nevidí a musí se sám rozhodnout, kdy riskovat otočení od nich
pryč a naopak kdy se k nim včas vrátit.

## První směna (`night01`)

- Délka: ~2:30 minuty
- Počáteční energie: 100
- 4 kamery, 1 pár dveří, 1 světlo do chodby
- Jeden nepřítel: `basicIntruder`

## Nepřítel

Trasa (`basicIntruder`) má dvě stejně pravděpodobné varianty, jedna se vylosuje při
startu směny a platí po celou její dobu:

- `outside -> outer_yard -> right_hallway -> door_hallway -> at_door -> attack`
- `outside -> outer_yard -> left_hallway -> door_hallway -> at_door -> attack`

`outside` není vidět na žádné kameře (nepřítel se teprve blíží), `at_door` taky ne —
to je stav pro DoorView, ne kameru. (Existuje ještě `breach` — připravená druhá
"u dveří" stage pro budoucí trasy, chová se stejně jako `at_door`, ale zatím ji
žádná trasa nepoužívá, viz TECH_DESIGN.md.)

- Každé ~2 s (viz `night.enemyTickMs`) se vyhodnocuje, co nepřítel udělá — tři
  nezávislé možnosti:
  - **postoupí** o krok dál (`advanceChance`, zpomalené sledováním na kameře přes
    `watchedAdvanceMultiplier`)
  - **ustoupí** o krok zpět (`retreatChance`, výchozí 10 %) — na první pozici
    (`outside`) ustoupit nemá kam, bere se to jako setrvání
  - jinak **zůstává** na místě
  - Poslední rozhodnutí (`advance`/`stay`/`retreat`/...) je vidět v DebugPanelu.
- Když je u dveří (`at_door`):
  - dveře zavřené → po náhodné době 6–8 s se vzdá a vrátí úplně na začátek trasy
    (`doorHoldRangeMs`) — nezávisle na světle, viz "Světlo a dveře" níže pro
    mnohem rychlejší kombinovaný efekt
  - dveře otevřené → zaútočí na nejbližším vyhodnocení (do ~2 s) → jumpscare → smrt

## Energie

Objekt 13 běží na starý generátor a nouzovou baterii, ne na abstraktní "power bar":
generátor sám neutáhne všechny systémy najednou, přes den se baterie dobíjí ze
solárních panelů, v noci hráč jede z rezervy. Kamery, světla, magnetický zámek
dveří, generátorové řízení a pomocné systémy žerou víc, než generátor zvládá
stabilně dodat — proto energie za normálních okolností ubývá, i když hráč "nic
nedělá". Tohle vysvětlení je i jeden z hintů na LoadingScreen
(`content/loadingHints.ts`, `energy_generator_battery`), ne natvrdo v jedné
komponentě.

Chování se liší podle toho, jestli hráč aktivně sleduje kamery (DeskView + otevřená
kamera), nebo ne:

- **Sleduje kamery** — energie jen ubývá: pasivní odběr (idle) + spotřeba otevřené
  kamery.
- **Nesleduje kamery** (DoorView, nebo DeskView bez otevřené kamery) — energie se
  pomalu **dobíjí**, cca 1 % za 3 sekundy (`rechargePerSecondWhenIdle` v definici
  směny). Zavřené dveře a/nebo rozsvícené světlo ale dál spotřebovávají energii a
  tato spotřeba dobíjení přebíjí — se zavřenými dveřmi je čistý efekt pořád úbytek,
  jen pomalejší než při sledování kamer.
- **Kritický stav generátoru** (viz "Generátor" níže) navrch přidá pevnou extra
  spotřebu — jako kdyby byly zavřené dvoje dveře a svítilo světlo (2×
  `doorClosed` sazba + `lightOn` sazba) — bez ohledu na to, jestli jsou skutečně
  zapnuté. Platí to jak při sledování kamer, tak při dobíjení.
- Energie nikdy nepřekročí 100 % ani neklesne pod 0 %.
- Když energie dojde na 0, baterie je vybitá a nastane **blackout** (viz níže) —
  ne okamžitá smrt.
- Prahy `LOW_POWER_THRESHOLD` a `CRITICAL_POWER_THRESHOLD` (viz `balancing/constants.ts`)
  řídí vizuální/zvukové varování.

Výpočet je celý v `gameReducer.ts` (`applyPowerDelta`), UI jen zobrazuje výsledek.

## Dveře

Přepínatelné jen v pohledu na dveře (DoorView) — viz "Pohled hráče" výše. Zavřené
dveře chrání před útokem, ale spotřebovávají energii.

## Světlo a dveře

Světlo **samo o sobě nepřítele nikdy neodpudí** — u otevřených dveří ani u zavřených
bez toho, aby zrovna svítilo. Jediný efekt světla je v přesné kombinaci se dvěma
dalšími podmínkami, a to **repel**:

- dveře zavřené
- světlo zapnuté
- nepřítel je u dveří (`at_door`)

Pokud tohle platí nepřetržitě `doorLightRepelRequiredMs` (výchozí 1,5 s), nepřítel
silně a rychle ustoupí — zahraje se jednorázový řev (`monster_retreat_roar`) a
nepřítel se resetuje úplně na začátek trasy (`monsterRetreatStage`). Jakmile
kterákoliv ze tří podmínek přestane platit (otevřeš dveře, zhasneš, nepřítel
odejde od dveří), časovač se okamžitě vynuluje — žádné "napůl nastřádané" repely
se nepřenáší do příště.

Na rozdíl od obecného vzdání se (výše, 6–8 s, nezávislé na světle), tenhle
repel je rychlý, jasný a dobře čitelný: *"Zavřel jsem dveře, rozsvítil jsem,
monstrum zařvalo a uteklo."* Dveře zůstávají hlavní obranou — světlo je jen
potvrzující nástroj navrch, ne náhrada za zavření dveří.

Časovač se počítá v `TICK` (běžný herní tik, ~100 ms), ne v `ENEMY_ADVANCE`
(~2 s) — proto repel přijde předvídatelně kolem 1,5 s, ne v hrubých skocích po
celých `enemyTickMs`.

## Kamery

4 kamery (`game/cameras/cameras.object13.ts`), seřazené podle vzdálenosti od
hráče (`order`, nižší = dál venku):

1. **Venkovní vstup** (`outer_yard`) — nejvzdálenější pohled
2. **Pravá chodba** (`right_hallway`) / **Levá chodba** (`left_hallway`) — boční
   chodby ke dveřím (`basicIntruder` si na začátku směny náhodně vylosuje jednu
   z nich, viz "Nepřítel" výše)
3. **Chodba před dveřmi** (`door_hallway`) — poslední úsek, nejblíž hráči

Otevřená kamera stojí malou energii a dočasně zpomaluje postup nepřítele, pokud
je na ní právě vidět. Kamery nejsou instantní taby — po každém výběru/přepnutí
kamera ~700 ms (`cameraFocusMs`) jen "ladí signál" (šum, žádný obsah), teprve
pak ukáže ostrý obraz. Kliknutí na kameru navíc krátce zašumí (`camera_noise`) —
zvuk překvapení, ne obyčejný UI klik: hraje **jen** když je nepřítel zrovna na
kameře nejblíž hráči (`door_hallway`), a **jen jednou** za tuto "návštěvu" —
dokud tam nepřítel je, další klikání (třeba přes jinou kameru a zpátky) ho
neopakuje. Zvuk se "odjistí" znovu, až nepřítel z `door_hallway` odejde.

Panel kamer je zarovnaný podle fyzické pozice (`CameraDefinition.position`) —
venkovní vstup a chodba před dveřmi přes celou šířku nahoře/dole, pravá a levá
chodba vedle sebe uprostřed, ať si hráč snáz udělá mentální mapu místnosti.

Seznam a počet kamer je čistě konfigurační (`NightDefinition.cameras` +
`defaultCameraId`) — žádná komponenta kamery nemá natvrdo napsané, viz
TECH_DESIGN.md "Kamery jsou konfigurační, nikdy hardcoded".

## Generátor

První zvuková gameplay mechanika — normální stav není ticho, ale pravidelné
pípání. Čtyři stavy (`GeneratorState`):

- **normal** — pípne každých 5 s (`generator.beepIntervalMs`). Toto pípání říká
  hráči "generátor běží", žádný jiný signál není potřeba.
- **silentFault** — porucha (nastane nejvýš jednou za směnu, nikdy hned na
  začátku — mezi 45. a 110. sekundou, `generator.faultEarliestAtMs`/
  `faultLatestAtMs`). Generátor **ztichne** na 10 sekund
  (`generator.silentGraceMs`) — to je férový reakční čas, žádná extra spotřeba
  energie zatím neběží. Ticho samo o sobě je signál, že se něco děje.
- **criticalBeeping** — když hráč nestihne restartovat do 10 s, spustí se rychlé
  varovné pípání (`generator.criticalBeepIntervalMs`) a dodatečná spotřeba
  energie (viz "Energie" výše). Trvá, dokud generátor hráč nerestartuje.
- **restarting** — trest za zbytečný klik: pokud hráč restartuje generátor, který
  byl v pořádku (`normal`), na `generator.restartPenaltyMs` (5 s) se sám vyřadí —
  potichu (žádné pípání) a se stejnou extra spotřebou energie jako
  `criticalBeeping`. Po vypršení se automaticky vrátí do `normal` s novým
  pípáním. Cíl: naučit hráče nekontrolovat generátor naslepo, jen když k tomu
  má důvod (ticho, nebo rychlé pípání).

Restart: hráč se musí otočit do GeneratorView (šipka z DeskView) a kliknout na
generátor — z obou poruchových stavů funguje bez postihu (i během ticha), z
`normal` spustí penalizaci `restarting` výše. Vizuální kontrolka
(stabilní/zhaslá/blikající červeně/blikající žlutě) je jen pomocná — hlavní
signál má být zvuk. Šipka "Zkontrolovat generátor" v DeskView navíc bliká,
dokud je generátor v jakémkoliv nenormálním stavu (`silentFault`,
`criticalBeeping`, `restarting`), jako drobná pomůcka pro hráče, který zrovna
kouká do kamer a zvuk mu unikl.

## Blackout

Když energie dojde na 0, nenastává okamžitá smrt — baterie je vybitá, generátor
chcípne a magnetický zámek dveří povolí. Hráč dostane ~12 sekund
(`night.blackout.durationMs`) čistého strachu, než přijde skutečný konec.

Během blackoutu (`gameStatus: "blackout"`):
- kamery, světlo, standardní restart generátoru nejdou použít (žádný efekt na klik)
- dveře se považují za otevřené/odemčené a nejdou zavřít
- generátor přestane pípat, i to varovné
- pozice nepřítele na trase zamrzne — hrozbu odteď representuje jen odpočet
- čas směny běží dál jako předtím

Místo DeskView/DoorView/GeneratorView se zobrazí `BlackoutView` s postupujícím
atmosférickým textem podle čtyř fází (`game/visuals/blackoutPhase.ts`,
hranice `night.blackout.phaseThresholdsMs`, texty v `content/copy.ts`):

0. Monitor problikne, kamery zčernají.
1. Dveře cvaknou — zámek povolil.
2. Generátor vydá poslední zvuk a utichne.
3. Zavytí, ticho, kroky se blíží.

**Přežití:** pokud `remainingMs` klesne na 0 dřív, než blackout doběhne
(`night.blackout.canBeSurvivedIfShiftEnds`), hráč **vyhrává** — i uprostřed
blackoutu. Blackout na úplném konci směny tedy není automatická prohra.

**Smrt:** pokud blackout doběhne dřív než konec směny, hráč umírá
(`deathReason: "blackout_timeout"`, "Nouzová baterie padla na nulu. Magnetický
zámek povolil.").

## Smrt

Dva důvody (`DeathReason`):
- `door_open_at_attack` — nezavřel dveře včas, dokud generátor/baterie fungovaly
- `blackout_timeout` — blackout doběhl dřív, než skončila směna

Zobrazí se krátký jumpscare overlay a `DeathScreen` s možností okamžitého restartu směny.

## Výhra

Když `remainingMs` klesne na 0 a hráč je stále naživu (i uprostřed blackoutu — viz
výše), zobrazí se `WinScreen`.

## Pozdější možné rozšíření

- Další směny (`night02.ts`, ...) s vlastním nepřítelem, kamerami, balancem
- Další typy nepřátel s odlišnou trasou/logikou
- Vlastní pixel-art grafika místo CSS placeholderu
- Skutečné audio soubory
- Ukládání postupu mezi směnami
- Přeskočitelný LoadingScreen
- Focus delay kamer počítaný podle napětí/energie/generátoru, ne pevná hodnota
