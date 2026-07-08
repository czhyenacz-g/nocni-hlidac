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
  - dveře zavřené → po náhodné době 6–8 s se vzdá a odejde na jednu z chodeb
    (`right_hallway`/`left_hallway`) nebo na venkovní vstup (`outer_yard`) —
    vždy jen tam, kudy skutečně vede aktivní trasa dané směny
    (`doorHoldRangeMs`) — nezávisle na světle, viz "Světlo a dveře" níže pro
    mnohem rychlejší kombinovaný efekt a "Obtížnost" níže pro to, co musí hráč
    udělat, než je bezpečné dveře otevřít
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
  pomalu **dobíjí**, cca 1 % za 12 sekund (`rechargePerSecondWhenIdle` v definici
  směny — čtvrtina původní rychlosti, dobíjení mimo kamery má být znatelně pomalejší
  pojistka, ne pohodlný způsob, jak energii snadno doplnit). Zavřené dveře a/nebo
  rozsvícené světlo ale dál spotřebovávají energii a tato spotřeba dobíjení přebíjí
  — se zavřenými dveřmi je čistý efekt pořád úbytek, jen pomalejší než při
  sledování kamer.
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

### Ztěžování podle noci (night scaling)

Nezávisle na zvolené obtížnosti (easy/medium/hard, viz "Obtížnost" výše) se Objekt 13
postupně zhoršuje podle toho, kolikátou noc v řadě aktuální hlídač slouží
(`survivedNights + 1`, viz "Survival streak" v TECH_DESIGN.md): energie ubývá mírně
rychleji. Explicitní křivka (ne lineární step): noc 1 ×1,00, noc 2 ×1,05, noc 3 ×1,10,
noc 4 ×1,15, noc 5 ×1,25, noc 6 ×1,40, noc 7 ×1,55, noc 8 ×1,70, noc 9 ×1,85, noc 10 a
dál capnuté na ×2,00 (neroste to donekonečna). Škáluje se jen spotřeba (drain), dobíjení
energie zůstává vždy stejné.

Tohle je první pravidlo v samostatné "night scaling" vrstvě
(`game/difficulty/nightScaling.ts`), oddělené od difficulty — časem přibudou další
modifikátory podle noci (aktivnější monstrum, dřívější porucha generátoru, ...), zatím jen
tenhle jeden.

## Dveře

Přepínatelné jen v pohledu na dveře (DoorView) — viz "Pohled hráče" výše. Zavřené
dveře chrání před útokem, ale spotřebovávají energii.

Nepřítel u dveří (`at_door`) útočí **pokaždé**, když tam je — žádný samostatný "chce/
nechce zaútočit" hod (viz `game/core/doorEncounter.ts`). Výsledek závisí jen na tom,
jsou-li dveře zavřené:

- **Otevřené dveře → smrt.** Beze změny oproti dosavadnímu chování — stejný
  death/jumpscare flow, stejný `deathReason` (`door_open_at_attack`, nebo
  `bulb_replacement_attack` uprostřed ruční výměny žárovky).
- **Zavřené dveře → útok zablokovaný, bušení do dveří.** Hráč neumírá, ale zahraje se
  krátký, fyzický zvuk nárazu (`monster_door_bang`) — potvrzení, že ho dveře právě
  zachránily. Bušení se spouští VÝHRADNĚ jako přímý důsledek zablokovaného útoku (ne
  časem, ne náhodně) — každý `ENEMY_ADVANCE` tik, kdy je nepřítel u zavřených dveří,
  je jeden blokovaný útok = jedno bouchnutí.

## Světlo a dveře

Světlo **samo o sobě nepřítele nikdy neodpudí** — u otevřených dveří ani u zavřených
bez toho, aby zrovna svítilo. Jediný efekt světla je v přesné kombinaci se dvěma
dalšími podmínkami, a to **repel**:

- dveře zavřené
- světlo zapnuté
- nepřítel je u dveří (`at_door`)

