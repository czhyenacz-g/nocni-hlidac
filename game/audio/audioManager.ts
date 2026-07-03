import { AUDIO_CONFIG, FallbackSynthConfig } from "./audioConfig";
import { AudioEventId } from "./audioEvents";

/**
 * Jednoduchý AudioManager. Pravidlo: chybějící nebo nenačtený audio soubor nikdy
 * nesmí shodit aplikaci — přehrání jen tiše selže (zachyceno promise/catch),
 * případně se místo něj syntetizuje krátký fallback tón (viz playFallbackSynth).
 * Musí se inicializovat až po první interakci uživatele (autoplay policy prohlížečů).
 */
class AudioManager {
  private elements = new Map<AudioEventId, HTMLAudioElement>();
  private muted = false;
  private initialized = false;
  private synthCtx: AudioContext | null = null;

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
    const config = AUDIO_CONFIG[id];
    const audio = this.elements.get(id);
    if (!audio) return;

    try {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Soubor chybí nebo přehrání selhalo — zahraj syntetizovaný fallback, pokud existuje.
        if (config.fallbackSynth) this.playFallbackSynth(config.fallbackSynth);
      });
    } catch {
      if (config.fallbackSynth) this.playFallbackSynth(config.fallbackSynth);
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

  // Krátká náhradní sekvence tónů přes Web Audio API — žádná externí knihovna,
  // jen dokud nejsou hotové skutečné audio soubory (viz audioConfig.ts#FallbackSynthConfig).
  private playFallbackSynth(synth: FallbackSynthConfig): void {
    if (this.muted || typeof window === "undefined") return;

    try {
      const AudioCtxClass =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!this.synthCtx) this.synthCtx = new AudioCtxClass();
      const ctx = this.synthCtx;

      let t = ctx.currentTime + 0.01;
      for (const note of synth.notes) {
        const dur = note.durationMs / 1000;
        const attack = Math.min(0.01, dur / 4);
        // Drž vrchol hlasitosti přes většinu délky noty (sustain), ne jen
        // okamžitý attack->decay — bez toho zní i "hlasitý" tón v praxi tiše,
        // protože exponenciální rampa dolů ukusuje skoro celou notu hned od začátku.
        const holdEnd = t + dur * 0.7;
        const end = t + dur;

        const osc = ctx.createOscillator();
        osc.type = synth.waveform ?? "sine";
        osc.frequency.setValueAtTime(note.frequency, t);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(synth.volume, t + attack);
        gain.gain.setValueAtTime(synth.volume, holdEnd);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(end + 0.02);

        t += dur + (note.gapMs ?? 0) / 1000;
      }
    } catch {
      // I syntéza je jen nice-to-have — pokud selže (např. AudioContext limit), ignoruj.
    }
  }
}

// Jedna sdílená instance pro celou aplikaci.
export const audioManager = new AudioManager();
