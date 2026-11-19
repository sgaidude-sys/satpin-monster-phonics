import { engine, midiToHz } from './engine';

/**
 * A gentle, looping kids' tune built entirely in Web Audio:
 * kalimba melody, warm plucked bass, soft offbeat chords, shaker & a cushion kick.
 * 16 bars: an 8-bar melodic A section and an 8-bar sparkly B section.
 */

const BPM = 100;
const STEP = 60 / BPM / 2; // eighth notes
const STEPS_PER_BAR = 8;
const LOOKAHEAD = 0.15;

// Chord roots + tones (midi) per bar
type Chord = { root: number; tones: number[] };
const C: Chord = { root: 48, tones: [60, 64, 67] };
const Am: Chord = { root: 45, tones: [57, 60, 64] };
const F: Chord = { root: 41, tones: [57, 60, 65] };
const G: Chord = { root: 43, tones: [59, 62, 67] };
const Em: Chord = { root: 40, tones: [59, 64, 67] };
const Dm: Chord = { root: 50, tones: [57, 62, 65] };

const PROGRESSION: Chord[] = [C, Am, F, G, C, Am, F, G, F, G, Em, Am, Dm, G, C, C];

// [bar, step, midi, lengthInSteps]
const MELODY_A: [number, number, number, number][] = [
  [0, 0, 76, 2], [0, 2, 79, 2], [0, 4, 81, 1], [0, 5, 79, 1], [0, 6, 76, 2],
  [1, 0, 72, 2], [1, 2, 76, 2], [1, 4, 74, 2], [1, 6, 72, 2],
  [2, 0, 69, 2], [2, 2, 72, 2], [2, 4, 81, 2], [2, 6, 79, 2],
  [3, 0, 74, 3], [3, 3, 79, 1], [3, 4, 74, 2], [3, 6, 71, 2],
  [4, 0, 76, 2], [4, 2, 79, 2], [4, 4, 84, 2], [4, 6, 81, 1], [4, 7, 79, 1],
  [5, 0, 81, 2], [5, 2, 76, 2], [5, 4, 72, 2], [5, 6, 76, 2],
  [6, 0, 77, 2], [6, 2, 76, 2], [6, 4, 74, 2], [6, 6, 72, 2],
  [7, 0, 74, 2], [7, 2, 71, 2], [7, 4, 74, 4],
];

const MELODY_B: [number, number, number, number][] = [
  [8, 0, 81, 3], [8, 4, 77, 2], [8, 6, 76, 2],
  [9, 0, 74, 3], [9, 4, 79, 4],
  [10, 0, 79, 2], [10, 2, 76, 2], [10, 4, 71, 2], [10, 6, 76, 2],
  [11, 0, 72, 6], [11, 6, 76, 2],
  [12, 0, 77, 2], [12, 2, 74, 2], [12, 4, 81, 2], [12, 6, 77, 2],
  [13, 0, 79, 3], [13, 4, 83, 2], [13, 6, 86, 2],
  [14, 0, 84, 4], [14, 4, 79, 2], [14, 6, 76, 2],
  [15, 0, 72, 6],
];

const MELODY = [...MELODY_A, ...MELODY_B];
const TOTAL_STEPS = PROGRESSION.length * STEPS_PER_BAR;

let timer: number | null = null;
let nextTime = 0;
let step = 0;
let musicOut: GainNode | null = null;
let musicIntensity = 1; // 0 = map/calm, 1 = normal play, 2 = streak/celebration sparkle
let musicWorld = 0;

// Subtle semitone shift per world so each biome has its own harmonic colour
const WORLD_TRANSPOSE = [0, 2, -2, -5];

export function setMusicIntensity(level: 0 | 1 | 2): void {
  musicIntensity = level;
}

export function setMusicWorld(worldIndex: number): void {
  musicWorld = Math.max(0, Math.min(WORLD_TRANSPOSE.length - 1, worldIndex));
}

function kalimba(midi: number, t: number, len: number, gain: number, pan: number): void {
  const ctx = engine.ctx!;
  const f = midiToHz(midi);
  const dur = Math.max(0.35, len * STEP * 1.6);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  p.connect(musicOut!);
  engine.send(p, 0.35);
  const partials: [number, number, number][] = [
    [1, 1, dur],
    [2.01, 0.28, dur * 0.4],
    [5.4, 0.08, 0.08],
  ];
  for (const [ratio, amp, d] of partials) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f * ratio;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain * amp, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(p);
    o.start(t);
    o.stop(t + d + 0.05);
  }
}

