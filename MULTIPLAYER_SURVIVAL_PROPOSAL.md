# Multiplayerová survival minihra – návrh na později

## Stav dokumentu

Tento dokument shrnuje návrh budoucí multiplayerové survival minihry pro **Nočního hlídače / Objekt 13**.

Nejde o aktuální implementační zadání. Cílem je uchovat rozhodnutí a principy pro pozdější vývoj tak, aby se:

- co nejvíce využila současná mechanika existující `/minihra`,
- znovu nevynalézaly už vyřešené části,
- převzaly osvědčené principy multiplayerové synchronizace z projektu **Osmá liga**,
- oddělila herní logika, síťová synchronizace a vykreslení,
- současná hra ani existující minihra zbytečně nepřepisovaly od nuly.

---

# 1. Hlavní idea

Má vzniknout samostatný multiplayerový survival režim postavený nad existující testovací minihrou.

Základ:

- stejná nebo velmi podobná mapa jako v současné `/minihra`,
- až přibližně 20 hráčů,
- 30 vln tematicky odpovídajících 30 nocím,
- na začátku hry nemá žádný hráč zbraň,
- zbraně, munice a světelné bonusy se hledají na mapě,
- monstra nelze zabít jednou ranou,
- první zásah monstrum přepne do výrazně nebezpečnějšího stavu,
- tým musí zraněné monstrum dorazit co nejrychleji,
- týmové zabíjení monster postupně zvětšuje zorné pole všem hráčům,
- hráči si mají přirozeně rozdělit role a spolupracovat.

Hlavní atmosférická mechanika:

> Dokud monstrum nikdo nezraní, je nebezpečné, ale relativně kontrolovatelné. První výstřel spustí jeho zuřivý stav. Od té chvíle musí celý tým vědět, že je potřeba ho co nejrychleji dorazit.

---

# 2. Nezačínat od nuly

Budoucí vývoj nesmí automaticky vytvořit druhou paralelní minihru se stejnými základy.

Nejprve je nutné provést audit:

- přesná současná URL testovací minihry,
- zda jde o `/minihra`, `/hra/minihra`, dev route nebo jinou cestu,
- jaký používá reducer a stav,
- jak je řešena mapa,
- jak jsou řešeni hráči a monstrum,
- jak fungují kolize,
- jak funguje střelba,
- jak funguje zrychlení po zásahu,
- jak funguje zorné pole,
- které části jsou čisté funkce,
- které části jsou svázané přímo s React komponentou,
- zda lze přidat nový režim bez rozbití současné minihry.

Preferovaný směr:

```text
/minihra
```

se zachovaným současným režimem a novou variantou například:

```text
/minihra?mode=multiplayer-survival
```

nebo přepínačem režimu přímo na testovací stránce.

Nová komponenta a nová mapa se mají vytvářet jen tehdy, pokud audit prokáže, že stávající základ nejde rozumně rozšířit.

---

# 3. Využití existujících mechanik Nočního hlídače

Co nejvíce se má znovu použít ze současné minihry a současné hry.

Typicky:

- pohyb hráče,
- mapa a kolizní geometrie,
- zorné pole,
- práce se světlem,
- střelba,
- zásah monstra,
- stun nebo krátké zastavení,
- zrychlení monstra po zásahu,
- existující AI funkce,
- hledání cesty,
- logika pronásledování,
- zvuková a vizuální odezva,
- spawning předmětů,
- interakce s municí,
- případné existující testovací nástroje.

Pokud už existuje čistá funkce pro jedno monstrum, například ve stylu:

```ts
updateEnemyAi(enemy, context)
```

nemá se přepisovat. Má se použít opakovaně:

```ts
for (const monster of state.monsters) {
  updateEnemyAi(monster, context);
}
```

Je potřeba nejprve zjistit skutečný stav kódu. Tento dokument neurčuje konkrétní názvy funkcí ani souborů jako závazné.

---

# 4. Využití multiplayeru z Osmé ligy

Projekt Osmá liga už obsahuje řadu vyřešených multiplayerových principů. Ty se mají znovu použít nebo převzít jako ověřený vzor.

Před implementací je potřeba provést audit multiplayerové vrstvy Osmé ligy, zejména:

