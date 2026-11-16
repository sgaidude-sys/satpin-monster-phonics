/**
 * Dress-up accessories for Munchy. Every hat is drawn with the origin at the
 * top-centre of Munchy's head, in units of his body size `u`.
 */

const INK = '#123a4a';

const TOP_HATS = new Set(['party', 'crown', 'wizard', 'pirate', 'chef']);

export function hatHidesTuft(id: string | null): boolean {
  return !!id && TOP_HATS.has(id);
}

function outline(ctx: CanvasRenderingContext2D, u: number, w = 0.05): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * u;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function starShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function drawHat(ctx: CanvasRenderingContext2D, id: string, u: number, t = 0): void {
  ctx.save();
  switch (id) {
    case 'party': {
      ctx.rotate(-0.18);
      ctx.beginPath();
      ctx.moveTo(-0.34 * u, 0.06 * u);
      ctx.lineTo(0, -0.8 * u);
      ctx.lineTo(0.34 * u, 0.06 * u);
      ctx.quadraticCurveTo(0, 0.14 * u, -0.34 * u, 0.06 * u);
      ctx.closePath();
      const g = ctx.createLinearGradient(-0.3 * u, 0, 0.3 * u, 0);
      g.addColorStop(0, '#ff5d8f');
      g.addColorStop(1, '#ff9cc8');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 0.09 * u;
      for (let i = 0; i < 4; i++) {
        const y = -0.62 * u + i * 0.22 * u;
        ctx.beginPath();
        ctx.moveTo(-0.5 * u, y + 0.12 * u);
        ctx.lineTo(0.5 * u, y - 0.12 * u);
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-0.34 * u, 0.06 * u);
      ctx.lineTo(0, -0.8 * u);
      ctx.lineTo(0.34 * u, 0.06 * u);
      ctx.quadraticCurveTo(0, 0.14 * u, -0.34 * u, 0.06 * u);
      ctx.closePath();
      outline(ctx, u);
      // Pom-pom
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(0, -0.84 * u, 0.12 * u, 0, Math.PI * 2);
      ctx.fill();
      outline(ctx, u, 0.04);
      break;
    }
    case 'crown': {
      ctx.translate(0, 0.04 * u);
      ctx.beginPath();
      ctx.moveTo(-0.42 * u, 0);
      ctx.lineTo(-0.46 * u, -0.42 * u);
      ctx.lineTo(-0.24 * u, -0.22 * u);
      ctx.lineTo(0, -0.52 * u);
      ctx.lineTo(0.24 * u, -0.22 * u);
      ctx.lineTo(0.46 * u, -0.42 * u);
      ctx.lineTo(0.42 * u, 0);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -0.5 * u, 0, 0);
      g.addColorStop(0, '#fff3a0');
      g.addColorStop(0.5, '#ffd23f');
      g.addColorStop(1, '#f59e0b');
      ctx.fillStyle = g;
      ctx.fill();
      outline(ctx, u);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-0.42 * u, -0.12 * u, 0.84 * u, 0.1 * u);
      const gems: [number, number, string][] = [
        [-0.24 * u, -0.07 * u, '#ff4d6d'],
        [0, -0.07 * u, '#29b6f6'],
        [0.24 * u, -0.07 * u, '#2ed47a'],
      ];
      for (const [x, y, c] of gems) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, 0.06 * u, 0, Math.PI * 2);
        ctx.fill();
        outline(ctx, u, 0.025);
      }
      for (const x of [-0.46, 0, 0.46]) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x * u, (x === 0 ? -0.55 : -0.45) * u, 0.05 * u, 0, Math.PI * 2);
        ctx.fill();
        outline(ctx, u, 0.025);
      }
      // twinkle
      const tw = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.fillStyle = `rgba(255,255,255,${tw})`;
      starShape(ctx, 0.3 * u, -0.6 * u, 0.06 * u);
      ctx.fill();
      break;
    }
    case 'wizard': {
      ctx.rotate(0.08);
      ctx.fillStyle = '#6d3df5';
      ctx.beginPath();
      ctx.ellipse(0, 0.02 * u, 0.6 * u, 0.13 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      outline(ctx, u);
      ctx.beginPath();
      ctx.moveTo(-0.32 * u, 0);
      ctx.quadraticCurveTo(-0.1 * u, -0.6 * u, 0.05 * u, -0.95 * u);
      ctx.quadraticCurveTo(0.2 * u, -1.0 * u, 0.36 * u, -0.86 * u);
      ctx.quadraticCurveTo(0.18 * u, -0.7 * u, 0.32 * u, 0);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -0.9 * u, 0, 0);
      g.addColorStop(0, '#a78bfa');
      g.addColorStop(1, '#6d3df5');
      ctx.fillStyle = g;
      ctx.fill();
      outline(ctx, u);
      ctx.fillStyle = '#ffe14d';
      starShape(ctx, -0.04 * u, -0.32 * u, 0.1 * u);
      ctx.fill();
      outline(ctx, u, 0.025);
      starShape(ctx, 0.14 * u, -0.6 * u, 0.06 * u);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0.36 * u, -0.86 * u, 0.06 * u, 0, Math.PI * 2);
      ctx.fill();
      outline(ctx, u, 0.025);
      break;
    }
    case 'pirate': {
      ctx.translate(0, 0.06 * u);
      ctx.beginPath();
      ctx.moveTo(-0.62 * u, -0.02 * u);
      ctx.quadraticCurveTo(-0.5 * u, -0.5 * u, -0.2 * u, -0.42 * u);
      ctx.quadraticCurveTo(0, -0.62 * u, 0.2 * u, -0.42 * u);
      ctx.quadraticCurveTo(0.5 * u, -0.5 * u, 0.62 * u, -0.02 * u);
      ctx.quadraticCurveTo(0, -0.16 * u, -0.62 * u, -0.02 * u);
      ctx.closePath();
      ctx.fillStyle = '#2b2440';
      ctx.fill();
      outline(ctx, u);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 0.04 * u;
      ctx.beginPath();
      ctx.moveTo(-0.55 * u, -0.06 * u);
      ctx.quadraticCurveTo(0, -0.2 * u, 0.55 * u, -0.06 * u);
      ctx.stroke();
      // Skull
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -0.34 * u, 0.1 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-0.06 * u, -0.28 * u, 0.12 * u, 0.07 * u);
      ctx.fillStyle = '#2b2440';
      ctx.beginPath();
      ctx.arc(-0.04 * u, -0.35 * u, 0.025 * u, 0, Math.PI * 2);
      ctx.arc(0.04 * u, -0.35 * u, 0.025 * u, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'chef': {
      ctx.translate(0, 0.04 * u);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-0.24 * u, -0.38 * u, 0.2 * u, 0, Math.PI * 2);
      ctx.arc(0.24 * u, -0.38 * u, 0.2 * u, 0, Math.PI * 2);
      ctx.arc(0, -0.5 * u, 0.26 * u, 0, Math.PI * 2);
      ctx.fill();
      outline(ctx, u);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-0.24 * u, -0.38 * u, 0.17 * u, 0, Math.PI * 2);
      ctx.arc(0.24 * u, -0.38 * u, 0.17 * u, 0, Math.PI * 2);
      ctx.arc(0, -0.5 * u, 0.23 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-0.34 * u, -0.26 * u, 0.68 * u, 0.28 * u, 0.04 * u);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();
      outline(ctx, u);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.03 * u;
      for (const x of [-0.17, 0, 0.17]) {
        ctx.beginPath();
        ctx.moveTo(x * u, -0.22 * u);
        ctx.lineTo(x * u, -0.02 * u);
        ctx.stroke();
      }
      break;
    }
    case 'bow': {
      ctx.translate(-0.5 * u, 0.2 * u);
      ctx.rotate(-0.35);
      ctx.fillStyle = '#ff5d8f';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * 0.32 * u, -0.3 * u, s * 0.34 * u, 0);
        ctx.quadraticCurveTo(s * 0.32 * u, 0.28 * u, 0, 0);
        ctx.fill();
        outline(ctx, u, 0.045);
      }
      ctx.fillStyle = '#ff9cc8';
      ctx.beginPath();
      ctx.arc(0, 0, 0.08 * u, 0, Math.PI * 2);
      ctx.fill();
      outline(ctx, u, 0.04);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.ellipse(-0.18 * u, -0.08 * u, 0.06 * u, 0.03 * u, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'flower': {
      ctx.translate(0.52 * u, 0.22 * u);
      ctx.rotate(t * 0.4);
      const petals = ['#ff8fb3', '#ffb3cf', '#ff8fb3', '#ffb3cf', '#ff8fb3', '#ffb3cf'];
      petals.forEach((c, i) => {
        const a = (i / petals.length) * Math.PI * 2;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 0.13 * u, Math.sin(a) * 0.13 * u, 0.1 * u, 0.07 * u, a, 0, Math.PI * 2);
        ctx.fill();
        outline(ctx, u, 0.03);
      });
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(0, 0, 0.08 * u, 0, Math.PI * 2);
      ctx.fill();
      outline(ctx, u, 0.03);
      break;
    }
    case 'shades': {
      // Sits over the eyes (eyes are ~0.6u below the head top)
      ctx.translate(0, 0.6 * u);
      ctx.fillStyle = '#1b1530';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.roundRect(s * 0.34 * u - 0.24 * u, -0.17 * u, 0.48 * u, 0.32 * u, 0.12 * u);
        ctx.fill();
        outline(ctx, u, 0.045);
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.06 * u;
      ctx.beginPath();
      ctx.moveTo(-0.1 * u, -0.08 * u);
      ctx.quadraticCurveTo(0, -0.14 * u, 0.1 * u, -0.08 * u);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 0.04 * u;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 0.34 * u - 0.15 * u, -0.08 * u);
        ctx.lineTo(s * 0.34 * u - 0.05 * u, -0.12 * u);
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

/** Draws a hat centred and auto-fitted in a small canvas for menus. */
export function renderHatIcon(canvas: HTMLCanvasElement, id: string): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = canvas.clientWidth || 64;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  // Draw big off-screen, measure the painted area, then fit it into the tile.
  const S = 320;
  const off = document.createElement('canvas');
  off.width = off.height = S;
  const o = off.getContext('2d')!;
  o.translate(S / 2, S / 2);
  drawHat(o, id, 120, 0);
  const data = o.getImageData(0, 0, S, S).data;
  let x0 = S, y0 = S, x1 = 0, y1 = 0;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (data[(y * S + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const target = size * dpr * 0.86;
  const k = Math.min(target / w, target / h);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, x0, y0, w, h, (size * dpr - w * k) / 2, (size * dpr - h * k) / 2, w * k, h * k);
}
