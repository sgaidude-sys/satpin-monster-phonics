/**
 * Munchy — a fully procedural, spring-driven cartoon monster.
 * Sticker-style ink outlines, soft shading, expressive brows, eyes that track
 * fingers & cards, a mouth that lip-syncs to the voice bus, jelly squash &
 * stretch, hops, chewing, gulping and a wobbly hair tuft.
 */

import { drawHat, hatHidesTuft } from './hats';

export type MonsterMood =
  | 'idle'
  | 'burp'
  | 'dance'
  | 'speaking'
  | 'happy'
  | 'yuck'
  | 'confused'
  | 'chewing'
  | 'wave';

class Spring {
  value: number;
  target: number;
  vel = 0;
  constructor(v: number, public k = 220, public d = 14) {
    this.value = v;
    this.target = v;
  }
  step(dt: number): void {
    const n = 3;
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const f = -this.k * (this.value - this.target) - this.d * this.vel;
      this.vel += f * h;
      this.value += this.vel * h;
    }
  }
}

const INK = '#123a4a';
const BODY_LIGHT = '#8ff5e2';
const BODY_MID = '#2fcdb6';
const BODY_DARK = '#13978d';
const BELLY = '#dcfff7';

interface Options {
  idleMood?: MonsterMood;
  sizeFactor?: number;
}