- vytvoření místnosti,
- připojení hráče,
- identifikace hráče,
- session,
- reconnect,
- odpojení,
- heartbeat,
- timeout mrtvého spojení,
- serverové snapshoty,
- pořadová čísla snapshotů,
- serverový čas,
- interpolace pohybu,
- klientská predikce, pokud existuje,
- korekce stavu,
- zpracování opožděných snapshotů,
- zahazování snapshotů doručených mimo pořadí,
- synchronizace vstupů,
- debug režim multiplayeru,
- případní testovací boti,
- simulace latence,
- chování při reloadu stránky,
- návrat hráče do probíhající hry.

Cíl není bezmyšlenkovitě zkopírovat celý kód Osmé ligy.

Cíl je:

> Použít stejný osvědčený model synchronizace, stejné principy autority serveru a co nejvíce přenositelné infrastruktury.

---

# 5. Architektonický princip

Herní režim má být rozdělen minimálně do tří vrstev:

```text
herní simulace
síťový transport a synchronizace
React vykreslení a ovládání
```

Herní pravidla nemají být závislá na websocketu ani přímo na React komponentě.

Preferovaný model:

```ts
nextState = updateSimulation(previousState, inputs, deltaMs)
```

Síťová vrstva má pouze:

- přijímat vstupy,
- volat autoritativní simulaci,
- distribuovat snapshoty,
- řešit připojení a odpojení.

React má:

- zobrazovat stav,
- posílat vstupy,
- interpolovat vizuální pohyb,
- zobrazovat UI a efekty.

První lokální prototyp se nesmí napsat jako slepá ulička, která by se při přidání multiplayeru celá zahodila.

---

# 6. Autorita serveru

Pro budoucí multiplayer až pro 20 hráčů musí být server autoritou.

Server rozhoduje o:

- pozici monster,
- aktuálním cíli každého monstra,
- zásazích,
- zbývajících životech monster,
- smrti monster,
- sebrání zbraně,
- vylepšení na dvouhlavňovku,
- množství munice,
- sebrání žárovky,
- délce světelného efektu,
- týmovém počtu zabití,
- týmovém bonusu rozhledu,
- čase vlny,
- začátku a konci vln,
- smrti hráče,
- odpojení hráče,
- reconnectu,
- bezpečném návratovém spawnu.

Klient posílá zejména vstupy:

```ts
type PlayerInput = {
  inputSeq: number;
  movement: DirectionInput;
  aimAngle: number;
  shootPressed: boolean;
  interactPressed: boolean;
};
```

Klient nesmí autoritativně oznamovat:

```text
zabil jsem monstrum
sebral jsem zbraň
mám více munice
mám větší rozhled
```

Tyto skutečnosti musí potvrdit server.

---

# 7. Hlavní cíl hry

Režim má mít 30 vln, které tematicky odpovídají 30 nocím.

Hlavní cíl:

> Tým se má dostat co nejdále a přežít všech 30 vln.

Výsledky zápasu mohou obsahovat:

- nejvyšší dosaženou vlnu,
- celkový čas přežití,
- počet zabitých monster,
- počet zásahů,
- počet asistencí,
- počet zachráněných spoluhráčů,
- přinesenou munici,
- dobu, po kterou hráč odváděl monstrum,
- počet sebraných žárovek,
- týmový dosažený rozhled.

Poškození a zabití mají být statistiky, ne hlavní individuální cíl.

Hra nemá podporovat sobecké kradení posledních ran.

---

# 8. Struktura 30 vln

Základní návrh:

```text
Vlny 1–10: 1 monstrum
Vlny 11–20: 2 monstra
Vlny 21–30: 3 monstra
```

Monstra mají být postupně silnější.

S rostoucí vlnou lze zvyšovat:

- počet zásahů nutných k zabití,
- základní rychlost,
- rychlost v zuřivém stavu,
- inteligenci nebo agresivitu,
- odolnost vůči stunu,
- délku pronásledování,
- rychlost změny cíle,
- tlak na munici,
- počet spawnů předmětů.

Počet monster by se neměl automaticky zvyšovat nad tři jen proto, že je více hráčů.

Lepší jsou tři nebezpečná a čitelná monstra než dvacet slabých nepřátel.

---

# 9. Otázka jednoho nebo více monster současně

Tento bod zatím není definitivně uzavřen.

Možné modely:

## Varianta A – jen jedno aktivní monstrum

Výhody:

- velmi čitelné,
- silná týmová koordinace,
- všichni vědí, které monstrum je potřeba řešit,
- jednodušší AI,
- jednodušší síťová synchronizace,
- menší vizuální chaos,
- lépe vynikne mechanika prvního zásahu a zuřivého stavu.

