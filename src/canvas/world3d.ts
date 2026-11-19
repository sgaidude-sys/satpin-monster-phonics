import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * AAA Three.js Living Storybook World Renderer.
 *
 * Features:
 * - 4 smoothly morphing 3D biomes matching the 4 Adventure Map worlds:
 *     0: Sunny Meadow  (golden-hour meadow, blossom trees, warm pollen)
 *     1: Candy Forest  (cotton-candy twilight, pastel hills, sugar sparkles)
 *     2: Ocean Shore   (turquoise sunlit cove, shimmering water, sea sparkles)
 *     3: Starry Hills  (enchanted indigo dusk, aurora glow, golden fireflies)
 * - Physically-based materials (PBR) with procedural tactile micro-grain
 *   bump & roughness maps.
 * - Cinematic three-point + hemisphere + rim lighting with ACES Filmic
 *   tone mapping, 2048x2048 PCFSoftShadowMap, and atmospheric FogExp2.
 * - Tuned post-processing stack: RenderPass -> selective UnrealBloomPass ->
 *   custom Cinematic ShaderPass (vignette, color grade, impact chromatic
 *   aberration & radial pulse) -> OutputPass.
 * - Zero-allocation pooled 3D particle systems (ambient life + celebration
 *   emissive bursts) and spring-damped dynamic camera with impact kicks.
 */

interface BiomePalette {
  skyTop: number;
  skyMid: number;
  skyHorizon: number;
  fog: number;
  fogDensity: number;
  sunColor: number;
  sunEmissive: number;
  sunPos: [number, number, number];
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  keyColor: number;
  keyIntensity: number;
  rimColor: number;
  rimIntensity: number;
  farHill: number;
  midHill: number;
  frontHill: number;
  treePrimary: number;
  treeAccent: number;
  trunk: number;
  cloudTint: number;
  moteColor: number;
  waterOpacity: number;
  waterColor: number;
  starOpacity: number;
  auroraOpacity: number;
  bloomStrength: number;
  exposure: number;
}

const BIOMES: BiomePalette[] = [
  // 0: Sunny Meadow
  {
    skyTop: 0x2692eb,
    skyMid: 0x74cbff,
    skyHorizon: 0xffecc2,
    fog: 0xd0efff,
    fogDensity: 0.0115,
    sunColor: 0xffdf78,
    sunEmissive: 0xffcc3d,
    sunPos: [14, 11.5, -26],
    hemiSky: 0xb2e3ff,
    hemiGround: 0x4ca852,
    hemiIntensity: 1.0,
    keyColor: 0xfff1cc,
    keyIntensity: 2.25,
    rimColor: 0xffc857,
    rimIntensity: 0.92,
    farHill: 0x67be9e,
    midHill: 0x56be62,
    frontHill: 0x44af4f,
    treePrimary: 0x45b057,
    treeAccent: 0xff8fbd,
    trunk: 0x865533,
    cloudTint: 0xffffff,
    moteColor: 0xfff3a0,
    waterOpacity: 0.0,
    waterColor: 0x22c8e8,
    starOpacity: 0.0,
    auroraOpacity: 0.0,
    bloomStrength: 0.3,
    exposure: 1.01,
  },
  // 1: Candy Forest
  {
    skyTop: 0x9b6dff,
    skyMid: 0xf7a8d8,
    skyHorizon: 0xffe6cc,
    fog: 0xf9d8ee,
    fogDensity: 0.015,
    sunColor: 0xffd1ea,
    sunEmissive: 0xff8ec8,
    sunPos: [12, 10, -26],
    hemiSky: 0xffd6f0,
    hemiGround: 0xc084fc,
    hemiIntensity: 1.1,
    keyColor: 0xffe9f5,
    keyIntensity: 2.15,
    rimColor: 0x7dd3fc,
    rimIntensity: 1.1,
    farHill: 0xc49bf2,
    midHill: 0xf48fb8,
    frontHill: 0x7bdcb5,
    treePrimary: 0xff7eb6,
    treeAccent: 0x7ee8fa,
    trunk: 0xc07a60,
    cloudTint: 0xfff0f7,
    moteColor: 0xffe484,
    waterOpacity: 0.0,
    waterColor: 0x67e8f9,
    starOpacity: 0.2,
    auroraOpacity: 0.15,
    bloomStrength: 0.44,
    exposure: 1.04,
  },
  // 2: Ocean Shore
  {
    skyTop: 0x1e8be0,
    skyMid: 0x63d5f8,
    skyHorizon: 0xfff5d1,
    fog: 0xc9f2ff,
    fogDensity: 0.013,
    sunColor: 0xfff0a8,
    sunEmissive: 0xffdf6b,
    sunPos: [15, 12, -26],
    hemiSky: 0xa5f3fc,
    hemiGround: 0xf4cc86,
    hemiIntensity: 1.15,
    keyColor: 0xfff8e2,
    keyIntensity: 2.45,
    rimColor: 0x38bdf8,
    rimIntensity: 1.05,
    farHill: 0x4cc4cf,
    midHill: 0x34b3c8,
    frontHill: 0xf2cd85,
    treePrimary: 0x2ec492,
    treeAccent: 0xff9f68,
    trunk: 0xa47449,
    cloudTint: 0xf5fdff,
    moteColor: 0xc4f7ff,
    waterOpacity: 0.88,
    waterColor: 0x16b8d8,
    starOpacity: 0.0,
    auroraOpacity: 0.0,
    bloomStrength: 0.38,
    exposure: 1.08,
  },
  // 3: Starry Hills
  {
    skyTop: 0x131138,
    skyMid: 0x2f256d,
    skyHorizon: 0x6f4ba8,
    fog: 0x362a6e,
    fogDensity: 0.017,
    sunColor: 0xfff7cc,
    sunEmissive: 0xffe999,
    sunPos: [13, 12, -26],
    hemiSky: 0x818cf8,
    hemiGround: 0x3b2c68,
    hemiIntensity: 0.9,
    keyColor: 0xd9e3ff,
    keyIntensity: 1.85,
    rimColor: 0xc084fc,
    rimIntensity: 1.35,
    farHill: 0x37306b,
    midHill: 0x4c3f8c,
    frontHill: 0x3a5a78,
    treePrimary: 0x5c52b5,
    treeAccent: 0x6ee7b7,
    trunk: 0x4a3b69,
    cloudTint: 0xb8b2e8,
    moteColor: 0xffe46b,
    waterOpacity: 0.0,
    waterColor: 0x4f46e5,
    starOpacity: 1.0,
    auroraOpacity: 0.72,
    bloomStrength: 0.56,
    exposure: 1.05,
  },
];

