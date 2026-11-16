interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  rotation: number;
  vRot: number;
  shape: 'circle' | 'star' | 'ribbon';
  wobblePhase: number;
}

const CONFETTI_COLORS = [
  '#f43f5e',
  '#f59e0b',
  '#10b981',
  '#0ea5e9',
  '#8b5cf6',
  '#ec4899',
  '#fde047',
];

export class ParticleCanvasController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private rafId: number | null = null;
  private lastTime = 0;
  private confettiEndTime = 0;
  private confettiSpawnAccum = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not initialize 2D context for particle canvas');
    }
    this.ctx = ctx;
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    this.start();
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    window.removeEventListener('resize', this.handleResize);
  }

  /**
   * Emits a joyful particle burst at screen coordinates (clientX, clientY).
   */
  public burst(clientX: number, clientY: number, accentHex = '#fbbf24', count = 34): void {
    const dpr = this.getDpr();
    const x = clientX * dpr;
    const y = clientY * dpr;
    const colors = [accentHex, '#fde047', '#38bdf8', '#f472b6', '#34d399', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const speed = (220 + Math.random() * 440) * dpr;
      const shape: Particle['shape'] = i % 2 === 0 ? 'star' : 'circle';
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90 * dpr,
        size: (6 + Math.random() * 9) * dpr,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.45,
        gravity: 680 * dpr,
        drag: 0.96,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 10,
        shape,
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * Triggers a 5-second confetti celebration across the entire screen.
   */
  public startConfetti(durationMs = 5000): void {
    const now = performance.now();
    this.confettiEndTime = now + durationMs;

    // Initial side cannons
    const dpr = this.getDpr();
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (let i = 0; i < 65; i++) {
      const fromLeft = i % 2 === 0;
      const startX = fromLeft ? w * 0.05 : w * 0.95;
      const startY = h * (0.45 + Math.random() * 0.3);
      const baseAngle = fromLeft ? -Math.PI * 0.3 : -Math.PI * 0.7;
      const angle = baseAngle + (Math.random() - 0.5) * 0.65;
      const speed = (500 + Math.random() * 650) * dpr;

      this.particles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (8 + Math.random() * 8) * dpr,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        alpha: 1,
        life: 0,
        maxLife: 2.8 + Math.random() * 1.5,
        gravity: 480 * dpr,
        drag: 0.985,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12,
        shape: i % 5 === 0 ? 'star' : 'ribbon',
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private getDpr(): number {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  private handleResize = (): void => {
    const dpr = this.getDpr();
    const w = Math.max(1, Math.floor(window.innerWidth * dpr));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  };

  private start(): void {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.update(now, dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(now: number, dt: number): void {
    // Spawn raining confetti while celebration is active
    if (now < this.confettiEndTime) {
      this.confettiSpawnAccum += dt * 75;
      const dpr = this.getDpr();
      while (this.confettiSpawnAccum >= 1) {
        this.confettiSpawnAccum -= 1;
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: -16 * dpr,
          vx: (Math.random() - 0.5) * 140 * dpr,
          vy: (160 + Math.random() * 220) * dpr,
          size: (7 + Math.random() * 7) * dpr,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          alpha: 1,
          life: 0,
          maxLife: 3.2 + Math.random() * 1.4,
          gravity: 160 * dpr,
          drag: 0.992,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 9,
          shape: Math.random() < 0.2 ? 'star' : 'ribbon',
          wobblePhase: Math.random() * Math.PI * 2,
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife || p.y > this.canvas.height + 60) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.gravity * dt;

      if (p.shape === 'ribbon') {
        p.wobblePhase += dt * 6;
        p.x += Math.sin(p.wobblePhase) * 35 * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;

      const lifeRatio = p.life / p.maxLife;
      p.alpha = lifeRatio > 0.7 ? Math.max(0, 1 - (lifeRatio - 0.7) / 0.3) : 1;
    }
  }

  private render(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'ribbon') {
        const tilt = Math.cos(p.wobblePhase);
        ctx.fillRect(-p.size * 0.5, -p.size * 0.28 * tilt, p.size, p.size * 0.56);
      } else {
        this.drawStar(ctx, p.size * 0.65);
      }
      ctx.restore();
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = Math.cos(outerAngle) * r;
      const oy = Math.sin(outerAngle) * r;
      const ix = Math.cos(innerAngle) * (r * 0.45);
      const iy = Math.sin(innerAngle) * (r * 0.45);
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
  }
}