Nevýhody:

- při 20 hráčích může být jedno monstrum příliš snadno obklíčeno,
- může být nutné výrazně zvýšit jeho odolnost,
- část hráčů nemusí mít dost práce.

## Varianta B – 1 / 2 / 3 monstra podle desítky vln

Výhody:

- přirozený růst chaosu,
- více rolí,
- více pronásledovaných hráčů,
- větší tlak na rozdělení týmu.

Nevýhody:

- více současně zuřivých monster může být nepřehledných,
- hráči mohou nechtěně aktivovat několik monster najednou,
- větší riziko, že tým ztratí kontrolu bez možnosti nápravy.

Doporučení pro první prototyp:

- začít s jedním aktivním monstrem,
- ověřit hlavní herní smyčku,
- následně přidat druhé a třetí monstrum až jako parametr testovacího režimu,
- rozhodnutí potvrdit podle skutečné hratelnosti, ne pouze teoreticky.

---

# 10. Stav monstra před a po prvním zásahu

Monstrum má mít minimálně dva výrazně odlišné stavy.

## Nezraněné monstrum

- je nebezpečné,
- pronásleduje jednoho hráče,
- pohybuje se pomaleji,
- lze ho odvést,
- tým může připravit přepad,
- hráči si mohou doplnit munici,
- není nutné ho ihned napadnout.

## Zraněné / zuřivé monstrum

První platný zásah způsobí jednorázový přechod:

```text
nezraněné
↓ první zásah
zuřivé
```

Po přechodu:

- výrazně zrychlí,
- je agresivnější,
- pokračuje za aktuálním cílem,
- může mít kratší reakční dobu,
- může se hůře nechat zmást,
- musí být vizuálně i zvukově jasné, že změnilo stav.

Důležitý princip:

> Zrychlení se nespouští znovu po každém zásahu. Klíčová je první rána, která spustí nevratnou nebezpečnou fázi.

Hráči mají okamžitě pochopit:

> Někdo monstrum zranil. Teď musí umřít co nejrychleji.

Odezva může zahrnovat:

- řev,
- změnu zvuku,
- změnu animace,
- krátké bliknutí světel,
- otřes,
- změnu barevného nebo obrazového efektu,
- týmovou hlášku.

---

# 11. Životy monster

Monstra nemají umírat po jedné ráně.

Podle typu nebo vlny mohou vyžadovat například:

```text
2 zásahy
3 zásahy
5 zásahů
více zásahů u pozdějších vln
```

Přesná čísla se mají doladit testováním.

Je potřeba ošetřit situaci, kdy mnoho hráčů vystřelí ve stejný okamžik.

Možnosti:

- velmi krátká ochranná doba po zásahu,
- limit počtu zásahů započítaných v jednom síťovém okně,
- serverové seřazení zásahů podle ticku,
- jasná vizuální odezva přijatého zásahu.

Mechanika nesmí působit tak, že server náhodně ignoruje střelbu.

---

# 12. Cílení monstra na hráče

Každé monstrum je v jednu chvíli zaměřené jen na jednoho hráče.

Stav může obsahovat například:

```ts
type MonsterTargetState = {
  targetPlayerId: string | null;
  targetSinceMs: number;
  lastProgressTowardTargetMs: number;
};
```

Monstrum drží svůj cíl a nepřepíná každou chvíli podle nejbližšího hráče.

Cíl se může změnit, když:

- hráč zemře,
- hráč se odpojí,
- hráč už není dostupný,
- cesta dlouhodobě neexistuje,
- monstrum se přibližně 30 sekund nedokáže přiblížit,
- jiný hráč použije budoucí schopnost k převzetí pozornosti.

Preferované pravidlo:

> Pokud se monstrum přibližně 30 sekund nedokáže ke svému cíli reálně dostat nebo nezmenšuje vzdálenost, vybere si jiného hráče.

Nový cíl nemá být pouze čistě náhodný.

Výběr může zohlednit:

- vzdálenost,
- viditelnost,
- hluk,
- střelbu,
- počet monster už zaměřených na stejného hráče,
- dobu od posledního pronásledování.

Při více monstrech je vhodná silná penalizace, aby se všechna monstra bezdůvodně nesoustředila na jednoho člověka.

---

# 13. Začátek hry bez zbraní

Na začátku každého zápasu:

