# Game Design — Objekt 13: První směna

## Základní herní smyčka

1. Hráč spustí směnu z hlavního menu.
2. Sleduje kamery, aby věděl, kde se nepřítel nachází.
3. Podle situace zavírá/otevírá dveře a zapíná/vypíná světlo — obojí spotřebovává energii.
4. Když je nepřítel u dveří a dveře jsou otevřené, spustí se jumpscare a smrt.
5. Pokud energie dojde, hráč je bezbranný a umírá.
6. Pokud hráč přežije celou délku směny, vyhrává.
7. Po smrti může okamžitě restartovat aktuální směnu.

## Obrazovky

- **MainMenuScreen** — název, podtitul, úvodní text, tlačítko "Spustit směnu"
- **GameScreen** — kamery, dveře, světlo, energie, časovač směny
- **DeathScreen** — krátký jumpscare overlay, důvod smrti, tlačítko "Zkusit znovu"
- **WinScreen** — text o přežití směny, tlačítko "Znovu"

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

- Ubývá kontinuálně, rychlost závisí na tom, co je zapnuté:
  - zavřené dveře
  - rozsvícené světlo
  - otevřená kamera (malá spotřeba)
  - vždy malý pasivní odběr (idle)
- Když energie dojde na 0, hráč je téměř bezbranný a prohrává (`power_depleted`).
- Prahy `LOW_POWER_THRESHOLD` a `CRITICAL_POWER_THRESHOLD` (viz `balancing/constants.ts`)
  řídí vizuální/zvukové varování.

## Dveře

Přepínatelné tlačítkem. Zavřené dveře chrání před útokem, ale spotřebovávají energii.

## Světlo

Krátké posvícení do chodby — pomáhá vidět nepřítele mimo kamery, spotřebovává energii.

## Kamery

3 kamery pokrývající trasu nepřítele. Otevřená kamera stojí malou energii a dočasně
zpomaluje postup nepřítele, pokud je na ní právě vidět.

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
