export type MonsterMood = 'idle' | 'speaking' | 'happy' | 'spitOut';

export class MonsterCanvasController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mood: MonsterMood = 'idle';
  private moodTimer = 0;
  private rafId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private pointerNorm = { x: 0.5, y: 0.4 };
  private blinkTimer = 2.5;
  private isBlinking = false;

  // Squash and stretch spring state
  private scaleX = 1;
  private scaleY = 1;
  private targetScaleX = 1;
  private targetScaleY = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize 2D context for monster canvas');
    }
    this.ctx = context;
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointerMove);
    this.start();
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
  }

  public setMood(mood: MonsterMood, durationSec = 0): void {
    this.mood = mood;
    this.moodTimer = durationSec;

    if (mood === 'happy') {
      this.scaleX = 1.24;
      this.scaleY = 0.78;
    } else if (mood === 'spitOut') {
      this.scaleX = 0.8;
      this.scaleY = 1.22;
    } else if (mood === 'speaking') {
      this.scaleX = 1.1;
      this.scaleY = 0.92;
    }
  }

  public getMouthScreenPosition(): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.52,
      y: rect.top + rect.height * 0.61,
    };
  }

  private handlePointerMove = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const nx = (e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth * 0.6);
    const ny = (e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight * 0.6);
    this.pointerNorm.x = Math.max(-1, Math.min(1, nx));
    this.pointerNorm.y = Math.max(-1, Math.min(1, ny));
  };

  private handleResize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
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
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    this.elapsed += dt;

    if (this.moodTimer > 0) {
      this.moodTimer -= dt;
      if (this.moodTimer <= 0) {
        this.mood = 'idle';
      }
    }

    // Blinking
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      if (this.isBlinking) {
        this.isBlinking = false;
        this.blinkTimer = 2.2 + Math.random() * 2.5;
      } else {
        this.isBlinking = true;
        this.blinkTimer = 0.13;
      }
    }

    // Idle breathing squash & stretch
    const breath = Math.sin(this.elapsed * 3.1);
    if (this.mood === 'happy') {
      const jump = Math.abs(Math.sin(this.elapsed * 10));
      this.targetScaleX = 1 - jump * 0.1;
      this.targetScaleY = 1 + jump * 0.12;
    } else if (this.mood === 'speaking') {
      const talkBounce = Math.sin(this.elapsed * 14);
      this.targetScaleX = 1 + talkBounce * 0.04;
      this.targetScaleY = 1 - talkBounce * 0.04;
    } else if (this.mood === 'spitOut') {
      this.targetScaleX = 1 + Math.sin(this.elapsed * 22) * 0.06;
      this.targetScaleY = 1 - Math.sin(this.elapsed * 22) * 0.06;
    } else {
      this.targetScaleX = 1 + breath * 0.03;
      this.targetScaleY = 1 - breath * 0.03;
    }

    const lerpSpeed = Math.min(1, dt * 12);
    this.scaleX += (this.targetScaleX - this.scaleX) * lerpSpeed;
    this.scaleY += (this.targetScaleY - this.scaleY) * lerpSpeed;
  }

  private render(): void {
    this.handleResize();
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const baseSize = Math.min(w, h) * 0.42;
    const groundY = h * 0.86;

    let jumpOffsetY = 0;
    let wobbleAngle = 0;
    if (this.mood === 'happy') {
      jumpOffsetY = -Math.abs(Math.sin(this.elapsed * 9)) * baseSize * 0.24;
      wobbleAngle = Math.sin(this.elapsed * 12) * 0.06;
    } else if (this.mood === 'spitOut') {
      wobbleAngle = Math.sin(this.elapsed * 26) * 0.1;
    }

    // Ground shadow
    const shadowScale = Math.max(0.65, 1 + jumpOffsetY / (baseSize * 1.4));
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.beginPath();
    ctx.ellipse(cx, groundY, baseSize * 0.72 * shadowScale, baseSize * 0.14 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Monster body transform anchored at feet
    ctx.save();
    ctx.translate(cx, groundY + jumpOffsetY);
    ctx.rotate(wobbleAngle);
    ctx.scale(this.scaleX, this.scaleY);

    const bodyCenterY = -baseSize * 0.92;

    // Little feet
    this.drawFoot(ctx, -baseSize * 0.36, -baseSize * 0.06, baseSize);
    this.drawFoot(ctx, baseSize * 0.36, -baseSize * 0.06, baseSize);

    // Waving arms
    const armWave = this.mood === 'happy' ? Math.sin(this.elapsed * 16) * 0.45 : Math.sin(this.elapsed * 3.1) * 0.12;
    this.drawArm(ctx, -baseSize * 0.78, bodyCenterY + baseSize * 0.12, baseSize, -1, armWave);
    this.drawArm(ctx, baseSize * 0.78, bodyCenterY + baseSize * 0.12, baseSize, 1, -armWave);

    // Cute horns
    this.drawHorn(ctx, -baseSize * 0.42, bodyCenterY - baseSize * 0.72, baseSize, -0.35);
    this.drawHorn(ctx, baseSize * 0.42, bodyCenterY - baseSize * 0.72, baseSize, 0.35);

    // Main fuzzy body (teal/mint gradient)
    const bodyGrad = ctx.createRadialGradient(
      -baseSize * 0.2,
      bodyCenterY - baseSize * 0.3,
      baseSize * 0.1,
      0,
      bodyCenterY,
      baseSize * 1.05
    );
    bodyGrad.addColorStop(0, '#5eead4');
    bodyGrad.addColorStop(0.65, '#14b8a6');
    bodyGrad.addColorStop(1, '#0f766e');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(0, bodyCenterY - baseSize * 0.9);
    ctx.bezierCurveTo(
      baseSize * 0.95,
      bodyCenterY - baseSize * 0.9,
      baseSize * 1.02,
      bodyCenterY + baseSize * 0.85,
      0,
      bodyCenterY + baseSize * 0.88
    );
    ctx.bezierCurveTo(
      -baseSize * 1.02,
      bodyCenterY + baseSize * 0.85,
      -baseSize * 0.95,
      bodyCenterY - baseSize * 0.9,
      0,
      bodyCenterY - baseSize * 0.9
    );
    ctx.fill();

    // Soft belly patch
    ctx.fillStyle = 'rgba(204, 251, 241, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, bodyCenterY + baseSize * 0.34, baseSize * 0.52, baseSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rosy cheeks
    ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-baseSize * 0.5, bodyCenterY + baseSize * 0.02, baseSize * 0.14, baseSize * 0.09, 0, 0, Math.PI * 2);
    ctx.ellipse(baseSize * 0.5, bodyCenterY + baseSize * 0.02, baseSize * 0.14, baseSize * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeY = bodyCenterY - baseSize * 0.24;
    const eyeOffsetX = baseSize * 0.3;
    this.drawEye(ctx, -eyeOffsetX, eyeY, baseSize * 0.22);
    this.drawEye(ctx, eyeOffsetX, eyeY, baseSize * 0.22);

    // Mouth
    this.drawMouth(ctx, 0, bodyCenterY + baseSize * 0.16, baseSize);

    // Sound waves when speaking
    if (this.mood === 'speaking') {
      this.drawSoundWaves(ctx, baseSize * 0.95, bodyCenterY - baseSize * 0.35, baseSize);
    }

    ctx.restore();
  }

  private drawFoot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.fillStyle = '#0d9488';
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.22, size * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawArm(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    dir: number,
    angle: number
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#14b8a6';
    ctx.beginPath();
    ctx.ellipse(dir * size * 0.14, 0, size * 0.22, size * 0.11, dir * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawHorn(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tilt: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(-size * 0.12, size * 0.12);
    ctx.quadraticCurveTo(0, -size * 0.34, size * 0.12, size * 0.12);
    ctx.closePath();
    ctx.fill();

    // Cute horn stripe
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size * 0.05, -size * 0.02);
    ctx.lineTo(size * 0.05, -size * 0.05);
    ctx.stroke();
    ctx.restore();
  }

  private drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    if (this.mood === 'happy') {
      // Happy ^ ^ eyes
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(3, radius * 0.26);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y + radius * 0.2, radius * 0.72, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      return;
    }

    if (this.mood === 'spitOut') {
      // Silly > < eyes
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(3, radius * 0.24);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const dir = x < 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x - dir * radius * 0.5, y - radius * 0.4);
      ctx.lineTo(x + dir * radius * 0.4, y);
      ctx.lineTo(x - dir * radius * 0.5, y + radius * 0.4);
      ctx.stroke();
      return;
    }

    if (this.isBlinking) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(3, radius * 0.22);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.75, y);
      ctx.lineTo(x + radius * 0.75, y);
      ctx.stroke();
      return;
    }

    // Big glossy eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    const lookX = this.pointerNorm.x * radius * 0.28;
    const lookY = this.pointerNorm.y * radius * 0.24;

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x + lookX, y + lookY, radius * 0.54, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + lookX - radius * 0.18, y + lookY - radius * 0.22, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMouth(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    if (this.mood === 'speaking') {
      const open = 0.5 + 0.5 * Math.sin(this.elapsed * 18);
      const rx = size * 0.22;
      const ry = size * (0.09 + open * 0.15);
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.ellipse(x, y + size * 0.06, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cute tongue
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(x, y + size * 0.08 + ry * 0.4, rx * 0.6, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (this.mood === 'happy') {
      // Big open joyful smile
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.arc(x, y, size * 0.34, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      // Cute tooth
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(x - size * 0.16, y, size * 0.1, size * 0.09, 3);
      ctx.roundRect(x + size * 0.06, y, size * 0.1, size * 0.09, 3);
      ctx.fill();

      // Tongue
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(x, y + size * 0.22, size * 0.18, size * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (this.mood === 'spitOut') {
      // Silly wavy "bleh" mouth
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(3, size * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - size * 0.22, y + size * 0.05);
      ctx.quadraticCurveTo(x - size * 0.1, y - size * 0.04, x, y + size * 0.05);
      ctx.quadraticCurveTo(x + size * 0.1, y + size * 0.14, x + size * 0.22, y + size * 0.05);
      ctx.stroke();

      // Silly tongue sticking out
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.roundRect(x - size * 0.08, y + size * 0.06, size * 0.16, size * 0.18, size * 0.08);
      ctx.fill();
      return;
    }

    // Friendly idle smile with one cute little tooth
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(3, size * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y - size * 0.04, size * 0.26, 0.22 * Math.PI, 0.78 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x - size * 0.08, y + size * 0.17, size * 0.09, size * 0.07, 2);
    ctx.fill();
  }

  private drawSoundWaves(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const pulse = (this.elapsed * 3) % 1;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const p = (pulse + i * 0.33) % 1;
      const radius = size * (0.18 + p * 0.34);
      ctx.strokeStyle = `rgba(14, 165, 233, ${(1 - p) * 0.85})`;
      ctx.lineWidth = Math.max(2.5, size * 0.035);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, radius, -0.32 * Math.PI, 0.32 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }
}
