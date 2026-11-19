import { engine, midiToHz, panFromScreenX } from './engine';

/** Subtle ±pct pitch randomization (default ±10%) to eliminate robotic repetition. */
const jitterPitch = (pct = 0.1) => 1 + (Math.random() * 2 - 1) * pct;
/** Subtle ±pct gain variation (default ±8%) for organic dynamics. */
const jitterGain = (pct = 0.08) => 1 + (Math.random() * 2 - 1) * pct;

/* ------------------------------------------------------------------ */
/*  Low-level voices                                                   */
/* ------------------------------------------------------------------ */

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  freqEnd?: number;
  glide?: number;
  t?: number;
  attack?: number;
  dur: number;
  gain: number;
  reverb?: number;
  pan?: number;
  panEnd?: number;
  filter?: number;
  dest?: AudioNode;
}

function out(
  dest: AudioNode | undefined,
  node: AudioNode,
  pan = 0,
  panEnd?: number,
  t = 0,
  dur = 0.3
): void {
  const ctx = engine.ctx!;
  const target = dest ?? engine.sfx;
  if ((pan !== 0 || (panEnd !== undefined && panEnd !== pan)) && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    const start = t || ctx.currentTime;
    const clampedStart = Math.max(-1, Math.min(1, pan));
    p.pan.setValueAtTime(clampedStart, start);
    if (panEnd !== undefined && panEnd !== pan) {
      p.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, panEnd)), start + Math.max(0.05, dur));
    }
    node.connect(p).connect(target);
  } else {
    node.connect(target);
  }
}

function tone(o: ToneOpts): void {
  const ctx = engine.ctx;
  if (!ctx) return;
  const t = o.t ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t + (o.glide ?? o.dur));
  const a = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  let node: AudioNode = osc.connect(g);
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.filter;
    node = node.connect(f);
  }
  out(o.dest, node, o.pan, o.panEnd, t, o.dur);
  if (o.reverb) engine.send(node, o.reverb);
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

interface NoiseOpts {
  t?: number;
  dur: number;
  gain: number;
  type?: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
  attack?: number;
  reverb?: number;
  pan?: number;
  panEnd?: number;
  dest?: AudioNode;
}

function noise(o: NoiseOpts): void {
  const ctx = engine.ctx;
  if (!ctx) return;
  const t = o.t ?? ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = engine.noise();
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq, t);
  if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  const a = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  const node = src.connect(f).connect(g);
  out(o.dest, node, o.pan, o.panEnd, t, o.dur);
  if (o.reverb) engine.send(node, o.reverb);
  src.start(t, Math.random() * 1.5);
  src.stop(t + o.dur + 0.05);
}

/** FM bell / glockenspiel. */
export function bell(freq: number, t: number, gain: number, dur = 1.2, reverb = 0.35, pan = 0, dest?: AudioNode): void {
  const ctx = engine.ctx;
  if (!ctx) return;
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const g = ctx.createGain();
  car.frequency.value = freq;
  mod.frequency.value = freq * 3.5;
  modGain.gain.setValueAtTime(freq * 2.2, t);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur * 0.6);
  mod.connect(modGain).connect(car.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const node = car.connect(g);
  out(dest, node, pan);
  engine.send(node, reverb);
  car.start(t);
  mod.start(t);
  car.stop(t + dur + 0.05);
  mod.stop(t + dur + 0.05);
}

/** Warm wooden marimba / kalimba pluck. */
export function marimba(freq: number, t: number, gain: number, dur = 0.5, reverb = 0.2, pan = 0, dest?: AudioNode): void {
  tone({ freq, t, dur, gain, reverb, pan, dest, attack: 0.002 });
  tone({ freq: freq * 4, t, dur: dur * 0.18, gain: gain * 0.35, pan, dest, attack: 0.001 });
  tone({ freq: freq * 10, t, dur: 0.02, gain: gain * 0.12, pan, dest, attack: 0.0005 });
}

/* ------------------------------------------------------------------ */
/*  Game sound effects                                                 */
/* ------------------------------------------------------------------ */

const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];

function ready(): AudioContext | null {
  const ctx = engine.ensure();
  return ctx;
}

