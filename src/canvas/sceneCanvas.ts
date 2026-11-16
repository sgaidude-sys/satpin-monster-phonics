/**
 * Living storybook backdrop: rotating sun rays, drifting clouds, layered
 * parallax hills, swaying grass & flowers, butterflies and floating pollen.
 * Static layers are pre-rendered on resize so each frame stays cheap.
 */

interface Cloud {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  speed: number;
  depth: number;
  w: number;
}

interface Mote {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
}

interface Butterfly {
  x: number;
  y: number;
  t: number;
  speed: number;
  color: string;
  dir: number;
  seed: number;
}

interface Flower {
  x: number;
  h: number;
  color: string;
  phase: number;
  size: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class SceneCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private time = 0;
  private last = 0;
  private sky!: HTMLCanvasElement;
  private farHills!: HTMLCanvasElement;
  private midHills!: HTMLCanvasElement;
  private frontHill!: HTMLCanvasElement;
  private clouds: Cloud[] = [];
  private motes: Mote[] = [];
  private butterflies: Butterfly[] = [];
  private flowers: Flower[] = [];
  private pointer = { x: 0, y: 0 };
  private smoothPointer = { x: 0, y: 0 };
  private rainbow = 0;
  private rainbowTarget = 0;
  private reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  /** Show a rainbow for a few seconds (big celebrations). */
  celebrate(seconds = 6): void {
    this.rainbowTarget = 1;
    setTimeout(() => (this.rainbowTarget = 0), seconds * 1000);
  }

  private frontY(x: number): number {
    const { w, h } = this;
    return h * 0.87 + Math.sin(x / w * 5.2 + 1.3) * h * 0.018 + Math.sin(x / w * 11 + 0.2) * h * 0.006;
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.buildLayers();
  }