Pokud tohle platí nepřetržitě `doorLightRepelRequiredMs` (výchozí 1,5 s), nepřítel
silně a rychle ustoupí — zahraje se jednorázový řev (`monster_retreat_roar`), krátce
po něm kroky ústupu (`monster_retreat_steps`) a nepřítel se resetuje úplně na
začátek trasy (`monsterRetreatStage`). Jakmile kterákoliv ze tří podmínek přestane
platit (otevřeš dveře, zhasneš, nepřítel odejde od dveří), časovač se okamžitě
vynuluje — žádné "napůl nastřádané" repely se nepřenáší do příště.

Světlem odehnaný nepřítel NEVYŽADUJE ověření kamerou (na rozdíl od obecného
vzdání se níže) — repel je okamžitý a jasně slyšitelný, takže hráč sám ví, že
zabral. Pokud ale hráč měl z dřívějška rozjeté nepotvrzené vzdání se
(`monsterRetreatedTo` bez `monsterRetreatVerified`), repel tenhle požadavek
nijak neruší ani nesplňuje — zůstává, dokud ho hráč skutečně neověří na kameře.

Na rozdíl od obecného vzdání se (výše, 6–8 s, nezávislé na světle), tenhle
repel je rychlý, jasný a dobře čitelný: *"Zavřel jsem dveře, rozsvítil jsem,
monstrum zařvalo a uteklo."* Dveře zůstávají hlavní obranou — světlo je jen
potvrzující nástroj navrch, ne náhrada za zavření dveří.

Časovač se počítá v `TICK` (běžný herní tik, ~100 ms), ne v `ENEMY_ADVANCE`
(~2 s) — proto repel přijde předvídatelně kolem 1,5 s, ne v hrubých skocích po
celých `enemyTickMs`.

## Obtížnost

Interní, zatím bez UI ani query parametru (viz TECH_DESIGN.md "Obtížnost") —
tři úrovně, `easy`/`medium`/`hard`, výchozí `medium`. Ovlivňuje jediné aktuální
pravidlo, **odchod monstra od dveří**:

Když monstrum u zavřených dveří "vzdá" čekání (viz "Nepřítel" výše) a odejde na
jednu z chodeb nebo na venkovní vstup:

- **easy** — jakmile monstrum odejde, je bezpečné dveře otevřít rovnou.
- **medium/hard** — nestačí počkat, až monstrum zmizí z kamery `door_hallway`. To
  jen znamená "monstrum už není přímo před kanceláří", ne "je bezpečno". Hráč
  musí monstrum najít na **jiné** odpovídající kameře (`outer_yard`/
  `left_hallway`/`right_hallway` — podle toho, kam skutečně odešlo), teprve pak
  je bezpečné dveře otevřít. Pokud hráč otevře dřív, monstrum se vrátí do
  `door_hallway` (ne rovnou ke dveřím) — trest, ale ne okamžitý teleport k
  útoku: hráč ještě dostane krátkou šanci si všimnout a stihnout dveře znovu
  zavřít, než monstrum normálním tempem postoupí až ke dveřím.

`medium` a `hard` se dnes chovají stejně — `hard` je připravené místo pro
budoucí přísnější pravidla, ne duplicitní kopie `medium`.

### Vizuální potvrzení ústupu (fleeing_monster)

Na kameře, kam monstrum po "vzdání se" odešlo, se dokud ho hráč neověří ukáže speciální
snímek — monstrum **ustupuje/utíká pryč** (`fleeing_monster`), ne obyčejná "monstrum je tu a
je nebezpečí" fotka. Otevření téhle konkrétní kamery ústup zároveň potvrzuje (stejná logika
jako dřív) — hráč tak přímo na obrázku vidí, že našel správné místo, ne že jen náhodou
narazil na monstrum. Jakmile je ústup ověřený, kamera se vrátí k běžnému monster/normal
zobrazení. Pokud pro danou kameru fleeing snímek chybí, zobrazí se obyčejná monster fotka
místo něj — beze změny chování ověření.

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
pak ukáže ostrý obraz. Kliknutí na kameru navíc krátce ozve tlukotem srdce
(`heartbeat`) — zvuk překvapení/leknutí, ne obyčejný UI klik: hraje **jen** když je nepřítel zrovna na
kameře nejblíž hráči (`door_hallway`), a **jen jednou** za tuto "návštěvu" —
dokud tam nepřítel je, další klikání (třeba přes jinou kameru a zpátky) ho
neopakuje. Zvuk se "odjistí" znovu, až nepřítel z `door_hallway` odejde.