/** Soft bubbly UI tap with subtle pitch & volume randomization. */
export function sfxTap(pitch = 1, screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = pitch * jitterPitch(0.09);
  const g = jitterGain(0.08);
  const pan = panFromScreenX(screenX);
  tone({ freq: 420 * p, freqEnd: 880 * p, glide: 0.06, t, dur: 0.11, gain: 0.22 * g, attack: 0.003, pan });
  noise({ t, dur: 0.03, gain: 0.05 * g, freq: 3000 * p, q: 2, pan });
}

/** Little pitched pluck when hovering a card (spatialized & subtly micro-detuned). */
export function sfxHover(index: number, screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const freq = midiToHz(PENTA[2 + index * 2]) * jitterPitch(0.03);
  const pan = screenX !== undefined ? panFromScreenX(screenX) : (index - 1) * 0.35 + 0.18;
  marimba(freq, ctx.currentTime, 0.12 * jitterGain(0.08), 0.35, 0.16, pan);
}

/** Card is lifted with a finger. */
export function sfxPickup(index = 1, screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.09);
  const g = jitterGain(0.08);
  const pan = screenX !== undefined ? panFromScreenX(screenX) : (index - 1) * 0.35 + 0.15;
  tone({ freq: 300 * p, freqEnd: 760 * p, glide: 0.09, t, dur: 0.14, gain: 0.2 * g, pan });
  tone({ freq: 900 * p, freqEnd: 1500 * p, glide: 0.07, t: t + 0.04, dur: 0.1, gain: 0.07 * g, pan });
}

/** Card dropped back to its slot. */
export function sfxDrop(screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.1);
  const g = jitterGain(0.08);
  const pan = panFromScreenX(screenX);
  tone({ freq: 520 * p, freqEnd: 260 * p, glide: 0.08, t, dur: 0.12, gain: 0.16 * g, pan });
  noise({ t, dur: 0.05, gain: 0.05 * g, freq: 1200 * p, q: 1.4, pan });
}

/** Card dealt onto the table. */
export function sfxDeal(index: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.08);
  const pan = (index - 1) * 0.42 + 0.15;
  noise({ t, dur: 0.09, gain: 0.12 * jitterGain(0.08), freq: 2400 * p, freqEnd: 900 * p, q: 1.2, pan });
  marimba(midiToHz([67, 72, 76][index % 3]) * jitterPitch(0.025), t + 0.02, 0.09, 0.3, 0.15, pan);
}

/** Airy stereo-panning whoosh for flying cards & transitions. */
export function sfxWhoosh(dur = 0.4, fromX?: number, toX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.1);
  const pan = fromX !== undefined ? panFromScreenX(fromX) : 0.35;
  const panEnd = toX !== undefined ? panFromScreenX(toX) : -0.35;
  noise({
    t,
    dur,
    gain: 0.22 * jitterGain(0.08),
    freq: 500 * p,
    freqEnd: 2800 * p,
    q: 1.8,
    attack: dur * 0.6,
    reverb: 0.16,
    pan,
    panEnd,
  });
}

/** Three crunchy spatialized chomps and a satisfying gulp (randomized per bite). */
export function sfxMunch(screenX?: number): number {
  const ctx = ready();
  if (!ctx) return 0;
  const t = ctx.currentTime;
  const pan = screenX !== undefined ? panFromScreenX(screenX) : -0.35;
  for (let i = 0; i < 3; i++) {
    const s = t + i * 0.17;
    const p = jitterPitch(0.11);
    const g = jitterGain(0.08);
    tone({ freq: (170 - i * 12) * p, freqEnd: 60 * p, glide: 0.07, t: s, dur: 0.1, gain: 0.45 * g, attack: 0.002, pan });
    noise({ t: s, dur: 0.09, gain: 0.32 * g, freq: 1300 + Math.random() * 750, q: 0.9, attack: 0.002, pan });
    noise({ t: s + 0.012, dur: 0.05, gain: 0.12 * g, type: 'highpass', freq: 4500 * p, q: 0.7, pan });
  }
  const gp = jitterPitch(0.08);
  const g = t + 0.56;
  tone({ freq: 340 * gp, freqEnd: 110 * gp, glide: 0.16, t: g, dur: 0.22, gain: 0.3, attack: 0.01, filter: 1200, pan });
  tone({ freq: 680 * gp, freqEnd: 220 * gp, glide: 0.14, t: g, dur: 0.12, gain: 0.08, pan });
  return 0.78;
}