function bass(midi: number, t: number, gain: number): void {
  const ctx = engine.ctx!;
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = midiToHz(midi);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(900, t);
  f.frequency.exponentialRampToValueAtTime(260, t + 0.3);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 1.8);
  o.connect(f).connect(g).connect(musicOut!);
  o.start(t);
  o.stop(t + STEP * 2);
}

function chordStab(tones: number[], t: number, gain: number): void {
  const ctx = engine.ctx!;
  tones.forEach((m, i) => {
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = midiToHz(m);
    f.type = 'lowpass';
    f.frequency.value = 1600;
    const s = t + i * 0.012; // tiny strum
    g.gain.setValueAtTime(0.0001, s);
    g.gain.linearRampToValueAtTime(gain, s + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, s + STEP * 1.1);
    const node = o.connect(f).connect(g);
    node.connect(musicOut!);
    engine.send(node, 0.2);
    o.start(s);
    o.stop(s + STEP * 1.2);
  });
}

function shaker(t: number, gain: number): void {
  const ctx = engine.ctx!;
  const src = ctx.createBufferSource();
  src.buffer = engine.noise();
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  src.connect(f).connect(g).connect(musicOut!);
  src.start(t, Math.random());
  src.stop(t + 0.08);
}

function kick(t: number, gain: number): void {
  const ctx = engine.ctx!;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(musicOut!);
  o.start(t);
  o.stop(t + 0.25);
}

function scheduleStep(s: number, t: number): void {
  const bar = Math.floor(s / STEPS_PER_BAR);
  const inBar = s % STEPS_PER_BAR;
  const chord = PROGRESSION[bar];
  const bSection = bar >= 8;
  const shift = WORLD_TRANSPOSE[musicWorld] ?? 0;

  // Rhythm section (softer on map / richer during gameplay & streaks)
  const rhythmScale = musicIntensity === 0 ? 0.65 : 1;
  if (inBar === 0 || inBar === 4) kick(t, 0.32 * rhythmScale);
  if (inBar % 2 === 1) shaker(t, 0.05 * rhythmScale);
  if (inBar === 2 || inBar === 6) shaker(t, 0.025 * rhythmScale);

  if (inBar === 0) bass(chord.root + shift, t, 0.32);
  if (inBar === 4) bass(chord.root + shift + 7, t, 0.24);
  if (inBar === 6 && bar % 2 === 1) bass(chord.root + shift + 12, t, 0.18);

  if (inBar === 2 || inBar === 6) {
    chordStab(
      chord.tones.map((n) => n + shift),
      t,
      0.035
    );
  }

  // Twinkly arpeggio in B section, Starry Hills, or high-intensity streak/celebration
  if ((bSection || musicWorld === 3 || musicIntensity >= 2) && inBar % 2 === 0) {
    const tone = chord.tones[(inBar / 2) % 3] + shift + 24;
    const g = musicIntensity >= 2 ? 0.042 : 0.026;
    kalimba(tone, t, 1, g, 0.5);
  }

  for (const [b, st, midi, len] of MELODY) {
    if (b === bar && st === inBar) {
      kalimba(midi + shift, t, len, 0.11, -0.12);
    }
  }
}

function tick(): void {
  const ctx = engine.ctx;
  if (!ctx) return;
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    // Slight swing makes it bouncy
    const swing = step % 2 === 1 ? STEP * 0.12 : 0;
    scheduleStep(step, nextTime + swing);
    nextTime += STEP;
    step = (step + 1) % TOTAL_STEPS;
  }
}

export function startMusic(): void {
  const ctx = engine.ensure();
  if (!ctx || timer !== null) return;
  musicOut = ctx.createGain();
  musicOut.gain.setValueAtTime(0.0001, ctx.currentTime);
  musicOut.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
  musicOut.connect(engine.music);
  nextTime = ctx.currentTime + 0.1;
  step = 0;
  timer = window.setInterval(tick, 30);
  tick();
}

export function stopMusic(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  const ctx = engine.ctx;
  if (ctx && musicOut) {
    const g = musicOut;
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
    setTimeout(() => g.disconnect(), 1500);
    musicOut = null;
  }
}
