# Bušení na dveře / řev monstra / kroky — kandidáti z Freesound.org

Originální stažené soubory, zatím nikam nezapojené (nejsou v `audioConfig.ts`,
nejsou v `public/assets/audio/`). Až se vyberou finální kandidáti, patří sem
stejný postup jako u ostatních zvuků (viz `assets/audio/README.md`): zkonvertovat/
zesílit přes `ffmpeg` podle potřeby, zkopírovat do `public/assets/audio/`, napojit
přes `AUDIO_EVENTS`/`audioConfig.ts`, doplnit zdroj sem i do `CREDITS.md`.

## door_pound/

- `194365__macif__door-knocking-angry.wav` — [Door knocking (Angry).wav – Macif](https://freesound.org/people/Macif/sounds/194365/), **CC0**, 2.1 s

## monster_roar/

- `479380__breviceps__dragon-several-roars-growls-and-snarls.wav` — [Dragon: Several roars, growls and snarls – Breviceps](https://freesound.org/people/Breviceps/sounds/479380/), **CC0**, 60 s (raw originál, víc variant za sebou)

Rozřezáno (`ffmpeg -af silencedetect=noise=-30dB:duration=0.3` na nalezení mezer
ticha, pak `ffmpeg -ss/-to` per segment) na 12 samostatných jednořevových
souborů v `public/dev-sound-candidates/monster_roar/roar_01.mp3` … `roar_12.mp3`
(viz `/dev-sound`, sekce "Kandidáti" — tam jde každý poslechnout zvlášť).
`roar_10.mp3` je delší (~10 s) — v originále mezi ním a sousedy nebyla
dost dlouhá pauza ticha, takže obsahuje víc navazujících zavrčení najednou,
ne čistě jeden úder. Zatím nikam nezapojeno do `AUDIO_EVENTS`/`audioConfig.ts`.

## footsteps/

Obě varianty níže znějí jako **těžké, dunivé monstrum** — pro současného
nepřítele jsou moc masivní/pomalé. Zatím nikam nezapojujeme, schované na
později pro budoucí druhý typ nepřítele ("gigant") s vlastním, těžším
zvukovým profilem.

- `753178__vilkas_sound__monster-stomp-footsteps-sequence.mp3` — [Monster Stomp Footsteps Sequence – Vilkas_Sound](https://freesound.org/people/Vilkas_Sound/sounds/753178/), **CC BY 4.0** (vyžaduje atribuci v `CREDITS.md`, pokud se použije), 8.3 s
- `712066__audiopapkin__monster-footsteps-on-gravel.wav` — [Monster footsteps on gravel – AudioPapkin](https://freesound.org/people/AudioPapkin/sounds/712066/), **CC0**, 22.3 s (opakující se kroky, jde vystřihnout kratší smyčku)

## footsteps_human/

Kroky **člověka** (ne monstra/giganta) — kandidáti pro současného nepřítele, na
rozdíl od `footsteps/` výše, které jsou vyhrazené pro budoucí "gigant" typ.

- `336598__inspectorj__footsteps-concrete-a.wav` — [Footsteps, Concrete, A – InspectorJ](https://freesound.org/people/InspectorJ/sounds/336598/), **CC BY 4.0** (vyžaduje atribuci v `CREDITS.md`, pokud se použije), ~39.8 s, tvrdší podpatek na betonu
- `813622__securesubset__footsteps-stone-rock-concrete-cement.wav` — [Footsteps - Stone, Rock, Concrete, Cement – SecureSubset](https://freesound.org/people/SecureSubset/sounds/813622/), **CC0**, 6.7 s

## Poznámka

Neúspěšné/přeskočené kandidáty (nestažené):
- Goblin Growl (qubodup) — jen 0.78 s, moc krátké a "goblin" tón nesedí k atmosféře hry.