/** Sparkly correct-answer chime. Climbs higher with each streak. */
export function sfxCorrect(streak = 0): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const lift = Math.min(streak, 5) * 2;
  const notes = [72, 76, 79, 84].map((n) => n + lift);
  notes.forEach((n, i) => bell(midiToHz(n), t + i * 0.07, 0.16, 1.3, 0.4, (i - 1.5) * 0.3));
  marimba(midiToHz(48 + lift), t, 0.22, 0.6, 0.1);
  sfxSparkle(t + 0.3, 0.6);
}

/** Twinkling glockenspiel cascade. */
export function sfxSparkle(at?: number, amount = 1): void {
  const ctx = ready();
  if (!ctx) return;
  const t = at ?? ctx.currentTime;
  const count = Math.round(7 * amount);
  for (let i = 0; i < count; i++) {
    const n = PENTA[4 + Math.floor(Math.random() * 6)] + 12;
    bell(midiToHz(n), t + i * 0.045 + Math.random() * 0.02, 0.045, 0.6, 0.5, Math.random() * 1.6 - 0.8);
  }
}

/** Friendly cartoon "bwoing" + raspberry for a wrong answer — silly, never scary. */
export function sfxWrong(screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.1);
  const gScale = jitterGain(0.08);
  const pan = screenX !== undefined ? panFromScreenX(screenX) : -0.3;
  // Spring boing (vibrato sine)
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(190 * p, t);
  osc.frequency.exponentialRampToValueAtTime(420 * p, t + 0.12);
  osc.frequency.exponentialRampToValueAtTime(240 * p, t + 0.55);
  lfo.frequency.setValueAtTime(16, t);
  lfo.frequency.linearRampToValueAtTime(7, t + 0.55);
  lfoG.gain.setValueAtTime(40, t);
  lfoG.gain.exponentialRampToValueAtTime(8, t + 0.55);
  lfo.connect(lfoG).connect(osc.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.26 * gScale, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  const node = osc.connect(g);
  out(engine.sfx, node, pan, pan * 0.5, t, 0.6);
  engine.send(node, 0.15);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + 0.65);
  lfo.stop(t + 0.65);
  // Two soft descending "uh-oh" plucks
  marimba(midiToHz(67) * jitterPitch(0.04), t + 0.05, 0.14 * gScale, 0.35, 0.1, pan);
  marimba(midiToHz(64) * jitterPitch(0.04), t + 0.2, 0.14 * gScale, 0.45, 0.1, pan);
}

/** "Ptooey!" spatialized spit-out sweeping from Munchy toward the card slot. */
export function sfxSpit(fromX?: number, toX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.11);
  const g = jitterGain(0.08);
  const pan = fromX !== undefined ? panFromScreenX(fromX) : -0.35;
  const panEnd = toX !== undefined ? panFromScreenX(toX) : 0.35;
  noise({ t, dur: 0.16, gain: 0.3 * g, freq: 900 * p, freqEnd: 2400 * p, q: 2.2, attack: 0.01, pan, panEnd });
  tone({ freq: 520 * p, freqEnd: 180 * p, glide: 0.18, t: t + 0.02, dur: 0.22, gain: 0.18 * g, type: 'triangle', filter: 2000, pan, panEnd });
}

/** Star lands in the progress meter. */
export function sfxStar(slot: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const base = [76, 79, 81, 84, 88][Math.min(slot, 4)];
  bell(midiToHz(base), t, 0.2, 1.4, 0.45);
  bell(midiToHz(base + 7), t + 0.06, 0.1, 1.1, 0.5);
  noise({ t, dur: 0.5, gain: 0.04, type: 'highpass', freq: 7000, q: 0.5, reverb: 0.3 });
}

/** Rising swoosh as a star flies to the meter (pans dynamically across stereo field). */
export function sfxStarFly(fromX?: number, toX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.06);
  const pan = panFromScreenX(fromX);
  const panEnd = panFromScreenX(toX);
  tone({ freq: 600 * p, freqEnd: 1800 * p, glide: 0.45, t, dur: 0.5, gain: 0.05, type: 'triangle', reverb: 0.3, pan, panEnd });
  noise({ t, dur: 0.45, gain: 0.08, freq: 3000 * p, freqEnd: 8000 * p, q: 3, attack: 0.3, reverb: 0.2, pan, panEnd });
}