  private layer(extra = 40): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = Math.floor((this.w + extra * 2) * this.dpr);
    c.height = Math.floor((this.h + extra) * this.dpr);
    const g = c.getContext('2d')!;
    g.scale(this.dpr, this.dpr);
    g.translate(extra, 0);
    return [c, g];
  }

  private buildLayers(): void {
    const { w, h } = this;

    // ---- Sky
    {
      const [c, g] = this.layer(0);
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#4fb6f5');
      grad.addColorStop(0.45, '#9bdcff');
      grad.addColorStop(0.72, '#e4f6ff');
      grad.addColorStop(0.86, '#fff4d6');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      const glow = g.createRadialGradient(w * 0.84, h * 0.14, 0, w * 0.84, h * 0.14, Math.max(w, h) * 0.6);
      glow.addColorStop(0, 'rgba(255,246,196,0.75)');
      glow.addColorStop(0.3, 'rgba(255,240,180,0.25)');
      glow.addColorStop(1, 'rgba(255,240,180,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);
      this.sky = c;
    }

    // ---- Far hills (hazy)
    {
      const [c, g] = this.layer();
      const base = h * 0.66;
      g.beginPath();
      g.moveTo(-40, h);
      for (let x = -40; x <= w + 40; x += 8) {
        g.lineTo(x, base + Math.sin(x / w * 4 + 2) * h * 0.05 + Math.sin(x / w * 9) * h * 0.012);
      }
      g.lineTo(w + 40, h);
      g.closePath();
      const grad = g.createLinearGradient(0, base - h * 0.06, 0, h);
      grad.addColorStop(0, '#a7e3c9');
      grad.addColorStop(1, '#cdeedd');
      g.fillStyle = grad;
      g.fill();
      // Tiny distant trees
      for (let i = 0; i < 18; i++) {
        const x = rand(-20, w + 20);
        const y = base + Math.sin(x / w * 4 + 2) * h * 0.05 + Math.sin(x / w * 9) * h * 0.012 + 4;
        const r = rand(5, 9) * (h / 800);
        g.fillStyle = '#86cfae';
        g.fillRect(x - 1, y - r, 2, r + 2);
        g.beginPath();
        g.arc(x, y - r * 1.4, r, 0, Math.PI * 2);
        g.fill();
      }
      this.farHills = c;
    }

    // ---- Mid hills with lollipop trees
    {
      const [c, g] = this.layer();
      const yAt = (x: number) => h * 0.76 + Math.sin(x / w * 3.1 + 4) * h * 0.04 + Math.sin(x / w * 7.3) * h * 0.012;
      // Trees behind the hill crest
      const s = Math.max(0.6, Math.min(1.3, h / 800));
      const trees = Math.round(w / 140);
      for (let i = 0; i < trees; i++) {
        const x = (i + rand(0.1, 0.9)) * (w / trees);
        const y = yAt(x) + 6;
        const r = rand(22, 34) * s;
        const trunkH = r * 1.3;
        g.fillStyle = '#9a6a43';
        g.beginPath();
        g.roundRect(x - r * 0.12, y - trunkH, r * 0.24, trunkH + 8, 4);
        g.fill();
        const crown = g.createRadialGradient(x - r * 0.35, y - trunkH - r * 0.5, r * 0.1, x, y - trunkH, r * 1.1);
        const hue = Math.random() < 0.3 ? ['#ffd1e8', '#f7a6cf'] : ['#9be38a', '#4fb560'];
        crown.addColorStop(0, hue[0]);
        crown.addColorStop(1, hue[1]);
        g.fillStyle = crown;
        g.beginPath();
        g.arc(x, y - trunkH - r * 0.4, r, 0, Math.PI * 2);
        g.arc(x - r * 0.6, y - trunkH, r * 0.65, 0, Math.PI * 2);
        g.arc(x + r * 0.6, y - trunkH, r * 0.7, 0, Math.PI * 2);
        g.fill();
      }
      g.beginPath();
      g.moveTo(-40, h);
      for (let x = -40; x <= w + 40; x += 8) g.lineTo(x, yAt(x));
      g.lineTo(w + 40, h);
      g.closePath();
      const grad = g.createLinearGradient(0, h * 0.7, 0, h);
      grad.addColorStop(0, '#8be07f');
      grad.addColorStop(1, '#5fc067');
      g.fillStyle = grad;
      g.fill();
      // Soft light on crest
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 3;
      g.beginPath();
      for (let x = -40; x <= w + 40; x += 8) {
        if (x === -40) g.moveTo(x, yAt(x) + 2);
        else g.lineTo(x, yAt(x) + 2);
      }
      g.stroke();
      // Bushes
      for (let i = 0; i < Math.round(w / 220); i++) {
        const x = rand(0, w);
        const y = yAt(x) + rand(14, 30);
        const r = rand(12, 20) * s;
        g.fillStyle = '#4caf5a';
        g.beginPath();
        g.arc(x, y, r, Math.PI, 0);
        g.arc(x + r, y + 2, r * 0.7, Math.PI, 0);
        g.arc(x - r, y + 2, r * 0.7, Math.PI, 0);
        g.fill();
      }
      this.midHills = c;
    }

    // ---- Front hill (static part)
    {
      const [c, g] = this.layer();
      g.beginPath();
      g.moveTo(-40, h);
      for (let x = -40; x <= w + 40; x += 6) g.lineTo(x, this.frontY(x));
      g.lineTo(w + 40, h);
      g.closePath();
      const grad = g.createLinearGradient(0, h * 0.84, 0, h);
      grad.addColorStop(0, '#62c95f');
      grad.addColorStop(1, '#3ea54b');
      g.fillStyle = grad;
      g.fill();
      // Speckles of texture
      for (let i = 0; i < w / 6; i++) {
        const x = rand(-20, w + 20);
        const y = rand(this.frontY(x) + 8, h);
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(20,90,40,0.12)';
        g.beginPath();
        g.ellipse(x, y, rand(2, 5), rand(1, 2.5), 0, 0, Math.PI * 2);
        g.fill();
      }
      this.frontHill = c;
    }

    // ---- Clouds
    this.clouds = [];
    const cloudCount = Math.max(4, Math.round(w / 260));
    for (let i = 0; i < cloudCount; i++) {
      const cw = rand(120, 240) * Math.max(0.7, Math.min(1.4, w / 1200));
      this.clouds.push({
        sprite: this.makeCloud(cw),
        x: rand(-cw, w),
        y: rand(h * 0.04, h * 0.42),
        speed: rand(6, 16),
        depth: rand(0.3, 1),
        w: cw,
      });
    }

    // ---- Motes
    this.motes = Array.from({ length: Math.round(w / 40) }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(1.2, 3.2),
      speed: rand(6, 18),
      phase: rand(0, Math.PI * 2),
    }));

    // ---- Butterflies
    this.butterflies = [
      { x: w * 0.2, y: h * 0.5, t: 0, speed: 0.35, color: '#f472b6', dir: 1, seed: rand(0, 100) },
      { x: w * 0.7, y: h * 0.4, t: 0, speed: 0.28, color: '#fbbf24', dir: -1, seed: rand(0, 100) },
    ];

    // ---- Flowers
    const palette = ['#f472b6', '#fbbf24', '#ffffff', '#a78bfa', '#fb7185', '#38bdf8'];
    this.flowers = Array.from({ length: Math.round(w / 70) }, () => ({
      x: rand(0, w),
      h: rand(14, 30),
      color: palette[Math.floor(Math.random() * palette.length)],
      phase: rand(0, Math.PI * 2),
      size: rand(5, 8),
    }));
  }

  private makeCloud(cw: number): HTMLCanvasElement {
    const ch = cw * 0.55;
    const c = document.createElement('canvas');
    c.width = Math.floor(cw * this.dpr);
    c.height = Math.floor(ch * this.dpr);
    const g = c.getContext('2d')!;
    g.scale(this.dpr, this.dpr);
    const puffs: [number, number, number][] = [
      [0.22, 0.68, 0.2],
      [0.4, 0.48, 0.26],
      [0.6, 0.42, 0.24],
      [0.78, 0.62, 0.19],
      [0.5, 0.7, 0.24],
    ];
    const draw = (fill: string | CanvasGradient, dy: number) => {
      g.fillStyle = fill;
      g.beginPath();
      for (const [px, py, pr] of puffs) {
        g.moveTo(px * cw + pr * cw, py * ch + dy);
        g.arc(px * cw, py * ch + dy, pr * cw, 0, Math.PI * 2);
      }
      g.fill();
    };
    draw('rgba(160, 200, 230, 0.55)', ch * 0.06);
    const grad = g.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#eaf6ff');
    draw(grad, 0);
    return c;
  }

  private loop = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += this.reduceMotion ? dt * 0.3 : dt;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    const { w, h } = this;
    const k = Math.min(1, dt * 3);
    this.smoothPointer.x += (this.pointer.x - this.smoothPointer.x) * k;
    this.smoothPointer.y += (this.pointer.y - this.smoothPointer.y) * k;
    this.rainbow += (this.rainbowTarget - this.rainbow) * Math.min(1, dt * 1.5);

    for (const c of this.clouds) {
      c.x += c.speed * c.depth * dt;
      if (c.x > w + 20) {
        c.x = -c.w - rand(0, 200);
        c.y = rand(h * 0.04, h * 0.42);
      }
    }
    for (const m of this.motes) {
      m.y -= m.speed * dt;
      m.x += Math.sin(this.time * 0.8 + m.phase) * 8 * dt;
      if (m.y < -10) {
        m.y = h + 10;
        m.x = rand(0, w);
      }
    }
    for (const b of this.butterflies) {
      b.t += dt;
      b.x += b.dir * 40 * b.speed * dt * (1 + Math.sin(b.t * 0.7 + b.seed) * 0.6);
      b.y += Math.sin(b.t * 1.3 + b.seed) * 30 * dt + Math.cos(b.t * 0.5) * 10 * dt;
      b.y = Math.max(h * 0.2, Math.min(h * 0.8, b.y));
      if (b.x > w + 60) b.dir = -1;
      if (b.x < -60) b.dir = 1;
    }
  }

  private render(): void {
    const { ctx, w, h, time } = this;
    const px = this.smoothPointer.x;
    const py = this.smoothPointer.y;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    ctx.drawImage(this.sky, 0, 0, w, h);

    // Sun + rotating rays
    const sx = w * 0.84 - px * 6;
    const sy = h * 0.14 - py * 4;
    const sr = Math.min(w, h) * 0.075;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(time * 0.05);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    const rays = 14;
    const len = Math.max(w, h) * 1.1;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, len, a, a + Math.PI / rays * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    this.drawSun(sx, sy, sr);

    // Rainbow during celebrations
    if (this.rainbow > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.rainbow * 0.55;
      const colors = ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
      const rx = w * 0.5;
      const ry = h * 0.95;
      const r0 = Math.min(w, h) * 0.75;
      const band = r0 * 0.045;
      ctx.lineWidth = band;
      colors.forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.arc(rx, ry, r0 - i * band, Math.PI, 0);
        ctx.stroke();
      });
      ctx.restore();
    }

    // Clouds (far ones move less with pointer)
    for (const c of this.clouds) {
      const ch = c.w * 0.55;
      ctx.globalAlpha = 0.75 + c.depth * 0.25;
      ctx.drawImage(c.sprite, c.x - px * 10 * c.depth, c.y - py * 5 * c.depth + Math.sin(time * 0.4 + c.x * 0.01) * 3, c.w, ch);
    }
    ctx.globalAlpha = 1;

    const lw = this.farHills.width / this.dpr;
    const lh = this.farHills.height / this.dpr;
    ctx.drawImage(this.farHills, -40 - px * 8, -py * 3, lw, lh);
    ctx.drawImage(this.midHills, -40 - px * 16, -py * 5, lw, lh);

    this.drawButterflies();

    // Front hill + grass + flowers
    const fx = -px * 26;
    const fy = -py * 7;
    ctx.drawImage(this.frontHill, -40 + fx, fy, lw, lh);
    this.drawGrass(fx, fy);
    this.drawFlowers(fx, fy);

    // Floating pollen
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      const a = 0.25 + 0.25 * Math.sin(time * 2 + m.phase);
      ctx.fillStyle = `rgba(255, 250, 210, ${a})`;
      ctx.beginPath();
      ctx.arc(m.x - px * 20, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSun(x: number, y: number, r: number): void {
    const { ctx, time } = this;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#fff7c2');
    g.addColorStop(0.6, '#ffd84d');
    g.addColorStop(1, '#ffb703');
    ctx.save();
    ctx.shadowColor = 'rgba(255, 200, 60, 0.8)';
    ctx.shadowBlur = r * 0.8;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Sleepy smiling face
    const blink = Math.sin(time * 0.9) > 0.97;
    ctx.strokeStyle = '#c2410c';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath();
    if (blink) {
      ctx.moveTo(x - r * 0.42, y - r * 0.1);
      ctx.lineTo(x - r * 0.18, y - r * 0.1);
      ctx.moveTo(x + r * 0.18, y - r * 0.1);
      ctx.lineTo(x + r * 0.42, y - r * 0.1);
    } else {
      ctx.arc(x - r * 0.3, y - r * 0.05, r * 0.13, Math.PI * 1.1, Math.PI * 1.9);
      ctx.moveTo(x + r * 0.43, y - r * 0.05);
      ctx.arc(x + r * 0.3, y - r * 0.05, r * 0.13, Math.PI * 1.1, Math.PI * 1.9);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + r * 0.12, r * 0.25, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 120, 80, 0.4)';
    ctx.beginPath();
    ctx.arc(x - r * 0.5, y + r * 0.2, r * 0.12, 0, Math.PI * 2);
    ctx.arc(x + r * 0.5, y + r * 0.2, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGrass(ox: number, oy: number): void {
    const { ctx, w, time } = this;
    const step = 9;
    ctx.save();
    ctx.translate(ox, oy);
    for (let x = -40; x < w + 40; x += step) {
      const base = this.frontY(x) + 3;
      const sway = Math.sin(time * 1.6 + x * 0.025) * 4 + Math.sin(time * 0.7 + x * 0.01) * 2;
      const hgt = 10 + ((x * 7919) % 9);
      ctx.fillStyle = (x / step) % 3 === 0 ? '#7ad672' : '#55b956';
      ctx.beginPath();
      ctx.moveTo(x - 3, base);
      ctx.quadraticCurveTo(x + sway * 0.4, base - hgt * 0.6, x + sway, base - hgt);
      ctx.quadraticCurveTo(x + sway * 0.3, base - hgt * 0.4, x + 3, base);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFlowers(ox: number, oy: number): void {
    const { ctx, time } = this;
    ctx.save();
    ctx.translate(ox, oy);
    for (const f of this.flowers) {
      const base = this.frontY(f.x) + 10;
      const sway = Math.sin(time * 1.4 + f.phase) * 5;
      const tx = f.x + sway;
      const ty = base - f.h;
      ctx.strokeStyle = '#2f8f3e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x, base);
      ctx.quadraticCurveTo(f.x, base - f.h * 0.5, tx, ty);
      ctx.stroke();
      ctx.fillStyle = f.color;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + time * 0.3;
        ctx.beginPath();
        ctx.arc(tx + Math.cos(a) * f.size * 0.7, ty + Math.sin(a) * f.size * 0.7, f.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath();
      ctx.arc(tx, ty, f.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawButterflies(): void {
    const { ctx, time } = this;
    for (const b of this.butterflies) {
      const flap = Math.abs(Math.sin(time * 14 + b.seed));
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(b.dir, 1);
      ctx.rotate(Math.sin(time * 2 + b.seed) * 0.15);
      ctx.fillStyle = b.color;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(0.25 + flap * 0.75, 1);
        ctx.beginPath();
        ctx.ellipse(side * 6, -4, 7, 9, side * 0.4, 0, Math.PI * 2);
        ctx.ellipse(side * 5, 6, 5, 6, -side * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#3b2f4a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.8, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
