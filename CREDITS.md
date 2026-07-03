# Credits

## Audio

Všechny zvuky použité v projektu pochází z [Kenney.nl](https://kenney.nl/assets),
licence **Creative Commons CC0** (public domain — bez nutnosti attribution).

Použité balíčky:

| Balíček | URL |
|---|---|
| UI Audio | https://kenney.nl/assets/ui-audio |
| Interface Sounds | https://kenney.nl/assets/interface-sounds |
| Impact Sounds | https://kenney.nl/assets/impact-sounds |
| Sci-fi Sounds | https://kenney.nl/assets/sci-fi-sounds |
| RPG Audio | https://kenney.nl/assets/rpg-audio |

Datum importu: 2026-07-03

Zdrojové soubory byly `.ogg`, převedené do `.mp3` (`ffmpeg -codec:a libmp3lame -qscale:a 4`)
kvůli širší kompatibilitě napříč prohlížeči (Safari/iOS nativně nepodporuje Ogg Vorbis).

| Finální soubor (`public/assets/audio/`) | Zdrojový Kenney zvuk | Balíček |
|---|---|---|
| `ambience_loop.mp3` | `spaceEngineLow_000` | Sci-fi Sounds |
| `camera_noise.mp3` | `computerNoise_000` | Sci-fi Sounds |
| `door_close.mp3` | `doorClose_000` | Sci-fi Sounds |
| `door_open.mp3` | `doorOpen_000` | Sci-fi Sounds |
| `light_click.mp3` | `switch1` | UI Audio |
| `enemy_step.mp3` | `footstep_concrete_000` | Impact Sounds |
| `enemy_near.mp3` | `creak1` | RPG Audio |
| `power_low.mp3` | `error_001` | Interface Sounds |
| `jumpscare.mp3` | `explosionCrunch_000` | Sci-fi Sounds |
| `shift_win.mp3` | `confirmation_001` | Interface Sounds |
| `ui_click.mp3` | `click1` | UI Audio |

Podrobnosti a pravidla pro přidávání dalších zvuků viz `assets/audio/README.md` a
`AUDIO_DESIGN.md`.