/** Munchy giggles when poked (pitch & volume randomized). */
export function sfxGiggle(screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const base = (520 + Math.random() * 140) * jitterPitch(0.08);
  const pan = screenX !== undefined ? panFromScreenX(screenX) : -0.3;
  for (let i = 0; i < 4; i++) {
    const s = t + i * (0.085 + Math.random() * 0.012);
    const f = base * (1 - i * 0.06);
    tone({ freq: f * 1.25, freqEnd: f, glide: 0.06, t: s, dur: 0.08, gain: 0.14 * jitterGain(0.08), type: 'triangle', filter: 2600, pan });
  }
}

/** Snare roll into a cymbal crash — the sticker reveal. */
export function sfxDrumroll(seconds = 1.1): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const hits = Math.floor(seconds / 0.045);
  for (let i = 0; i < hits; i++) {
    const p = i / hits;
    noise({ t: t + i * 0.045, dur: 0.06, gain: 0.04 + p * 0.14, freq: 2200, q: 0.6, type: 'bandpass' });
  }
  tone({ freq: 90, freqEnd: 60, t, dur: seconds, gain: 0.08, attack: seconds * 0.9 });
}

export function sfxCrash(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  noise({ t, dur: 1.8, gain: 0.28, type: 'highpass', freq: 5000, q: 0.4, reverb: 0.4 });
  noise({ t, dur: 0.6, gain: 0.2, freq: 3000, q: 0.5 });
  tone({ freq: 110, freqEnd: 45, glide: 0.3, t, dur: 0.5, gain: 0.5 });
}

/** Big brassy celebration fanfare. */
export function sfxFanfare(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const brass = (midi: number, s: number, d: number, gain: number) => {
    for (const det of [-7, 0, 7]) {
      const osc = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = midiToHz(midi);
      osc.detune.value = det;
      f.type = 'lowpass';
      f.Q.value = 2;
      f.frequency.setValueAtTime(400, t + s);
      f.frequency.exponentialRampToValueAtTime(3200, t + s + 0.06);
      f.frequency.exponentialRampToValueAtTime(1400, t + s + d);
      g.gain.setValueAtTime(0.0001, t + s);
      g.gain.linearRampToValueAtTime(gain, t + s + 0.03);
      g.gain.setValueAtTime(gain * 0.8, t + s + d * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + s + d);
      const node = osc.connect(f).connect(g);
      node.connect(engine.sfx);
      engine.send(node, 0.3);
      osc.start(t + s);
      osc.stop(t + s + d + 0.05);
    }
  };
  // da-da-da DAAA, da-DAAAA!
  const line: [number, number, number][] = [
    [67, 0, 0.14],
    [72, 0.15, 0.14],
    [76, 0.3, 0.14],
    [79, 0.45, 0.42],
    [76, 0.9, 0.14],
    [79, 1.05, 0.9],
  ];
  line.forEach(([m, s, d]) => brass(m, s, d, 0.05));
  // Chord pad under the last note
  [60, 64, 67].forEach((m) => brass(m, 1.05, 0.9, 0.025));
  // Timpani
  [0, 0.45, 1.05].forEach((s, i) =>
    tone({ freq: [98, 98, 131][i], freqEnd: [80, 80, 100][i], glide: 0.3, t: t + s, dur: 0.6, gain: 0.35, reverb: 0.2 })
  );
  // Glitter on top
  sfxSparkle(t + 1.05, 1.4);
  noise({ t: t + 1.05, dur: 1.6, gain: 0.1, type: 'highpass', freq: 6000, q: 0.4, reverb: 0.4 });
}

/** Soft swish for panels opening/closing. */
export function sfxPanel(open: boolean): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  noise({
    t,
    dur: 0.28,
    gain: 0.12,
    freq: open ? 600 : 2600,
    freqEnd: open ? 2600 : 600,
    q: 1.4,
    attack: 0.12,
    reverb: 0.15,
  });
  marimba(midiToHz(open ? 79 : 72), t + 0.08, 0.08, 0.3, 0.2);
}

/** Toggle switch blip. */
export function sfxToggle(on: boolean): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  marimba(midiToHz(on ? 76 : 69), t, 0.14, 0.25, 0.1);
  marimba(midiToHz(on ? 83 : 64), t + 0.06, 0.12, 0.3, 0.1);
}

