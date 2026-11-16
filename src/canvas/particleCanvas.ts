type Shape = 'dot' | 'star' | 'spark' | 'confetti' | 'ring' | 'crumb' | 'heart' | 'text';

interface Particle {
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
  text?: string;
  additive?: boolean;
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
}

const CONFETTI = ['#ff5d8f', '#ffb020', '#2ed47a', '#29b6f6', '#9b6dff', '#ff7ac6', '#ffe14d'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class ParticleCanvasController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
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

  private add(p: Partial<Particle> & Pick<Particle, 'shape' | 'x' | 'y'>): void {
    this.particles.push({
      vx: 0,
      vy: 0,
      size: 8,
      color: '#fff',
      life: 0,
      maxLife: 1,
      gravity: 0,
      drag: 0.96,
      rot: Math.random() * Math.PI * 2,
      vRot: 0,
      phase: Math.random() * Math.PI * 2,
      ...p,
    });
  }

  /** Juicy celebratory burst: shockwave ring, stars, sparkles and dots. */
  burst(x: number, y: number, accent = '#ffd43b', count = 30): void {
    const colors = [accent, '#ffe14d', '#ffffff', '#7dd3fc', '#ff9cc8'];
    this.add({ shape: 'ring', x, y, size: 10, color: '#ffffff', maxLife: 0.45 });
    this.add({ shape: 'ring', x, y, size: 6, color: accent, maxLife: 0.6 });
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
      const sp = rand(220, 560);
      const shape: Shape = i % 3 === 0 ? 'star' : i % 3 === 1 ? 'spark' : 'dot';
      this.add({
        shape,
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        size: shape === 'dot' ? rand(4, 8) : rand(9, 16),
        color: colors[i % colors.length],
        maxLife: rand(0.6, 1.1),
        gravity: 700,
        drag: 0.93,
        vRot: rand(-8, 8),
        additive: shape === 'spark',
      });
    }
  }

  /** Food crumbs flying out of Munchy's mouth while chewing. */
  crumbs(x: number, y: number, color: string, count = 10): void {
    for (let i = 0; i < count; i++) {
      this.add({
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
      this.add({
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
    this.add({
      shape: Math.random() < 0.5 ? 'spark' : 'dot',
      x: x + rand(-20, 20),
      y: y + rand(-20, 20),
      vx: rand(-40, 40),
      vy: rand(-60, 10),
      size: rand(5, 10),
      color: Math.random() < 0.5 ? color : '#ffffff',
      maxLife: rand(0.35, 0.6),
      gravity: 80,
      additive: true,
    });
  }

  /** Bubbly floating words like "Yum!". */
  text(x: number, y: number, text: string, color: string, size = 44): void {
    this.add({
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
    this.flyers.push({ x0, y0, cx, cy, x1, y1, t: 0, dur: 0.75, onArrive, trail: 0 });
  }

  confetti(ms = 5000): void {
    this.confettiUntil = performance.now() + ms;
    const { w, h } = this;
    for (let i = 0; i < 90; i++) {
      const left = i % 2 === 0;
      const a = (left ? -Math.PI * 0.32 : -Math.PI * 0.68) + rand(-0.35, 0.35);
      const sp = rand(700, 1300);
      this.add({
        shape: i % 6 === 0 ? 'star' : 'confetti',
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
    if (this.particles.length || this.flyers.length || this.dirty) this.render();
    requestAnimationFrame(this.loop);
  };

  private update(now: number, dt: number): void {
    if (now < this.confettiUntil) {
      this.confettiAcc += dt * 70;
      while (this.confettiAcc >= 1) {
        this.confettiAcc -= 1;
        this.add({
          shape: Math.random() < 0.15 ? 'star' : 'confetti',
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
        this.add({
          shape: 'spark',
          x: x + rand(-6, 6),
          y: y + rand(-6, 6),
          vx: rand(-30, 30),
          vy: rand(-30, 30),
          size: rand(6, 12),
          color: Math.random() < 0.5 ? '#ffe14d' : '#ffffff',
          maxLife: rand(0.3, 0.5),
          additive: true,
        });
      }
      this.add({ shape: 'star', x, y, size: 26, color: '#ffd43b', maxLife: 0.03, rot: f.t * 10 });
      if (f.t >= 1) {
        this.flyers.splice(i, 1);
        this.burst(f.x1, f.y1, '#ffd43b', 14);
        f.onArrive();
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife || p.y > this.h + 80) {
        this.particles.splice(i, 1);
        continue;
      }
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
  }

  private render(): void {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.dirty = this.particles.length > 0 || this.flyers.length > 0;

    for (const p of this.particles) {
      const lr = p.life / p.maxLife;
      let alpha = lr > 0.7 ? 1 - (lr - 0.7) / 0.3 : 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.additive) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      switch (p.shape) {
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
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 8);
          break;
        }
        case 'ring': {
          const r = p.size + lr * 110;
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
          ctx.strokeText(p.text ?? '', 0, 0);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text ?? '', 0, 0);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillText(p.text ?? '', 0, -p.size * 0.06);
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
