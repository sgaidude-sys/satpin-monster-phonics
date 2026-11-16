import { engine, midiToHz } from './engine';

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
  filter?: number;
  dest?: AudioNode;
}

function out(dest: AudioNode | undefined, node: AudioNode, pan = 0): void {
  const ctx = engine.ctx!;
  const target = dest ?? engine.sfx;
  if (pan !== 0 && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
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
  out(o.dest, node, o.pan);
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
  out(o.dest, node, o.pan);
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

/** Soft bubbly UI tap. */
export function sfxTap(pitch = 1): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone({ freq: 420 * pitch, freqEnd: 880 * pitch, glide: 0.06, t, dur: 0.11, gain: 0.22, attack: 0.003 });
  noise({ t, dur: 0.03, gain: 0.05, freq: 3000 * pitch, q: 2 });
}

/** Little pitched pluck when hovering a card. */
export function sfxHover(index: number): void {
  const ctx = ready();
  if (!ctx) return;
  marimba(midiToHz(PENTA[2 + index * 2]), ctx.currentTime, 0.12, 0.35, 0.15, (index - 1) * 0.4);
}

/** Card is lifted with a finger. */
export function sfxPickup(index = 1): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone({ freq: 300, freqEnd: 760, glide: 0.09, t, dur: 0.14, gain: 0.2, pan: (index - 1) * 0.4 });
  tone({ freq: 900, freqEnd: 1500, glide: 0.07, t: t + 0.04, dur: 0.1, gain: 0.07 });
}

/** Card dropped back to its slot. */
export function sfxDrop(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone({ freq: 520, freqEnd: 260, glide: 0.08, t, dur: 0.12, gain: 0.16 });
  noise({ t, dur: 0.05, gain: 0.05, freq: 1200, q: 1.4 });
}

/** Card dealt onto the table. */
export function sfxDeal(index: number): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  noise({ t, dur: 0.09, gain: 0.12, freq: 2400, freqEnd: 900, q: 1.2, pan: (index - 1) * 0.5 });
  marimba(midiToHz([67, 72, 76][index % 3]), t + 0.02, 0.09, 0.3, 0.15, (index - 1) * 0.5);
}

/** Airy whoosh for flying cards. */
export function sfxWhoosh(dur = 0.4): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  noise({ t, dur, gain: 0.22, freq: 500, freqEnd: 2800, q: 1.8, attack: dur * 0.6, reverb: 0.15 });
}

/** Three crunchy chomps and a satisfying gulp. */
export function sfxMunch(): number {
  const ctx = ready();
  if (!ctx) return 0;
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const s = t + i * 0.17;
    tone({ freq: 170 - i * 12, freqEnd: 60, glide: 0.07, t: s, dur: 0.1, gain: 0.45, attack: 0.002 });
    noise({ t: s, dur: 0.09, gain: 0.32, freq: 1300 + Math.random() * 700, q: 0.9, attack: 0.002 });
    noise({ t: s + 0.012, dur: 0.05, gain: 0.12, type: 'highpass', freq: 4500, q: 0.7 });
  }
  const g = t + 0.56;
  tone({ freq: 340, freqEnd: 110, glide: 0.16, t: g, dur: 0.22, gain: 0.3, attack: 0.01, filter: 1200 });
  tone({ freq: 680, freqEnd: 220, glide: 0.14, t: g, dur: 0.12, gain: 0.08 });
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
export function sfxWrong(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Spring boing (vibrato sine)
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(190, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);
  osc.frequency.exponentialRampToValueAtTime(240, t + 0.55);
  lfo.frequency.setValueAtTime(16, t);
  lfo.frequency.linearRampToValueAtTime(7, t + 0.55);
  lfoG.gain.setValueAtTime(40, t);
  lfoG.gain.exponentialRampToValueAtTime(8, t + 0.55);
  lfo.connect(lfoG).connect(osc.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.26, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  const node = osc.connect(g);
  node.connect(engine.sfx);
  engine.send(node, 0.15);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + 0.65);
  lfo.stop(t + 0.65);
  // Two soft descending "uh-oh" plucks
  marimba(midiToHz(67), t + 0.05, 0.14, 0.35, 0.1);
  marimba(midiToHz(64), t + 0.2, 0.14, 0.45, 0.1);
}

/** "Ptooey!" spit-out. */
export function sfxSpit(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  noise({ t, dur: 0.16, gain: 0.3, freq: 900, freqEnd: 2400, q: 2.2, attack: 0.01 });
  tone({ freq: 520, freqEnd: 180, glide: 0.18, t: t + 0.02, dur: 0.22, gain: 0.18, type: 'triangle', filter: 2000 });
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

/** Rising swoosh as a star flies to the meter. */
export function sfxStarFly(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone({ freq: 600, freqEnd: 1800, glide: 0.45, t, dur: 0.5, gain: 0.05, type: 'triangle', reverb: 0.3 });
  noise({ t, dur: 0.45, gain: 0.08, freq: 3000, freqEnd: 8000, q: 3, attack: 0.3, reverb: 0.2 });
}

/** Munchy giggles when poked. */
export function sfxGiggle(): void {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const base = 520 + Math.random() * 120;
  for (let i = 0; i < 4; i++) {
    const s = t + i * 0.09;
    const f = base * (1 - i * 0.06);
    tone({ freq: f * 1.25, freqEnd: f, glide: 0.06, t: s, dur: 0.08, gain: 0.14, type: 'triangle', filter: 2600 });
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