export class MonsterCanvasController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: Options;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private time = 0;
  private last = 0;
  private running = true;

  private mood: MonsterMood;
  private moodTimer = 0;

  private sx = new Spring(1, 260, 9);
  private sy = new Spring(1, 260, 9);
  private lean = new Spring(0, 120, 12);
  private mouthOpen = new Spring(0, 260, 20);
  private smile = new Spring(0.6, 160, 18);
  private mouthW = new Spring(1, 200, 18);
  private browLift = new Spring(0, 180, 16);
  private browTilt = new Spring(0, 180, 16);
  private cheeks = new Spring(0, 200, 14);
  private armL = new Spring(0.5, 140, 10);
  private armR = new Spring(0.5, 140, 10);
  private tuft = new Spring(0, 90, 5);
  private lookX = new Spring(0, 160, 18);
  private lookY = new Spring(0, 160, 18);
  private pupil = new Spring(1, 160, 14);

  private jumpY = 0;
  private jumpV = 0;
  private hopTimer = 4;
  private blink = 0;
  private blinkTimer = 2.5;
  private saccadeTimer = 1;
  private randomLook = { x: 0, y: 0 };
  private pointer = { x: 0, y: 0, at: -10 };
  private hunger = 0;
  private hungerPoint = { x: 0, y: 0 };
  private voiceLevel: () => number = () => 0;
  private narratorActive: () => boolean = () => false;
  private mouthScreen = { x: 0, y: 0 };
  private eyeScreen = { x: 0, y: 0 };
  private unit = 100;
  private hat: string | null = null;
  private spinT = 0;
  private ro: ResizeObserver;
  private onPointer = (e: PointerEvent) => {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.at = this.time;
  };

  constructor(canvas: HTMLCanvasElement, opts: Options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.opts = opts;
    this.mood = opts.idleMood ?? 'idle';
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    window.addEventListener('pointermove', this.onPointer);
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  setVoiceProviders(level: () => number, narrator: () => boolean): void {
    this.voiceLevel = level;
    this.narratorActive = narrator;
  }

  pause(p: boolean): void {
    const was = this.running;
    this.running = !p;
    if (!was && this.running) {
      this.last = performance.now();
      requestAnimationFrame(this.loop);
    }
  }

  /** Stops rendering and releases listeners (for temporary Munchys in menus). */
  destroy(): void {
    this.running = false;
    this.ro.disconnect();
    window.removeEventListener('pointermove', this.onPointer);
  }

  setHat(id: string | null): void {
    if (id !== this.hat) {
      this.hat = id;
      this.kick(-0.2, 0.25);
      this.tuft.vel += 6;
    }
  }

  /** A full twirl. */
  spin(): void {
    this.spinT = 0.7;
    if (this.jumpY === 0) this.jumpV = -2.6;
  }

  getMood(): MonsterMood {
    return this.mood;
  }

  setMood(mood: MonsterMood, durationSec = 0): void {
    const prev = this.mood;
    this.mood = mood;
    this.moodTimer = durationSec;
    switch (mood) {
      case 'happy':
        this.kick(0.35, -0.3);
        if (this.jumpY === 0) this.jumpV = -3.4;
        break;
      case 'yuck':
        this.kick(-0.3, 0.35);
        break;
      case 'speaking':
        if (prev !== 'speaking') this.kick(0.12, -0.1);
        break;
      case 'chewing':
        this.kick(0.25, -0.25);
        break;
      case 'confused':
        this.lean.vel += 1.5;
        break;
      case 'burp':
        this.kick(-0.35, 0.4);
        break;
    }
  }

  /** Card is being dragged nearby: 0 = far, 1 = right at the mouth. */
  setHunger(level: number, clientX = 0, clientY = 0): void {
    this.hunger = Math.max(0, Math.min(1, level));
    this.hungerPoint.x = clientX;
    this.hungerPoint.y = clientY;
  }

  /** Tickle reaction when tapped. */
  poke(): void {
    this.kick(-0.25, 0.25);
    if (this.jumpY === 0) this.jumpV = -2.4;
    this.tuft.vel += 8;
  }

  /** Big swallow stretch at the end of chewing. */
  gulp(): void {
    this.kick(-0.2, 0.3);
  }

  getMouthScreenPosition(): { x: number; y: number } {
    if (this.mouthScreen.x === 0 && this.mouthScreen.y === 0) {
      const r = this.canvas.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height * 0.6 };
    }
    return { ...this.mouthScreen };
  }

  getUnitPx(): number {
    return this.unit;
  }

  private kick(x: number, y: number): void {
    this.sx.vel += x * 12;
    this.sy.vel += y * 12;
  }

  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };

  /* ---------------------------------------------------------------- */
  /*  Simulation                                                       */
  /* ---------------------------------------------------------------- */

  private update(dt: number): void {
    this.time += dt;
    const t = this.time;
    if (this.spinT > 0) this.spinT = Math.max(0, this.spinT - dt);
    const idleMood = this.opts.idleMood ?? 'idle';

    if (this.moodTimer > 0) {
      this.moodTimer -= dt;
      if (this.moodTimer <= 0) this.mood = idleMood;
    }

    // Blink
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2 + Math.random() * 3;
      if (Math.random() < 0.2) this.blinkTimer = 0.25; // double blink
    }
    const sinceBlink = this.blinkTimer;
    this.blink = sinceBlink < 0.12 ? Math.sin((sinceBlink / 0.12) * Math.PI) : 0;

    // Jump physics (units of body size)
    const prevY = this.jumpY;
    if (this.jumpY < 0 || this.jumpV < 0) {
      this.jumpV += 15 * dt;
      this.jumpY += this.jumpV * dt;
      if (this.jumpY >= 0) {
        this.jumpY = 0;
        const impact = Math.min(1, Math.abs(this.jumpV) / 4);
        this.jumpV = 0;
        this.kick(0.4 * impact, -0.45 * impact);
        this.tuft.vel -= 10 * impact;
      }
    }
    this.tuft.vel += (this.jumpY - prevY) * 60;

    // Look target
    let lx = this.randomLook.x;
    let ly = this.randomLook.y;
    this.saccadeTimer -= dt;
    if (this.saccadeTimer <= 0) {
      this.saccadeTimer = 1.2 + Math.random() * 2.5;
      this.randomLook = { x: Math.random() * 1.6 - 0.8, y: Math.random() * 0.8 - 0.4 };
    }
    const toLocal = (px: number, py: number) => {
      const dx = px - this.eyeScreen.x;
      const dy = py - this.eyeScreen.y;
      const len = Math.hypot(dx, dy) || 1;
      const m = Math.min(1, len / (this.unit * 2.5));
      return { x: (dx / len) * m, y: (dy / len) * m };
    };
    if (this.hunger > 0.01) {
      const p = toLocal(this.hungerPoint.x, this.hungerPoint.y);
      lx = p.x;
      ly = p.y;
    } else if (t - this.pointer.at < 2.5) {
      const p = toLocal(this.pointer.x, this.pointer.y);
      lx = p.x;
      ly = p.y;
    }
    if (this.mood === 'confused') {
      lx = 0.5;
      ly = -0.7;
    }
    this.lookX.target = lx;
    this.lookY.target = ly;

    // Mood targets
    let open = 0;
    let smile = 0.6;
    let mw = 1;
    let brow = 0;
    let tilt = 0;
    let cheeks = 0;
    let armL = 0.45 + Math.sin(t * 2.2) * 0.08;
    let armR = 0.45 + Math.sin(t * 2.2 + 1) * 0.08;
    let lean = Math.sin(t * 0.9) * 0.02;
    let pupil = 1;
    let breathe = Math.sin(t * 2.6) * 0.025;

    const voice = this.voiceLevel();
    const narr = this.narratorActive();

    switch (this.mood) {
      case 'idle':
      case 'wave': {
        this.hopTimer -= dt;
        if (this.hopTimer <= 0 && this.jumpY === 0 && this.hunger < 0.05) {
          this.hopTimer = 5 + Math.random() * 6;
          this.jumpV = -2 - Math.random() * 0.8;
          this.kick(-0.15, 0.2);
        }
        if (this.mood === 'wave') {
          armR = 2.7 + Math.sin(t * 9) * 0.35;
          open = 0.35;
          smile = 1;
          brow = 0.3;
        }
        break;
      }
      case 'speaking': {
        const level = Math.max(voice, narr ? 0.35 + 0.35 * Math.sin(t * 17) * Math.sin(t * 5.3) : 0);
        open = Math.min(1, level * 1.4);
        smile = 0.5;
        mw = 0.85 + level * 0.25;
        brow = 0.35 + level * 0.3;
        armL = 0.7 + level * 0.4;
        armR = 0.7 + level * 0.4;
        breathe += level * 0.03;
        break;
      }
      case 'happy': {
        if (this.jumpY === 0) {
          this.jumpV = -3.2 - Math.random() * 0.6;
          this.kick(-0.2, 0.3);
        }
        open = 0.8;
        smile = 1;
        mw = 1.25;
        brow = 0.5;
        armL = 2.6 + Math.sin(t * 14) * 0.35;
        armR = 2.6 + Math.sin(t * 14 + Math.PI) * 0.35;
        lean = Math.sin(t * 8) * 0.06;
        break;
      }
      case 'chewing': {
        open = Math.max(0, Math.sin(t * 18)) * 0.22;
        smile = 0.9;
        mw = 0.8;
        cheeks = 1;
        brow = 0.2;
        armL = 1.2;
        armR = 1.2;
        breathe = Math.sin(t * 18) * 0.04;
        break;
      }
      case 'yuck': {
        open = 0;
        smile = -0.2;
        brow = -0.3;
        tilt = 0.6;
        lean = Math.sin(t * 26) * 0.1;
        armL = 1.6 + Math.sin(t * 20) * 0.4;
        armR = 1.6 - Math.sin(t * 20) * 0.4;
        break;
      }
      case 'burp': {
        open = 0.75 + Math.sin(t * 30) * 0.12;
        smile = 0;
        mw = 0.7;
        cheeks = 1;
        brow = 0.6;
        armL = 0.9;
        armR = 0.9;
        breathe = Math.sin(t * 30) * 0.04 + 0.05;
        break;
      }
      case 'dance': {
        const beat = t * 4.2;
        if (this.jumpY === 0 && Math.sin(beat) > 0.95) {
          this.jumpV = -2.4;
        }
        open = 0.6;
        smile = 1;
        mw = 1.15;
        brow = 0.5;
        armL = 1.4 + Math.sin(beat) * 1.2;
        armR = 1.4 - Math.sin(beat) * 1.2;
        lean = Math.sin(beat) * 0.14;
        break;
      }
      case 'confused': {
        open = 0.18;
        smile = -0.3;
        mw = 0.45;
        brow = 0.2;
        tilt = -0.8;
        lean = 0.12;
        armR = 2.2 + Math.sin(t * 3) * 0.1; // scratching head
        break;
      }
    }

    // Hungry overlay: card being dragged close
    if (this.hunger > 0.01 && this.mood !== 'chewing') {
      const hgr = this.hunger;
      open = Math.max(open, 0.25 + hgr * 0.95);
      mw = Math.max(mw, 1 + hgr * 0.35);
      smile = Math.max(smile, 0.6);
      brow = Math.max(brow, 0.3 + hgr * 0.5);
      pupil = 1 + hgr * 0.35;
      const dir = this.hungerPoint.x > this.mouthScreen.x ? 1 : -1;
      lean = dir * hgr * 0.14;
      armL = 1.4 + hgr * 0.4 + Math.sin(t * 12) * 0.1 * hgr;
      armR = 1.4 + hgr * 0.4 + Math.sin(t * 12 + 1) * 0.1 * hgr;
      breathe += Math.sin(t * 10) * 0.02 * hgr;
    }

    this.mouthOpen.target = open;
    this.smile.target = smile;
    this.mouthW.target = mw;
    this.browLift.target = brow;
    this.browTilt.target = tilt;
    this.cheeks.target = cheeks;
    this.armL.target = armL;
    this.armR.target = armR;
    this.lean.target = lean;
    this.pupil.target = pupil;
    this.sx.target = 1 - breathe;
    this.sy.target = 1 + breathe;
    this.tuft.target = -this.lean.value * 2;

    for (const s of [
      this.sx, this.sy, this.lean, this.mouthOpen, this.smile, this.mouthW, this.browLift,
      this.browTilt, this.cheeks, this.armL, this.armR, this.tuft, this.lookX, this.lookY, this.pupil,
    ]) {
      s.step(dt);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Rendering                                                        */
  /* ---------------------------------------------------------------- */

  private render(): void {
    // Cheap self-check in case a resize notification was missed
    if (Math.abs(this.canvas.clientWidth - this.w) > 1 || Math.abs(this.canvas.clientHeight - this.h) > 1) this.resize();
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const f = this.opts.sizeFactor ?? 1;
    const u = Math.min(w * 0.3, h * 0.34) * f;
    this.unit = u;
    const cx = w / 2;
    const ground = h * 0.93;
    const jy = this.jumpY * u;

    // Ground shadow
    const lift = Math.min(1, -this.jumpY / 0.6);
    ctx.fillStyle = `rgba(20, 60, 50, ${0.22 - lift * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(cx, ground, u * 0.85 * (1 - lift * 0.3), u * 0.13 * (1 - lift * 0.3), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, ground + jy);
    ctx.rotate(this.lean.value);
    if (this.spinT > 0) {
      const p = 1 - this.spinT / 0.7;
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      ctx.translate(0, -1 * u);
      ctx.rotate(e * Math.PI * 2);
      ctx.translate(0, 1 * u);
    }
    ctx.scale(this.sx.value, this.sy.value);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    this.drawFeet(u);
    this.drawArm(u, -1, this.armL.value);
    this.drawArm(u, 1, this.armR.value);
    this.drawHorn(u, -1);
    this.drawHorn(u, 1);
    this.drawBody(u);
    if (!hatHidesTuft(this.hat)) this.drawTuft(u);
    this.drawFace(u);
    if (this.hat) {
      ctx.save();
      ctx.translate(0, -1.9 * u);
      ctx.rotate(this.tuft.value * 0.04);
      drawHat(ctx, this.hat, u, this.time);
      ctx.restore();
    }

    ctx.restore();
  }

  private bodyPath(u: number): void {
    const { ctx } = this;
    const cy = -1.0 * u;
    const rx = 0.96 * u;
    const ry = 0.93 * u;
    const N = 96;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const s = Math.sin(a);
      const c = Math.cos(a);
      const pear = 1 + 0.07 * Math.max(0, s) - 0.03 * Math.max(0, -s);
      const fuzz = s < -0.2 ? 1 + 0.014 * Math.sin(a * 22) : 1;
      const x = c * rx * pear * fuzz;
      const y = cy + s * ry * fuzz;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private drawBody(u: number): void {
    const { ctx } = this;
    const cy = -1.0 * u;

    this.bodyPath(u);
    const g = ctx.createRadialGradient(-0.35 * u, cy - 0.45 * u, 0.1 * u, 0, cy, 1.1 * u);
    g.addColorStop(0, BODY_LIGHT);
    g.addColorStop(0.55, BODY_MID);
    g.addColorStop(1, BODY_DARK);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.save();
    this.bodyPath(u);
    ctx.clip();
    // Bottom ambient occlusion
    const ao = ctx.createLinearGradient(0, cy + 0.2 * u, 0, cy + 0.95 * u);
    ao.addColorStop(0, 'rgba(8, 80, 80, 0)');
    ao.addColorStop(1, 'rgba(8, 80, 80, 0.35)');
    ctx.fillStyle = ao;
    ctx.fillRect(-1.2 * u, cy, 2.4 * u, 1.2 * u);
    // Belly
    const bg = ctx.createRadialGradient(0, cy + 0.42 * u, 0.05 * u, 0, cy + 0.55 * u, 0.6 * u);
    bg.addColorStop(0, BELLY);
    bg.addColorStop(1, 'rgba(190, 250, 236, 0.85)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(0, cy + 0.6 * u, 0.58 * u, 0.42 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    // Spots
    ctx.fillStyle = 'rgba(16, 140, 128, 0.35)';
    const spots: [number, number, number][] = [
      [-0.72, -0.25, 0.09],
      [-0.6, 0.05, 0.06],
      [0.74, -0.15, 0.08],
      [0.62, 0.15, 0.05],
      [-0.3, -0.75, 0.05],
      [0.36, -0.78, 0.06],
    ];
    for (const [sx, sy, sr] of spots) {
      ctx.beginPath();
      ctx.arc(sx * u, cy + sy * u, sr * u, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rim light
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 0.05 * u;
    ctx.beginPath();
    ctx.ellipse(0, cy, 0.86 * u, 0.83 * u, 0, Math.PI * 1.08, Math.PI * 1.42);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-0.52 * u, cy - 0.58 * u, 0.12 * u, 0.06 * u, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.bodyPath(u);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.065 * u;
    ctx.stroke();
  }

  private drawFeet(u: number): void {
    const { ctx } = this;
    for (const side of [-1, 1]) {
      const x = side * 0.4 * u;
      ctx.fillStyle = BODY_DARK;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.055 * u;
      ctx.beginPath();
      ctx.ellipse(x, -0.06 * u, 0.26 * u, 0.13 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 0.035 * u;
      ctx.beginPath();
      ctx.moveTo(x - 0.07 * u, 0.0);
      ctx.lineTo(x - 0.07 * u, -0.06 * u);
      ctx.moveTo(x + 0.07 * u, 0.0);
      ctx.lineTo(x + 0.07 * u, -0.06 * u);
      ctx.stroke();
    }
  }

  private drawArm(u: number, side: number, angle: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(side * 0.8 * u, -0.95 * u);
    ctx.rotate(-side * angle);
    const len = 0.46 * u;
    const r = 0.13 * u;
    ctx.fillStyle = BODY_MID;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.055 * u;
    ctx.beginPath();
    ctx.roundRect(-r, -r * 0.5, r * 2, len, r);
    ctx.fill();
    ctx.stroke();
    // Paw
    ctx.beginPath();
    ctx.arc(0, len - r * 0.2, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = BODY_LIGHT;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawHorn(u: number, side: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(side * 0.5 * u, -1.72 * u);
    ctx.rotate(side * 0.35);
    const g = ctx.createLinearGradient(0, 0, 0, -0.45 * u);
    g.addColorStop(0, '#a78bfa');
    g.addColorStop(1, '#f0abfc');
    ctx.fillStyle = g;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.055 * u;
    ctx.beginPath();
    ctx.moveTo(-0.14 * u, 0.1 * u);
    ctx.quadraticCurveTo(-0.12 * u, -0.3 * u, side * 0.08 * u, -0.46 * u);
    ctx.quadraticCurveTo(0.16 * u, -0.2 * u, 0.14 * u, 0.1 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.035 * u;
    ctx.beginPath();
    ctx.moveTo(-0.08 * u, -0.08 * u);
    ctx.lineTo(0.09 * u, -0.12 * u);
    ctx.moveTo(-0.05 * u, -0.22 * u);
    ctx.lineTo(0.07 * u, -0.25 * u);
    ctx.stroke();
    ctx.restore();
  }

  private drawTuft(u: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(0, -1.9 * u);
    ctx.rotate(this.tuft.value * 0.25);
    ctx.fillStyle = BODY_MID;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.05 * u;
    for (const [a, l] of [[-0.55, 0.26], [0, 0.34], [0.55, 0.24]] as const) {
      ctx.save();
      ctx.rotate(a + this.tuft.value * 0.1);
      ctx.beginPath();
      ctx.moveTo(-0.07 * u, 0.06 * u);
      ctx.quadraticCurveTo(-0.08 * u, -l * 0.6 * u, 0.03 * u, -l * u);
      ctx.quadraticCurveTo(0.08 * u, -l * 0.5 * u, 0.07 * u, 0.06 * u);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawFace(u: number): void {
    const { ctx } = this;
    const eyeY = -1.3 * u;
    const eyeX = 0.34 * u;
    const er = 0.25 * u;

    // Store screen anchors for look-at & card feeding
    const m = ctx.getTransform();
    const eyeP = m.transformPoint(new DOMPoint(0, eyeY));
    const mouthY = -0.82 * u;
    const mouthP = m.transformPoint(new DOMPoint(0, mouthY + 0.08 * u));
    const rect = this.canvas.getBoundingClientRect();
    this.eyeScreen = { x: rect.left + eyeP.x / this.dpr, y: rect.top + eyeP.y / this.dpr };
    this.mouthScreen = { x: rect.left + mouthP.x / this.dpr, y: rect.top + mouthP.y / this.dpr };

    // Cheeks
    const ch = 1 + this.cheeks.value * 0.6;
    ctx.fillStyle = 'rgba(255, 105, 150, 0.72)';
    ctx.beginPath();
    ctx.ellipse(-0.6 * u, -0.92 * u, 0.15 * u * ch, 0.09 * u * ch, 0, 0, Math.PI * 2);
    ctx.ellipse(0.6 * u, -0.92 * u, 0.15 * u * ch, 0.09 * u * ch, 0, 0, Math.PI * 2);
    ctx.fill();

    this.drawEye(-eyeX, eyeY, er, -1);
    this.drawEye(eyeX, eyeY, er, 1);
    this.drawBrow(-eyeX, eyeY, u, -1);
    this.drawBrow(eyeX, eyeY, u, 1);
    this.drawMouth(0, mouthY, u);

    if (this.mood === 'confused') {
      const bob = Math.sin(this.time * 4) * 0.04 * u;
      ctx.save();
      ctx.font = `700 ${0.55 * u}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 0.08 * u;
      ctx.strokeStyle = INK;
      ctx.fillStyle = '#ffd43b';
      ctx.strokeText('?', 1.0 * u, -1.95 * u + bob);
      ctx.fillText('?', 1.0 * u, -1.95 * u + bob);
      ctx.restore();
      // Sweat drop
      ctx.fillStyle = '#7dd3fc';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.03 * u;
      ctx.beginPath();
      const dx = -0.78 * u;
      const dy = -1.55 * u + ((this.time * 0.6) % 1) * 0.15 * u;
      ctx.moveTo(dx, dy - 0.12 * u);
      ctx.quadraticCurveTo(dx + 0.08 * u, dy, dx, dy + 0.05 * u);
      ctx.quadraticCurveTo(dx - 0.08 * u, dy, dx, dy - 0.12 * u);
      ctx.fill();
      ctx.stroke();
    }

    if (this.mood === 'speaking') {
      const pulse = (this.time * 2.4) % 1;
      for (let i = 0; i < 3; i++) {
        const p = (pulse + i / 3) % 1;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - p) * 0.9})`;
        ctx.lineWidth = 0.05 * u;
        ctx.beginPath();
        ctx.arc(0.55 * u, mouthY, (0.3 + p * 0.5) * u, -0.35 * Math.PI, 0.35 * Math.PI);
        ctx.stroke();
      }
    }
  }

  private drawEye(x: number, y: number, r: number, side: number): void {
    const { ctx } = this;
    const mood = this.mood;
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';

    if (mood === 'happy' || mood === 'chewing' || mood === 'burp' || mood === 'dance') {
      ctx.lineWidth = r * 0.3;
      ctx.beginPath();
      if (mood === 'happy' || mood === 'dance') ctx.arc(x, y + r * 0.35, r * 0.62, Math.PI * 1.15, Math.PI * 1.85);
      else ctx.arc(x, y - r * 0.2, r * 0.55, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      return;
    }
    if (mood === 'yuck') {
      ctx.lineWidth = r * 0.28;
      ctx.lineJoin = 'round';
      const d = -side;
      ctx.beginPath();
      ctx.moveTo(x - d * r * 0.45, y - r * 0.42);
      ctx.lineTo(x + d * r * 0.4, y);
      ctx.lineTo(x - d * r * 0.45, y + r * 0.42);
      ctx.stroke();
      return;
    }

    // Sclera
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.08, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.08, 0, 0, Math.PI * 2);
    ctx.clip();
    // subtle inner shade
    ctx.fillStyle = 'rgba(80, 140, 160, 0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.9, r * 1.2, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const lx = this.lookX.value * r * 0.38;
    const ly = this.lookY.value * r * 0.34;
    const ir = r * 0.64;
    const ig = ctx.createRadialGradient(x + lx, y + ly + ir * 0.3, ir * 0.1, x + lx, y + ly, ir);
    ig.addColorStop(0, '#ffe08a');
    ig.addColorStop(0.7, '#f5a524');
    ig.addColorStop(1, '#b45309');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(x + lx, y + ly, ir, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1530';
    ctx.beginPath();
    ctx.arc(x + lx * 1.1, y + ly * 1.1, ir * 0.55 * this.pupil.value, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + lx - r * 0.24, y + ly - r * 0.28, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + lx + r * 0.2, y + ly + r * 0.2, r * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // Eyelid (blink)
    if (this.blink > 0.01) {
      const top = y - r * 1.1;
      const lid = r * 2.2 * this.blink;
      ctx.fillStyle = BODY_MID;
      ctx.fillRect(x - r * 1.2, top, r * 2.4, lid);
      ctx.strokeStyle = INK;
      ctx.lineWidth = r * 0.2;
      ctx.beginPath();
      ctx.moveTo(x - r * 1.1, top + lid);
      ctx.lineTo(x + r * 1.1, top + lid);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.08, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawBrow(x: number, y: number, u: number, side: number): void {
    const { ctx } = this;
    const lift = this.browLift.value * 0.1 * u;
    const tilt = this.browTilt.value * 0.35 * -side;
    const by = y - 0.38 * u - lift;
    ctx.save();
    ctx.translate(x, by);
    ctx.rotate(tilt);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.065 * u;
    ctx.beginPath();
    ctx.moveTo(-0.13 * u, 0.02 * u);
    ctx.quadraticCurveTo(0, -0.05 * u, 0.13 * u, 0.02 * u);
    ctx.stroke();
    ctx.restore();
  }

  private drawMouth(x: number, y: number, u: number): void {
    const { ctx } = this;
    const open = this.mouthOpen.value;
    const smile = this.smile.value;
    const hw = 0.27 * u * Math.max(0.3, this.mouthW.value);
    const cornerY = y - smile * 0.07 * u;

    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.06 * u;

    if (this.mood === 'yuck') {
      // Wavy "bleh" + tongue
      ctx.fillStyle = '#ff7a9a';
      ctx.beginPath();
      ctx.roundRect(x - 0.08 * u, y, 0.16 * u, 0.22 * u, 0.08 * u);
      ctx.fill();
      ctx.lineWidth = 0.04 * u;
      ctx.stroke();
      ctx.lineWidth = 0.06 * u;
      ctx.beginPath();
      ctx.moveTo(x - hw, y);
      ctx.quadraticCurveTo(x - hw * 0.5, y - 0.08 * u, x, y);
      ctx.quadraticCurveTo(x + hw * 0.5, y + 0.08 * u, x + hw, y);
      ctx.stroke();
      return;
    }

    if (open < 0.06) {
      ctx.beginPath();
      ctx.moveTo(x - hw, cornerY);
      ctx.quadraticCurveTo(x, y + smile * 0.18 * u, x + hw, cornerY);
      ctx.stroke();
      // Cute fang
      if (smile > 0.3) {
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 0.025 * u;
        const fx = x + hw * 0.35;
        const fy = y + smile * 0.08 * u;
        ctx.beginPath();
        ctx.moveTo(fx - 0.045 * u, fy - 0.01 * u);
        ctx.lineTo(fx, fy + 0.08 * u);
        ctx.lineTo(fx + 0.045 * u, fy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      return;
    }

    const topY = y + 0.02 * u - smile * 0.02 * u;
    const botY = y + (0.1 + open * 0.6) * u + smile * 0.06 * u;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x - hw, cornerY);
      ctx.quadraticCurveTo(x, topY - open * 0.08 * u, x + hw, cornerY);
      ctx.quadraticCurveTo(x + hw * 0.9, botY, x, botY);
      ctx.quadraticCurveTo(x - hw * 0.9, botY, x - hw, cornerY);
      ctx.closePath();
    };
    path();
    ctx.fillStyle = '#4a0d2a';
    ctx.fill();

    ctx.save();
    path();
    ctx.clip();
    // Throat shade
    ctx.fillStyle = '#2a0418';
    ctx.beginPath();
    ctx.ellipse(x, (topY + botY) / 2, hw * 0.5, (botY - topY) * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tongue
    const tg = ctx.createRadialGradient(x - hw * 0.2, botY - 0.1 * u, 0.02 * u, x, botY, hw);
    tg.addColorStop(0, '#ffa3b8');
    tg.addColorStop(1, '#f2557a');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.ellipse(x, botY + 0.02 * u, hw * 0.7, 0.16 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    // Teeth
    ctx.fillStyle = '#ffffff';
    for (const s of [-1, 1]) {
      const tx = x + s * hw * 0.42;
      const ty = topY - open * 0.05 * u;
      ctx.beginPath();
      ctx.moveTo(tx - 0.06 * u, ty - 0.03 * u);
      ctx.lineTo(tx, ty + 0.1 * u);
      ctx.lineTo(tx + 0.06 * u, ty - 0.03 * u);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    path();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.06 * u;
    ctx.stroke();
  }
}
