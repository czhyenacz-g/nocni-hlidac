# Databáze Objektu 13 (/database) — MVP

Veřejně dostupná prezentační stránka `/database` s návrhem budoucí "interní
databáze" Objektu 13. V TÉTO fázi je to čistě informační/prezentační modul —
žádná herní logika, žádné napojení na `GameState`, žádné databázové tabulky.

## Účel

Ukázat, jak by mohla vypadat budoucí encyklopedie subjektů/vybavení/hlášení/
manuálů Objektu 13, a zdokumentovat detailní TODO seznam plánovaných funkcí,
aniž by cokoli z toho muselo být implementované už teď.

## Čtyři záložky

- **Subjekty** (výchozí) — potvrzený subjekt Ghoul (jediná "hotová" karta),
  osobní výzkumný panel (guest/auth varianta), plánované subjekty
  (Ghost/Titan/Praetorián), závěrečný TODO blok.
- **Výbava** — 9 karet vybavení (zbraně, dávkovač munice, sonické dělo,
  dveřní systém, generátor, kamery, žárovky, baterie), každá s vlastním
  TODO.
- **Hlášení** — jeden pevný ukázkový report (noc 7, Ghoul), osobní panel
  (guest/auth), náhled budoucího formuláře hlášení (celý `disabled`, nic se
  neodesílá), TODO blok.
- **Manuály** — 7 provozních manuálů (přežití první noci, brokovnice,
  poškozená kamera, žárovky, energie, sonické dělo, lov subjektu), TODO
  blok.

Přepínání je čistě klientský `useState` v `components/screens/DatabaseScreen.tsx`
(role `tablist`/`tab`/`tabpanel`, šipky + Home/End pro klávesnici) — žádné
URL/router zapojení v této fázi (viz zadání "nedělej kvůli tomu složitý
router"); záložky nemají vlastní `?tab=` parametr.

## Veřejný vs. osobní obsah

- **Veřejný obsah** (karty subjektů/vybavení/manuálů, ukázkový report) je
  vidět VŽDY, bez ohledu na přihlášení — je to prezentace budoucí databáze,
  ne osobní data.
- **Osobní obsah** (panel "OSOBNÍ ZÁZNAM"/"OSOBNÍ VÝZKUM"/"OSOBNÍ HLÁŠENÍ")
  se zobrazí jen po přihlášení (Discord OAuth, stejný mechanismus jako
  zbytek webu — `lib/auth/session.ts`). Nepřihlášený hráč vidí jen krátký
  prezentační text "co tu jednou bude" a nenápadné tlačítko přihlášení.

Skutečně dostupná data pro přihlášeného hráče: `currentNight`
(server `currentRun`) a `highestNightReached` (server `bestRun`) — stejný
zdroj jako `/leaderboard`/`/api/auth/me` (`lib/leaderboard/ensureHubPlayer.ts`).
Vše ostatní (objevené subjekty, dokončená hlášení, potvrzené likvidace,
vyřazené kamery) v projektu zatím vůbec neexistuje — zobrazuje se jako
`ZATÍM NENAPOJENO`, nikdy jako vymyšlené číslo.

## Napojení skutečných dat v budoucnu

Až bude existovat centrální herní postup pro tahle pole, stačí rozšířit
`lib/database/databaseViewer.ts#buildDatabasePlayerPreview` o nové zdroje
(zatím vrací jen `currentNight`/`highestNightReached`) — `DatabaseViewerStatus.tsx`
a `DatabaseSubjectsTab.tsx` už čtou `DatabasePlayerPreview` obecně a
placeholder text zmizí sám, jakmile hodnota přestane být `undefined`.

## Statický obsah odděleně od herní logiky

Veškerý strukturovaný obsah (karty, manuály, ukázkový report, TODO seznamy)
žije v `lib/database/databaseContent.ts` jako typovaná data (typy v
`lib/database/databaseTypes.ts`) — žádný z těchto souborů nic neimportuje z
`game/core`/`game/*` a `game/core` nic neimportuje odtud. Krátké UI
"chrome" texty (hlavička, badge, placeholdery) jsou v `content/copy.ts` pod
klíčem `database`, stejná konvence jako zbytek webu.

## Zatím není nikde odkazovaná

`/database` není v hlavní navigaci, footeru, ani ve hře — dostupná pouze
ručním zadáním URL. V projektu není žádný `sitemap.ts`/`sitemap.xml`, takže
stránka se ani automaticky neobjeví ve strojově generované sitemapě.

## Co je nyní jen TODO

Bestiář, výzkumné body/úrovně, ukládání/odesílání hlášení, statistiky
munice/zásahů/smrtí, globální statistiky, žebříčky specifické pro databázi,
odemykání obsahu, CMS/administrace, vyhledávání/filtrování/export — nic z
tohohle není implementované. Každá záložka končí `DatabaseTodoBlock`
seznamem, který to explicitně říká.
