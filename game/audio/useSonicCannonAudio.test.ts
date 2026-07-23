import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIO_EVENTS } from "./audioEvents";
import { AUDIO_CONFIG } from "./audioConfig";
import {
  pickRandomSonicCannonStart,
  SONIC_CANNON_END_SAFETY_MARGIN_SEC,
  SONIC_CANNON_FADE_IN_MS,
  SONIC_CANNON_FADE_OUT_MS,
} from "./useSonicCannonAudio";

// Vitest tu běží v node prostředí (žádné jsdom/testing-library v projektu,
// viz ostatní testy) — nejde tedy vyrenderovat useSonicCannonAudio() jako
// skutečný React hook. Místo toho (stejná konvence jako
// game/audio/useHeartbeatStress.ts, která taky nemá vlastní hook-level test
// — testuje se extrahovaná čistá logika) testujeme:
//   1) pickRandomSonicCannonStart jako čistou funkci přímo,
//   2) AudioManager (game/audio/audioManager.ts) — skutečnou třídu, kterou
//      hook interně volá — přes falešný `Audio`/`window` global, přesně na
//      AUDIO_EVENTS.sonicCannonVoice, tj. na "sonic_cannon.wav" eventu.
// Tohle pokrývá přesně tu novou logiku (fade-in/fade-out/seek/onEnded/
// onceLoadedMetadata), kterou tenhle úkol přidal do AudioManageru.

class FakeAudioElement {
  static instances: FakeAudioElement[] = [];

  src: string;
  volume = 1;
  loop = false;
  preload = "";
  currentTime = 0;
  duration = NaN;
  paused = true;
  playCallCount = 0;
  pauseCallCount = 0;
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  constructor(src: string) {
    this.src = src;
    FakeAudioElement.instances.push(this);
  }

  play(): Promise<void> {
    this.playCallCount++;
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.pauseCallCount++;
    this.paused = true;
  }

  addEventListener(type: string, cb: (...args: unknown[]) => void, options?: { once?: boolean }): void {
    if (options?.once) {
      const wrapped = (...args: unknown[]) => {
        this.removeEventListener(type, wrapped);
        cb(...args);
      };
      this.addEventListener(type, wrapped);
      return;
    }
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }

  removeEventListener(type: string, cb: (...args: unknown[]) => void): void {
    this.listeners.get(type)?.delete(cb);
  }

  /** Testovací pomůcka — zavolá všechny zaregistrované listenery daného typu. */
  emit(type: string): void {
    for (const cb of this.listeners.get(type) ?? []) cb();
  }

  static reset(): void {
    FakeAudioElement.instances = [];
  }

  static bySrc(src: string): FakeAudioElement {
    const found = FakeAudioElement.instances.find((instance) => instance.src === src);
    if (!found) throw new Error(`No FakeAudioElement created for src "${src}"`);
    return found;
  }
}

let audioManager: typeof import("./audioManager").audioManager;

async function tickRaf(frames = 1): Promise<void> {
  // requestAnimationFrame je stubovaný na setTimeout(cb, 16) níže (viz
  // beforeEach) — fake timers z vitestu ho posunou dopředu synchronně.
  for (let i = 0; i < frames; i++) {
    await vi.advanceTimersByTimeAsync(16);
  }
}

