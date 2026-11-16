import { SATPIN_ITEMS, type SatpinLetter } from '../data/phonics';
import { engine } from './engine';

/* ================================================================== */
/*  Pure phoneme synthesiser                                           */
/*  Speech engines tend to read "s" as "ess" or "t" as "tee". Phonics   */
/*  needs the pure sound, so Munchy's voice is built from a glottal    */
/*  source + formant filters (vowels/nasals) and shaped noise          */
/*  (fricatives/plosives). Recorded /audio/{letter}.mp3 files, when    */
/*  present, always win.                                               */
/* ================================================================== */

let glottalWave: PeriodicWave | null = null;

function getGlottal(ctx: AudioContext): PeriodicWave {
  if (!glottalWave) {
    const n = 64;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      // ~ -12 dB/oct spectral tilt, close to a relaxed human voice
      imag[i] = 1 / Math.pow(i, 1.25);
    }
    glottalWave = ctx.createPeriodicWave(real, imag);
  }
  return glottalWave;
}

type Formant = [freq: number, bandwidth: number, gainDb: number];

interface VoicedSpec {
  f0: number;
  dur: number;
  formants: Formant[];
  gain: number;
  lowpass?: number;
  breath?: number;
}

function voiced(ctx: AudioContext, t: number, s: VoicedSpec, dest: AudioNode): number {
  const src = ctx.createOscillator();
  src.setPeriodicWave(getGlottal(ctx));
  // Friendly sing-song contour: slight rise then a gentle fall
  src.frequency.setValueAtTime(s.f0 * 0.96, t);
  src.frequency.linearRampToValueAtTime(s.f0 * 1.04, t + s.dur * 0.25);
  src.frequency.linearRampToValueAtTime(s.f0 * 0.9, t + s.dur);

  const vib = ctx.createOscillator();
  const vibG = ctx.createGain();
  vib.frequency.value = 5.4;
  vibG.gain.setValueAtTime(0, t);
  vibG.gain.linearRampToValueAtTime(s.f0 * 0.018, t + s.dur * 0.6);
  vib.connect(vibG).connect(src.frequency);

  const sum = ctx.createGain();
  for (const [freq, bw, db] of s.formants) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = freq / bw;
    const g = ctx.createGain();
    g.gain.value = Math.pow(10, db / 20);
    src.connect(bp).connect(g).connect(sum);
  }

  // A touch of breath noise for realism
  if (s.breath) {
    const n = ctx.createBufferSource();
    n.buffer = engine.noise();
    n.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = s.formants[1]?.[0] ?? 1500;
    bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.value = s.breath;
    n.connect(bp).connect(g).connect(sum);
    n.start(t, Math.random());
    n.stop(t + s.dur + 0.2);
  }

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = s.lowpass ?? 5200;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(s.gain, t + 0.045);
  env.gain.setValueAtTime(s.gain, t + s.dur - 0.1);
  env.gain.exponentialRampToValueAtTime(0.0001, t + s.dur);

  sum.connect(lp).connect(env).connect(dest);
  src.start(t);
  vib.start(t);
  src.stop(t + s.dur + 0.05);
  vib.stop(t + s.dur + 0.05);
  return s.dur;
}

interface NoiseSpec {
  dur: number;
  gain: number;
  attack: number;
  release: number;
  filters: { type: BiquadFilterType; freq: number; q?: number; gain?: number }[];
}

function shapedNoise(ctx: AudioContext, t: number, s: NoiseSpec, dest: AudioNode): number {
  const n = ctx.createBufferSource();
  n.buffer = engine.noise();
  n.loop = true;
  let node: AudioNode = n;
  for (const f of s.filters) {
    const bq = ctx.createBiquadFilter();
    bq.type = f.type;
    bq.frequency.value = f.freq;
    if (f.q !== undefined) bq.Q.value = f.q;
    if (f.gain !== undefined) bq.gain.value = f.gain;
    node = node.connect(bq);
  }
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(s.gain, t + s.attack);
  const holdEnd = Math.max(t + s.attack, t + s.dur - s.release);
  env.gain.setValueAtTime(s.gain, holdEnd);
  env.gain.exponentialRampToValueAtTime(0.0001, t + s.dur);
  node.connect(env).connect(dest);
  n.start(t, Math.random());
  n.stop(t + s.dur + 0.05);
  return s.dur;
}