### Overview / detail — přepínání kamer není zdarma

Kamerový panel má dva režimy (`GameState.cameraViewMode: "overview" | "detail"`),
záměrně ne jen čtyři obyčejná tlačítka:

- **Overview** (`CameraMonitorGrid.tsx`) — výchozí pohled, mřížka malých
  monitorů (na 4 kamerách 2×2), jedna dlaždice na kameru z `night.cameras`.
  Monitor ukazuje jen štítek a statický šum, **žádný živý obraz** — hráč nevidí,
  kde je nepřítel, dokud si konkrétní kameru nezvětší.
- **Detail** (`CameraDetailView.tsx`) — klik na monitor přiblíží danou kameru na
  celou plochu (`CameraView`, stejné "ladění signálu" jako dřív) a přidá
  tlačítko/šipku "Zpět na přehled". Až odsud se dá vidět, jestli je na kameře
  nepřítel.

Hráč se tak musí aktivně rozhodnout: koukat na přehled (bez informace, kde
nepřítel je) vs. zvětšit jednu konkrétní kameru (informace, ale musí se pak
ručně vrátit zpět, než zkusí jinou). **Zpomalení nepřítele platí jen v detailu**
vybrané kamery — overview se nikdy nepočítá jako aktivní sledování (viz
`isEnemyBeingWatched` v `gameReducer.ts`), jinak by šlo sledovat všechny kamery
najednou zdarma jen otevřeným přehledem.

Na mobilu je stejná mřížka monitorů (responzivně menší dlaždice), žádné
oddělené kompaktní ovládání — 2×2 mřížka je dost malá i na úzký displej a
zachovává stejnou herní mechaniku overview/detail všude.

Seznam a počet kamer je čistě konfigurační (`NightDefinition.cameras` +
`defaultCameraId`) — žádná komponenta kamery (`CameraMonitorGrid`,
`CameraMonitorTile`, `CameraDetailView`, `CameraPanel`) nemá natvrdo napsané,
viz TECH_DESIGN.md "Kamery jsou konfigurační, nikdy hardcoded".

### Skutečný obraz v detailu kamery

Detail kamery (viz "Overview / detail" výše) ukazuje reálný snímek z
`public/object_13/camera/<kamera>/`, ne jen text:

- Když je na dané kameře podle `enemyStage` vidět monstrum, ukáže se jedna z fotek s
  monstrem — vždy **stejná** pro danou kameru (deterministický výběr, ne náhodný), ať se
  obraz neseká při každém otevření.
- Jinak se mezi fotkami bez monstra **pomalu prostřídává** (jednou za pár sekund), ať kamera
  nepůsobí jako jedna mrtvá fotka — ale žádná rychlá animace/blikání.
- `door_hallway` má navíc jinou sadu fotek podle toho, jestli je zapnuté světlo do chodby —
  jasnější/tmavší chodba podle skutečného stavu.