describe("useSonicCannonAudio / AudioManager sonic cannon integration", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    FakeAudioElement.reset();
    vi.stubGlobal("window", {});
    vi.stubGlobal("Audio", FakeAudioElement);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16));

    ({ audioManager } = await import("./audioManager"));
    audioManager.init();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function sonicAudio(): FakeAudioElement {
    return FakeAudioElement.bySrc(AUDIO_CONFIG[AUDIO_EVENTS.sonicCannonVoice].src);
  }

  it("1. activating the cannon calls play() via startLoopWithFadeIn", () => {
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    expect(sonicAudio().playCallCount).toBe(1);
    expect(sonicAudio().paused).toBe(false);
  });

  it("2. playback starts at volume 0 and ramps up to the configured target (fade-in)", async () => {
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    expect(sonicAudio().volume).toBe(0);

    await tickRaf(Math.ceil(SONIC_CANNON_FADE_IN_MS / 16) + 2);
    expect(sonicAudio().volume).toBeCloseTo(AUDIO_CONFIG[AUDIO_EVENTS.sonicCannonVoice].volume, 5);
  });

  it("3/4. deactivating starts a fade-out and pause() is called once it completes", async () => {
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    await tickRaf(Math.ceil(SONIC_CANNON_FADE_IN_MS / 16) + 2);

    audioManager.fadeOutLoop(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_OUT_MS);
    // Mid-fade: volume has started dropping but pause() not called yet.
    await tickRaf(2);
    expect(sonicAudio().volume).toBeGreaterThan(0);
    expect(sonicAudio().pauseCallCount).toBe(0);

    await tickRaf(Math.ceil(SONIC_CANNON_FADE_OUT_MS / 16) + 2);
    expect(sonicAudio().pauseCallCount).toBe(1);
    // Po dokončení fade-outu AudioManager obnoví hlasitost na výchozí z
    // configu (pro příští startLoop/startLoopWithFadeIn) — nezůstává na 0,
    // audio je ale prokazatelně zastavené (pauseCallCount výše).
    expect(sonicAudio().volume).toBe(AUDIO_CONFIG[AUDIO_EVENTS.sonicCannonVoice].volume);
  });

  it("5. audio does not keep playing after the cannon is deactivated (fade-out completes to paused)", async () => {
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    await tickRaf(Math.ceil(SONIC_CANNON_FADE_IN_MS / 16) + 2);
    audioManager.fadeOutLoop(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_OUT_MS);
    await tickRaf(Math.ceil(SONIC_CANNON_FADE_OUT_MS / 16) + 2);
    expect(sonicAudio().paused).toBe(true);
  });

  it("6. re-activation never creates a second audio instance for the same event", () => {
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    audioManager.fadeOutLoop(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_OUT_MS);
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    const matching = FakeAudioElement.instances.filter(
      (instance) => instance.src === AUDIO_CONFIG[AUDIO_EVENTS.sonicCannonVoice].src,
    );
    expect(matching).toHaveLength(1);
  });

  it("7/8. picks a valid random start that always keeps the end-safety margin", () => {
    for (let i = 0; i < 50; i++) {
      const start = pickRandomSonicCannonStart(120);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(start).toBeLessThanOrEqual(120 - SONIC_CANNON_END_SAFETY_MARGIN_SEC);
    }
  });

  it("8b. falls back to 0 when the track is shorter than the safety margin", () => {
    expect(pickRandomSonicCannonStart(5)).toBe(0);
    expect(pickRandomSonicCannonStart(SONIC_CANNON_END_SAFETY_MARGIN_SEC)).toBe(0);
  });

  it("9. reaching the end of the track while active seeks to a new random position and keeps playing the same instance", () => {
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    const audio = sonicAudio();
    audio.duration = 120;
    audio.currentTime = 118;

    const unsubscribe = audioManager.onEnded(AUDIO_EVENTS.sonicCannonVoice, () => {
      const start = pickRandomSonicCannonStart(audio.duration);
      audioManager.seekTo(AUDIO_EVENTS.sonicCannonVoice, start);
      audioManager.startLoop(AUDIO_EVENTS.sonicCannonVoice);
    });

    audio.emit("ended");
    unsubscribe();

    expect(audio.currentTime).toBeLessThanOrEqual(120 - SONIC_CANNON_END_SAFETY_MARGIN_SEC);
    expect(audio.playCallCount).toBe(2); // initial start + restart after "ended"
    const matching = FakeAudioElement.instances.filter(
      (instance) => instance.src === AUDIO_CONFIG[AUDIO_EVENTS.sonicCannonVoice].src,
    );
    expect(matching).toHaveLength(1); // still the same single instance
  });

  it("10. stopLoop (cleanup — death/restart/menu/unmount) always stops the sound immediately", () => {
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    audioManager.stopLoop(AUDIO_EVENTS.sonicCannonVoice);
    expect(sonicAudio().paused).toBe(true);
  });

  it("11a. a fast re-activation during fade-out cancels the fade-out and fades back in instead of being stopped by the stale fade-out", async () => {
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    await tickRaf(Math.ceil(SONIC_CANNON_FADE_IN_MS / 16) + 2);

    audioManager.fadeOutLoop(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_OUT_MS);
    await tickRaf(1); // fade-out in progress, not finished

    // Fast re-activation — must supersede the in-flight fade-out.
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    await tickRaf(Math.ceil(SONIC_CANNON_FADE_IN_MS / 16) + 2);

    // The stale fade-out's eventual pause() must never fire after this point.
    expect(sonicAudio().paused).toBe(false);
    expect(sonicAudio().volume).toBeCloseTo(AUDIO_CONFIG[AUDIO_EVENTS.sonicCannonVoice].volume, 5);
  });

  it("11b. a fast deactivation during fade-in immediately reverses direction into a fade-out", async () => {
    audioManager.startLoopWithFadeIn(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_IN_MS);
    await tickRaf(1); // fade-in in progress, volume > 0 but not yet at target
    const midFadeInVolume = sonicAudio().volume;
    expect(midFadeInVolume).toBeGreaterThan(0);

    audioManager.fadeOutLoop(AUDIO_EVENTS.sonicCannonVoice, SONIC_CANNON_FADE_OUT_MS);
    // One tick into the fade-out: volume must already be moving DOWN from
    // where the fade-in left it, not continuing to climb toward the fade-in
    // target — this is the actual "direction reversed immediately" check.
    await tickRaf(1);
    expect(sonicAudio().volume).toBeLessThan(midFadeInVolume);

    await tickRaf(Math.ceil(SONIC_CANNON_FADE_OUT_MS / 16) + 2);
    expect(sonicAudio().paused).toBe(true);
    // AudioManager obnoví hlasitost na výchozí z configu po dokončeném
    // fade-outu (viz komentář v testu 3/4 výše) — důležité je, že se do
    // pauznutého stavu dostalo přes fade-out, ne že by zůstalo hrát na
    // fade-in cílové hlasitosti.
    expect(sonicAudio().volume).toBe(AUDIO_CONFIG[AUDIO_EVENTS.sonicCannonVoice].volume);
  });
});