/** A crisp unvoiced plosive: tiny closure, sharp burst, breathy release. */
function plosive(ctx: AudioContext, t: number, kind: 't' | 'p', dest: AudioNode): number {
  if (kind === 't') {
    shapedNoise(ctx, t, {
      dur: 0.035,
      gain: 1.1,
      attack: 0.002,
      release: 0.03,
      filters: [{ type: 'bandpass', freq: 4200, q: 0.9 }],
    }, dest);
    shapedNoise(ctx, t + 0.012, {
      dur: 0.11,
      gain: 0.4,
      attack: 0.005,
      release: 0.09,
      filters: [
        { type: 'highpass', freq: 2200, q: 0.7 },
        { type: 'peaking', freq: 4500, q: 1, gain: 6 },
      ],
    }, dest);
    return 0.13;
  }
  // p: low, puffy lip burst
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.03);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.44, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.06);
  shapedNoise(ctx, t, {
    dur: 0.03,
    gain: 1.15,
    attack: 0.002,
    release: 0.025,
    filters: [{ type: 'lowpass', freq: 1500, q: 0.8 }],
  }, dest);
  shapedNoise(ctx, t + 0.01, {
    dur: 0.13,
    gain: 0.53,
    attack: 0.006,
    release: 0.1,
    filters: [{ type: 'bandpass', freq: 1100, q: 0.6 }],
  }, dest);
  return 0.14;
}

/** Schedules the pure phoneme and returns its duration in seconds. */
function synthPhoneme(ctx: AudioContext, letter: SatpinLetter, t: number, dest: AudioNode): number {
  switch (letter) {
    case 's':
      // /s/ — long, bright hiss
      return shapedNoise(ctx, t, {
        dur: 0.85,
        gain: 0.25,
        attack: 0.09,
        release: 0.16,
        filters: [
          { type: 'highpass', freq: 3800, q: 0.7 },
          { type: 'peaking', freq: 6400, q: 1.4, gain: 9 },
          { type: 'lowpass', freq: 11000, q: 0.5 },
        ],
      }, dest);
    case 'a':
      // /æ/ as in apple (child-like formants)
      return voiced(ctx, t, {
        f0: 245,
        dur: 0.55,
        gain: 2.45,
        breath: 0.05,
        formants: [
          [1000, 110, 0],
          [1950, 140, -4],
          [2950, 220, -13],
          [4100, 300, -22],
        ],
      }, dest);
    case 'i':
      // /ɪ/ as in igloo
      return voiced(ctx, t, {
        f0: 255,
        dur: 0.45,
        gain: 1.35,
        breath: 0.04,
        formants: [
          [470, 80, 0],
          [2250, 140, -7],
          [3150, 220, -12],
          [4100, 300, -20],
        ],
      }, dest);
    case 'n':
      // /n/ — humming nasal murmur
      return voiced(ctx, t, {
        f0: 215,
        dur: 0.8,
        gain: 0.75,
        lowpass: 1600,
        formants: [
          [260, 60, 0],
          [480, 120, -14],
          [2150, 200, -24],
        ],
      }, dest);
    case 't': {
      // Two crisp taps: "t . t"
      plosive(ctx, t, 't', dest);
      plosive(ctx, t + 0.42, 't', dest);
      return 0.58;
    }
    case 'p': {
      plosive(ctx, t, 'p', dest);
      plosive(ctx, t + 0.42, 'p', dest);
      return 0.58;
    }
  }
}

/* ================================================================== */
/*  Recorded-file override                                             */
/* ================================================================== */

const missing = new Set<string>();
const buffers = new Map<string, AudioBuffer>();

async function loadRecording(ctx: AudioContext, letter: SatpinLetter): Promise<AudioBuffer | null> {
  const url = `/audio/${letter}.mp3`;
  if (missing.has(url)) return null;
  const cached = buffers.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url);
    const type = res.headers.get('content-type') || '';
    if (!res.ok || type.includes('text/html')) throw new Error('missing');
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    buffers.set(url, buf);
    return buf;
  } catch {
    missing.add(url);
    return null;
  }
}