/** Big welcome jingle on Play. */
export function sfxStart(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => marimba(midiToHz(m), t + i * 0.055, 0.15, 0.6, 0.25, (i - 3) * 0.2));
  bell(midiToHz(88), t + 0.4, 0.12, 1.5, 0.5);
  sfxSparkle(t + 0.42, 0.8);
}

/* ------------------------------------------------------------------ */
/*  Adventure expansion                                                */
/* ------------------------------------------------------------------ */

/** A big silly burp. Four-year-olds' favourite sound. */
export function sfxBurp(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 0.7;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(105, t);
  osc.frequency.linearRampToValueAtTime(128, t + 0.12);
  osc.frequency.exponentialRampToValueAtTime(68, t + dur);
  // Rough, gurgly amplitude modulation
  const am = ctx.createOscillator();
  const amGain = ctx.createGain();
  am.type = 'square';
  am.frequency.setValueAtTime(34, t);
  am.frequency.linearRampToValueAtTime(22, t + dur);
  amGain.gain.value = 0.5;
  const vca = ctx.createGain();
  vca.gain.value = 0.5;
  am.connect(amGain).connect(vca.gain);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(350, t + dur);
  lp.Q.value = 4;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(0.6, t + 0.04);
  env.gain.setValueAtTime(0.55, t + dur * 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(vca).connect(lp).connect(env).connect(engine.sfx);
  osc.start(t);
  am.start(t);
  osc.stop(t + dur + 0.05);
  am.stop(t + dur + 0.05);
  noise({ t, dur: dur * 0.9, gain: 0.08, freq: 500, q: 1.5, attack: 0.03 });
}

/** Bubble pop — pitch climbs with each pop + subtle organic variation & stereo pan. */
export function sfxBubblePop(pitch = 1, screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = pitch * jitterPitch(0.08);
  const g = jitterGain(0.08);
  const pan = panFromScreenX(screenX);
  tone({ freq: 500 * p, freqEnd: 1500 * p, glide: 0.04, t, dur: 0.08, gain: 0.3 * g, attack: 0.001, pan });
  noise({ t, dur: 0.03, gain: 0.12 * g, type: 'highpass', freq: 3000 * p, q: 0.7, pan });
  bell(midiToHz(84 + Math.round((pitch - 1) * 12)), t + 0.03, 0.06 * g, 0.5, 0.35, pan);
}

/** Rubbery "boop" when tapping a wrong bubble or egg (randomized ±10%). */
export function sfxBonk(screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.11);
  const pan = panFromScreenX(screenX);
  tone({ freq: 340 * p, freqEnd: 190 * p, glide: 0.18, t, dur: 0.22, gain: 0.22 * jitterGain(0.08), type: 'triangle', filter: 1400, pan });
}

/** Eggshell crack — bigger with each stage & spatialized. */
export function sfxCrack(stage: number, screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.09);
  const pan = panFromScreenX(screenX);
  const n = 2 + stage;
  for (let i = 0; i < n; i++) {
    noise({ t: t + i * 0.025, dur: 0.035, gain: (0.25 + stage * 0.05) * jitterGain(0.08), freq: (3200 + Math.random() * 2000) * p, q: 2.5, attack: 0.001, pan });
  }
  tone({ freq: (260 + stage * 40) * p, freqEnd: 120 * p, glide: 0.06, t, dur: 0.08, gain: 0.25, pan });
}

/** Hatching: pop + happy rising arpeggio. */
export function sfxHatch(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  noise({ t, dur: 0.12, gain: 0.35, freq: 2500, q: 1, attack: 0.002 });
  tone({ freq: 300, freqEnd: 900, glide: 0.12, t, dur: 0.18, gain: 0.25 });
  [72, 76, 79, 84, 88].forEach((m, i) => marimba(midiToHz(m), t + 0.08 + i * 0.06, 0.14, 0.5, 0.3));
  sfxSparkle(t + 0.3, 0.7);
}

/** Wooden treasure chest rattle. */
export function sfxChestShake(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 4; i++) {
    noise({ t: t + i * 0.06, dur: 0.05, gain: 0.25, freq: 700 + Math.random() * 400, q: 3, attack: 0.002 });
    tone({ freq: 140, freqEnd: 90, t: t + i * 0.06, dur: 0.06, gain: 0.18 });
  }
  bell(midiToHz(91), t + 0.1, 0.05, 0.4, 0.4);
}