- žádný hráč nemá zbraň,
- žádný hráč nemá munici,
- hráči mají pouze základní pohyb a omezený rozhled.

První fáze hry je o:

- hledání vybavení,
- průzkumu mapy,
- rozdělení rolí,
- získání zbraní,
- získání munice,
- odvádění monstra bez možnosti okamžitého zabití.

To má zabránit tomu, aby hra začínala okamžitou palbou.

---

# 14. Zbraně

## První nalezená zbraň

```text
bez zbraně → jednohlavňovka
```

## Druhá nalezená zbraň

```text
jednohlavňovka → dvouhlavňovka
```

Pokud má hráč už dvouhlavňovku, další zbraň nesmí automaticky spotřebovat.

Má zůstat dostupná pro ostatní hráče.

Dvouhlavňovka může později umožnit:

- dva samostatné výstřely před přebitím,
- nebo vystřelení obou hlavní současně,
- případně jinou výhodu.

Přesné chování zatím není definitivně rozhodnuto.

Zbraň není jen výhoda. Je také odpovědnost, protože první výstřel může aktivovat zuřivý stav monstra.

---

# 15. Munice a muniční místo

Na mapě má být místo podobné kanceláři nebo zásobovací stanici, kde lze získat munici.

Má fungovat jako důležitý týmový bod.

Možné vlastnosti:

- více muničních beden,
- omezená kapacita,
- postupné doplňování,
- krátký cooldown,
- nutnost několik sekund interagovat,
- během doplňování hráč nemůže střílet,
- ostatní ho musí krýt.

Pro větší počet hráčů nesmí vzniknout jedna úzká fronta.

Proto je vhodné:

- více interakčních bodů,
- několik beden,
- nebo sdílená zásoba s více přístupovými místy.

---

# 16. Žárovky a dočasný rozhled

Na mapě se mohou objevovat žárovky.

Sebrání žárovky:

- zvětší osobní zorné pole hráče,
- účinek trvá přibližně 30 sekund,
- efekt je dočasný,
- další žárovka může obnovit nebo omezeně prodloužit trvání.

Časování se má řídit absolutním serverovým časem:

```ts
bulbActiveUntilMs: number | null;
```

Efekt se nesmí zmrazit odpojením nebo zavřením hry.

---

# 17. Trvalý týmový růst rozhledu

Počet zabitých monster zvyšuje základní zorné pole všem hráčům.

Výhoda je týmová, ne individuální.

Důvody:

- podporuje spolupráci,
- nezvýhodňuje pouze hráče s nejvíce posledními zásahy,
- nově připojený hráč dostane aktuální týmovou úroveň,
- celý tým cítí společný postup.

Preferovaný model jsou milníky.

Příklad:

```text
0 zabití týmu: 100 % základního rozhledu
5 zabití: 110 %
15 zabití: 120 %
30 zabití: 130 %
50 zabití: 140 %
```

Přesné hodnoty se mají doladit podle délky a obtížnosti 30 vln.

Výpočet může být například:

```ts
effectiveVisionRadius =
  baseVisionRadius *
  teamVisionMultiplier *
  personalBulbMultiplier;
```

Týmový růst je trvalý v rámci jednoho zápasu nebo běhu.

Není zatím rozhodnuto, že by se měl ukládat jako trvalá metaprogrese mezi různými zápasy.

---

# 18. Odpojení a reconnect

Když hráč zavře hru, obnoví stránku nebo ztratí spojení:

- jeho postava zmizí z aktivní mapy,
- přestane být platným cílem monster,
- nepřekáží ostatním,
- jeho stav se dočasně zachová pro reconnect,
- nepřijde o své zbraně ani výhody.

Zachovat se má zejména:

```ts
type PersistedMatchPlayerState = {
  playerId: string;
  weaponLevel: 0 | 1 | 2;
  ammo: number;
  personalUnlocks: string[];
  bulbActiveUntilMs: number | null;
  disconnectedAtMs: number | null;
};
```

Týmový bonus rozhledu není potřeba ukládat přímo hráči, protože je součástí společného stavu zápasu.

## Co se při reconnectu nezachovává

Nemá se automaticky zachovat:

- přesná pozice na mapě,
- aktuální střelba,
- momentální animace,
- krátký stun,
- právě probíhající interakce,
- zaměření monstra na odpojeného hráče.

Po návratu se hráč objeví na bezpečném návratovém místě, pravděpodobně u muniční oblasti nebo na vybraném reconnect spawnu.