/** Kick off background loads so the first play has no delay. */
export function preloadRecordings(): void {
  const ctx = engine.ensure();
  if (!ctx) return;
  (Object.keys(SATPIN_ITEMS) as SatpinLetter[]).forEach((l) => void loadRecording(ctx, l));
}

/* ================================================================== */
/*  Narrator (device speech voice) for words & praise                  */
/* ================================================================== */

let narratorVoice: SpeechSynthesisVoice | null = null;
let narratorSpeaking = false;

function scoreVoice(v: SpeechSynthesisVoice): number {
  let s = 0;
  if (/^en[-_]/i.test(v.lang) || v.lang === 'en') s += 10;
  if (/en[-_](US|GB|AU)/i.test(v.lang)) s += 3;
  if (/natural|neural|online/i.test(v.name)) s += 12;
  if (/google/i.test(v.name)) s += 6;
  if (/aria|jenny|ava|emma|libby|sonia|samantha|serena|karen|zira|female/i.test(v.name)) s += 4;
  if (/novelty|whisper|bad news|bells|boing|bubbles|cellos|organ|zarvox|trinoids|albert|jester|superstar|wobble/i.test(v.name)) s -= 50;
  if (v.localService) s += 1;
  return s;
}

function pickVoice(): void {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  narratorVoice = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function isNarratorSpeaking(): boolean {
  return narratorSpeaking;
}

/** Speak a short line with the friendliest available device voice. */
export function say(text: string, opts: { rate?: number; pitch?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!engine.settings.narrator || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      if (!narratorVoice) pickVoice();
      const u = new SpeechSynthesisUtterance(text);
      if (narratorVoice) {
        u.voice = narratorVoice;
        u.lang = narratorVoice.lang;
      }
      u.rate = opts.rate ?? 0.92;
      u.pitch = opts.pitch ?? 1.15;
      u.volume = 1;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        narratorSpeaking = false;
        engine.duck(false);
        resolve();
      };
      u.onstart = () => {
        narratorSpeaking = true;
      };
      u.onend = finish;
      u.onerror = finish;
      engine.duck(true);
      narratorSpeaking = true;
      synth.speak(u);
      setTimeout(finish, 600 + text.length * 120);
    } catch {
      resolve();
    }
  });
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  narratorSpeaking = false;
}

/* ================================================================== */
/*  Public API                                                         */
/* ================================================================== */

let activeSource: AudioBufferSourceNode | null = null;

/** Plays the pure letter sound. Resolves when finished. */
export async function playPhoneme(letter: SatpinLetter): Promise<void> {
  const ctx = engine.ensure();
  if (!ctx) return;
  stopSpeech();
  if (activeSource) {
    try {
      activeSource.stop();
    } catch {
      /* already stopped */
    }
    activeSource = null;
  }
  engine.duck(true);
  const rec = await loadRecording(ctx, letter);
  let dur: number;
  if (rec) {
    const src = ctx.createBufferSource();
    src.buffer = rec;
    src.connect(engine.voice);
    src.start();
    activeSource = src;
    dur = rec.duration;
  } else {
    dur = synthPhoneme(ctx, letter, ctx.currentTime + 0.02, engine.voice);
  }
  await new Promise((r) => setTimeout(r, dur * 1000 + 80));
  engine.duck(false);
}

/** Renders a phoneme offline – used to sanity-check levels in development. */
export async function renderPhonemeOffline(letter: SatpinLetter): Promise<{ peak: number; rms: number; dur: number }> {
  const sr = 44100;
  const off = new OfflineAudioContext(1, sr * 1.2, sr);
  // Borrow a noise buffer for the offline context
  const len = sr * 2;
  const nb = off.createBuffer(1, len, sr);
  const d = nb.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const realNoise = engine.noise;
  engine.noise = () => nb;
  glottalWave = null;
  const dur = synthPhoneme(off as unknown as AudioContext, letter, 0.01, off.destination);
  engine.noise = realNoise;
  glottalWave = null;
  const buf = await off.startRendering();
  const data = buf.getChannelData(0);
  let peak = 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > peak) peak = a;
    if (a > 0.001) {
      sum += a * a;
      n++;
    }
  }
  return { peak, rms: Math.sqrt(sum / Math.max(1, n)), dur };
}