/** Chest bursts open. */
export function sfxChestOpen(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  noise({ t, dur: 0.6, gain: 0.25, freq: 400, freqEnd: 5000, q: 1.2, attack: 0.4, reverb: 0.3 });
  tone({ freq: 110, freqEnd: 50, glide: 0.3, t: t + 0.4, dur: 0.4, gain: 0.45 });
  [60, 64, 67, 72].forEach((m) => bell(midiToHz(m + 12), t + 0.42, 0.1, 1.8, 0.5));
  sfxSparkle(t + 0.45, 1.6);
}

/** One star awarded on the results screen. */
export function sfxStarAward(i: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const n = [76, 79, 84][Math.min(2, i)];
  bell(midiToHz(n), t, 0.22, 1.4, 0.45);
  bell(midiToHz(n + 12), t + 0.05, 0.08, 1, 0.5);
  tone({ freq: 90, freqEnd: 50, t, dur: 0.25, gain: 0.3 });
}

/** Little hop on the map (with subtle pitch variation). */
export function sfxHop(i = 0, screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.09);
  const pan = panFromScreenX(screenX);
  tone({ freq: (300 + i * 40) * p, freqEnd: (700 + i * 60) * p, glide: 0.1, t, dur: 0.14, gain: 0.16 * jitterGain(0.08), pan });
  tone({ freq: 160 * p, freqEnd: 70 * p, t: t + 0.22, dur: 0.07, gain: 0.2 * jitterGain(0.08), pan });
}

/** Soft cushioned thump when Munchy lands from a jump. */
export function sfxLand(impact = 0.6, screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.11);
  const g = Math.min(1, Math.max(0.2, impact)) * jitterGain(0.08);
  const pan = screenX !== undefined ? panFromScreenX(screenX) : -0.35;
  tone({ freq: 125 * p, freqEnd: 52 * p, glide: 0.065, t, dur: 0.09, gain: 0.16 * g, attack: 0.002, pan });
  noise({ t, dur: 0.045, gain: 0.045 * g, type: 'lowpass', freq: 650 * p, q: 0.8, pan });
}

/** A new level node unlocks on the map. */
export function sfxUnlock(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  [67, 71, 74, 79, 83, 86].forEach((m, i) => bell(midiToHz(m), t + i * 0.05, 0.08, 0.9, 0.5, (i - 2.5) * 0.25));
}

/** "Ta-da!" when Munchy puts on a hat. */
export function sfxWear(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  marimba(midiToHz(72), t, 0.18, 0.3, 0.2);
  marimba(midiToHz(79), t + 0.12, 0.18, 0.6, 0.25);
  bell(midiToHz(91), t + 0.12, 0.08, 1, 0.5);
  sfxSparkle(t + 0.15, 0.6);
}

/** Spin whoosh when Munchy twirls. */
export function sfxSpin(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  noise({ t, dur: 0.5, gain: 0.18, freq: 600, freqEnd: 3000, q: 4, attack: 0.2 });
  tone({ freq: 400, freqEnd: 1200, glide: 0.45, t, dur: 0.5, gain: 0.08, type: 'triangle' });
}

/** Rubber squish when Munchy is squeezed (randomized ±10%). */
export function sfxSquish(screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.1);
  const pan = screenX !== undefined ? panFromScreenX(screenX) : -0.3;
  tone({ freq: 180 * p, freqEnd: 520 * p, glide: 0.18, t, dur: 0.25, gain: 0.22 * jitterGain(0.08), type: 'triangle', filter: 1600, pan });
  noise({ t, dur: 0.15, gain: 0.08, freq: 900 * p, q: 3, pan });
}

/** Tiny chomp when a bubble letter reaches Munchy (randomized ±10%). */
export function sfxNom(screenX?: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const p = jitterPitch(0.11);
  const pan = screenX !== undefined ? panFromScreenX(screenX) : -0.35;
  tone({ freq: 170 * p, freqEnd: 70 * p, glide: 0.06, t, dur: 0.09, gain: 0.35 * jitterGain(0.08), pan });
  noise({ t, dur: 0.07, gain: 0.2 * jitterGain(0.08), freq: 1500 * p, q: 1, pan });
}