Tím se omezuje zneužívání odpojení jako teleportu nebo úniku před monstrem.

## Délka reconnect okna

Pro krátkou hru lze stav držet do konce zápasu.

Pro delší režim je vhodné reconnect okno, například několik minut.

Přesná hodnota zatím není rozhodnuta.

---

# 19. Smrt hráče

Tento bod není definitivně rozhodnut.

Možnosti:

## Okamžitá smrt

- hráč skončí,
- sleduje zbytek týmu,
- jeho zbraň spadne na zem,
- ostatní ji mohou sebrat.

## Stav na zemi

- hráč je sražen,
- spoluhráči ho mohou oživit,
- oživení trvá několik sekund,
- vzniká další důvod ke spolupráci.

Pro první technický prototyp lze použít jednodušší okamžitou smrt.

Datový model by ale měl později umožnit:

```ts
alive
downed
dead
```

Při definitivní smrti má zbraň zůstat v ekonomice zápasu a spadnout na zem.

Při pouhém odpojení se zbraň zachovává hráči pro reconnect.

---

# 20. Snapshot multiplayerového stavu

Snapshot může obsahovat přibližně:

```ts
type MatchSnapshot = {
  seq: number;
  serverTimeMs: number;

  phase: MatchPhase;
  wave: number;
  remainingMs: number;

  players: NetworkPlayer[];
  monsters: NetworkMonster[];
  pickups: NetworkPickup[];

  teamKills: number;
  teamVisionLevel: number;
};
```

Přesná struktura se má odvodit z existující synchronizace v Osmé lize a ze skutečného stavu minihry.

Není cílem vytvářet nový síťový protokol, pokud lze rozumně rozšířit ten ověřený.

---

# 21. První testovací verze

První verze nemá rovnou implementovat celý online režim pro 20 hráčů.

Má ověřit hlavní herní smyčku.

Doporučený rozsah:

- použít existující `/minihra`,
- stejná nebo současná mapa,
- interně používat `players[]`,
- interně používat `monsters[]`,
- zatím jeden skutečně ovládaný hráč,
- možnost přidat simulované hráče nebo boty,
- jedno aktivní monstrum,
- později testovací přepínač pro dvě a tři monstra,
- začátek bez zbraně,
- nalezení první zbraně,
- nalezení druhé zbraně,
- munice na určeném místě,
- žárovka na 30 sekund,
- více zásahů nutných k zabití,
- jednorázové zrychlení po prvním zásahu,
- týmový počet zabití,
- týmové milníky rozhledu,
- dvouminutová testovací vlna,
- simulované odpojení a reconnect,
- debug informace pro cíle monster a stav snapshotů.

Až po ověření zábavnosti:

- napojit skutečný multiplayer transport,
- testovat více reálných klientů,
- rozšířit na 30 vln,
- zvýšit počet monster,
- ladit škálování pro 20 hráčů.

---

# 22. Co zatím nedělat

Do prvního prototypu nepřidávat:

- matchmaking,
- veřejné lobby,
- obchod,
- složitý inventář,
- mnoho typů zbraní,
- mnoho typů monster,
- trvalou metaprogresi,
- více map,
- kosmetické systémy,
- rozsáhlý ranking,
- samostatnou novou multiplayerovou architekturu,
- druhou kopii existující minihry,
- paralelní snapshot systém vedle Osmé ligy.

---

# 23. Doporučený postup budoucí práce

## Fáze 1 – audit

1. Najít skutečnou existující `/minihra`.
2. Popsat její stav, reducer, mapu a render.
3. Vypsat existující mechaniky monster.
4. Najít multiplayerové jádro Osmé ligy.
5. Popsat snapshoty, reconnect, heartbeat a autoritu serveru.
6. Určit, co lze převzít přímo a co jen jako vzor.
7. Bez implementace navrhnout minimální integrační plán.

## Fáze 2 – lokální gameplay prototyp

1. Rozšířit stávající minihru o nový režim.
2. Oddělit simulaci od React vykreslení.
3. Zavést pole hráčů a monster.
4. Implementovat začátek bez zbraní.
5. Přidat zbraně, munici a žárovky.
6. Přidat zuřivý stav po prvním zásahu.
7. Přidat týmové milníky rozhledu.
8. Přidat dvouminutovou testovací vlnu.
9. Přidat debug panel.

## Fáze 3 – multiplayerová synchronizace

