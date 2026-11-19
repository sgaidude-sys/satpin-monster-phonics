import { engine, midiToHz } from './engine';

/**
 * Dynamic, world-reactive procedural ambient soundscape routed to `engine.ambience`:
 *   World 0 (Sunny Meadow): Gentle sunlit breeze + distant cheerful songbird chirps
 *   World 1 (Candy Forest): Soft ethereal breeze + occasional crystalline windchimes
 *   World 2 (Ocean Shore):  Soothing slow-breathing ocean waves + airy sea breeze
 *   World 3 (Starry Hills): Warm night air + distant twinkling star-harp & cozy crickets
 */

let running = false;
let currentWorld = 0;
let bedGain: GainNode | null = null;
let bedFilter: BiquadFilterNode | null = null;
let bedSource: AudioBufferSourceNode | null = null;
let lfoOsc: OscillatorNode | null = null;
let lfoDepth: GainNode | null = null;
let detailTimer: number | undefined;

interface WorldBedSpec {
  filterType: BiquadFilterType;
  freq: number;
  q: number;
  lfoHz: number;
  lfoRange: number;
  gain: number;
}

const BED_SPECS: WorldBedSpec[] = [
  { filterType: 'bandpass', freq: 520, q: 0.7, lfoHz: 0.14, lfoRange: 180, gain: 0.16 }, // Meadow breeze
  { filterType: 'bandpass', freq: 780, q: 1.0, lfoHz: 0.2, lfoRange: 240, gain: 0.13 },  // Candy shimmer air
  { filterType: 'lowpass', freq: 380, q: 0.8, lfoHz: 0.11, lfoRange: 210, gain: 0.28 },  // Ocean surf swells
  { filterType: 'bandpass', freq: 440, q: 0.9, lfoHz: 0.09, lfoRange: 120, gain: 0.12 }, // Starry night air
];

export function startAmbience(): void {
  const ctx = engine.ensure();
  if (!ctx || running) return;
  running = true;

  const src = ctx.createBufferSource();
  src.buffer = engine.noise();
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const out = ctx.createGain();

  const spec = BED_SPECS[currentWorld];
  filter.type = spec.filterType;
  filter.frequency.value = spec.freq;
  filter.Q.value = spec.q;

  lfo.type = 'sine';
  lfo.frequency.value = spec.lfoHz;
  lfoGain.gain.value = spec.lfoRange;
  lfo.connect(lfoGain).connect(filter.frequency);

  out.gain.setValueAtTime(0.0001, ctx.currentTime);
  out.gain.linearRampToValueAtTime(spec.gain, ctx.currentTime + 2.2);

  src.connect(filter).connect(out).connect(engine.ambience);
  engine.send(out, 0.22);

  src.start();
  lfo.start();

  bedSource = src;
  bedFilter = filter;
  lfoOsc = lfo;
  lfoDepth = lfoGain;
  bedGain = out;

  scheduleNextDetail();
}

export function setAmbienceWorld(worldIndex: number): void {
  const next = Math.max(0, Math.min(BED_SPECS.length - 1, worldIndex));
  if (next === currentWorld) return;
  currentWorld = next;

  const ctx = engine.ctx;
  if (!ctx || !running || !bedFilter || !lfoOsc || !lfoDepth || !bedGain) return;

  const spec = BED_SPECS[currentWorld];
  const t = ctx.currentTime;
  bedFilter.type = spec.filterType;
  bedFilter.frequency.setTargetAtTime(spec.freq, t, 0.6);
  bedFilter.Q.setTargetAtTime(spec.q, t, 0.6);
  lfoOsc.frequency.setTargetAtTime(spec.lfoHz, t, 0.6);
  lfoDepth.gain.setTargetAtTime(spec.lfoRange, t, 0.6);
  bedGain.gain.setTargetAtTime(spec.gain, t, 0.6);
}

export function stopAmbience(): void {
  running = false;
  clearTimeout(detailTimer);
  const ctx = engine.ctx;
  if (ctx && bedGain) {
    const g = bedGain;
    const s = bedSource;
    const l = lfoOsc;
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
    setTimeout(() => {
      try {
        s?.stop();
        l?.stop();
      } catch {
        /* ignore */
      }
      g.disconnect();
    }, 900);
  }
  bedGain = null;
  bedFilter = null;
  bedSource = null;
  lfoOsc = null;
  lfoDepth = null;
}

function scheduleNextDetail(): void {
  clearTimeout(detailTimer);
  if (!running) return;
  const delay = 2600 + Math.random() * 4200;
  detailTimer = window.setTimeout(() => {
    if (!running) return;
    if (!document.hidden && engine.settings.ambience) {
      playWorldDetail(currentWorld);
    }
    scheduleNextDetail();
  }, delay);
}

function playWorldDetail(world: number): void {
  const ctx = engine.ctx;
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + 0.02;
  const pan = (Math.random() - 0.5) * 1.4;

  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  const dest: AudioNode = panner ? panner : engine.ambience;
  if (panner) {
    panner.pan.value = pan;
    panner.connect(engine.ambience);
    engine.send(panner, 0.45);
  }

  if (world === 0) {
    // Cheerful distant meadow songbird (2-3 gentle melodic chirps)
    const base = 1850 + Math.random() * 650;
    const notes = Math.random() < 0.5 ? [1, 1.26, 1.12] : [1.18, 1.42];
    notes.forEach((mult, i) => {
      const s = t + i * 0.11;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base * mult * 0.92, s);
      o.frequency.exponentialRampToValueAtTime(base * mult * 1.14, s + 0.045);
      o.frequency.exponentialRampToValueAtTime(base * mult * 0.98, s + 0.09);
      g.gain.setValueAtTime(0.0001, s);
      g.gain.linearRampToValueAtTime(0.055, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.095);
      o.connect(g).connect(dest);
      o.start(s);
      o.stop(s + 0.11);
    });
  } else if (world === 1) {
    // Dreamy crystalline windchime notes
    const scale = [84, 88, 91, 95, 96, 100];
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const s = t + i * (0.12 + Math.random() * 0.12);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = midiToHz(scale[Math.floor(Math.random() * scale.length)]);
      g.gain.setValueAtTime(0.0001, s);
      g.gain.linearRampToValueAtTime(0.045, s + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 1.2);
      o.connect(g).connect(dest);
      o.start(s);
      o.stop(s + 1.25);
    }
  } else if (world === 2) {
    // Gentle distant sea gull / foaming wave crest
    const src = ctx.createBufferSource();
    src.buffer = engine.noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(1400, t + 0.9);
    bp.frequency.exponentialRampToValueAtTime(320, t + 2.2);
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
    src.connect(bp).connect(g).connect(dest);
    src.start(t, Math.random());
    src.stop(t + 2.4);
  } else {
    // Starry Hills: gentle twinkling harp harmonic + soft distant night chirp
    const scale = [76, 79, 83, 86, 88, 91];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = midiToHz(scale[Math.floor(Math.random() * scale.length)]);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 1.65);
  }
}
