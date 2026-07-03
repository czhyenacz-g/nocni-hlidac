# Audio assety

Sem patří zvukové soubory, na které odkazuje `game/audio/audioConfig.ts`.

V první verzi tyto soubory (zatím) neexistují — `AudioManager` (`game/audio/audioManager.ts`)
selhání přehrání tiše ignoruje, takže hra funguje i bez nich.

Očekávané soubory (viz `game/audio/audioEvents.ts`):

- `ambience_loop.mp3`
- `camera_noise.mp3`
- `door_close.mp3`
- `door_open.mp3`
- `light_click.mp3`
- `enemy_step.mp3`
- `enemy_near.mp3`
- `power_low.mp3`
- `jumpscare.mp3`
- `shift_win.mp3`
- `ui_click.mp3`

Soubory se očekávají v `/public/assets/audio/`.
