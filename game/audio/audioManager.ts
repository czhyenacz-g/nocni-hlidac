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
  /**
   * Když `startLoop` selže (chybějící/nenačtený soubor pro `loop: true`
   * event, viz emergencyRunSiren), opakovaně přehrává `fallbackSynth` v
   * intervalu podle délky jeho notové sekvence — jediný způsob, jak má i
   * loop zvuk fallback, ne jen jednorázový `play()`. `stopLoop`/`setMuted`
   * ho musí zrušit, jinak by syntetizovaná siréna hrála donekonečna.
   */
  private loopFallbackTimers = new Map<AudioEventId, ReturnType<typeof setInterval>>();
  /**
   * Které loopy jsou "chtěné" právě teď (naposledy startLoop, ne stopLoop) —
   * bez tohohle by setMuted(false) neměl jak poznat, které pauznuté <audio>
   * elementy má zase pustit. Nic jiného loop sám od sebe znovu nespustí
   * (viz useHeartbeatStress.ts#loopsStartedRef — startLoop volá jen JEDNOU
   * za mount), takže ambient/heartbeat by po odmutování jinak zůstaly navždy
   * potichu, i když `muted` je zase `false`.
   */
  private activeLoops = new Set<AudioEventId>();

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
      // Ztlumení musí zastavit i syntetizované loop fallbacky (viz
      // loopFallbackTimers) — jinak by siréna dál "hrála" (jen tiše, přes
      // playFallbackSynth samotné, které mute respektuje, ale interval by
      // dál běžel a nikdy sám neskončil).
      for (const timer of this.loopFallbackTimers.values()) {
        clearInterval(timer);
      }
      this.loopFallbackTimers.clear();
    } else {
      // Znovu spustí VŠECHNY loopy, které byly aktivní před ztlumením (viz
      // activeLoops) — pause() výše je jen natvrdo zastavil, nic jiného by
      // je samo od sebe znovu nespustilo (ambient loop i heartbeat startují
      // jen jednou za mount, viz app/play/page.tsx / useHeartbeatStress.ts).
      // startLoop() sám řeší i případný fallbackSynth, kdyby reálný soubor
      // znovu selhal.
      for (const id of this.activeLoops) {
        this.startLoop(id);
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

    // Zapamatuje si "tenhle loop má hrát" bez ohledu na aktuální muted stav
    // (viz activeLoops) — setMuted(false) podle tohohle pozná, které loopy
    // má zase pustit, i kdyby k prvnímu startLoop došlo ještě před
    // odmutováním.
    this.activeLoops.add(id);
    if (this.muted) return;

    const config = AUDIO_CONFIG[id];
    try {
      void audio.play().catch(() => {
        // Soubor chybí/nejde přehrát — na rozdíl od `play()` výše se sem
        // dřív fallbackSynth vůbec nedostal (loop zvuk bez souboru byl
        // prostě potichu), proto ho tu nově opakovaně přehrává, dokud
        // nepřijde stopLoop (viz startFallbackSynthLoop).
        if (config.fallbackSynth) this.startFallbackSynthLoop(id, config.fallbackSynth);
      });
    } catch {
      if (config.fallbackSynth) this.startFallbackSynthLoop(id, config.fallbackSynth);
    }
  }

  /** Opakuje `playFallbackSynth` v intervalu podle délky jedné notové sekvence — viz loopFallbackTimers. No-op, pokud už pro tenhle `id` běží. */
  private startFallbackSynthLoop(id: AudioEventId, synth: FallbackSynthConfig): void {
    if (this.loopFallbackTimers.has(id) || this.muted) return;
    const cycleDurationMs = synth.notes.reduce((total, note) => total + note.durationMs + (note.gapMs ?? 0), 0);
    this.playFallbackSynth(synth);
    const timer = setInterval(() => this.playFallbackSynth(synth), Math.max(50, cycleDurationMs));
    this.loopFallbackTimers.set(id, timer);
  }

  /** Průběžná změna hlasitosti běžícího (i zastaveného) loopu — pro plynulé fady, viz useHeartbeatStress.ts. */
  setVolume(id: AudioEventId, volume: number): void {
    const audio = this.elements.get(id);
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume));
  }

  stopLoop(id: AudioEventId): void {
    this.activeLoops.delete(id);
    const audio = this.elements.get(id);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    const timer = this.loopFallbackTimers.get(id);
    if (timer !== undefined) {
      clearInterval(timer);
      this.loopFallbackTimers.delete(id);
    }
  }

  /**
   * Plynule ztlumí běžící loop k tichu přes `durationMs`, pak ho zastaví a
   * vrátí na výchozí hlasitost z configu (pro příští `startLoop`) — na
   * rozdíl od `stopLoop` (okamžité, tvrdé zastavení). Používá se před
   * jumpscare/smrtí, viz app/play/page.tsx a AUDIO_DESIGN.md "Ticho před
   * lekačkou".
   */
  fadeOutLoop(id: AudioEventId, durationMs: number): void {
    const audio = this.elements.get(id);
    if (!audio) return;

    const config = AUDIO_CONFIG[id];
    const startVolume = audio.volume;
    const startedAt = performance.now();

    const step = () => {
      const elapsed = performance.now() - startedAt;
      const t = Math.min(1, elapsed / durationMs);
      audio.volume = startVolume * (1 - t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = config.volume;
        // Stejný důvod jako stopLoop — po dokončeném fade-outu (smrt/
        // blackout) už tenhle loop není "chtěný", ať ho případné pozdější
        // odmutování znovu nenahodí.
        this.activeLoops.delete(id);
      }
    };
    requestAnimationFrame(step);
  }

  stopAll(): void {
    for (const audio of this.elements.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.activeLoops.clear();
    for (const timer of this.loopFallbackTimers.values()) {
      clearInterval(timer);
    }
    this.loopFallbackTimers.clear();
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
