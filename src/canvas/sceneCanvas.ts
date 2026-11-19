import { World3DScene } from './world3d';

/**
 * SceneCanvas facade: boots the AAA Three.js PBR + Post-Processing 3D storybook
 * world (`World3DScene`) with a safe 2D gradient fallback if WebGL is unavailable.
 */
export class SceneCanvas {
  private world3d: World3DScene | null = null;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private worldIndex = 0;

  constructor(canvas: HTMLCanvasElement) {
    try {
      this.world3d = new World3DScene(canvas);
    } catch {
      this.fallbackCanvas = canvas;
      this.drawFallback();
      window.addEventListener('resize', () => this.drawFallback());
    }
  }

  /** Smoothly crossfade the 3D biome lighting, fog, sky, and foliage to match a World (0..3). */
  setWorld(worldIndex: number): void {
    this.worldIndex = worldIndex;
    if (this.world3d) this.world3d.setWorld(worldIndex);
    else this.drawFallback();
  }

  /** Trigger the blooming 3D rainbow arc & golden impact glow for celebrations. */
  celebrate(seconds = 6): void {
    this.world3d?.celebrate(seconds);
  }

  /** Trigger dynamic 3D camera shake, FOV micro-kick & impact chromatic aberration. */
  triggerImpact(intensity = 0.5, accentHex?: string): void {
    this.world3d?.triggerImpact(intensity, accentHex);
  }

  /** Emit pooled HDR 3D bloom stars/sparks at screen coordinates. */
  triggerBurst(x: number, y: number, accentHex = '#ffd43b', count = 22): void {
    this.world3d?.triggerBurst(x, y, accentHex, count);
  }

  destroy(): void {
    this.world3d?.destroy();
  }

  private drawFallback(): void {
    if (!this.fallbackCanvas) return;
    const ctx = this.fallbackCanvas.getContext('2d');
    if (!ctx) return;
    const w = (this.fallbackCanvas.width = window.innerWidth);
    const h = (this.fallbackCanvas.height = window.innerHeight);
    const palettes: [string, string, string][] = [
      ['#4fb6f5', '#b9e7ff', '#62c95f'],
      ['#9b6dff', '#f7a8d8', '#7bdcb5'],
      ['#1e8be0', '#63d5f8', '#f2cd85'],
      ['#131138', '#2f256d', '#3a5a78'],
    ];
    const [top, mid, bot] = palettes[this.worldIndex % palettes.length];
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(0.68, mid);
    g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}