1. Převzít model místností z Osmé ligy.
2. Převzít snapshot sekvence.
3. Převzít reconnect.
4. Převzít heartbeat.
5. Převzít interpolaci.
6. Přidat serverovou autoritu nad monstry, zásahy a pickupy.
7. Ověřit dva až čtyři klienty.
8. Simulovat latenci a odpojení.

## Fáze 4 – škálování a obsah

1. Otestovat 10 až 20 klientů nebo botů.
2. Rozšířit na 30 vln.
3. Ověřit jedno, dvě a tři monstra.
4. Doladit HP, rychlost a munici.
5. Přidat další typy monster jen tehdy, když základ funguje.
6. Rozhodnout smrt versus downed stav.
7. Doplnit závěrečné statistiky.

---

# 24. Hlavní nezodpovězené otázky

Před implementací bude ještě potřeba rozhodnout:

1. Má být v jednu chvíli jen jedno aktivní monstrum, nebo 1 / 2 / 3 podle desítky vln?
2. Jak dlouhá má být jedna vlna?
3. Má mezi vlnami existovat krátká přípravná pauza?
4. Jak přesně funguje dvouhlavňovka?
5. Kolik zbraní se spawnuje podle počtu hráčů?
6. Kolik zásahů vyžadují jednotlivé vlny?
7. Má hráč po chycení ihned zemřít, nebo být nejprve sražen?
8. Jak dlouhé je reconnect okno?
9. Kde přesně se hráč po reconnectu objeví?
10. Jak se zabrání tomu, aby 20 hráčů zabilo monstrum v jediném serverovém ticku?
11. Jak se bude škálovat munice podle počtu hráčů?
12. Zda budou všechny tři desítky vln součástí jednoho dlouhého zápasu.
13. Zda se týmový růst rozhledu resetuje po skončení zápasu.
14. Zda bude Objekt 13 pouze aréna, nebo budou hráči později také něco bránit či opravovat.

---

# 25. Shrnutí identity režimu

Nejdůležitější vlastnosti budoucího režimu:

- nikdo nezačíná se zbraní,
- zbraně jsou vzácný týmový zdroj,
- munice vyžaduje návrat na zásobovací místo,
- světlo je omezené,
- žárovky dávají dočasnou osobní výhodu,
- zabití monster trvale zlepšuje rozhled celému týmu v rámci zápasu,
- monstrum po první ráně výrazně zrychlí a zdivočí,
- první výstřel je strategické týmové rozhodnutí,
- každé monstrum sleduje vždy jen jednoho hráče,
- při dlouhé nemožnosti přiblížení přepne cíl,
- odpojený hráč zmizí, ale nepřijde o vybavení pro reconnect,
- režim má 30 vln,
- co nejvíce mechanik se využije ze současné `/minihra`,
- co nejvíce síťových principů se převezme z multiplayeru Osmé ligy.

Klíčová herní situace:

> Jeden hráč monstrum odvádí. Ostatní si připraví zbraně a munici. Dokud nikdo nevystřelí, tým má situaci relativně pod kontrolou. Jakmile padne první rána, monstrum se rozzuří a celý tým ho musí co nejrychleji dorazit.

---

# 26. Fáze 1 — audit (proveden 2026-07-26)

Provedený audit `/minihra` enginu (nocni-hlidac) a multiplayerového jádra Osmé ligy
(osma-liga + project-hub-api). Čistě informativní — bez implementace, viz zadání fáze 1.

## 26.1 `/minihra` engine — zjištění

- **Je to stejná komponenta jako v ostré hře.** `/minihra` (`app/minihra/page.tsx`) je jen
  debug obálka (výběr z 27 scénářů + JSON panel) kolem `components/minigame/EmergencyMiniGame.tsx`
  — TÉTÉŽ komponenty, kterou `app/play/page.tsx` používá pro battery/shotgun/camera-maintenance
  výjezdy. Žádná druhá paralelní minihra neexistuje.
- **Žádný reducer.** Stav žije v `useRef<MiniGameRefState>` (jeden velký mutovaný objekt),
  ~20 `useState` zrcadel jen kvůli re-renderu HUD. Vstupní kontrakt je
  `EmergencyMiniGameInput` (objective/equipment/layoutId/seed/...).
- **Mapa je datově definovaná a seedovaná** (`layoutTypes.ts`, `layouts/`, `layoutPlacement.ts`,
  `seededRandom.ts`) — místnosti/zdi/sloty s tagy, deterministický výběr přes seed. Nezávislé
  na počtu hráčů/monster na datové úrovni — přímo použitelné pro survival mapu.
