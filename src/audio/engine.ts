/**
 * Central Web Audio graph.
 *
 *   sfx ───────┐
 *   voice ─────┼──► master ──► glue compressor ──► limiter ──► speakers
 *   music ─duck┘        ▲
 *   reverb send ─► convolver (procedural plate) ┘
 */

export interface AudioSettings {
  music: boolean;
  sfx: boolean;
  narrator: boolean;
}

const SETTINGS_KEY = 'munchy_audio_settings_v1';
const MUSIC_LEVEL = 0.3;
const SFX_LEVEL = 0.9;
const VOICE_LEVEL = 1.0;

function loadSettings(): AudioSettings {
  const fallback: AudioSettings = { music: true, sfx: true, narrator: true };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      music: p.music ?? true,
      sfx: p.sfx ?? true,
      narrator: p.narrator ?? true,
    };
  } catch {
    return fallback;
  }
}

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfx!: GainNode;
  voice!: GainNode;
  music!: GainNode;
  musicDuck!: GainNode;
  reverbIn!: GainNode;
  private analyser!: AnalyserNode;
  private analyserData!: Float32Array<ArrayBuffer>;
  private noiseBuf: AudioBuffer | null = null;
  settings: AudioSettings = loadSettings();
  private listeners = new Set<(s: AudioSettings) => void>();
  private duckDepth = 0;

  /** Lazily builds the audio graph. Safe to call often. */
  ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.build(ctx);
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend().catch(() => {});
        else this.ctx.resume().catch(() => {});
      });
    }
    if (this.ctx.state === 'suspended' && !document.hidden) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private build(ctx: AudioContext): void {
    // Glue compressor + brickwall-ish limiter keep everything punchy but safe for little ears.
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18;
    glue.knee.value = 12;
    glue.ratio.value = 3;
    glue.attack.value = 0.006;
    glue.release.value = 0.22;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;

    this.master = ctx.createGain();
    this.master.gain.value = 0.92;
    this.master.connect(glue).connect(limiter).connect(ctx.destination);

    // Procedural plate reverb
    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeImpulse(ctx, 2.4, 2.6);
    const reverbHp = ctx.createBiquadFilter();
    reverbHp.type = 'highpass';
    reverbHp.frequency.value = 220;
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.42;
    this.reverbIn = ctx.createGain();
    this.reverbIn.connect(reverbHp).connect(convolver).connect(reverbReturn).connect(this.master);

    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);

    this.voice = ctx.createGain();
    this.voice.connect(this.master);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyserData = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));
    this.voice.connect(this.analyser);
    const voiceVerb = ctx.createGain();
    voiceVerb.gain.value = 0.12;
    this.voice.connect(voiceVerb).connect(this.reverbIn);

    this.musicDuck = ctx.createGain();
    this.music = ctx.createGain();
    this.music.connect(this.musicDuck).connect(this.master);

    this.applySettings(true);
  }

  private makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Gentle pre-delay + exponential tail, lightly low-passed so it sounds warm.
        const env = i < rate * 0.012 ? 0 : Math.pow(1 - t, decay);
        const white = Math.random() * 2 - 1;
        lp += (white - lp) * (0.55 - t * 0.4);
        data[i] = lp * env;
      }
    }
    return buf;
  }

  noise(): AudioBuffer {
    const ctx = this.ctx!;
    if (!this.noiseBuf) {
      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuf;
  }

  /** Connects a node into the reverb with the given send amount. */
  send(node: AudioNode, amount: number): void {
    if (!this.ctx || amount <= 0) return;
    const g = this.ctx.createGain();
    g.gain.value = amount;
    node.connect(g).connect(this.reverbIn);
  }

  /** Smoothly lowers the music while speech plays. */
  duck(on: boolean): void {
    if (!this.ctx) return;
    this.duckDepth = Math.max(0, this.duckDepth + (on ? 1 : -1));
    const target = this.duckDepth > 0 ? 0.28 : 1;
    const t = this.ctx.currentTime;
    this.musicDuck.gain.cancelScheduledValues(t);
    this.musicDuck.gain.setTargetAtTime(target, t, on ? 0.06 : 0.35);
  }

  /** 0..1 loudness of whatever Munchy is saying right now (used for lip-sync). */
  voiceLevel(): number {
    if (!this.ctx || !this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.analyserData);
    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i++) sum += this.analyserData[i] ** 2;
    const rms = Math.sqrt(sum / this.analyserData.length);
    return Math.min(1, rms * 6);
  }

  setSetting<K extends keyof AudioSettings>(key: K, value: AudioSettings[K]): void {
    this.settings = { ...this.settings, [key]: value };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
    this.applySettings(false);
    if (key === 'narrator' && !value && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.listeners.forEach((fn) => fn(this.settings));
  }

  onSettingsChange(fn: (s: AudioSettings) => void): void {
    this.listeners.add(fn);
  }

  private applySettings(immediate: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const set = (p: AudioParam, v: number) => {
      if (immediate) p.value = v;
      else p.setTargetAtTime(v, t, 0.12);
    };
    set(this.music.gain, this.settings.music ? MUSIC_LEVEL : 0);
    set(this.sfx.gain, this.settings.sfx ? SFX_LEVEL : 0);
    set(this.voice.gain, VOICE_LEVEL);
  }
}

export const engine = new AudioEngine();

export function unlockAudio(): void {
  engine.ensure();
}

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}
