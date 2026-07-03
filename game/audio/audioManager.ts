import { AUDIO_CONFIG } from "./audioConfig";
import { AudioEventId } from "./audioEvents";

/**
 * Jednoduchý AudioManager. Pravidlo: chybějící nebo nenačtený audio soubor nikdy
 * nesmí shodit aplikaci — přehrání jen tiše selže (zachyceno promise/catch).
 * Musí se inicializovat až po první interakci uživatele (autoplay policy prohlížečů).
 */
class AudioManager {
  private elements = new Map<AudioEventId, HTMLAudioElement>();
  private muted = false;
  private initialized = false;

  init(): void {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    for (const [id, config] of Object.entries(AUDIO_CONFIG) as [AudioEventId, typeof AUDIO_CONFIG[AudioEventId]][]) {
      const audio = new Audio(config.src);
      audio.volume = config.volume;
      audio.loop = config.loop;
      audio.preload = "auto";
      this.elements.set(id, audio);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      for (const audio of this.elements.values()) {
        audio.pause();
      }
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(id: AudioEventId): void {
    if (this.muted || !this.initialized) return;
    const audio = this.elements.get(id);
    if (!audio) return;

    try {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Soubor chybí nebo přehrání selhalo — v první verzi je to očekávané, ignoruj.
      });
    } catch {
      // Ignoruj — audio je nice-to-have, ne kritická závislost.
    }
  }

  startLoop(id: AudioEventId): void {
    if (!this.initialized) return;
    const audio = this.elements.get(id);
    if (!audio) return;

    if (this.muted) return;

    try {
      void audio.play().catch(() => {});
    } catch {
      // Ignoruj.
    }
  }

  stopLoop(id: AudioEventId): void {
    const audio = this.elements.get(id);
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  stopAll(): void {
    for (const audio of this.elements.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}

// Jedna sdílená instance pro celou aplikaci.
export const audioManager = new AudioManager();
