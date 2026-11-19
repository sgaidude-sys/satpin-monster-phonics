type Shape =
  | 'dot'
  | 'star'
  | 'spark'
  | 'streak'
  | 'flash'
  | 'puff'
  | 'confetti'
  | 'ring'
  | 'crumb'
  | 'heart'
  | 'text'
  | 'orb';

interface Particle {
  active: boolean;
  shape: Shape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  rot: number;
  vRot: number;
  phase: number;
  text: string;
  additive: boolean;
}

interface Flyer {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  onArrive: () => void;
  trail: number;
  color: string;
  text?: string;
}

const POOL_CAPACITY = 640;
const CONFETTI = ['#ff5d8f', '#ffb020', '#2ed47a', '#29b6f6', '#9b6dff', '#ff7ac6', '#ffe14d'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Zero-allocation pooled 2D foreground VFX layer.
 * Handles layered impact flashes, directional spark streaks, ground dust puffs,
 * cartoon spit-out puffs, shockwave rings, flying stars/letters, and confetti.
 */
export class ParticleCanvasController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pool: Particle[] = [];
  private cursor = 0;
  private activeCount = 0;
  private flyers: Flyer[] = [];
  private last = 0;
  private confettiUntil = 0;
  private confettiAcc = 0;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private dirty = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    for (let i = 0; i < POOL_CAPACITY; i++) {
      this.pool.push({
        active: false,
        shape: 'dot',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 8,
        color: '#ffffff',
        life: 0,
        maxLife: 1,
        gravity: 0,
        drag: 0.96,
        rot: 0,
        vRot: 0,
        phase: 0,
        text: '',
        additive: false,
      });
    }
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
  }

  private spawn(p: Partial<Particle> & Pick<Particle, 'shape' | 'x' | 'y'>): void {
    // Find an inactive slot or overwrite oldest via ring cursor
    let slot: Particle | null = null;
    for (let i = 0; i < POOL_CAPACITY; i++) {
      const idx = (this.cursor + i) % POOL_CAPACITY;
      if (!this.pool[idx].active) {
        slot = this.pool[idx];
        this.cursor = (idx + 1) % POOL_CAPACITY;
        break;
      }
    }
    if (!slot) {
      slot = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % POOL_CAPACITY;
    } else {
      this.activeCount++;
    }

    slot.active = true;
    slot.shape = p.shape;
    slot.x = p.x;
    slot.y = p.y;
    slot.vx = p.vx ?? 0;
    slot.vy = p.vy ?? 0;
    slot.size = p.size ?? 8;
    slot.color = p.color ?? '#ffffff';
    slot.life = 0;
    slot.maxLife = p.maxLife ?? 1;
    slot.gravity = p.gravity ?? 0;
    slot.drag = p.drag ?? 0.96;
    slot.rot = p.rot ?? Math.random() * Math.PI * 2;
    slot.vRot = p.vRot ?? 0;
    slot.phase = p.phase ?? Math.random() * Math.PI * 2;
    slot.text = p.text ?? '';
    slot.additive = p.additive ?? false;
  }

  /** Layered AAA impact burst: additive cast flash, dual shockwaves, directional streaks, stars & sparkles. */
  burst(x: number, y: number, accent = '#ffd43b', count = 30): void {
    const colors = [accent, '#ffe14d', '#ffffff', '#7dd3fc', '#ff9cc8'];
    this.spawn({ shape: 'flash', x, y, size: 78, color: '#ffffff', maxLife: 0.22, additive: true });
    this.spawn({ shape: 'flash', x, y, size: 110, color: accent, maxLife: 0.32, additive: true });
    this.spawn({ shape: 'ring', x, y, size: 12, color: '#ffffff', maxLife: 0.42 });
    this.spawn({ shape: 'ring', x, y, size: 6, color: accent, maxLife: 0.6 });

    // Directional high-speed impact spark streaks
    const streaks = Math.min(12, Math.max(6, Math.round(count * 0.35)));
    for (let i = 0; i < streaks; i++) {
      const a = (i / streaks) * Math.PI * 2 + rand(-0.22, 0.22);
      const sp = rand(460, 820);
      this.spawn({
        shape: 'streak',
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: rand(14, 24),
        color: i % 2 === 0 ? '#ffffff' : accent,
        maxLife: rand(0.24, 0.4),
        gravity: 340,
        drag: 0.89,
        additive: true,
      });
    }

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
      const sp = rand(210, 560);
      const shape: Shape = i % 3 === 0 ? 'star' : i % 3 === 1 ? 'spark' : 'dot';
      this.spawn({
        shape,
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        size: shape === 'dot' ? rand(4, 8) : rand(10, 17),
        color: colors[i % colors.length],
        maxLife: rand(0.6, 1.15),
        gravity: 700,
        drag: 0.93,
        vRot: rand(-8, 8),
        additive: shape === 'spark',
      });
    }
  }

  /** Soft glowing magic halo for tile lighting, egg cracks & UI feedback. */
  magicRing(x: number, y: number, color = '#ffd43b'): void {
    this.spawn({ shape: 'flash', x, y, size: 54, color, maxLife: 0.25, additive: true });
    this.spawn({ shape: 'ring', x, y, size: 8, color, maxLife: 0.45 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rand(-0.2, 0.2);
      this.spawn({
        shape: 'spark',
        x,
        y,
        vx: Math.cos(a) * rand(90, 180),
        vy: Math.sin(a) * rand(90, 180),
        size: rand(8, 13),
        color: i % 2 === 0 ? '#ffffff' : color,
        maxLife: rand(0.32, 0.5),
        drag: 0.92,
        additive: true,
      });
    }
  }

  /** Soft cushioned landing dust puffs when Munchy lands from a hop or cards drop. */
  dustPuff(x: number, y: number, intensity = 0.7): void {
    const count = Math.round(4 + intensity * 6);
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      this.spawn({
        shape: 'puff',
        x: x + side * rand(8, 38) * intensity,
        y: y + rand(-4, 4),
        vx: side * rand(45, 135) * intensity,
        vy: rand(-50, -15) * intensity,
        size: rand(10, 22) * (0.7 + intensity * 0.5),
        color: 'rgba(255, 255, 245, 0.85)',
        maxLife: rand(0.4, 0.68),
        gravity: -18,
        drag: 0.91,
      });
    }
  }

  /** Playful comic puff of silly pastel clouds & bubbles when Munchy spits out a wrong card. */
  spitPuff(x: number, y: number, dirX = 1): void {
    const dir = dirX >= 0 ? 1 : -1;
    for (let i = 0; i < 8; i++) {
      this.spawn({
        shape: 'puff',
        x: x + rand(-8, 10),
        y: y + rand(-8, 8),
        vx: dir * rand(120, 320),
        vy: rand(-140, 40),
        size: rand(14, 28),
        color: i % 2 === 0 ? '#dff6ff' : '#ffffff',
        maxLife: rand(0.45, 0.75),
        gravity: -40,
        drag: 0.92,
      });
    }
    for (let i = 0; i < 5; i++) {
      this.spawn({
        shape: 'ring',
        x: x + dir * rand(10, 35),
        y: y + rand(-15, 15),
        vx: dir * rand(90, 210),
        vy: rand(-90, -20),
        size: rand(4, 9),
        color: '#9ee7ff',
        maxLife: rand(0.35, 0.55),
        drag: 0.94,
      });
    }
  }

  /** Food crumbs flying out of Munchy's mouth while chewing. */
  crumbs(x: number, y: number, color: string, count = 10): void {
    for (let i = 0; i < count; i++) {
      this.spawn({
        shape: 'crumb',
        x: x + rand(-14, 14),
        y: y + rand(-6, 6),
        vx: rand(-220, 220),
        vy: rand(-380, -120),
        size: rand(5, 10),
        color: i % 3 === 0 ? '#ffffff' : color,
        maxLife: rand(0.6, 1),
        gravity: 1200,
        drag: 0.98,
        vRot: rand(-12, 12),
      });
    }
  }

  hearts(x: number, y: number, count = 5): void {
    for (let i = 0; i < count; i++) {
      this.spawn({
        shape: 'heart',
        x: x + rand(-40, 40),
        y: y + rand(-10, 10),
        vx: rand(-30, 30),
        vy: rand(-180, -110),
        size: rand(14, 24),
        color: i % 2 ? '#ff5d8f' : '#ff8fb3',
        maxLife: rand(1.1, 1.6),
        gravity: -30,
        drag: 0.99,
      });
    }
  }

  /** A tiny sparkle trail behind a dragged card. */
  trail(x: number, y: number, color: string): void {
    this.spawn({
      shape: Math.random() < 0.55 ? 'spark' : 'dot',
      x: x + rand(-20, 20),
      y: y + rand(-20, 20),
      vx: rand(-40, 40),
      vy: rand(-60, 10),
      size: rand(6, 12),
      color: Math.random() < 0.5 ? color : '#ffffff',
      maxLife: rand(0.35, 0.62),
      gravity: 80,
      additive: true,
    });
  }

  /** Bubbly floating words like "Yum!". */
  text(x: number, y: number, text: string, color: string, size = 44): void {
    this.spawn({
      shape: 'text',
      x,
      y,
      vy: -150,
      size,
      color,
      text,
      maxLife: 1.2,
      drag: 0.95,
      rot: rand(-0.12, 0.12),
    });
  }

  /** Star that arcs from one point to another and calls back on arrival. */
  flyStar(x0: number, y0: number, x1: number, y1: number, onArrive: () => void): void {
    const cx = (x0 + x1) / 2 + rand(-80, 80);
    const cy = Math.min(y0, y1) - 160;
    this.flyers.push({ x0, y0, cx, cy, x1, y1, t: 0, dur: 0.75, onArrive, trail: 0, color: '#ffd43b' });
  }

  /** A letter bubble that swoops into a target (Munchy's mouth). */
  flyLetter(x0: number, y0: number, x1: number, y1: number, text: string, color: string, onArrive: () => void): void {
    const cx = (x0 + x1) / 2;
    const cy = Math.min(y0, y1) - 120;
    this.flyers.push({ x0, y0, cx, cy, x1, y1, t: 0, dur: 0.55, onArrive, trail: 0, color, text });
  }

  confetti(ms = 5000): void {
    this.confettiUntil = performance.now() + ms;
    const { w, h } = this;
    for (let i = 0; i < 95; i++) {
      const left = i % 2 === 0;
      const a = (left ? -Math.PI * 0.32 : -Math.PI * 0.68) + rand(-0.35, 0.35);
      const sp = rand(700, 1320);
      this.spawn({
        shape: i % 5 === 0 ? 'star' : 'confetti',
        x: left ? -10 : w + 10,
        y: h * rand(0.55, 0.85),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: rand(9, 16),
        color: CONFETTI[i % CONFETTI.length],
        maxLife: rand(3, 4.5),
        gravity: 520,
        drag: 0.975,
        vRot: rand(-10, 10),
      });
    }
  }

  private loop = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(now, dt);
    if (this.activeCount > 0 || this.flyers.length > 0 || this.dirty) this.render();
    requestAnimationFrame(this.loop);
  };

  private update(now: number, dt: number): void {
    if (now < this.confettiUntil) {
      this.confettiAcc += dt * 74;
      while (this.confettiAcc >= 1) {
        this.confettiAcc -= 1;
        this.spawn({
          shape: Math.random() < 0.16 ? 'star' : 'confetti',
          x: rand(0, this.w),
          y: -20,
          vx: rand(-60, 60),
          vy: rand(120, 260),
          size: rand(9, 15),
          color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
          maxLife: rand(3.5, 5),
          gravity: 90,
          drag: 0.995,
          vRot: rand(-8, 8),
        });
      }
    }

    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.t += dt / f.dur;
      const t = Math.min(1, f.t);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = (1 - e) * (1 - e) * f.x0 + 2 * (1 - e) * e * f.cx + e * e * f.x1;
      const y = (1 - e) * (1 - e) * f.y0 + 2 * (1 - e) * e * f.cy + e * e * f.y1;
      f.trail += dt;
      while (f.trail > 0.012) {
        f.trail -= 0.012;
        this.spawn({
          shape: 'spark',
          x: x + rand(-6, 6),
          y: y + rand(-6, 6),
          vx: rand(-30, 30),
          vy: rand(-30, 30),
          size: rand(7, 13),
          color: Math.random() < 0.5 ? (f.text ? f.color : '#ffe14d') : '#ffffff',
          maxLife: rand(0.3, 0.5),
          additive: true,
        });
      }
      if (f.text) {
        this.spawn({ shape: 'orb', x, y, size: 54 * (1 - e * 0.55), color: f.color, text: f.text, maxLife: 0.03, rot: 0 });
      } else {
        this.spawn({ shape: 'star', x, y, size: 26, color: '#ffd43b', maxLife: 0.03, rot: f.t * 10 });
      }
      if (f.t >= 1) {
        this.flyers.splice(i, 1);
        this.burst(f.x1, f.y1, f.color, f.text ? 12 : 16);
        f.onArrive();
      }
    }

    let alive = 0;
    for (let i = 0; i < POOL_CAPACITY; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife || p.y > this.h + 80) {
        p.active = false;
        continue;
      }
      alive++;
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag;
      p.vy *= drag;
      p.vy += p.gravity * dt;
      if (p.shape === 'confetti') {
        p.phase += dt * 8;
        p.x += Math.sin(p.phase) * 40 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vRot * dt;
    }
    this.activeCount = alive;
  }

  private render(): void {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.dirty = this.activeCount > 0 || this.flyers.length > 0;

    for (let i = 0; i < POOL_CAPACITY; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const lr = p.life / p.maxLife;
      let alpha = lr > 0.7 ? 1 - (lr - 0.7) / 0.3 : 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.shape !== 'streak') ctx.rotate(p.rot);
      if (p.additive) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;

      switch (p.shape) {
        case 'flash': {
          const r = p.size * (0.4 + lr * 0.9);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
          g.addColorStop(0, p.color);
          g.addColorStop(0.45, p.color);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = (1 - lr) * (1 - lr) * 0.85;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'streak': {
          const angle = Math.atan2(p.vy, p.vx);
          ctx.rotate(angle);
          ctx.globalAlpha = (1 - lr) * 0.95;
          const len = p.size * (1 - lr * 0.45);
          ctx.beginPath();
          ctx.ellipse(0, 0, len, Math.max(1.5, 3.2 * (1 - lr)), 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'puff': {
          const r = (p.size / 2) * (0.65 + lr * 0.85);
          ctx.globalAlpha = (1 - lr) * 0.72;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'dot':
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'crumb':
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(-p.size / 2, -p.size / 3);
          ctx.lineTo(p.size / 2, -p.size / 2);
          ctx.lineTo(p.size / 3, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 3);
          ctx.closePath();
          ctx.fill();
          break;
        case 'star':
          ctx.globalAlpha = alpha;
          this.star(p.size / 2);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(160, 90, 0, 0.5)';
          ctx.stroke();
          break;
        case 'spark': {
          ctx.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(p.life * 30 + p.phase));
          const s = p.size / 2;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.quadraticCurveTo(0, 0, s, 0);
          ctx.quadraticCurveTo(0, 0, 0, s);
          ctx.quadraticCurveTo(0, 0, -s, 0);
          ctx.quadraticCurveTo(0, 0, 0, -s);
          ctx.fill();
          break;
        }
        case 'confetti': {
          ctx.globalAlpha = alpha;
          const flip = Math.cos(p.phase * 1.3);
          ctx.scale(1, flip);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.fillStyle = 'rgba(255,255,255,0.42)';
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 8);
          break;
        }
        case 'ring': {
          const r = p.size + lr * 115;
          ctx.globalAlpha = (1 - lr) * 0.9;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 10 * (1 - lr) + 1;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'heart': {
          ctx.globalAlpha = alpha;
          const s = p.size / 2;
          ctx.rotate(Math.sin(p.life * 5 + p.phase) * 0.3 - p.rot);
          ctx.beginPath();
          ctx.moveTo(0, s * 0.9);
          ctx.bezierCurveTo(-s * 1.4, -s * 0.1, -s * 0.6, -s * 1.2, 0, -s * 0.4);
          ctx.bezierCurveTo(s * 0.6, -s * 1.2, s * 1.4, -s * 0.1, 0, s * 0.9);
          ctx.fill();
          break;
        }
        case 'orb': {
          const r = p.size / 2;
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = p.color;
          ctx.lineWidth = r * 0.16;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = p.color;
          ctx.font = `700 ${r * 1.3}px Andika, Fredoka, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.text, 0, -r * 0.12);
          break;
        }
        case 'text': {
          const pop = lr < 0.15 ? 0.4 + (lr / 0.15) * 0.75 : lr < 0.25 ? 1.15 - ((lr - 0.15) / 0.1) * 0.15 : 1;
          alpha = lr > 0.75 ? 1 - (lr - 0.75) / 0.25 : 1;
          ctx.globalAlpha = alpha;
          ctx.scale(pop, pop);
          ctx.font = `700 ${p.size}px Fredoka, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineJoin = 'round';
          ctx.lineWidth = p.size * 0.2;
          ctx.strokeStyle = '#26213f';
          ctx.strokeText(p.text, 0, 0);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, 0, 0);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillText(p.text, 0, -p.size * 0.06);
          break;
        }
      }
      ctx.restore();
    }
  }

  private star(r: number): void {
    const { ctx } = this;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const b = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(b) * r * 0.48, Math.sin(b) * r * 0.48);
    }
    ctx.closePath();
  }
}
