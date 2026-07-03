# Audio Design

## Proč je zvuk důležitý

Pro klaustrofobickou lekací hru je zvuk minimálně stejně důležitý jako obraz — napětí se
staví hlavně ambientní atmosférou a náhlými zvukovými akcenty, ne jen vizuálem. Proto má
audio od první verze vlastní samostatnou vrstvu (`game/audio/`), ne jen náhodné `<audio>`
tagy rozházené po komponentách.

## Seznam zvuků pro MVP

Definováno v `game/audio/audioEvents.ts` a nakonfigurováno v `game/audio/audioConfig.ts`:

- `ambience_loop` — tiché pozadí, hraje smyčkou po celou dobu směny
- `camera_noise` — krátký šum při přepnutí kamery
- `door_close` / `door_open` — cvaknutí dveří
- `light_click` — cvaknutí světla
- `enemy_step` — kroky/pohyb nepřítele na trase
- `enemy_near` — nepřítel je blízko (u dveří)
- `power_low` — varování při nízké energii
- `jumpscare` — zvuk při útoku/smrti
- `shift_win` — zvuk při přežití směny
- `ui_click` — obecný UI klik (např. tlačítko Start, otočení mezi pohledy)
- `generator_beep` — normální pípnutí generátoru každých 5 s (viz "Generátor" níže)
- `generator_warning_beep` — rychlé varovné pípání v kritickém stavu generátoru

## Ambientní zvuková vrstva

Žádná klasická výrazná hudba. Cíl je nenápadná ambientní atmosféra: slabý dron, nízký tón,
šum elektroinstalace, nepravidelné vzdálené zvuky. V první verzi je to reprezentováno jedním
`ambience_loop` placeholder souborem — rozšíření na vrstvenou/dynamickou ambienci (podle
`tensionLevel`) je připravené jako další krok, ne v MVP.

## Generátor — první zvuková gameplay mechanika

Normální stav generátoru není ticho, ale pravidelné pípání (`generator_beep`
každých 5 s) — to je hráčovi jediný signál, že je vše v pořádku. Když se
generátor porouchá, na 10 sekund úplně ztichne (žádný zvuk, ne jiný zvuk) — ticho
samo je varování a dává hráči férový reakční čas. Pokud nezareaguje, spustí se
rychlé, hlasitější `generator_warning_beep` (viz `generator.criticalBeepIntervalMs`
v `night01.ts`) a zůstane, dokud hráč generátor v `GeneratorView` nerestartuje.
Vizuální kontrolka v `GeneratorView.tsx` (stabilní/zhaslá/blikající) je jen
pomocná — hlavní signál má být zvuk, viz `GAME_DESIGN.md` sekce "Generátor".

## Zvukové události

Herní logika a UI komponenty nevolají `new Audio()` přímo — volají
`audioManager.play(AUDIO_EVENTS.xxx)` (nebo `startLoop`/`stopLoop` pro smyčky). Napojení na
konkrétní herní stav je v `app/play/page.tsx`: `useEffect` hooky sledují změny stavu
(obrazovka, dveře, světlo, energie, stage nepřítele) a podle nich spouští odpovídající zvuk.

## Ticho před lekačkou

Definice lekaček (`game/jumpscares/jumpscares.object13.ts`) obsahuje `silenceBeforeMs` —
záměrné krátké ticho před `jumpscare` zvukem. V první verzi je hodnota připravená v datech;
samotné vizuální/zvukové zpoždění lze doladit later bez zásahu do herní logiky.

## Jak funguje AudioManager

`game/audio/audioManager.ts` je jednoduchá třída se singleton instancí (`audioManager`):

- `init()` — vytvoří `HTMLAudioElement` pro každý event z `AUDIO_CONFIG`. Musí se volat až
  po první uživatelské interakci (kliknutí na "Spustit směnu"), kvůli autoplay policy
  prohlížečů.
- `play(id)` — přehraje zvuk od začátku; chybu při přehrání (chybějící/nenačtený soubor)
  tiše zachytí a ignoruje.
- `startLoop(id)` / `stopLoop(id)` — spustí/zastaví smyčkový zvuk (ambience).
- `setMuted(bool)` — globální mute, pozastaví i běžící smyčky.

## Jak přidat nový zvuk

1. Přidej klíč do `AUDIO_EVENTS` v `game/audio/audioEvents.ts`.
2. Přidej odpovídající záznam do `AUDIO_CONFIG` v `game/audio/audioConfig.ts` (cesta v
   `/public/assets/audio/`, hlasitost, `loop`).
3. Zavolej `audioManager.play(AUDIO_EVENTS.novyZvuk)` (nebo `startLoop`) na místě, kde má
   zvuk hrát — typicky v `useEffect` v `app/play/page.tsx`, který sleduje relevantní část
   stavu.
4. Soubor samotný přidej do `public/assets/audio/` — dokud tam není, hra funguje dál beze
   změny chování (viz pravidlo níže).

## Jak se audio váže na stav hry

`app/play/page.tsx` drží `useRef` na předchozí hodnoty klíčových částí stavu (obrazovka,
dveře, světlo, energie, stage nepřítele, `generatorBeepSeq`) a v `useEffect` porovnává se
stavem aktuálním — při přechodu spustí odpovídající zvuk. Díky tomu je vazba na stav
explicitní a na jednom místě, ne rozeseta po komponentách.

Generátor je ukázka stejného vzoru pro periodický, ne jen jednorázový zvuk:
`gameReducer.ts` při každém pípnutí zvýší `generatorBeepSeq` o 1 (čistá herní logika,
žádné volání audia), a `app/play/page.tsx` na tuto změnu reaguje přehráním `generator_beep`
nebo `generator_warning_beep` podle aktuálního `generatorState` — reducer o zvuku neví nic,
jen "oznámí", že nastal beep.

## Pravidlo: hra nesmí spadnout při chybějících audio souborech

`AudioManager.play()` i `startLoop()` obalují `audio.play()` do `try/catch` a `.catch()` na
vrácený promise. Pokud soubor neexistuje nebo přehrání selže (např. kvůli autoplay policy),
chyba se tiše ignoruje a hra pokračuje beze změny — audio je "nice to have", ne kritická
závislost. `public/assets/audio/` teď obsahuje reálné placeholder zvuky (CC0, Kenney.nl —
viz `assets/audio/README.md`), ale pravidlo platí bez ohledu na to, jestli soubor existuje:
kdykoliv v budoucnu nějaký chybí, chybí, nebo se poškodí, hra musí fungovat dál.