- Textový spoiler "POSTAVA V DOSAHU" / "— žádný pohyb —" byl z `CameraView.tsx` odstraněný
  (problikával přes fotku a prozrazoval monstrum dřív, než ho hráč sám najde) — hráč teď
  pozná monstrum jen z fotky samotné. Stejná informace zůstává jen v DebugPanelu ("kamera-
  detekce"). Overview mřížka (malé monitory) obraz pořád neukazuje — to je pořád jen detail.

Všechny čtyři kamery teď mají fotky s monstrem (`outer_yard`, `left_hallway`,
`right_hallway`, `door_hallway` obojí varianta, se světlem i bez) — kdyby některé kameře
přesto chyběly, fallback na "normal" fotky funguje i tak (žádná rozbitá/prázdná
obrazovka).

`door_hallway` má navíc speciální snímek pro `enemyStage === "at_door"` (monstrum je už
fyzicky u dveří, ne jen v chodbě před nimi) — místo obyčejné "monstrum v chodbě" fotky se
zobrazí jasně odlišný "u dveří" záběr (se světlem i bez), ať hráč pozná extrémní blízkost
přímo na kameře, ne až v `DoorView`.

### Kamerový drift

Obraz v detailu kamery navíc velmi jemně "dýchá" — pomalý pohyb zleva doprava (a mírně
nahoru/dolů) a zpátky, jako by kamera nebyla úplně statická (`game/cameras/
cameraMotionConfig.ts`). Žádné rychlé třesení ani glitch, jen sotva postřehnutelný drift na
pozadí — cyklus tam a zpátky trvá ~25 sekund (~12,6 s na směr, po playtestu o 30 % zrychleno
z původních ~18 s). Konfigurovatelné/vypnutelné na jednom místě,
případně jde nastavit jinak per kamera (zatím žádná výjimka).

## Stres a heartbeat

Interní hladina stresu/adrenalinu (0–100, `game/audio/useHeartbeatStress.ts`), zatím s
vývojovým zobrazením "Stres: X" přímo v HUDu vedle energie (`STRESS_DEV_HUD_ENABLED` v
`game/balancing/constants.ts` — časem se skryje, teď je potřeba logiku vidět/ověřit).

Stres roste hlavně tehdy, když hráč **skutečně vidí monstrum v detailu kamery** (ne v
overview mřížce, viz "Overview / detail" výše) — cílová hodnota podle toho, kde přesně
monstrum je:

- Monstrum není vidět → 0
- Venkovní vstup (`outer_yard`) → 20 (jen lehké rozbušení)
- Levá/pravá chodba (`left_hallway`/`right_hallway`) → 40 (střední stres)
- Chodba před dveřmi (`door_hallway`), dveře **zavřené** → 45 — pořád stres ("pořád je
  tam"), ale ne panika
- Chodba před dveřmi (`door_hallway`), dveře **otevřené** → 100 — nejvyšší ohrožení,
  otevřené dveře + monstrum těsně u nich

Navrch se přičítá bonus, dokud generátor rychle spotřebovává nouzovou energii (rychlé
pípání + rychlý pokles energie, viz "Generátor" níže): **+20**
(`BACKUP_POWER_STRESS_BONUS`) ve fázi `criticalBeeping` (skutečná porucha protáhlá přes
reakční čas), **+40** (`GENERATOR_RESTART_STRESS_BONUS`) ve fázi `restarting` (hráč omylem
restartoval funkční generátor — vlastní chyba bolí víc než náhodná porucha). Bonus je
plochý, ne akumulující se (zůstává na stejné hodnotě, dokud fáze trvá, nesčítá se každý
tik) a zmizí sám, jakmile fáze skončí (restart dokončen). Součet (lokace + generátor) je
capnutý na 100.

Skutečná (zobrazovaná i slyšitelná) hodnota stresu neskáče na cíl okamžitě — plynule se k
němu přibližuje, rychleji nahoru (~1 s) než dolů (~35 s, po playtestu zpomaleno z
původních ~7 s — pokles se předtím zdál moc rychlý): leknutí přijde rychle,
uklidnění je pozvolné. Když monstrum přestane být vidět (odejde z kamery, hráč se
odvrátí), stres nezmizí hned — dloube se dolů k 0 a heartbeat s ním postupně odezní.

Podle stresu hrají dva nekonečné heartbeat loopy (`heartbeat_slow_reverb.mp3` /
`heartbeat_fast_reverb.mp3`, CC0 z OpenGameArt.org — viz `assets/audio/README.md`):
slabší/střední stres = pomalejší tlukot, nejvyšší stres = rychlý, hlasitější tlukot.
Přechod mezi nimi je plynulý crossfade (~60–80 stresu), ne tvrdé přepnutí. Po playtestu
(heartbeat byl málo slyšet) je hlasitost obou loopů o 20 % vyšší
(`HEARTBEAT_VOLUME_MULTIPLIER`) a ambientní pozadí se naopak při vyšším stresu plynule
ztišuje — od plné hlasitosti (stres 0) až na 20 % (`MIN_AMBIENT_STRESS_MULTIPLIER`, stres
100), ať je heartbeat v napjatých chvílích víc slyšet, ne přehlušený.

### Stres zpomaluje čas do úsvitu

Horor efekt: čím vyšší stres, tím pomaleji ubývá "Čas do úsvitu" — subjektivně se noc
vleče. Stres 0 = normální rychlost, stres 100 = odpočet ubývá poloviční rychlostí
(`MAX_STRESS_TIME_SLOWDOWN = 0.5`). Lineárně mezi tím (stres 50 = o 25 % pomaleji).

Důležité: **čas nikdy neskáče nahoru** — jen se zpomalí, jak rychle ubývá. Když stres
klesne, odpočet se postupně vrátí k normální rychlosti, ale zpátky nic nepřidá (žádné
"ztracené" sekundy se nevrací). Efekt je jemný horor prvek, ne frustrující trest — hráč má
motivaci se uklidnit (přestat sledovat monstrum, vyřešit situaci), protože ve stresu noc
trvá subjektivně déle, ne aby ho to nespravedlivě penalizovalo.

Jde vypnout (`STRESS_TIME_SLOWDOWN_ENABLED = false`) nebo doladit
(`MAX_STRESS_TIME_SLOWDOWN`) jedním přepnutím v `game/balancing/constants.ts`.

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
- **criticalBeeping** — když hráč nestihne restartovat do 10 s, spustí se **stejné**
  pípnutí jako v `normal`, jen 2×/s (`generator.criticalBeepIntervalMs`, 500 ms) —
  žádný samostatný "poplachový" zvuk — a dodatečná spotřeba energie (viz "Energie"
  výše). To rychlé pípání + rychlý pokles energie jsou jediná okamžitá
  signalizace; šipka na generátor v DeskView začne blikat až se zpožděním (~2 s),
  ne hned. Trvá, dokud generátor hráč nerestartuje.
- **restarting** — trest za zbytečný klik: pokud hráč restartuje generátor, který
  byl v pořádku (`normal`), na `generator.restartPenaltyMs` (5 s) se sám vyřadí —
  se stejným rychlým pípáním (2×/s) a stejnou extra spotřebou energie jako
  `criticalBeeping` (na žádost po playtestu — dřív bylo potichu, ale energie
  přitom mizela stejně rychle, takže to bylo matoucí). Navíc přidává vyšší
  stres než skutečná porucha (+40 vs. +20, viz "Stres a heartbeat" výše) —
  vlastní chyba bolí víc. Po vypršení se automaticky vrátí do `normal` s
  novým pípáním. Cíl: naučit hráče nekontrolovat generátor naslepo, jen když k
  tomu má důvod (ticho, nebo rychlé pípání).

Restart: hráč se musí otočit do GeneratorView (šipka z DeskView) a kliknout na
generátor — z obou poruchových stavů funguje bez postihu (i během ticha), z
`normal` spustí penalizaci `restarting` výše. Vizuální kontrolka
(stabilní/zhaslá/blikající červeně/blikající žlutě) je jen pomocná — hlavní
signál má být zvuk. Šipka "Zkontrolovat generátor" v DeskView bliká **jen**
během `criticalBeeping`, a i tam až se zpožděním ~2 s
(`GENERATOR_URGENT_BLINK_DELAY_MS`, `game/core/generatorUrgency.ts`) — nebliká
během tichého `silentFault` ani během `restarting`. Pořadí signálů je záměrně
zvuk → energie → (až pak) blikání: šipka je trest za přeslechnuté/přehlédnuté
pípání a klesající energii (typicky vypnutý zvuk), ne náhrada za ně.

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
hranice `night.blackout.phaseThresholdsMs`, texty v `content/copy.ts`). Každá
fáze má i svůj zvuk (viz AUDIO_DESIGN.md "Blackout"), text nikdy neslibuje
zvuk, který se nepřehraje:

0. "Nouzová baterie převzala napájení." — hraje `blackoutHowl` (zavytí při vstupu do blackoutu).
1. "Zámek slábne. Odněkud se ozvaly vzdálené kroky." — hraje `enemyStep`.
2. "Chodba utichla. Kroky se zrychlují." — hraje `enemyNear`.
3. "Něco je za dveřmi." — nehraje žádný nový zvuk, ambient místo toho plynule doztichne
   úplně (`BLACKOUT_FINAL_AMBIENCE_FADE_MS`) — hráč čeká na smrt potichu, ne s dalším efektem.

Na úplném konci (`deathReason: "blackout_timeout"`) hraje `jumpscare` — stejný
efekt jako u každé jiné smrti (viz `app/play/page.tsx`, `screen === "death"`).

**Přežití:** pokud `remainingMs` klesne na 0 dřív, než blackout doběhne
(`night.blackout.canBeSurvivedIfShiftEnds`), hráč **vyhrává** — i uprostřed
blackoutu. Blackout na úplném konci směny tedy není automatická prohra.

**Smrt:** pokud blackout doběhne dřív než konec směny, hráč umírá
(`deathReason: "blackout_timeout"`). Death screen ukazuje jasně odlišný text od
smrti nepřítelem u dveří: "Nabíjení selhalo. Nouzová baterie vydržela jen pár
sekund. Ve tmě povolil zámek." — hráč má jednoznačně poznat, že ho zabil
výpadek energie/timeout, ne přímý útok nepřítele.

## Smrt

Tři důvody (`DeathReason`), s odlišným textem na `DeathScreen` (`content/copy.ts`
`death.reasons`), ať hráč vždy pozná, co ho zabilo:
- `door_open_at_attack` — nezavřel dveře včas, dokud generátor/baterie fungovaly
- `blackout_timeout` — blackout doběhl dřív, než skončila směna (viz "Blackout" výše)
- `bulb_replacement_attack` — zemřel s otevřenými dveřmi uprostřed ruční výměny prasklé
  žárovky (viz "Žárovky" výše) — mechanicky stejný útok jako `door_open_at_attack` (dveře
  otevřené, hráč v `DoorView`), jen jiný text

Zobrazí se krátký jumpscare overlay a `DeathScreen` s možností okamžitého restartu směny.

### Smrt u dveří — krátký "reveal" před DeathScreen

`door_open_at_attack` má navíc krátký (~700 ms) moment těsně před `DeathScreen`, kdy hráč
uvidí monstrum přímo ve dveřích (obrázek `door_open_death_0`), místo aby smrt přišla úplně
instantně — **ale jen když už je hráč v `DoorView`** (dveře otevřené) v okamžiku útoku: obraz
dveří se krátce crossfade přepne na monstrum ve dveřích, a teprve pak přijde `DeathScreen`.

Pokud hráč sleduje kamery/generátor v okamžiku útoku, smrt zůstává klasická/instantní —
záměrně ho nepřepínáme na `DoorView`, jen aby uviděl reveal. Tenhle případ (smrt mimo
`DoorView`) má do budoucna dostat vlastní řešení/obrazovku, zatím se nijak neliší od chování
před touhle funkcí.

Je to čistě tenhle jeden speciální případ, ne univerzální "pre-death" mezistav pro všechny
smrti — `blackout_timeout` i běžné hraní (kamery/generátor bez téhle situace) se chovají
beze změny, smrt přijde stejně instantně jako dřív.

## Výhra

Když `remainingMs` klesne na 0 a hráč je stále naživu (i uprostřed blackoutu — viz
výše), zobrazí se `WinScreen`.

## Žárovky (základ)

První krok budoucího systému náhradních žárovek: hlídač na začátku kampaně dostane **10**
náhradních žárovek (`game/core/bulbsConfig.ts`). Počet je **campaign** hodnota, ne per-směna
— přenáší se beze změny z noci na noc, stejně jako "Předchozí hlídači" nebo survival streak.

### Životnost žárovky u dveří

Žárovka v místnosti u dveří (`roomBulbs.nearRoom`) má omezenou životnost reálného svícení —
výchozí **30 sekund** (`BULBS_CONFIG.defaultLifetimeMs`). Životnost ubývá **jen** když
světlo skutečně svítí (vypínač zapnutý A žárovka ještě funkční), ne podle samotné polohy
vypínače. Jakmile dojde na 0, žárovka praskne: vypínač sám cvakne do polohy vypnuto,
místnost okamžitě zhasne a kamera `door_hallway` přestane používat osvětlenou variantu
snímku — nemůže nastat stav, že žárovka je prasklá, ale kamera pořád ukazuje rozsvícenou
chodbu.

Opotřebení žárovky (kolik jí zbývá) se přenáší mezi dny/nocemi stejně jako počet náhradních
kusů — slabá, ale ještě nepraskla žárovka pokračuje příští noc přesně od stejné hodnoty,
neresetuje se na plnou životnost jen proto, že začala nová směna.

### Denní servis prasklých žárovek

Po **přežité** směně (ne po smrti — objekt fyzicky zůstává tak, jak ho hlídač opustil,
další nastoupí přesně tam, kde předchozí skončil) proběhne denní servis: každá **skutečně
prasklá** žárovka se vymění za náhradní kus ze skladu (počet náhradních žárovek se sníží o
1) a obnoví se na plnou životnost. Slabá, ale neprasklá žárovka se automaticky nevyměňuje —
údržba řeší jen to, co je opravdu rozbité. Pokud dojdou náhradní kusy, prasklá žárovka
zůstává prasklá i do další noci.

### Ruční výměna prasklé žárovky (riziko)

Pokud žárovka u dveří praskne, hráč ji může sám vyměnit — ale jen v `DoorView`, jen s
**otevřenými** dveřmi. To je záměrně riziko, ne pohodlná oprava: otevřené dveře jsou hlavní
obrana, takže výměna hráče na pár sekund vystaví. Klik na malou ikonku žárovky (viditelná
jen když jsou dveře otevřené a žárovka je prasklá) spustí 5sekundovou výměnu — hráč vidí
postup (kruh/lišta + čas), musí ale zůstat u otevřených dveří a v `DoorView` po celou dobu.
Odchod od dveří (pohled zpátky na stůl/generátor) nebo zavření dveří uprostřed výměny ji
zruší bez opravy — riziko musí trvat celou dobu, ne se dát obejít schováním. Pokud během
výměny dojde k útoku monstra, hráč zemře stejně jako při běžném "otevřené dveře" útoku, jen
s vlastním textem na DeathScreen ("Jít vyměnit tu žárovku nebylo hrdinství, ale poslední
chyba v tvém životě.") — nadpis a firemní hláška zůstávají stejné. Po úspěšném dokončení se
žárovka opraví na plnou životnost a světlo jde znovu normálně používat.

### Co v tomhle kroku ještě není

Nákup žárovek, sponzoring — jinak je základní smyčka (praskne → hráč riskuje výměnu nebo
počká na denní servis) hotová.

## Atmosférická pozadí

Menu, loading, hraní (fáze u stolu se 4 monitory), smrt, výhra i `/about` mají vlastní
konfigurovatelné pozadí (`game/visuals/backgroundImages.ts`, vykresluje
`components/SceneBackground.tsx`). Pozadí může být 1-3 snímky, které se plynule prolínají
(žádný tvrdý skok — např. stejný obraz, jen jinak kouřící komín), a/nebo jemný efekt
blikání/ztlumení světla nezávislý na snímcích (blikající kontrolka, ztlumené osvětlení).
Jde o čistě datovou konfiguraci — přidat/vyměnit obrázek nebo změnit efekt nevyžaduje zásah
do žádné screen komponenty. Zatím mají reálný obrázek jen menu, hraní a výhra; smrt/loading/
`/about` jsou připravené, ale zatím bez vlastního snímku.

## Pozdější možné rozšíření

- Další směny (`night02.ts`, ...) s vlastním nepřítelem, kamerami, balancem
- Další typy nepřátel s odlišnou trasou/logikou
- Vlastní pixel-art grafika místo CSS placeholderu
- Skutečné audio soubory
- Ukládání postupu mezi směnami
- Přeskočitelný LoadingScreen
- Focus delay kamer počítaný podle napětí/energie/generátoru, ne pevná hodnota