- **Čisté funkce (přímo znovupoužitelné, i server-side):** `game/minigame/logic.ts` (kolize
  `moveWithWallSliding`/`circlesTouch`, LOS/zorný kužel `hasLineOfSight`/`isTargetInCone`,
  `updateEnemyAi` — čistá, per-entita, dá se mapovat přes pole monster, `applyShot`/`isEnemyHit`
  — per-střelec/per-cíl), `playerVision.ts` (fog, taky per-entita), `layoutPlacement.ts`,
  `touchControls.ts`, `officeThreat.ts`.
- **Svázané s React komponentou (NENÍ přímo znovupoužitelné):** celý `EmergencyMiniGame.tsx` —
  `tick()`/`draw()` čtou `game.player`/`game.enemy` v JEDNOTNÉM čísle na desítkách míst,
  canvas vykreslování, keyboard/pointer handlery, `requestAnimationFrame` smyčka. **Neexistuje
  žádný "headless" `tick(state, input) -> state"` vstupní bod** — orchestrace je dnes
  zapletená přímo v komponentě.
- **Monstrum už má částečnou verzi "zrychlí po zásahu":** `Enemy.enraged` — jednorázově
  natrvalo `true` po prvním zotavení z "wounded", pak `investigating` běhá rychlostí
  `chaseSpeed` místo `searchSpeed` navždy. Není to eskalující křivka, jen jeden trvalý
  přepínač — základ pro budoucí mechaniku, ne hotové řešení.
- **Hidden true ending (`monsterHits`)** — počítadlo/report existuje i v `game/minigame/logic.ts`
  (`qualifiesAsNewMonsterHit`, `isMonsterHitFinal`), ale skutečný PRÁH a rozhodnutí "already
  defeated" žije v `game/core/monsterEnding.ts` na straně hlavní hry — spolupráce dvou vrstev,
  ne jedna uzavřená mechanika.
- **`MiniGameObjective` enum** (`"return_to_office" | "collect_item" | "survive" | "replace_camera"`)
  je existující "plug-in" bod pro nové objective, ale sám o sobě NESTAČÍ na multiplayer — pokrývá
  jen dispatch cíle mise, ne víc herců/síť/autoritu. Multiplayerový survival bude
  pravděpodobně potřebovat NOVOU komponentu/runtime, která znovupoužije `logic.ts` a
  `layouts/`, ne vsunutí do současné jednohráčové `tick()` smyčky `EmergencyMiniGame.tsx`.

## 26.2 Osmá liga — zjištění

- **Transport:** Socket.IO (ne raw WebSocket), server běží v `project-hub-api`
  (Fastify + `socket.io` na stejném HTTP serveru), klient `socket.io-client`
  v `osma-liga/components/online/useOnlineGame.ts`.
- **Room model:** místnosti jako obyčejné objekty v `Map<string, OnlineGameRoom>`
  (`project-hub-api/src/modules/osmaLiga/onlineGames.ts`), stavy
  `waiting/full/playing/finished/expired`, TTL 30 minut, úklid při přístupu (ne
  samostatný cron).
- **Identita hráče:** neautentizovaný náhodný token (16 bajtů hex) na hosta/hosta při
  vytvoření/joinu, uložený v `sessionStorage` na klientovi, žádný JWT/podpis — znalost
  tokenu = důkaz identity v rámci místnosti.
- **Heartbeat/reconnect: SLABÉ MÍSTO, ne vzor k okopírování.** Žádný vlastní
  heartbeat/disconnect handler — spoléhá čistě na výchozí Socket.IO engine.io
  ping/pong. Server na `disconnect` vůbec nereaguje (žádná pauza, žádné oznámení
  soupeři). Reconnect "funguje" jen náhodou — stav hry běží v `setInterval`
  nezávisle na socketu, takže hráč se vrátí přes `join_game` se stejným tokenem a
  dostane snapshoty dál. Žádné reconnect okno, žádný forfeit timeout.
- **Server je plně autoritativní** — klient posílá jen vstupy (`updateInput`),
  veškerá fyzika/skóre/časovač běží v `tickGame()` na serveru (`setInterval`, 33ms
  tick), oddělené od transportní vrstvy (`gameEngine/*.ts` bez znalosti socketu/HTTP).
  **Tohle je klíčový vzor k převzetí.**
