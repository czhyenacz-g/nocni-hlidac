# Bušení na dveře / řev monstra / kroky — kandidáti z Freesound.org

Originální stažené soubory, zatím nikam nezapojené (nejsou v `audioConfig.ts`,
nejsou v `public/assets/audio/`). Až se vyberou finální kandidáti, patří sem
stejný postup jako u ostatních zvuků (viz `assets/audio/README.md`): zkonvertovat/
zesílit přes `ffmpeg` podle potřeby, zkopírovat do `public/assets/audio/`, napojit
přes `AUDIO_EVENTS`/`audioConfig.ts`, doplnit zdroj sem i do `CREDITS.md`.

## door_pound/

- `194365__macif__door-knocking-angry.wav` — [Door knocking (Angry).wav – Macif](https://freesound.org/people/Macif/sounds/194365/), **CC0**, 2.1 s

## monster_roar/

- `479380__breviceps__dragon-several-roars-growls-and-snarls.wav` — [Dragon: Several roars, growls and snarls – Breviceps](https://freesound.org/people/Breviceps/sounds/479380/), **CC0**, 60 s (víc variant v jednom souboru, potřeba vystřihnout konkrétní roar)

## footsteps/

- `753178__vilkas_sound__monster-stomp-footsteps-sequence.mp3` — [Monster Stomp Footsteps Sequence – Vilkas_Sound](https://freesound.org/people/Vilkas_Sound/sounds/753178/), **CC BY 4.0** (vyžaduje atribuci v `CREDITS.md`, pokud se použije), 8.3 s
- `712066__audiopapkin__monster-footsteps-on-gravel.wav` — [Monster footsteps on gravel – AudioPapkin](https://freesound.org/people/AudioPapkin/sounds/712066/), **CC0**, 22.3 s (opakující se kroky, jde vystřihnout kratší smyčku)

## Poznámka

Neúspěšné/přeskočené kandidáty (nestažené):
- Goblin Growl (qubodup) — jen 0.78 s, moc krátké a "goblin" tón nesedí k atmosféře hry.
