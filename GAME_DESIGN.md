# Game Design — Objekt 13: První směna

## Základní herní smyčka

1. Hráč spustí směnu z hlavního menu.
2. Sleduje kamery ze stolního pohledu, aby věděl, kde se nepřítel nachází.
3. Zapíná/vypíná světlo ze stolního pohledu; když je potřeba zavřít dveře, musí se
   nejdřív otočit do pohledu na dveře a teprve tam na ně kliknout — obojí (dveře i
   světlo) spotřebovává energii, viz "Pohled hráče" a "Energie" níže.
4. Když je nepřítel u dveří a dveře jsou otevřené, spustí se jumpscare a smrt.
5. Pokud energie dojde, hráč je bezbranný a umírá.
6. Pokud hráč přežije celou délku směny, vyhrává.
7. Po smrti může okamžitě restartovat aktuální směnu.

## Obrazovky

- **MainMenuScreen** — název, podtitul, úvodní text, tlačítko "Spustit směnu"
- **GameScreen** — energie, časovač směny a aktuální pohled hráče (DeskView, DoorView nebo GeneratorView)
- **DeathScreen** — krátký jumpscare overlay, důvod smrti, tlačítko "Zkusit znovu"
- **WinScreen** — text o přežití směny, tlačítko "Znovu"

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
- 3 kamery, 1 pár dveří, 1 světlo do chodby
- Jeden nepřítel: `basicIntruder`

## Nepřítel

Trasa: `venku -> chodba daleko -> chodba blízko -> u dveří -> útok`

- Každých ~1,5 s (viz `night.enemyTickMs`) má šanci postoupit na další stage trasy.
- Sledování kamery, na které je právě viditelný, jeho postup zpomaluje
  (nižší šance na postup, `watchedAdvanceMultiplier`).
- Když je u dveří (`camera_03_door`):
  - dveře zavřené → po krátké době (`doorHoldBeforeResetMs`) se vrátí na start trasy
  - dveře otevřené → zaútočí → jumpscare → smrt

## Energie

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
- Když energie dojde na 0, hráč je téměř bezbranný a prohrává (`power_depleted`).
- Prahy `LOW_POWER_THRESHOLD` a `CRITICAL_POWER_THRESHOLD` (viz `balancing/constants.ts`)
  řídí vizuální/zvukové varování.

Výpočet je celý v `gameReducer.ts` (`applyPowerDelta`), UI jen zobrazuje výsledek.

## Dveře

Přepínatelné jen v pohledu na dveře (DoorView) — viz "Pohled hráče" výše. Zavřené
dveře chrání před útokem, ale spotřebovávají energii.

## Světlo

Krátké posvícení do chodby — pomáhá vidět nepřítele mimo kamery, spotřebovává energii.

## Kamery

3 kamery pokrývající trasu nepřítele. Otevřená kamera stojí malou energii a dočasně
zpomaluje postup nepřítele, pokud je na ní právě vidět.

## Generátor

První zvuková gameplay mechanika — normální stav není ticho, ale pravidelné
pípání. Tři stavy (`GeneratorState`):

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

Restart: hráč se musí otočit do GeneratorView (šipka z DeskView) a kliknout na
generátor — funguje z obou poruchových stavů (i během ticha, bez postihu) a
vrátí generátor do `normal` s novým pípáním za 5 s. Vizuální kontrolka
(stabilní/zhaslá/blikající) je jen pomocná — hlavní signál má být zvuk.

## Smrt

Dva důvody (`DeathReason`):
- `door_open_at_attack` — nezavřel dveře včas
- `power_depleted` — došla energie

Zobrazí se krátký jumpscare overlay a `DeathScreen` s možností okamžitého restartu směny.

## Výhra

Když `remainingMs` klesne na 0 a hráč je stále naživu, zobrazí se `WinScreen`.

## Pozdější možné rozšíření

- Další směny (`night02.ts`, ...) s vlastním nepřítelem, kamerami, balancem
- Další typy nepřátel s odlišnou trasou/logikou
- Vlastní pixel-art grafika místo CSS placeholderu
- Skutečné audio soubory
- Ukládání postupu mezi směnami