- **Snapshoty:** posílají se každé 2 ticky (~15 Hz), obsahují `tick` counter, ale
  klient nedělá ŽÁDNOU kontrolu pořadí/staleness — spoléhá na spolehlivé doručení
  jednoho socketu. Žádné zahazování out-of-order snapshotů (protože žádné
  nepřicházejí přes jeden socket).
- **Interpolace:** klient lerpuje VŠECHNY entity (včetně vlastního hráče) směrem k
  poslednímu snapshotu (`LERP = 0.3` konstanta) — žádná klientská predikce/reconciliace,
  vlastní pohyb je tak znatelně opožděný pod latencí. Jednoduché, ale ne "vzorové" pro
  responzivní ovládání.
- **Debug/test nástroje:** jen jeden AI bot pro trénovací výzvy
  (`gameEngine/ai.ts#computeTrainingChallengeInput`), žádný obecný bot/simulace
  latence/multiplayer debug panel.
- **Reload/rejoin:** čistě klientské řešení přes `sessionStorage` token + polling stavu
  místnosti (5s) — funguje jen díky tomu, že stav hry vůbec není vázaný na
  socket spojení. Zavření tabu (ne jen reload) token ztratí.
- **Vrstvení engine/transport je čisté a je to TEN vzor, co stojí za převzetí:**
  `tickGame(state, dt, ...)` v `project-hub-api/src/gameEngine/*.ts` nezná socket ani
  HTTP, jde testovat samostatně (`tick.test.ts`) a v principu pohánět jakýmkoliv
  transportem.

## 26.3 Minimální integrační plán

**Co převzít přímo (funguje dobře v Osmé lize):**
- Server-autoritativní pevný tick loop oddělený od životního cyklu socketu
  (`tickGame(state, inputs, dt)` nezná transport).
- Tokenová identita hráče perzistovaná v `sessionStorage`, jednoduchý rejoin přes
  znovu-poslaný token.
- Vrstvení engine/transport/render do tří modulů (přesně princip ze sekce 5 zadání).

**Co NEkopírovat beze změny (Osmá liga to sama řeší slabě):**
- Chybějící heartbeat/disconnect handling — pro survival s až 20 hráči a
  30 vlnami je "žádná reakce na odpojení" nedostatečné (zadání sekce 18 to už
  správně předpokládá jako nutnou novou práci, ne převzatou).
- Chybějící sekvenční/staleness kontrola snapshotů — u 20 hráčů a delšího zápasu
  stojí za to od začátku přidat `seq`/reject-older-than-last, i když to Osmá
  liga nepotřebovala (jeden 1v1 socket, krátký zápas).
- Lerp-everything bez predikce — pro survival s vlastním pohybem/mířením/střelbou
  hráče se vyplatí aspoň lokální predikce vlastního hráče (server jen koriguje),
  ne stejné opožděné lerpování jako u soupeřova panáčka v Osmé lize.

**Co potřebuje novou práci (neexistuje ani v jednom repu):**
- Headless `tick(state, inputs, deltaMs) -> state` extrahovaný z
  `EmergencyMiniGame.tsx` — `logic.ts` primitivy (kolize, AI, vidění, střelba) se dají
  volat přímo, ale orchestrace kolem nich dnes žije jen v React komponentě.
  Tohle je jádro prototypové fáze 2.
- Pole hráčů/monster místo jednotného `game.player`/`game.enemy` — datový typ se
  generalizuje snadno, ale VŠECHNY čtení/zápisy v `tick()`/`draw()` (desítky míst) se
  musí přepsat na cyklus.
- Eskalující (ne jednorázová) rychlost/agresivita monstra po zásahu — dnešní
  `enraged` je jeden trvalý přepínač, survival bude podle zadání (sekce 10)
  potřebovat výraznější/opakovatelnou reakci.
- Nový vstupní bod/komponenta pro multiplayerový režim — `MiniGameObjective` enum
  sám o sobě nestačí, protože nepokrývá víc hráčů ani síť.

**Doporučený první krok (navazuje na fázi 2 v zadání, sekce 21/23):** extrahovat z
`EmergencyMiniGame.tsx` headless `tick()` nad polem hráčů/monster (zatím jen 1
skutečně ovládaný hráč + 1 monstrum, žádná síť) — tím se ověří, že se dá `logic.ts`
znovupoužít beze změny a že se React vrstva dá čistě oddělit, než se vůbec sáhne na
multiplayer transport.
