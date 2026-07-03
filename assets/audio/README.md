# Audio assety

Skutečné servírované soubory jsou v `/public/assets/audio/`, na ně odkazuje
`game/audio/audioConfig.ts`. I kdyby soubor chyběl, `AudioManager`
(`game/audio/audioManager.ts`) selhání přehrání tiše ignoruje, takže hra funguje i bez nich.

## Zdroj (placeholder zvuky pro první verzi)

Všechny zvuky pochází z [Kenney.nl](https://kenney.nl) — licence **Creative Commons CC0**
(public domain, žádné attribution není potřeba). Použité balíčky: UI Audio, Interface
Sounds, Impact Sounds, Sci-fi Sounds, RPG Audio. Zdrojové soubory byly ve formátu `.ogg`,
zkonvertované do `.mp3` (`ffmpeg -codec:a libmp3lame -qscale:a 4`) kvůli širší kompatibilitě
napříč prohlížeči (Safari/iOS nativně nepodporuje Ogg Vorbis).

| Event (`audioEvents.ts`) | Soubor | Zdrojový Kenney zvuk |
|---|---|---|
| `ambienceLoop` | `ambience_loop.mp3` | Sci-fi Sounds — `spaceEngineLow_000` |
| `cameraNoise` | `camera_noise.mp3` | Sci-fi Sounds — `computerNoise_000` |
| `doorClose` | `door_close.mp3` | Sci-fi Sounds — `doorClose_000` |
| `doorOpen` | `door_open.mp3` | Sci-fi Sounds — `doorOpen_000` |
| `lightClick` | `light_click.mp3` | UI Audio — `switch1` |
| `enemyStep` | `enemy_step.mp3` | Impact Sounds — `footstep_concrete_000` |
| `enemyNear` | `enemy_near.mp3` | RPG Audio — `creak1` |
| `powerLow` | `power_low.mp3` | Interface Sounds — `error_001` |
| `jumpscare` | `jumpscare.mp3` | Sci-fi Sounds — `explosionCrunch_000` |
| `shiftWin` | `shift_win.mp3` | Interface Sounds — `confirmation_001` |
| `uiClick` | `ui_click.mp3` | UI Audio — `click1` |

Toto je první placeholder výběr, ne finální zvukový design — `ambience_loop.mp3` je krátký
efekt smyčkovaný přes `loop: true`, ne skutečně nekonečná ambientní kompozice (viz
`AUDIO_DESIGN.md`, sekce "Ambientní zvuková vrstva" pro plán rozšíření).
