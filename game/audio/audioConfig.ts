import { AUDIO_EVENTS, AudioEventId } from "./audioEvents";

export interface AudioClipConfig {
  /** Cesta k souboru v /public/assets/audio. Soubor nemusí zatím existovat. */
  src: string;
  volume: number;
  loop: boolean;
}

// Placeholder konfigurace zvuků pro první směnu. Soubory zatím nemusí existovat —
// AudioManager selhání přehrání tiše ignoruje (viz audioManager.ts).
export const AUDIO_CONFIG: Record<AudioEventId, AudioClipConfig> = {
  [AUDIO_EVENTS.ambienceLoop]: { src: "/assets/audio/ambience_loop.mp3", volume: 0.35, loop: true },
  [AUDIO_EVENTS.cameraNoise]: { src: "/assets/audio/camera_noise.mp3", volume: 0.5, loop: false },
  [AUDIO_EVENTS.doorClose]: { src: "/assets/audio/door_close.mp3", volume: 0.7, loop: false },
  [AUDIO_EVENTS.doorOpen]: { src: "/assets/audio/door_open.mp3", volume: 0.7, loop: false },
  [AUDIO_EVENTS.lightClick]: { src: "/assets/audio/light_click.mp3", volume: 0.6, loop: false },
  [AUDIO_EVENTS.enemyStep]: { src: "/assets/audio/enemy_step.mp3", volume: 0.5, loop: false },
  [AUDIO_EVENTS.enemyNear]: { src: "/assets/audio/enemy_near.mp3", volume: 0.6, loop: false },
  [AUDIO_EVENTS.powerLow]: { src: "/assets/audio/power_low.mp3", volume: 0.6, loop: false },
  [AUDIO_EVENTS.jumpscare]: { src: "/assets/audio/jumpscare.mp3", volume: 1.0, loop: false },
  [AUDIO_EVENTS.shiftWin]: { src: "/assets/audio/shift_win.mp3", volume: 0.7, loop: false },
  [AUDIO_EVENTS.uiClick]: { src: "/assets/audio/ui_click.mp3", volume: 0.4, loop: false },
};
