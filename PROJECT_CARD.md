# Project Card

- **Název projektu**: nocni-hlidac
- **Veřejný název**: Noční hlídač
- **První kapitola**: Objekt 13: První směna
- **Série / engine**: Noční služba
- **Domény**: nocni-hlidac.cz, nocnisluzba.cz, objekt13.cz

## Cíl

Vytvořit klaustrofobickou lekací hru v prohlížeči, kde hráč sedí v malé bezpečnostní
místnosti, sleduje kamery a nepřítele, a musí zavřít dveře ve správný okamžik, aby přežil
směnu. První cíl: malý funkční prototyp, ze kterého se postupně vyčistí obecnější engine
(Noční služba) pro další kapitoly.

## Cílovka

Hráči jednoduchých webových horor/lekacích her (žánr FNAF-like). Krátké, opakovatelné
relace (jedna směna = pár minut).

## Stav

Prototyp — první hratelná směna (MVP) funguje: menu, hra, smrt, výhra, restart.
Grafika a zvuk jsou placeholder, architektura je připravená na rozšíření.

## Budoucí monetizace

Zatím žádná. Neřeší se platby, Discord login, Patreon ani databáze.
Až se ověří, že je hra zábavná a hratelná, může se zvážit další kapitoly / dárky / reklama.

## Rizika

- Balancování obtížnosti (šance na postup nepřítele, spotřeba energie) — vyžaduje playtesting
- Chybějící skutečná grafika a zvuk mohou zkreslit dojem z hratelnosti
- Autoplay policy prohlížečů — audio se musí spouštět až po interakci (ošetřeno)

## Co zatím nedělat

- Platby, Discord login, Patreon, databázi
- Editor kampaní, více kampaní/nocí najednou
- 3D grafiku, multiplayer, složitý backend
- Velký lore systém
- Generický engine pro všechno — engine vznikne postupným čištěním z první hratelné směny
- Složitou procedurální mapu