/* ------------------------------------------------------------------ */
/*  Custom Shaders                                                     */
/* ------------------------------------------------------------------ */

const SKY_VERT = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uTopColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uTime;
  uniform float uAurora;
  uniform float uStars;
  varying vec3 vWorldDir;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y * 1.15 + 0.08, 0.0, 1.0);
    vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.42, h));
    col = mix(col, uTopColor, smoothstep(0.35, 0.95, h));

    // Warm sun / moon glow & soft god-ray spokes
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float halo = pow(sunDot, 12.0) * 0.45 + pow(sunDot, 96.0) * 0.75;
    float angle = atan(dir.y - uSunDir.y * 0.03, dir.x - uSunDir.x * 0.03);
    float rays = (0.5 + 0.5 * sin(angle * 12.0 + uTime * 0.25)) * pow(sunDot, 4.0) * 0.14;
    col += uSunColor * (halo + rays);

    // Subtle enchanted aurora ribbons in Starry Hills
    if (uAurora > 0.01 && h > 0.12) {
      float wave = sin(dir.x * 5.0 + uTime * 0.45 + sin(dir.z * 3.0 + uTime * 0.3));
      float band = exp(-pow((h - 0.44 - wave * 0.08) * 7.0, 2.0));
      vec3 aurCol = mix(vec3(0.28, 0.95, 0.78), vec3(0.75, 0.42, 1.0), 0.5 + 0.5 * sin(dir.x * 3.0 - uTime * 0.35));
      col += aurCol * band * uAurora * 0.55;
    }

    // Crisp procedural starfield in dusk/night worlds
    if (uStars > 0.01 && h > 0.1) {
      vec2 grid = floor(dir.xz / max(0.15, dir.y + 0.25) * 48.0);
      float rnd = hash(grid);
      if (rnd > 0.972) {
        float twinkle = 0.55 + 0.45 * sin(uTime * (2.5 + fract(rnd * 19.0) * 4.0) + rnd * 60.0);
        col += vec3(1.0, 0.97, 0.86) * twinkle * uStars * smoothstep(0.1, 0.4, h) * 1.1;
      }
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const CINEMATIC_POST_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uImpact: { value: 0 },
    uVignette: { value: 0.24 },
    uWarmth: { value: 0.04 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uImpact;
    uniform float uVignette;
    uniform float uWarmth;
    varying vec2 vUv;

    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);

      // Brief radial micro-zoom & subtle chromatic aberration on big impacts
      vec2 uv = vUv - center * (uImpact * 0.018);
      float ca = uImpact * 0.0085 * dist;
      vec2 offset = (dist > 0.0001 ? normalize(center) : vec2(0.0)) * ca;

      float r = texture2D(tDiffuse, uv + offset).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - offset).b;
      vec3 col = vec3(r, g, b);

      // Gentle storybook color grading (soft vibrance + warm sunlit highlights)
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(luma), col, 1.08);
      col.r += uWarmth * (1.0 - luma) * 0.18;
      col.b += uWarmth * 0.06;

      // Soft cinematic vignette
      float vig = smoothstep(0.96, 0.32, dist);
      col *= mix(1.0 - uVignette, 1.0, vig);

      // Subtle golden highlight flash on heavy impacts
      col += vec3(1.0, 0.96, 0.85) * (uImpact * 0.08);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

/* ------------------------------------------------------------------ */
/*  Procedural PBR Texture Generators (zero external asset failures)   */
/* ------------------------------------------------------------------ */

function makeFeltBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  const d = img.data;
  // Tactile soft meadow / felt noise + gentle grass grain
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n1 = Math.sin(x * 0.147 + y * 0.073) * 0.25 + Math.cos(y * 0.196 - x * 0.098) * 0.25;
      const n2 = (Math.random() - 0.5) * 0.32;
      const v = Math.max(0, Math.min(255, Math.floor((0.55 + n1 * 0.35 + n2) * 255)));
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 5);
  return tex;
}

function makeBarkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#909090';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 128;
    const w = 2 + Math.random() * 5;
    g.fillStyle = Math.random() < 0.5 ? '#c8c8c8' : '#585858';
    g.fillRect(x, 0, w, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function makeGlowSpriteTexture(): THREE.CanvasTexture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.28, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.65, 'rgba(255,255,255,0.2)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------------ */
/*  Pooled 3D Burst Particles                                          */
/* ------------------------------------------------------------------ */

interface BurstParticle3D {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  vRot: number;
  scale: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface Cloud3D {
  group: THREE.Group;
  speed: number;
  baseY: number;
  phase: number;
}

interface Tree3D {
  group: THREE.Group;
  phase: number;
  isAccent: boolean;
  lanternMat?: THREE.MeshStandardMaterial;
}

interface Butterfly3D {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  angle: number;
  speed: number;
  radiusX: number;
  radiusZ: number;
  baseY: number;
  seed: number;
}

const BURST_POOL_SIZE = 180;
const AMBIENT_COUNT = 130;
const GRASS_COUNT = 160;
const FLOWER_COUNT = 42;

export class World3DScene {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private postPass!: ShaderPass;

  // Lighting & Atmosphere
  private skyMat!: THREE.ShaderMaterial;
  private fog!: THREE.FogExp2;
  private hemiLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private impactLight!: THREE.PointLight;
  private sunOrb!: THREE.Mesh;
  private sunMat!: THREE.MeshBasicMaterial;

  // Environment Meshes
  private farHillMat!: THREE.MeshStandardMaterial;
  private midHillMat!: THREE.MeshStandardMaterial;
  private frontHillMat!: THREE.MeshStandardMaterial;
  private waterMesh!: THREE.Mesh;
  private waterMat!: THREE.MeshPhysicalMaterial;
  private treePrimaryMat!: THREE.MeshStandardMaterial;
  private treeAccentMat!: THREE.MeshStandardMaterial;
  private trunkMat!: THREE.MeshStandardMaterial;
  private cloudMat!: THREE.MeshStandardMaterial;
  private grassMesh!: THREE.InstancedMesh;
  private grassBase!: { x: number; y: number; z: number; h: number; phase: number; rotY: number }[];
  private flowerStemMesh!: THREE.InstancedMesh;
  private flowerHeadMesh!: THREE.InstancedMesh;
  private flowerCenterMesh!: THREE.InstancedMesh;
  private flowerBase!: { x: number; y: number; z: number; h: number; phase: number }[];
  private trees: Tree3D[] = [];
  private clouds: Cloud3D[] = [];
  private butterflies: Butterfly3D[] = [];
  private rainbowGroup!: THREE.Group;
  private rainbowMats: THREE.MeshBasicMaterial[] = [];

  // Pooled 3D Particles
  private ambientPoints!: THREE.Points;
  private ambientPos!: Float32Array;
  private ambientMeta!: { speed: number; phase: number; radius: number }[];
  private ambientMat!: THREE.PointsMaterial;

  private burstMesh!: THREE.InstancedMesh;
  private burstPool: BurstParticle3D[] = [];
  private burstCursor = 0;

  // State & Dynamics
  private running = true;
  private raf = 0;
  private time = 0;
  private last = 0;
  private worldIndex = 0;
  private pointer = { x: 0, y: 0 };
  private smoothPointer = { x: 0, y: 0 };
  private rainbowAlpha = 0;
  private rainbowTarget = 0;
  private rainbowTimeout: number | undefined;

  // Dynamic Camera Shake / Kick & Impact Post
  private camShake = 0;
  private camZoomKick = 0;
  private impactStrength = 0;
  private impactLightEnergy = 0;
  private reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  // Reusable scratch objects (zero per-frame allocations)
  private readonly tmpObj = new THREE.Object3D();
  private readonly tmpColor = new THREE.Color();
  private readonly tmpVec = new THREE.Vector3();
  private readonly tmpRay = new THREE.Vector3();

  private onResizeBound = () => this.resize();
  private onPointerBound = (e: PointerEvent) => {
    this.pointer.x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    this.pointer.y = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
  };
  private onContextLostBound = (e: Event) => {
    e.preventDefault();
    this.running = false;
  };
  private onContextRestoredBound = () => {
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initRenderer();
    this.initLightingAndSky();
    this.initTerrainAndProps();
    this.initPooledParticles();
    this.initPostProcessing();
    this.applyBiomeImmediate(0);

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('pointermove', this.onPointerBound, { passive: true });
    this.canvas.addEventListener('webglcontextlost', this.onContextLostBound);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestoredBound);

    this.resize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /** Smoothly crossfade the 3D world lighting, fog, sky, and biome colors. */
  setWorld(worldIndex: number): void {
    this.worldIndex = Math.max(0, Math.min(BIOMES.length - 1, worldIndex));
  }

  /** Show the luminous blooming 3D rainbow arc for celebrations. */
  celebrate(seconds = 6): void {
    this.rainbowTarget = 1;
    clearTimeout(this.rainbowTimeout);
    this.rainbowTimeout = window.setTimeout(() => {
      this.rainbowTarget = 0;
    }, seconds * 1000);
    this.triggerImpact(0.75);
  }

  /**
   * Triggers dynamic camera punch, subtle FOV kick, warm point light flash,
   * and brief chromatic aberration pulse on heavy gameplay impacts.
   */
  triggerImpact(intensity = 0.5, accentHex?: string): void {
    if (this.reduceMotion) return;
    const clamped = Math.max(0, Math.min(1.2, intensity));
    this.camShake = Math.max(this.camShake, clamped * 0.45);
    this.camZoomKick = Math.max(this.camZoomKick, clamped * 1.4);
    this.impactStrength = Math.max(this.impactStrength, clamped);
    this.impactLightEnergy = Math.max(this.impactLightEnergy, clamped * 9);
    if (accentHex) {
      this.impactLight.color.set(accentHex);
    } else {
      this.impactLight.color.set(0xffe484);
    }
  }

  /**
   * Projects a 2D screen coordinate into the 3D storybook world and emits a
   * pooled bloom-enabled 3D star/spark burst.
   */
  triggerBurst(screenX: number, screenY: number, accentHex = '#ffd43b', count = 20): void {
    const ndcX = (screenX / Math.max(1, window.innerWidth)) * 2 - 1;
    const ndcY = -(screenY / Math.max(1, window.innerHeight)) * 2 + 1;

    this.tmpRay.set(ndcX, ndcY, 0.5).unproject(this.camera);
    const dir = this.tmpRay.sub(this.camera.position).normalize();
    const dist = 10.5;
    const wx = this.camera.position.x + dir.x * dist;
    const wy = this.camera.position.y + dir.y * dist;
    const wz = this.camera.position.z + dir.z * dist;

    this.impactLight.position.set(wx, wy, wz + 2);
    const palette = [accentHex, '#fff4a3', '#ffffff', '#7dd3fc', '#ff9cc8'];

    for (let i = 0; i < count; i++) {
      const p = this.burstPool[this.burstCursor];
      this.burstCursor = (this.burstCursor + 1) % BURST_POOL_SIZE;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.3) * Math.PI;
      const sp = 3.2 + Math.random() * 5.8;
      p.active = true;
      p.x = wx + (Math.random() - 0.5) * 0.4;
      p.y = wy + (Math.random() - 0.5) * 0.4;
      p.z = wz + (Math.random() - 0.5) * 0.6;
      p.vx = Math.cos(theta) * Math.cos(phi) * sp;
      p.vy = Math.sin(phi) * sp + 2.8;
      p.vz = Math.sin(theta) * Math.cos(phi) * sp * 0.5;
      p.rotX = Math.random() * Math.PI;
      p.rotY = Math.random() * Math.PI;
      p.vRot = (Math.random() - 0.5) * 10;
      p.scale = 0.14 + Math.random() * 0.16;
      p.life = 0;
      p.maxLife = 0.75 + Math.random() * 0.65;
      p.color.set(palette[i % palette.length]).multiplyScalar(1.35); // HDR push for selective bloom
    }
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.rainbowTimeout);
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('pointermove', this.onPointerBound);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLostBound);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestoredBound);
    this.composer?.dispose();
    this.renderer?.dispose();
  }

  /* ---------------------------------------------------------------- */
  /*  Setup                                                            */
  /* ---------------------------------------------------------------- */

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0xdff5ff, 0.014);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(44, window.innerWidth / Math.max(1, window.innerHeight), 0.5, 160);
    this.camera.position.set(0, 4.4, 15.5);
    this.camera.lookAt(0, 2.2, -4);
  }

  private initLightingAndSky(): void {
    // Atmospheric Sky Dome
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x3ba8f5) },
        uMidColor: { value: new THREE.Color(0x8fd6ff) },
        uHorizonColor: { value: new THREE.Color(0xfff3d4) },
        uSunDir: { value: new THREE.Vector3(14, 11, -26).normalize() },
        uSunColor: { value: new THREE.Color(0xffe484) },
        uTime: { value: 0 },
        uAurora: { value: 0 },
        uStars: { value: 0 },
      },
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 24), this.skyMat);
    this.scene.add(skyDome);

    // Emissive Sun / Moon Orb (blooms softly)
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xffd24c, fog: false });
    this.sunOrb = new THREE.Mesh(new THREE.SphereGeometry(2.3, 28, 24), this.sunMat);
    this.sunOrb.position.set(14, 11, -26);
    this.scene.add(this.sunOrb);

    // 1. Hemisphere Sky/Ground bounce light
    this.hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x5ab85c, 1.05);
    this.scene.add(this.hemiLight);

    // 2. Directional Key Light with high-res PCFSoftShadowMap
    this.keyLight = new THREE.DirectionalLight(0xfff4d6, 2.35);
    this.keyLight.position.set(14, 18, 10);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 55;
    const d = 22;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.03;
    this.scene.add(this.keyLight);

    // 3. Rim / Backlight for lush Pixar silhouette readability
    this.rimLight = new THREE.DirectionalLight(0xffcf70, 0.95);
    this.rimLight.position.set(-14, 9, -14);
    this.scene.add(this.rimLight);

    // Dynamic impact point light
    this.impactLight = new THREE.PointLight(0xffe484, 0, 26, 1.6);
    this.impactLight.position.set(0, 4, 5);
    this.scene.add(this.impactLight);
  }

  private frontHillHeight(x: number, z: number): number {
    return (
      Math.sin(x * 0.22 + 1.1) * 0.55 +
      Math.cos(z * 0.26 + 0.4) * 0.42 +
      Math.sin((x + z) * 0.42) * 0.16 -
      0.8
    );
  }

  private initTerrainAndProps(): void {
    const feltBump = makeFeltBumpTexture();
    const barkBump = makeBarkTexture();

    // ---- Front Lush Storybook Hill (high detail PBR, seamless depth overlap into mid-hill)
    this.frontHillMat = new THREE.MeshStandardMaterial({
      color: 0x44af4f,
      roughness: 0.86,
      metalness: 0.02,
      bumpMap: feltBump,
      bumpScale: 0.09,
    });
    const frontGeo = new THREE.PlaneGeometry(58, 34, 72, 40);
    frontGeo.rotateX(-Math.PI / 2);
    const fPos = frontGeo.attributes.position;
    for (let i = 0; i < fPos.count; i++) {
      const x = fPos.getX(i);
      const z = fPos.getZ(i);
      // Gentle rise toward the back edge so frontHill melds seamlessly into midHill with zero gap
      const backLift = Math.max(0, -z - 4) * 0.14;
      fPos.setY(i, this.frontHillHeight(x, z) + backLift);
    }
    frontGeo.computeVertexNormals();
    const frontHill = new THREE.Mesh(frontGeo, this.frontHillMat);
    frontHill.position.set(0, 0, 2);
    frontHill.receiveShadow = true;
    this.scene.add(frontHill);

    // ---- Mid Rolling Hills (generous depth & height overlap)
    this.midHillMat = new THREE.MeshStandardMaterial({
      color: 0x56be62,
      roughness: 0.88,
      metalness: 0.02,
      bumpMap: feltBump,
      bumpScale: 0.07,
    });
    const midGeo = new THREE.PlaneGeometry(80, 32, 64, 28);
    midGeo.rotateX(-Math.PI / 2);
    const mPos = midGeo.attributes.position;
    for (let i = 0; i < mPos.count; i++) {
      const x = mPos.getX(i);
      const z = mPos.getZ(i);
      const mound = Math.sin(x * 0.14 + 2.4) * 1.9 + Math.cos(x * 0.29) * 0.7 - Math.abs(z) * 0.06 + 1.45;
      mPos.setY(i, mound);
    }
    midGeo.computeVertexNormals();
    const midHill = new THREE.Mesh(midGeo, this.midHillMat);
    midHill.position.set(0, -0.35, -13);
    midHill.receiveShadow = true;
    this.scene.add(midHill);

    // ---- Far Misty Mountains
    this.farHillMat = new THREE.MeshStandardMaterial({
      color: 0x76c8a8,
      roughness: 0.94,
      metalness: 0.0,
    });
    const farGeo = new THREE.PlaneGeometry(115, 28, 64, 16);
    farGeo.rotateX(-Math.PI / 2);
    const farPos = farGeo.attributes.position;
    for (let i = 0; i < farPos.count; i++) {
      const x = farPos.getX(i);
      const z = farPos.getZ(i);
      const ridge =
        Math.sin(x * 0.09 + 0.5) * 3.6 +
        Math.cos(x * 0.19 - 1.0) * 1.8 +
        Math.max(0, 1 - Math.abs(z) / 14) * 2.2;
      farPos.setY(i, ridge);
    }
    farGeo.computeVertexNormals();
    const farHill = new THREE.Mesh(farGeo, this.farHillMat);
    farHill.position.set(0, 0.3, -28);
    this.scene.add(farHill);

    // ---- Ocean Shore Shimmering Water Plane (smoothly fades in for World 2)
    this.waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x16b8d8,
      roughness: 0.14,
      metalness: 0.12,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      bumpMap: feltBump,
      bumpScale: 0.06,
      transparent: true,
      opacity: 0,
    });
    const waterGeo = new THREE.PlaneGeometry(90, 26, 48, 16);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.position.set(0, 0.25, -10.5);
    this.waterMesh.receiveShadow = true;
    this.waterMesh.visible = false;
    this.scene.add(this.waterMesh);

    // ---- Stylized 3D Storybook Trees (with cast shadows + glowing evening lanterns)
    this.treePrimaryMat = new THREE.MeshStandardMaterial({
      color: 0x4db85d,
      roughness: 0.78,
      metalness: 0.03,
      bumpMap: feltBump,
      bumpScale: 0.06,
    });
    this.treeAccentMat = new THREE.MeshStandardMaterial({
      color: 0xff9ec7,
      roughness: 0.65,
      metalness: 0.04,
      bumpMap: feltBump,
      bumpScale: 0.05,
    });
    this.trunkMat = new THREE.MeshStandardMaterial({
      color: 0x8c5c3a,
      roughness: 0.9,
      metalness: 0.02,
      bumpMap: barkBump,
      bumpScale: 0.08,
    });

    const treeSpots: [number, number, number, boolean][] = [
      [-15.5, -10, 1.35, false],
      [-11.2, -8.5, 1.05, true],
      [-7.4, -12.5, 1.2, false],
      [-2.8, -13.2, 0.95, true],
      [3.5, -13.0, 1.15, false],
      [8.2, -10.4, 1.25, true],
      [12.4, -8.8, 1.1, false],
      [16.2, -11.2, 1.3, false],
      [-14.2, -3.2, 0.85, true],
      [14.6, -3.5, 0.9, false],
    ];

    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.36, 2.3, 10);
    const puffGeo = new THREE.IcosahedronGeometry(1.15, 2);
    const lanternGeo = new THREE.SphereGeometry(0.18, 12, 10);

    for (const [tx, tz, sc, isAccent] of treeSpots) {
      const group = new THREE.Group();
      const baseY =
        tz < -6
          ? Math.sin(tx * 0.14 + 2.4) * 1.9 + Math.cos(tx * 0.29) * 0.7 + 0.3
          : this.frontHillHeight(tx, tz - 2);
      group.position.set(tx, baseY, tz);
      group.scale.setScalar(sc);

      const trunk = new THREE.Mesh(trunkGeo, this.trunkMat);
      trunk.position.y = 1.15;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      const crownMat = isAccent ? this.treeAccentMat : this.treePrimaryMat;
      const puffs: [number, number, number, number][] = [
        [0, 2.75, 0, 1.05],
        [-0.75, 2.3, 0.2, 0.72],
        [0.72, 2.35, -0.15, 0.76],
        [0.15, 2.4, 0.65, 0.65],
      ];
      for (const [px, py, pz, pr] of puffs) {
        const m = new THREE.Mesh(puffGeo, crownMat);
        m.position.set(px, py, pz);
        m.scale.setScalar(pr);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
      }

      // Tiny glowing berry/lantern ornament (emissive in Candy/Starry worlds)
      const lanternMat = new THREE.MeshStandardMaterial({
        color: 0xffe484,
        emissive: 0xffd24c,
        emissiveIntensity: 0.15,
        roughness: 0.3,
      });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(0.65, 1.78, 0.45);
      group.add(lantern);

      this.scene.add(group);
      this.trees.push({ group, phase: Math.random() * Math.PI * 2, isAccent, lanternMat });
    }

    // ---- Instanced Soft Curved Grass Tufts (rounded storybook silhouette, single draw call)
    const tuftShape = new THREE.Shape();
    tuftShape.moveTo(-0.14, 0);
    tuftShape.quadraticCurveTo(-0.18, 0.26, -0.22, 0.36);
    tuftShape.quadraticCurveTo(-0.08, 0.24, -0.05, 0.16);
    tuftShape.quadraticCurveTo(-0.02, 0.38, 0.03, 0.48);
    tuftShape.quadraticCurveTo(0.08, 0.32, 0.07, 0.16);
    tuftShape.quadraticCurveTo(0.14, 0.28, 0.22, 0.34);
    tuftShape.quadraticCurveTo(0.18, 0.16, 0.14, 0);
    tuftShape.closePath();
    const bladeGeo = new THREE.ShapeGeometry(tuftShape, 5);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x62cf61,
      roughness: 0.82,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.grassMesh = new THREE.InstancedMesh(bladeGeo, grassMat, GRASS_COUNT);
    this.grassMesh.receiveShadow = true;
    this.grassBase = [];
    for (let i = 0; i < GRASS_COUNT; i++) {
      const x = (Math.random() - 0.5) * 32;
      const z = -2.5 + Math.random() * 11.5;
      const y = this.frontHillHeight(x, z - 2) - 0.04;
      const h = 0.65 + Math.random() * 0.75;
      const phase = Math.random() * Math.PI * 2;
      const rotY = (Math.random() - 0.5) * 0.7;
      this.grassBase.push({ x, y, z, h, phase, rotY });
      this.tmpColor.setHSL(0.32 + (Math.random() - 0.5) * 0.04, 0.54, 0.45 + Math.random() * 0.14);
      this.grassMesh.setColorAt(i, this.tmpColor);
    }
    this.grassMesh.instanceColor!.needsUpdate = true;
    this.scene.add(this.grassMesh);

    // ---- Instanced 5-Petal Storybook Flowers with Sunny Yellow Centers
    const stemGeo = new THREE.CylinderGeometry(0.024, 0.032, 0.48, 5);
    stemGeo.translate(0, 0.24, 0);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.85 });

    // Build a true rounded 5-petal blossom silhouette
    const petalShape = new THREE.Shape();
    const petals = 5;
    for (let p = 0; p < petals; p++) {
      const a0 = (p / petals) * Math.PI * 2;
      const aMid = ((p + 0.5) / petals) * Math.PI * 2;
      const a1 = ((p + 1) / petals) * Math.PI * 2;
      const rIn = 0.075;
      const rOut = 0.23;
      if (p === 0) petalShape.moveTo(Math.cos(a0) * rIn, Math.sin(a0) * rIn);
      petalShape.quadraticCurveTo(
        Math.cos(aMid - 0.22) * rOut * 1.15,
        Math.sin(aMid - 0.22) * rOut * 1.15,
        Math.cos(aMid) * rOut,
        Math.sin(aMid) * rOut
      );
      petalShape.quadraticCurveTo(
        Math.cos(aMid + 0.22) * rOut * 1.15,
        Math.sin(aMid + 0.22) * rOut * 1.15,
        Math.cos(a1) * rIn,
        Math.sin(a1) * rIn
      );
    }
    petalShape.closePath();
    const headGeo = new THREE.ExtrudeGeometry(petalShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
    headGeo.center();
    const headMat = new THREE.MeshStandardMaterial({ roughness: 0.48, metalness: 0.03 });
    const centerGeo = new THREE.SphereGeometry(0.075, 10, 8);
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xffd43b, emissive: 0xffb703, emissiveIntensity: 0.15, roughness: 0.4 });

    this.flowerStemMesh = new THREE.InstancedMesh(stemGeo, stemMat, FLOWER_COUNT);
    this.flowerHeadMesh = new THREE.InstancedMesh(headGeo, headMat, FLOWER_COUNT);
    this.flowerCenterMesh = new THREE.InstancedMesh(centerGeo, centerMat, FLOWER_COUNT);
    this.flowerHeadMesh.castShadow = true;
    this.flowerBase = [];

    const flowerPalette = [0xff6b9d, 0xffd43b, 0xffffff, 0xb197fc, 0xff8787, 0x4dabf7];
    for (let i = 0; i < FLOWER_COUNT; i++) {
      const x = (Math.random() - 0.5) * 28;
      const z = -1.5 + Math.random() * 10;
      const y = this.frontHillHeight(x, z - 2) - 0.03;
      const h = 0.72 + Math.random() * 0.52;
      const phase = Math.random() * Math.PI * 2;
      this.flowerBase.push({ x, y, z, h, phase });
      this.tmpColor.setHex(flowerPalette[i % flowerPalette.length]);
      this.flowerHeadMesh.setColorAt(i, this.tmpColor);
    }
    this.flowerHeadMesh.instanceColor!.needsUpdate = true;
    this.scene.add(this.flowerStemMesh);
    this.scene.add(this.flowerHeadMesh);
    this.scene.add(this.flowerCenterMesh);

    // ---- Volumetric 3D Fluffy Clouds
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.0,
      emissive: 0xffffff,
      emissiveIntensity: 0.08,
    });
    const cloudGeo = new THREE.IcosahedronGeometry(1, 2);
    for (let i = 0; i < 6; i++) {
      const group = new THREE.Group();
      const layout: [number, number, number, number][] = [
        [0, 0, 0, 1.3],
        [-1.1, -0.25, 0.1, 0.95],
        [1.15, -0.2, -0.1, 1.0],
        [-0.45, 0.45, -0.15, 0.85],
        [0.5, 0.35, 0.15, 0.8],
      ];
      for (const [cx, cy, cz, cr] of layout) {
        const puff = new THREE.Mesh(cloudGeo, this.cloudMat);
        puff.position.set(cx, cy, cz);
        puff.scale.set(cr * 1.15, cr * 0.78, cr * 0.85);
        group.add(puff);
      }
      const scale = 0.85 + Math.random() * 0.75;
      const baseY = 7.5 + Math.random() * 4.5;
      group.scale.setScalar(scale);
      group.position.set(-28 + i * 11, baseY, -18 - Math.random() * 14);
      this.scene.add(group);
      this.clouds.push({ group, speed: 0.4 + Math.random() * 0.55, baseY, phase: Math.random() * Math.PI * 2 });
    }

    // ---- 3D Fluttering Butterflies (curved double-lobe wing silhouette)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.14, 0.24, 0.42, 0.26, 0.38, 0.04);
    wingShape.bezierCurveTo(0.36, -0.04, 0.24, -0.04, 0.18, -0.05);
    wingShape.bezierCurveTo(0.32, -0.1, 0.3, -0.26, 0.12, -0.22);
    wingShape.bezierCurveTo(0.04, -0.2, 0.02, -0.1, 0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape, 6);
    const bColors = [0xff7eb6, 0xffd43b, 0x7dd3fc];
    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      const wMat = new THREE.MeshStandardMaterial({
        color: bColors[i],
        emissive: bColors[i],
        emissiveIntensity: 0.25,
        side: THREE.DoubleSide,
        roughness: 0.4,
      });
      const leftWing = new THREE.Mesh(wingGeo, wMat);
      leftWing.scale.x = -1;
      const rightWing = new THREE.Mesh(wingGeo, wMat);
      group.add(leftWing, rightWing);
      this.scene.add(group);
      this.butterflies.push({
        group,
        leftWing,
        rightWing,
        angle: i * 2.1,
        speed: 0.35 + i * 0.08,
        radiusX: 5.5 + i * 2.2,
        radiusZ: 2.5 + i * 0.8,
        baseY: 2.4 + i * 0.9,
        seed: i * 11.3,
      });
    }

    // ---- Blooming Celebration Rainbow Arch
    this.rainbowGroup = new THREE.Group();
    const rbColors = [0xff5d8f, 0xffa94d, 0xffe066, 0x69db7c, 0x4dabf7, 0xb197fc];
    rbColors.forEach((hex, idx) => {
      const mat = new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      });
      this.rainbowMats.push(mat);
      const radius = 16.5 - idx * 0.52;
      const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.27, 10, 64, Math.PI), mat);
      this.rainbowGroup.add(torus);
    });
    this.rainbowGroup.position.set(0, -1.5, -22);
    this.rainbowGroup.visible = false;
    this.scene.add(this.rainbowGroup);
  }

  private initPooledParticles(): void {
    // 1. Pooled Ambient Floating Motes / Fireflies / Sugar Sparkles
    const geo = new THREE.BufferGeometry();
    this.ambientPos = new Float32Array(AMBIENT_COUNT * 3);
    this.ambientMeta = [];
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      this.ambientPos[i * 3] = (Math.random() - 0.5) * 32;
      this.ambientPos[i * 3 + 1] = 0.5 + Math.random() * 11;
      this.ambientPos[i * 3 + 2] = -12 + Math.random() * 22;
      this.ambientMeta.push({
        speed: 0.35 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        radius: 0.4 + Math.random() * 1.1,
      });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.ambientPos, 3));

    this.ambientMat = new THREE.PointsMaterial({
      color: 0xfff4a8,
      map: makeGlowSpriteTexture(),
      size: 0.55,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.ambientPoints = new THREE.Points(geo, this.ambientMat);
    this.scene.add(this.ambientPoints);

    // 2. Pooled 3D Emissive Burst Stars/Sparks (single instanced draw call, zero GC)
    const starGeo = new THREE.OctahedronGeometry(0.45, 0);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      toneMapped: false, // Allows HDR emissive colors to trigger selective UnrealBloomPass
    });
    this.burstMesh = new THREE.InstancedMesh(starGeo, starMat, BURST_POOL_SIZE);
    this.burstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.burstMesh.frustumCulled = false;

    for (let i = 0; i < BURST_POOL_SIZE; i++) {
      this.burstPool.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: 0,
        rotY: 0,
        vRot: 0,
        scale: 0,
        life: 0,
        maxLife: 1,
        color: new THREE.Color(0xffffff),
      });
      this.tmpObj.position.set(0, -100, 0);
      this.tmpObj.scale.setScalar(0);
      this.tmpObj.updateMatrix();
      this.burstMesh.setMatrixAt(i, this.tmpObj.matrix);
      this.burstMesh.setColorAt(i, this.tmpColor.setHex(0xffffff));
    }
    this.burstMesh.instanceMatrix.needsUpdate = true;
    this.burstMesh.instanceColor!.needsUpdate = true;
    this.scene.add(this.burstMesh);
  }

  private initPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.34, // strength
      0.55, // radius
      0.86  // high threshold = selective bloom only on sun, fireflies, lanterns & HDR sparks
    );
    this.composer.addPass(this.bloomPass);

    this.postPass = new ShaderPass(CINEMATIC_POST_SHADER);
    this.composer.addPass(this.postPass);

    this.composer.addPass(new OutputPass());
  }

  private applyBiomeImmediate(idx: number): void {
    const b = BIOMES[idx];
    this.skyMat.uniforms.uTopColor.value.setHex(b.skyTop);
    this.skyMat.uniforms.uMidColor.value.setHex(b.skyMid);
    this.skyMat.uniforms.uHorizonColor.value.setHex(b.skyHorizon);
    this.skyMat.uniforms.uSunColor.value.setHex(b.sunColor);
    this.skyMat.uniforms.uSunDir.value.set(...b.sunPos).normalize();
    this.skyMat.uniforms.uStars.value = b.starOpacity;
    this.skyMat.uniforms.uAurora.value = b.auroraOpacity;
    this.sunOrb.position.set(...b.sunPos);
    this.sunMat.color.setHex(b.sunEmissive).multiplyScalar(1.3);
    this.fog.color.setHex(b.fog);
    this.fog.density = b.fogDensity;
    this.hemiLight.color.setHex(b.hemiSky);
    this.hemiLight.groundColor.setHex(b.hemiGround);
    this.hemiLight.intensity = b.hemiIntensity;
    this.keyLight.color.setHex(b.keyColor);
    this.keyLight.intensity = b.keyIntensity;
    this.rimLight.color.setHex(b.rimColor);
    this.rimLight.intensity = b.rimIntensity;
    this.farHillMat.color.setHex(b.farHill);
    this.midHillMat.color.setHex(b.midHill);
    this.frontHillMat.color.setHex(b.frontHill);
    this.treePrimaryMat.color.setHex(b.treePrimary);
    this.treeAccentMat.color.setHex(b.treeAccent);
    this.trunkMat.color.setHex(b.trunk);
    this.cloudMat.color.setHex(b.cloudTint);
    this.ambientMat.color.setHex(b.moteColor);
    this.waterMat.color.setHex(b.waterColor);
    this.waterMat.opacity = b.waterOpacity;
    this.waterMesh.visible = b.waterOpacity > 0.02;
    this.bloomPass.strength = b.bloomStrength;
    this.renderer.toneMappingExposure = b.exposure;
  }

  private resize(): void {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
  }

  /* ---------------------------------------------------------------- */
  /*  Per-Frame Simulation & Render                                    */
  /* ---------------------------------------------------------------- */

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const speed = this.reduceMotion ? 0.28 : 1;
    this.time += dt * speed;

    this.updateBiomeMorph(dt);
    this.updateEnvironment(dt);
    this.updateParticles(dt);
    this.updateCameraAndPost(dt);

    this.composer.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private updateBiomeMorph(dt: number): void {
    const b = BIOMES[this.worldIndex];
    const k = Math.min(1, dt * 2.2);

    const lerpCol = (c: THREE.Color, hex: number, mult = 1) => {
      this.tmpColor.setHex(hex).multiplyScalar(mult);
      c.lerp(this.tmpColor, k);
    };

    lerpCol(this.skyMat.uniforms.uTopColor.value, b.skyTop);
    lerpCol(this.skyMat.uniforms.uMidColor.value, b.skyMid);
    lerpCol(this.skyMat.uniforms.uHorizonColor.value, b.skyHorizon);
    lerpCol(this.skyMat.uniforms.uSunColor.value, b.sunColor);
    this.skyMat.uniforms.uStars.value += (b.starOpacity - this.skyMat.uniforms.uStars.value) * k;
    this.skyMat.uniforms.uAurora.value += (b.auroraOpacity - this.skyMat.uniforms.uAurora.value) * k;
    this.skyMat.uniforms.uTime.value = this.time;

    this.tmpVec.set(...b.sunPos);
    this.sunOrb.position.lerp(this.tmpVec, k);
    this.skyMat.uniforms.uSunDir.value.copy(this.sunOrb.position).normalize();
    lerpCol(this.sunMat.color, b.sunEmissive, 1.32);

    lerpCol(this.fog.color, b.fog);
    this.fog.density += (b.fogDensity - this.fog.density) * k;

    lerpCol(this.hemiLight.color, b.hemiSky);
    lerpCol(this.hemiLight.groundColor, b.hemiGround);
    this.hemiLight.intensity += (b.hemiIntensity - this.hemiLight.intensity) * k;

    lerpCol(this.keyLight.color, b.keyColor);
    this.keyLight.intensity += (b.keyIntensity - this.keyLight.intensity) * k;

    lerpCol(this.rimLight.color, b.rimColor);
    this.rimLight.intensity += (b.rimIntensity - this.rimLight.intensity) * k;

    lerpCol(this.farHillMat.color, b.farHill);
    lerpCol(this.midHillMat.color, b.midHill);
    lerpCol(this.frontHillMat.color, b.frontHill);
    lerpCol(this.treePrimaryMat.color, b.treePrimary);
    lerpCol(this.treeAccentMat.color, b.treeAccent);
    lerpCol(this.trunkMat.color, b.trunk);
    lerpCol(this.cloudMat.color, b.cloudTint);
    lerpCol(this.ambientMat.color, b.moteColor);

    lerpCol(this.waterMat.color, b.waterColor);
    this.waterMat.opacity += (b.waterOpacity - this.waterMat.opacity) * k;
    this.waterMesh.visible = this.waterMat.opacity > 0.02;

    this.bloomPass.strength += (b.bloomStrength - this.bloomPass.strength) * k;
    this.renderer.toneMappingExposure += (b.exposure - this.renderer.toneMappingExposure) * k;

    // Lantern glow ramps up in Candy Forest & Starry Hills
    const lanternTarget = this.worldIndex === 3 ? 2.4 : this.worldIndex === 1 ? 1.15 : 0.15;
    for (const tr of this.trees) {
      if (tr.lanternMat) {
        tr.lanternMat.emissiveIntensity += (lanternTarget - tr.lanternMat.emissiveIntensity) * k;
      }
    }
  }

  private updateEnvironment(dt: number): void {
    const t = this.time;

    // Trees gentle wind sway
    for (const tr of this.trees) {
      tr.group.rotation.z = Math.sin(t * 1.1 + tr.phase) * 0.032;
      tr.group.rotation.x = Math.cos(t * 0.8 + tr.phase) * 0.018;
    }

    // Instanced grass sway
    for (let i = 0; i < GRASS_COUNT; i++) {
      const g = this.grassBase[i];
      const sway = Math.sin(t * 2.1 + g.phase + g.x * 0.2) * 0.24;
      this.tmpObj.position.set(g.x, g.y, g.z);
      this.tmpObj.rotation.set(sway * 0.4, g.rotY, sway);
      this.tmpObj.scale.set(1, g.h, 1);
      this.tmpObj.updateMatrix();
      this.grassMesh.setMatrixAt(i, this.tmpObj.matrix);
    }
    this.grassMesh.instanceMatrix.needsUpdate = true;

    // Instanced flowers sway (stems + 5-petal heads + sunny yellow centers)
    for (let i = 0; i < FLOWER_COUNT; i++) {
      const f = this.flowerBase[i];
      const sway = Math.sin(t * 1.65 + f.phase) * 0.16;
      this.tmpObj.position.set(f.x, f.y, f.z);
      this.tmpObj.rotation.set(0, f.phase, sway);
      this.tmpObj.scale.set(1, f.h, 1);
      this.tmpObj.updateMatrix();
      this.flowerStemMesh.setMatrixAt(i, this.tmpObj.matrix);

      const hx = f.x - Math.sin(sway) * 0.48 * f.h;
      const hy = f.y + Math.cos(sway) * 0.48 * f.h;
      const sc = 0.85 + 0.1 * Math.sin(t * 2 + f.phase);
      this.tmpObj.position.set(hx, hy, f.z);
      this.tmpObj.rotation.set(-0.28, 0, sway + Math.sin(t * 0.7 + f.phase) * 0.15);
      this.tmpObj.scale.setScalar(sc);
      this.tmpObj.updateMatrix();
      this.flowerHeadMesh.setMatrixAt(i, this.tmpObj.matrix);

      this.tmpObj.position.set(hx, hy, f.z + 0.045);
      this.tmpObj.rotation.set(0, 0, 0);
      this.tmpObj.scale.setScalar(sc);
      this.tmpObj.updateMatrix();
      this.flowerCenterMesh.setMatrixAt(i, this.tmpObj.matrix);
    }
    this.flowerStemMesh.instanceMatrix.needsUpdate = true;
    this.flowerHeadMesh.instanceMatrix.needsUpdate = true;
    this.flowerCenterMesh.instanceMatrix.needsUpdate = true;

    // Volumetric clouds drifting
    for (const c of this.clouds) {
      c.group.position.x += c.speed * dt;
      c.group.position.y = c.baseY + Math.sin(t * 0.5 + c.phase) * 0.25;
      if (c.group.position.x > 34) c.group.position.x = -34;
    }

    // Butterflies fluttering in organic figure-8 arcs
    for (const b of this.butterflies) {
      b.angle += b.speed * dt;
      const nx = Math.sin(b.angle) * b.radiusX;
      const nz = Math.sin(b.angle * 2) * b.radiusZ - 2.5;
      const ny = b.baseY + Math.sin(t * 1.8 + b.seed) * 0.7;
      b.group.lookAt(nx + Math.cos(b.angle), ny, nz + Math.cos(b.angle * 2) * 2);
      b.group.position.set(nx, ny, nz);
      const flap = Math.sin(t * 15 + b.seed) * 1.05;
      b.leftWing.rotation.y = flap;
      b.rightWing.rotation.y = -flap;
    }

    // Ocean shimmer wave scroll
    if (this.waterMesh.visible && this.waterMat.bumpMap) {
      this.waterMat.bumpMap.offset.x = t * 0.04;
      this.waterMat.bumpMap.offset.y = Math.sin(t * 0.3) * 0.08;
      this.waterMesh.position.y = 0.22 + Math.sin(t * 1.1) * 0.06;
    }

    // Celebration rainbow smooth fade
    this.rainbowAlpha += (this.rainbowTarget - this.rainbowAlpha) * Math.min(1, dt * 2.2);
    this.rainbowGroup.visible = this.rainbowAlpha > 0.01;
    if (this.rainbowGroup.visible) {
      const op = this.rainbowAlpha * 0.62;
      for (const m of this.rainbowMats) m.opacity = op;
      this.rainbowGroup.scale.setScalar(0.92 + this.rainbowAlpha * 0.08);
    }
  }

  private updateParticles(dt: number): void {
    const t = this.time;

    // 1. Pooled Ambient Motes / Fireflies
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      const m = this.ambientMeta[i];
      let y = this.ambientPos[i * 3 + 1] + m.speed * dt;
      if (y > 12) {
        y = 0.3;
        this.ambientPos[i * 3] = (Math.random() - 0.5) * 32;
      }
      this.ambientPos[i * 3] += Math.sin(t * 0.9 + m.phase) * m.radius * 0.35 * dt;
      this.ambientPos[i * 3 + 1] = y;
    }
    this.ambientPoints.geometry.attributes.position.needsUpdate = true;
    this.ambientMat.size = this.worldIndex === 3 ? 0.72 + Math.sin(t * 3) * 0.1 : 0.52;

    // 2. Pooled 3D Burst Particles (zero allocations)
    let anyActive = false;
    for (let i = 0; i < BURST_POOL_SIZE; i++) {
      const p = this.burstPool[i];
      if (!p.active) continue;
      anyActive = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.tmpObj.position.set(0, -100, 0);
        this.tmpObj.scale.setScalar(0);
        this.tmpObj.updateMatrix();
        this.burstMesh.setMatrixAt(i, this.tmpObj.matrix);
        continue;
      }
      const drag = Math.pow(0.95, dt * 60);
      p.vx *= drag;
      p.vy = p.vy * drag - 8.5 * dt;
      p.vz *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rotX += p.vRot * dt;
      p.rotY += p.vRot * 0.7 * dt;

      const lr = p.life / p.maxLife;
      const sc = p.scale * (lr < 0.18 ? lr / 0.18 : 1 - (lr - 0.18) / 0.82);
      this.tmpObj.position.set(p.x, p.y, p.z);
      this.tmpObj.rotation.set(p.rotX, p.rotY, 0);
      this.tmpObj.scale.setScalar(Math.max(0.001, sc));
      this.tmpObj.updateMatrix();
      this.burstMesh.setMatrixAt(i, this.tmpObj.matrix);
      this.burstMesh.setColorAt(i, p.color);
    }
    if (anyActive) {
      this.burstMesh.instanceMatrix.needsUpdate = true;
      if (this.burstMesh.instanceColor) this.burstMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateCameraAndPost(dt: number): void {
    const k = Math.min(1, dt * 4);
    this.smoothPointer.x += (this.pointer.x - this.smoothPointer.x) * k;
    this.smoothPointer.y += (this.pointer.y - this.smoothPointer.y) * k;

    // Decay impact dynamics
    this.camShake *= Math.pow(0.84, dt * 60);
    this.camZoomKick *= Math.pow(0.86, dt * 60);
    this.impactStrength *= Math.pow(0.82, dt * 60);
    this.impactLightEnergy *= Math.pow(0.86, dt * 60);

    if (this.camShake < 0.002) this.camShake = 0;
    if (this.impactStrength < 0.002) this.impactStrength = 0;

    const sx = (Math.random() - 0.5) * this.camShake;
    const sy = (Math.random() - 0.5) * this.camShake;
    const breathX = Math.sin(this.time * 0.45) * 0.28;
    const breathY = Math.cos(this.time * 0.65) * 0.14;

    this.camera.position.set(
      this.smoothPointer.x * 1.15 + breathX + sx,
      4.35 - this.smoothPointer.y * 0.45 + breathY + sy,
      15.5 - this.camZoomKick * 0.55
    );
    this.camera.lookAt(this.smoothPointer.x * 0.3, 2.15 - this.smoothPointer.y * 0.15, -4);

    this.impactLight.intensity = this.impactLightEnergy;
    this.postPass.uniforms.uImpact.value = this.impactStrength;
    this.postPass.uniforms.uTime.value = this.time;
  }
}
