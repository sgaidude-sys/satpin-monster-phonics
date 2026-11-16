import './style.css';
import './adventure.css';
import { ANIMAL_STICKERS, SATPIN_ITEMS, SATPIN_LETTERS, type AnimalSticker, type SatpinLetter } from './data/phonics';
import { HATS, LEVELS, MODE_INFO, type GameMode, type LevelDef } from './data/levels';
import { engine, unlockAudio } from './audio/engine';
import * as sfx from './audio/sfx';
import { startMusic } from './audio/music';
import { isNarratorSpeaking, playPhoneme, preloadVoice, sayLike, sayLine, sayWord, stopVoice, type LineKey } from './audio/voice';
import {
  completeLevel,
  loadProgression,
  MASTERY_TARGET,
  pickChoices,
  pickTarget,
  recordAttempt,
  resetProgression,
  totalStars,
  update,
  type Prize,
  type ProgressionState,
} from './state/progression';
import { MonsterCanvasController } from './canvas/monsterCanvas';
import { ParticleCanvasController } from './canvas/particleCanvas';
import { SceneCanvas } from './canvas/sceneCanvas';
import { renderHatIcon } from './canvas/hats';

/* ------------------------------------------------------------------ */
/*  Art                                                                */
/* ------------------------------------------------------------------ */

const ICON = {
  speaker: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9.2v5.6c0 .4.3.7.7.7h3.6l4.4 3.9c.5.4 1.3.1 1.3-.6V5.2c0-.7-.8-1-1.3-.6L7.3 8.5H3.7c-.4 0-.7.3-.7.7z"/><path d="M16 8.6a4.8 4.8 0 0 1 0 6.8M18.8 5.8a8.8 8.8 0 0 1 0 12.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2.4" fill="#fff"/><circle cx="15.5" cy="12" r="2.4" fill="#fff"/><circle cx="7.5" cy="18" r="2.4" fill="#fff"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h4.5v-5.5h4V20h4.5V10"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.6v14.8a1.1 1.1 0 0 0 1.7.9l11.6-7.4a1.1 1.1 0 0 0 0-1.8L8.7 3.7A1.1 1.1 0 0 0 7 4.6z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  hat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 12 3l7 16z" fill="#ff7ac6" stroke="#26213f" stroke-width="2" stroke-linejoin="round"/><path d="M8 13l7-3M7 17l10-4" stroke="#ffe14d" stroke-width="2"/><circle cx="12" cy="3.5" r="2.4" fill="#7dd3fc" stroke="#26213f" stroke-width="1.6"/></svg>`,
};

const MODE_ICON: Record<GameMode, string> = {
  feed: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19" fill="#f4b860" stroke="#26213f" stroke-width="3.5"/><circle cx="21" cy="21" r="12" fill="#f8cb80"/><circle cx="17" cy="18" r="3.2" fill="#5b3418"/><circle cx="29" cy="15" r="2.6" fill="#5b3418"/><circle cx="31" cy="28" r="3.4" fill="#5b3418"/><circle cx="18" cy="31" r="2.6" fill="#5b3418"/><circle cx="24" cy="24" r="2" fill="#5b3418"/></svg>`,
  bubble: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="22" cy="27" r="17" fill="#c9eeff" stroke="#26213f" stroke-width="3.5"/><path d="M12 23a11 11 0 0 1 9-9" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="39" cy="11" r="6" fill="#c9eeff" stroke="#26213f" stroke-width="3"/></svg>`,
  egg: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4C35 4 42 22 42 30c0 10-8 15-18 15S6 40 6 30C6 22 13 4 24 4z" fill="#fff6dc" stroke="#26213f" stroke-width="3.5"/><circle cx="18" cy="23" r="3" fill="#a78bfa"/><circle cx="30" cy="30" r="4" fill="#f9a8d4"/><circle cx="20" cy="36" r="2.5" fill="#7dd3fc"/><path d="M15 15a12 12 0 0 1 6-6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,
};

function starPath(cx: number, cy: number, r: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : inner;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const STAR_D = starPath(20, 21, 18, 8.6);
const STAR_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true">
  <path class="star-empty" stroke-width="2.5" stroke-linejoin="round" d="${STAR_D}"/>
  <g class="star-full">
    <path fill="url(#starGrad)" stroke="#c46a00" stroke-width="2.6" stroke-linejoin="round" d="${STAR_D}"/>
    <ellipse cx="15" cy="15" rx="3.2" ry="1.8" transform="rotate(-35 15 15)" fill="#fff" opacity=".85"/>
  </g>
</svg>`;

const EGG_D = 'M50 4C78 4 96 50 96 76c0 26-20 40-46 40S4 102 4 76C4 50 22 4 50 4z';
const CRACK_D = 'M6 58 L18 50 L28 60 L40 49 L50 60 L62 50 L72 61 L84 51 L94 58';

function eggSvg(letter: SatpinLetter): string {
  const item = SATPIN_ITEMS[letter];
  return `<svg viewBox="0 0 100 120" aria-hidden="true">
    <defs><radialGradient id="eg-${letter}" cx=".35" cy=".28" r=".85">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="${item.tint}"/><stop offset="1" stop-color="${item.accent}" stop-opacity=".45"/>
    </radialGradient></defs>
    <path d="${EGG_D}" fill="url(#eg-${letter})" stroke="#26213f" stroke-width="4"/>
    <g fill="${item.accent}" opacity=".35"><circle cx="72" cy="34" r="6"/><circle cx="22" cy="62" r="4.5"/><circle cx="80" cy="70" r="5"/><circle cx="30" cy="100" r="4"/><circle cx="58" cy="22" r="3"/></g>
    <ellipse cx="33" cy="30" rx="8" ry="14" transform="rotate(-25 33 30)" fill="#fff" opacity=".75"/>
    <text x="50" y="93" text-anchor="middle" font-family="Andika, Fredoka, sans-serif" font-weight="700" font-size="54" fill="${item.accent}" stroke="#ffffff" stroke-width="3" paint-order="stroke">${letter}</text>
    <path class="crack" d="${CRACK_D}" fill="none" stroke="#26213f" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" pathLength="100"/>
  </svg>`;
}

const CHEST_SVG = `<svg viewBox="0 0 160 140" aria-hidden="true">
  <ellipse cx="80" cy="132" rx="66" ry="7" fill="#26213f" opacity=".18"/>
  <g class="chest-base">
    <rect x="16" y="62" width="128" height="66" rx="10" fill="#c26b2a" stroke="#26213f" stroke-width="5"/>
    <rect x="21" y="66" width="118" height="10" rx="4" fill="#8f4a17" opacity=".55"/>
    <rect x="36" y="62" width="14" height="66" fill="#ffc83d" stroke="#26213f" stroke-width="4"/>
    <rect x="110" y="62" width="14" height="66" fill="#ffc83d" stroke="#26213f" stroke-width="4"/>
    <rect x="66" y="70" width="28" height="32" rx="6" fill="#ffd84d" stroke="#26213f" stroke-width="4"/>
    <circle cx="80" cy="83" r="4" fill="#26213f"/><rect x="78" y="85" width="4" height="9" rx="2" fill="#26213f"/>
  </g>
  <g class="chest-lid">
    <path d="M16 66V48C16 20 144 20 144 48V66Z" fill="#d97b34" stroke="#26213f" stroke-width="5" stroke-linejoin="round"/>
    <path d="M36 66V32M50 66V27M110 66V27M124 66V32" stroke="#26213f" stroke-width="4"/>
    <path d="M37 66V33h12v33zM111 66V28h12v38z" fill="#ffc83d"/>
    <path d="M30 40c20-12 80-12 100 0" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".45"/>
  </g>
</svg>`;

const PRAISE = ['Yum!', 'Yummy!', 'Tasty!', 'Super!', 'Wow!', 'Great!'];
const DECOR = ['🌳', '🌷', '🍄', '🌻', '🌲', '🌼', '🪨', '🌸'];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface DragState {
  card: HTMLButtonElement;
  letter: SatpinLetter;
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  vx: number;
  lastX: number;
  lastT: number;
  moved: boolean;
  home: DOMRect;
  trailAcc: number;
}

interface Bubble {
  el: HTMLButtonElement;
  letter: SatpinLetter;
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  dead: boolean;
}

type Screen = 'title' | 'map' | 'level';

/* ------------------------------------------------------------------ */
/*  Game                                                               */
/* ------------------------------------------------------------------ */

class PhonicsGame {
  private root: HTMLElement;
  private state: ProgressionState;
  private screen: Screen = 'title';

  // Level state
  private levelIndex = 0;
  private level: LevelDef = LEVELS[0];
  private run = 0;
  private round = 0;
  private mistakes = 0;
  private target: SatpinLetter = 's';
  private wrongThisRound = 0;
  private streak = 0;
  private locked = true;
  private hint = false;
  private displayedStars = 0;
  private sayToken = 0;
  private idleTimer: number | undefined;
  private drag: DragState | null = null;
  private burpedLast = false;

  // Egg mode
  private hatchEgg: HTMLElement | null = null;
  private hatchStage = 0;
  private hatchTimer: number | undefined;

  // Bubble mode
  private bubbles: Bubble[] = [];
  private bubbleRaf = 0;
  private bubbleLast = 0;
  private spawnAcc = 0;
  private pops = 0;
  private readonly popsNeeded = 3;
  private bubbleRoundActive = false;

  // Map
  private mapIndex = 0;

  private scene!: SceneCanvas;
  private monster!: MonsterCanvasController;
  private titleMonster!: MonsterCanvasController;
  private mapMonster!: MonsterCanvasController;
  private fx!: ParticleCanvasController;
  private modalMonsters: MonsterCanvasController[] = [];

  private el!: {
    game: HTMLElement;
    stage: HTMLElement;
    playfield: HTMLElement;
    instruction: HTMLElement;
    stars: HTMLElement;
    chip: HTMLElement;
    back: HTMLButtonElement;
    listen: HTMLButtonElement;
    hintBubble: HTMLElement;
    hintBtn: HTMLButtonElement;
    settingsBtn: HTMLButtonElement;
    wardrobeBtn: HTMLButtonElement;
    bookBtn: HTMLButtonElement;
    bookCount: HTMLElement;
    title: HTMLElement;
    map: HTMLElement;
    mapScroll: HTMLElement;
    mapLayer: HTMLElement;
    mapMunchy: HTMLCanvasElement;
    banner: HTMLElement;
    modal: HTMLElement;
    settings: HTMLElement;
    streak: HTMLElement;
    wipe: HTMLElement;
    monsterCanvas: HTMLCanvasElement;
  };

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = loadProgression();
    this.render();
    this.scene = new SceneCanvas(q(this.root, '#scene'));
    this.fx = new ParticleCanvasController(q(this.root, '#fx'));
    this.monster = new MonsterCanvasController(this.el.monsterCanvas);
    this.titleMonster = new MonsterCanvasController(q(this.root, '#title-monster'), { idleMood: 'wave', sizeFactor: 1.05 });
    this.mapMonster = new MonsterCanvasController(this.el.mapMunchy, { sizeFactor: 1.1 });
    for (const m of [this.monster, this.titleMonster, this.mapMonster]) {
      m.setVoiceProviders(() => engine.voiceLevel(), isNarratorSpeaking);
      m.setHat(this.state.equippedHat);
    }
    this.monster.pause(true);
    this.mapMonster.pause(true);
    this.bind();
    this.renderSettings();
    this.setScreen('title');
  }

  /* ---------------------------------------------------------------- */
  /*  DOM shell                                                        */
  /* ---------------------------------------------------------------- */

  private render(): void {
    const logo = "Munchy's"
      .split('')
      .map((ch, i) => {
        const colors = ['#ff5d8f', '#ffb020', '#2ed47a', '#29b6f6', '#9b6dff', '#ff7ac6', '#ffd23f', '#22c5c5'];
        return `<span style="--c:${colors[i % colors.length]};--i:${i}">${ch}</span>`;
      })
      .join('');

    this.root.innerHTML = `
      <div class="game at-title">
        <svg width="0" height="0" style="position:absolute" aria-hidden="true">
          <defs>
            <linearGradient id="starGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#fff6b0"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff9a1a"/>
            </linearGradient>
          </defs>
        </svg>
        <canvas id="scene" class="layer-scene"></canvas>

        <div class="map" id="map">
          <div class="map-scroll" id="map-scroll">
            <div class="map-inner">
              <div class="map-layer" id="map-layer"></div>
              <canvas class="map-munchy" id="map-munchy" aria-label="Munchy" role="img"></canvas>
            </div>
          </div>
        </div>

        <header class="hud">
          <div class="hud-group">
            <button class="icon-btn" id="btn-back" type="button" aria-label="Back"></button>
            <div class="level-chip" id="level-chip"></div>
          </div>
          <div class="star-meter" id="stars" aria-label="Level progress"></div>
          <div class="hud-group">
            <button class="icon-btn level-only" id="btn-hint" type="button" aria-label="Show the letter hint" aria-pressed="false">${ICON.eye}</button>
            <button class="icon-btn" id="btn-settings" type="button" aria-label="Settings" aria-expanded="false">${ICON.settings}</button>
            <button class="icon-btn map-only" id="btn-wardrobe" type="button" aria-label="Dress up Munchy">${ICON.hat}</button>
            <button class="sticker-btn" id="btn-book" type="button" aria-label="Open sticker book">
              <span class="emoji" aria-hidden="true">📒</span>
              <span class="count" id="book-count">0/${ANIMAL_STICKERS.length}</span>
            </button>
          </div>
        </header>

        <div class="streak" id="streak" aria-live="polite"></div>

        <main class="stage" id="stage">
          <section class="monster-zone">
            <button class="listen-btn" id="btn-listen" type="button" aria-label="Hear the sound again">
              <span class="listen-icon">${ICON.speaker}</span>
              <span class="listen-label"><b>Listen!</b><small>Tap to hear it again</small></span>
            </button>
            <div class="hint-bubble" id="hint-bubble" aria-hidden="true"><span></span></div>
            <canvas class="monster-canvas" id="monster" aria-label="Munchy the monster. Tap him!" role="img"></canvas>
          </section>
          <section class="play-zone">
            <div class="playfield" id="playfield"></div>
            <p class="instruction" id="instruction"></p>
          </section>
          <div class="level-banner" id="banner"></div>
        </main>

        <div class="settings" id="settings" role="dialog" aria-label="Settings"></div>

        <div class="title" id="title">
          <div class="logo">
            <div class="logo-top" aria-label="Munchy's">${logo}</div>
            <div class="logo-bottom">Phonics Feast</div>
          </div>
          <canvas class="title-monster" id="title-monster" aria-label="Munchy waving hello" role="img"></canvas>
          <button class="play-btn" id="btn-play" type="button">${ICON.play}<span>Play!</span></button>
          <p class="title-sub">Listen · feed · pop · hatch!</p>
        </div>

        <div class="modal" id="modal"></div>
        <canvas id="fx" class="layer-fx"></canvas>
        <div class="wipe" id="wipe"></div>
      </div>
    `;

    this.el = {
      game: q(this.root, '.game'),
      stage: q(this.root, '#stage'),
      playfield: q(this.root, '#playfield'),
      instruction: q(this.root, '#instruction'),
      stars: q(this.root, '#stars'),
      chip: q(this.root, '#level-chip'),
      back: q(this.root, '#btn-back'),
      listen: q(this.root, '#btn-listen'),
      hintBubble: q(this.root, '#hint-bubble'),
      hintBtn: q(this.root, '#btn-hint'),
      settingsBtn: q(this.root, '#btn-settings'),
      wardrobeBtn: q(this.root, '#btn-wardrobe'),
      bookBtn: q(this.root, '#btn-book'),
      bookCount: q(this.root, '#book-count'),
      title: q(this.root, '#title'),
      map: q(this.root, '#map'),
      mapScroll: q(this.root, '#map-scroll'),
      mapLayer: q(this.root, '#map-layer'),
      mapMunchy: q(this.root, '#map-munchy'),
      banner: q(this.root, '#banner'),
      modal: q(this.root, '#modal'),
      settings: q(this.root, '#settings'),
      streak: q(this.root, '#streak'),
      wipe: q(this.root, '#wipe'),
      monsterCanvas: q(this.root, '#monster'),
    };
  }

  private bind(): void {
    const { el } = this;
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());

    q(this.root, '#btn-play').addEventListener('click', () => this.start());
    q(this.root, '#title-monster').addEventListener('click', () => {
      unlockAudio();
      this.titleMonster.poke();
      sfx.sfxGiggle();
    });

    el.back.addEventListener('click', () => {
      sfx.sfxTap(0.9);
      this.closeSettings();
      if (this.screen === 'level') this.leaveLevel();
      else if (this.screen === 'map') this.showTitle();
    });

    el.listen.addEventListener('click', () => {
      if (this.locked) return;
      sfx.sfxTap(1.1);
      this.sayTarget();
    });

    el.monsterCanvas.addEventListener('click', () => this.tickle(this.monster, true));
    el.mapMunchy.addEventListener('click', () => this.tickle(this.mapMonster, false));

    el.hintBtn.addEventListener('click', () => {
      this.hint = !this.hint;
      sfx.sfxToggle(this.hint);
      this.renderHint();
    });

    el.settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.settings.classList.contains('open')) this.closeSettings();
      else {
        el.settings.classList.add('open');
        el.settingsBtn.setAttribute('aria-expanded', 'true');
        sfx.sfxPanel(true);
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (!el.settings.classList.contains('open')) return;
      const t = e.target as Node;
      if (!el.settings.contains(t) && !el.settingsBtn.contains(t)) this.closeSettings();
    });

    el.bookBtn.addEventListener('click', () => this.openBook());
    el.wardrobeBtn.addEventListener('click', () => this.openWardrobe());
    el.modal.addEventListener('click', (e) => {
      const kind = el.modal.dataset.kind;
      if (e.target === el.modal && (kind === 'book' || kind === 'wardrobe')) this.closeModal();
    });

    engine.onSettingsChange(() => this.renderSettings());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSettings();
        const kind = el.modal.dataset.kind;
        if (kind === 'book' || kind === 'wardrobe') this.closeModal();
      }
    });

    let resizeT: number | undefined;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = window.setTimeout(() => {
        if (this.screen === 'map') this.renderMap();
      }, 150);
    });

    document.addEventListener('pointerdown', () => this.bumpIdle(), { passive: true });
  }

  /** Random silly reaction when Munchy is tapped. */
  private tickle(m: MonsterCanvasController, replay: boolean): void {
    unlockAudio();
    const r = Math.random();
    const p = m === this.monster ? m.getMouthScreenPosition() : null;
    if (r < 0.4) {
      m.poke();
      sfx.sfxGiggle();
      if (Math.random() < 0.35 && !this.locked) sayLine('giggle');
    } else if (r < 0.7) {
      m.spin();
      sfx.sfxSpin();
    } else {
      m.poke();
      m.setMood('happy', 0.6);
      sfx.sfxSquish();
    }
    if (p) this.fx.hearts(p.x, p.y - 80, 3);
    if (replay && !this.locked && this.screen === 'level') setTimeout(() => this.sayTarget(), 700);
  }

  /* ---------------------------------------------------------------- */
  /*  Screens                                                          */
  /* ---------------------------------------------------------------- */

  private setScreen(s: Screen): void {
    this.screen = s;
    const g = this.el.game;
    g.classList.toggle('at-title', s === 'title');
    g.classList.toggle('at-map', s === 'map');
    g.classList.toggle('at-level', s === 'level');
    this.el.back.innerHTML = s === 'level' ? ICON.back : ICON.home;
    this.el.back.setAttribute('aria-label', s === 'level' ? 'Back to the map' : 'Back to the title');
    this.renderHud();
  }

  private async wipe(x: number, y: number, mid: () => void): Promise<void> {
    const w = this.el.wipe;
    w.style.display = 'block';
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dur = reduce ? 1 : 420;
    const a = w.animate([{ clipPath: `circle(0% at ${x}px ${y}px)` }, { clipPath: `circle(150% at ${x}px ${y}px)` }], {
      duration: dur,
      easing: 'cubic-bezier(0.6, 0, 0.4, 1)',
      fill: 'forwards',
    });
    sfx.sfxWhoosh(0.45);
    await Promise.race([a.finished.catch(() => {}), wait(dur + 300)]);
    mid();
    await wait(120);
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const b = w.animate([{ clipPath: `circle(150% at ${cx}px ${cy}px)` }, { clipPath: `circle(0% at ${cx}px ${cy}px)` }], {
      duration: dur,
      easing: 'cubic-bezier(0.6, 0, 0.4, 1)',
      fill: 'forwards',
    });
    await Promise.race([b.finished.catch(() => {}), wait(dur + 300)]);
    a.cancel();
    b.cancel();
    w.style.display = 'none';
  }

  private start(): void {
    unlockAudio();
    preloadVoice();
    sfx.sfxStart();
    startMusic();
    this.el.title.classList.add('hide');
    setTimeout(() => this.titleMonster.pause(true), 700);
    this.fx.burst(window.innerWidth / 2, window.innerHeight * 0.6, '#2ed47a', 30);
    this.showMap();
  }

  private showTitle(): void {
    this.locked = true;
    stopVoice();
    this.clearIdle();
    this.mapMonster.pause(true);
    this.titleMonster.pause(false);
    this.titleMonster.setHat(this.state.equippedHat);
    this.el.title.classList.remove('hide');
    this.setScreen('title');
  }

  /* ---------------------------------------------------------------- */
  /*  Adventure map                                                    */
  /* ---------------------------------------------------------------- */

  private mapPositions(): { pts: { x: number; y: number }[]; trophy: { x: number; y: number }; h: number } {
    const W = this.el.mapScroll.clientWidth || window.innerWidth;
    const hud = parseFloat(getComputedStyle(this.el.game).getPropertyValue('--hud-h')) || 80;
    const STEP = 150;
    const TOP = hud + 170;
    const BOTTOM = 150;
    const h = TOP + (LEVELS.length - 1) * STEP + BOTTOM;
    const amp = Math.min(W * 0.28, 230);
    const pts = LEVELS.map((_, i) => ({ x: W / 2 + Math.sin(i * 0.95 + 0.4) * amp, y: h - BOTTOM - i * STEP }));
    return { pts, trophy: { x: W / 2, y: TOP - 80 }, h };
  }

  private renderMap(): void {
    const { pts, trophy, h } = this.mapPositions();
    const W = this.el.mapScroll.clientWidth || window.innerWidth;
    (this.el.mapLayer.parentElement as HTMLElement).style.height = `${h}px`;

    const all = [{ x: pts[0].x, y: h + 20 }, ...pts, trophy];
    let d = `M${all[0].x},${all[0].y}`;
    for (let i = 0; i < all.length - 1; i++) {
      const p0 = all[Math.max(0, i - 1)];
      const p1 = all[i];
      const p2 = all[i + 1];
      const p3 = all[Math.min(all.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }

    const allDone = this.state.levelStars.every((s) => s > 0);
    const decor = LEVELS.map((_, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const p = pts[i];
      const x = clamp(p.x + side * (110 + ((i * 37) % 50)), 30, W - 30);
      const y = p.y - 60 + ((i * 53) % 40);
      return `<span class="decor" style="left:${x}px;top:${y}px;font-size:${34 + ((i * 13) % 20)}px">${DECOR[i % DECOR.length]}</span>`;
    }).join('');

    const nodes = LEVELS.map((lv, i) => {
      const stars = this.state.levelStars[i];
      const locked = i > this.state.unlockedLevel;
      const current = i === this.state.unlockedLevel && stars === 0;
      const info = MODE_INFO[lv.mode];
      const starRow = [0, 1, 2].map((k) => `<i class="${k < stars ? 'on' : ''}">★</i>`).join('');
      return `<button type="button" class="node ${locked ? 'is-locked' : ''} ${current ? 'is-current' : ''} ${stars ? 'is-done' : ''}"
          data-i="${i}" style="left:${pts[i].x}px;top:${pts[i].y}px;--mode:${info.color};--mode-dark:${info.colorDark}"
          aria-label="Level ${i + 1}, ${info.name}${locked ? ', locked' : ''}">
          <span class="node-icon">${MODE_ICON[lv.mode]}</span>
          <span class="node-num">${i + 1}</span>
          ${locked ? '<span class="node-lock">🔒</span>' : `<span class="node-stars">${starRow}</span>`}
        </button>`;
    }).join('');

    this.el.mapLayer.innerHTML = `
      <svg class="road" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" aria-hidden="true">
        <path d="${d}" class="road-edge"/>
        <path d="${d}" class="road-fill"/>
        <path d="${d}" class="road-dash"/>
      </svg>
      ${decor}
      ${nodes}
      <div class="node trophy ${allDone ? 'is-done' : 'is-locked'}" style="left:${trophy.x}px;top:${trophy.y}px" aria-label="Trophy">🏆</div>
    `;
    this.el.mapLayer.querySelectorAll<HTMLButtonElement>('.node[data-i]').forEach((n) => {
      n.addEventListener('click', () => this.onNodeTap(Number(n.dataset.i), n));
    });
    this.placeMapMunchy(this.mapIndex);
  }

  private placeMapMunchy(i: number): void {
    const { pts } = this.mapPositions();
    const p = pts[clamp(i, 0, LEVELS.length - 1)];
    const c = this.el.mapMunchy;
    c.style.left = `${p.x - 70}px`;
    c.style.top = `${p.y - 168}px`;
  }

  private scrollMapTo(i: number, smooth: boolean): void {
    const { pts } = this.mapPositions();
    const p = pts[clamp(i, 0, LEVELS.length - 1)];
    this.el.mapScroll.scrollTo({ top: p.y - this.el.mapScroll.clientHeight * 0.6, behavior: smooth ? 'smooth' : 'auto' });
  }

  private async hopMapMunchy(from: number, to: number): Promise<void> {
    const { pts } = this.mapPositions();
    const a = pts[from];
    const b = pts[to];
    const c = this.el.mapMunchy;
    this.mapMonster.setMood('happy', 1);
    sfx.sfxHop(0);
    setTimeout(() => sfx.sfxHop(2), 350);
    const anim = c.animate(
      [
        { left: `${a.x - 70}px`, top: `${a.y - 168}px` },
        { left: `${(a.x + b.x) / 2 - 70}px`, top: `${Math.min(a.y, b.y) - 250}px`, offset: 0.5 },
        { left: `${b.x - 70}px`, top: `${b.y - 168}px` },
      ],
      { duration: 800, easing: 'ease-in-out' }
    );
    this.mapIndex = to;
    this.placeMapMunchy(to);
    await Promise.race([anim.finished.catch(() => {}), wait(1000)]);
  }

  private showMap(after?: { completed: number; unlockedNew: boolean }): void {
    this.setScreen('map');
    this.monster.pause(true);
    this.mapMonster.pause(false);
    this.mapMonster.setHat(this.state.equippedHat);
    const playable = Math.min(this.state.unlockedLevel, LEVELS.length - 1);
    this.mapIndex = after ? after.completed : playable;
    this.renderMap();
    this.scrollMapTo(this.mapIndex, false);

    if (after?.unlockedNew) {
      setTimeout(async () => {
        await this.hopMapMunchy(after.completed, this.state.unlockedLevel);
        this.scrollMapTo(this.state.unlockedLevel, true);
        sfx.sfxUnlock();
        const node = this.el.mapLayer.querySelector<HTMLElement>(`.node[data-i="${this.state.unlockedLevel}"]`);
        if (node) {
          node.classList.add('just-unlocked');
          const r = node.getBoundingClientRect();
          this.fx.burst(r.left + r.width / 2, r.top + r.height / 2, '#ffd43b', 26);
        }
        this.mapMonster.setMood('speaking', 2);
        await sayLine('letsgo');
        this.mapMonster.setMood('idle');
      }, 700);
    } else if (!this.state.metMunchy) {
      this.state = update(this.state, { metMunchy: true });
      setTimeout(async () => {
        if (this.screen !== 'map') return;
        this.mapMonster.setMood('speaking', 8);
        await sayLine('intro');
        this.mapMonster.setMood('idle');
      }, 900);
    }
  }

  private async onNodeTap(i: number, node: HTMLElement): Promise<void> {
    unlockAudio();
    if (i > this.state.unlockedLevel) {
      sfx.sfxBonk();
      node.animate([{ rotate: '0deg' }, { rotate: '-12deg' }, { rotate: '10deg' }, { rotate: '-5deg' }, { rotate: '0deg' }], { duration: 420 });
      sayLine('locked');
      return;
    }
    sfx.sfxTap(1.2);
    if (i !== this.mapIndex) await this.hopMapMunchy(this.mapIndex, i);
    const r = node.getBoundingClientRect();
    this.startLevel(i, r.left + r.width / 2, r.top + r.height / 2);
  }

  /* ---------------------------------------------------------------- */
  /*  HUD                                                              */
  /* ---------------------------------------------------------------- */

  private renderHud(): void {
    if (this.screen === 'level') {
      const info = MODE_INFO[this.level.mode];
      this.el.chip.innerHTML = `<span class="chip-icon">${MODE_ICON[this.level.mode]}</span><span><span class="lvl-word">Level </span>${this.levelIndex + 1}</span>`;
      this.el.chip.style.setProperty('--mode', info.color);
    } else {
      this.el.chip.innerHTML = `<span class="chip-star">★</span><span>${totalStars(this.state)}</span>`;
      this.el.chip.style.setProperty('--mode', '#ffb020');
    }
    this.el.bookCount.textContent = `${this.state.stickers.length}/${ANIMAL_STICKERS.length}`;
    this.renderHint();
  }

  private renderStarSlots(n: number): void {
    this.el.stars.innerHTML = Array.from({ length: n }, (_, i) => `<div class="star-slot" data-i="${i}">${STAR_SVG}</div>`).join('');
  }

  private renderStars(popIndex = -1): void {
    this.el.stars.querySelectorAll<HTMLElement>('.star-slot').forEach((s, i) => {
      s.classList.toggle('is-filled', i < this.displayedStars);
      if (i === popIndex) {
        s.classList.remove('pop');
        void s.offsetWidth;
        s.classList.add('pop');
      }
    });
  }

  private renderHint(): void {
    const item = SATPIN_ITEMS[this.target];
    this.el.hintBubble.classList.toggle('show', this.hint && this.screen === 'level');
    this.el.hintBubble.style.setProperty('--accent', item.accent);
    this.el.hintBubble.querySelector('span')!.textContent = this.target;
    this.el.hintBtn.classList.toggle('is-on', this.hint);
    this.el.hintBtn.setAttribute('aria-pressed', String(this.hint));
    this.el.playfield.classList.toggle('show-hint', this.hint);
  }

  private showStreak(): void {
    if (this.streak < 2) return;
    const msgs = ['', '', 'Two in a row!', 'Three in a row!', 'On fire!', 'Unstoppable!'];
    this.el.streak.textContent = `🔥 ${msgs[Math.min(this.streak, 5)]}`;
    this.el.streak.classList.add('show');
    setTimeout(() => this.el.streak.classList.remove('show'), 1700);
  }

  private closeSettings(): void {
    if (!this.el.settings.classList.contains('open')) return;
    this.el.settings.classList.remove('open');
    this.el.settingsBtn.setAttribute('aria-expanded', 'false');
    sfx.sfxPanel(false);
  }

  private renderSettings(): void {
    const s = engine.settings;
    const row = (key: string, label: string, on: boolean) =>
      `<button type="button" class="toggle-row" role="switch" aria-checked="${on}" data-key="${key}">
        <span>${label}</span><span class="switch"></span>
      </button>`;
    this.el.settings.innerHTML = `
      <h3>Settings</h3>
      ${row('music', '🎵 Music', s.music)}
      ${row('sfx', '🔔 Sound effects', s.sfx)}
      ${row('narrator', '🗣️ Talking', s.narrator)}
      <button type="button" class="reset-btn" id="btn-reset">Reset progress</button>
    `;
    this.el.settings.querySelectorAll<HTMLButtonElement>('.toggle-row').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.key as 'music' | 'sfx' | 'narrator';
        const next = !engine.settings[key];
        engine.setSetting(key, next);
        sfx.sfxToggle(next);
      });
    });
    q(this.el.settings, '#btn-reset').addEventListener('click', () => {
      if (!window.confirm('Reset all levels, stars, hats and stickers?')) return;
      this.state = resetProgression();
      for (const m of [this.monster, this.mapMonster, this.titleMonster]) m.setHat(null);
      sfx.sfxDrop();
      this.closeSettings();
      if (this.screen === 'level') this.leaveLevel();
      else if (this.screen === 'map') this.showMap();
      this.renderHud();
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Level flow                                                       */
  /* ---------------------------------------------------------------- */

  private alive(run: number): boolean {
    return run === this.run && this.screen === 'level';
  }

  private startLevel(i: number, x: number, y: number): void {
    const run = ++this.run;
    this.levelIndex = i;
    this.level = LEVELS[i];
    this.round = 0;
    this.mistakes = 0;
    this.displayedStars = 0;
    this.streak = 0;
    this.locked = true;
    const info = MODE_INFO[this.level.mode];

    void this.wipe(x, y, () => {
      this.setScreen('level');
      this.mapMonster.pause(true);
      this.monster.pause(false);
      this.monster.setHat(this.state.equippedHat);
      this.monster.setMood('happy', 1);
      this.renderStarSlots(this.level.rounds);
      this.renderStars();
      this.setupPlayfield();
      this.el.instruction.textContent = info.instruction;
      this.el.banner.innerHTML = `
        <div class="banner-icon">${MODE_ICON[this.level.mode]}</div>
        <div><small>Level ${i + 1}</small><b>${info.name}</b></div>`;
      this.el.banner.style.setProperty('--mode', info.color);
      this.el.banner.style.setProperty('--mode-dark', info.colorDark);
      this.el.banner.classList.add('show');
    }).then(async () => {
      if (!this.alive(run)) return;
      sfx.sfxStart();
      await wait(350);
      if (!this.alive(run)) return;
      this.monster.setMood('speaking', 6);
      await sayLine(`mode_${this.level.mode}` as LineKey);
      if (!this.alive(run)) return;
      this.monster.setMood('idle');
      await wait(250);
      this.el.banner.classList.remove('show');
      this.nextRound(run);
    });
  }

  private leaveLevel(): void {
    this.run++;
    this.locked = true;
    stopVoice();
    this.clearIdle();
    this.stopBubbles();
    clearTimeout(this.hatchTimer);
    this.el.banner.classList.remove('show');
    const r = this.el.back.getBoundingClientRect();
    void this.wipe(r.left + r.width / 2, r.top + r.height / 2, () => this.showMap());
  }

  private setupPlayfield(): void {
    const pf = this.el.playfield;
    pf.dataset.mode = this.level.mode;
    this.stopBubbles();
    if (this.level.mode === 'feed') {
      pf.innerHTML = '<div class="cards" id="cards"></div>';
    } else if (this.level.mode === 'egg') {
      pf.innerHTML = '<div class="eggs" id="eggs"></div><div class="nest"></div>';
    } else {
      pf.innerHTML = `<div class="bubble-field" id="bubble-field"></div>
        <div class="pop-counter" id="pop-counter" aria-live="polite"></div>`;
      this.startBubbles();
    }
  }

  private async nextRound(run: number): Promise<void> {
    if (!this.alive(run)) return;
    if (this.round >= this.level.rounds) {
      this.levelComplete(run);
      return;
    }
    this.wrongThisRound = 0;
    this.target = pickTarget(this.state, this.level.letters, this.target);
    this.renderHint();
    const mode = this.level.mode;
    if (mode === 'feed') this.renderCards(pickChoices(this.target, this.level.letters, 3));
    else if (mode === 'egg') this.renderEggs(pickChoices(this.target, this.level.letters, 3));
    else {
      this.pops = 0;
      this.bubbleRoundActive = true;
      this.renderPopCounter();
      this.el.playfield.querySelectorAll('.bubble.glow').forEach((b) => b.classList.remove('glow'));
    }
    await wait(mode === 'bubble' ? 250 : 700);
    if (!this.alive(run)) return;
    this.locked = false;
    this.sayTarget();
  }

  private async sayTarget(): Promise<void> {
    const token = ++this.sayToken;
    this.el.listen.classList.add('is-playing');
    this.monster.setMood('speaking', 5);
    await playPhoneme(this.target);
    if (token !== this.sayToken) return;
    this.el.listen.classList.remove('is-playing');
    if (this.monster.getMood() === 'speaking') this.monster.setMood('idle');
    this.bumpIdle();
  }

  private bumpIdle(): void {
    this.clearIdle();
    if (this.screen !== 'level' || this.locked) return;
    this.idleTimer = window.setTimeout(() => {
      if (this.locked || this.screen !== 'level') return;
      this.el.listen.classList.remove('nudge');
      void this.el.listen.offsetWidth;
      this.el.listen.classList.add('nudge');
      this.sayTarget();
    }, 10000);
  }

  private clearIdle(): void {
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
  }

  /** Star flies from (x, y) into the level meter. Resolves when it lands. */
  private awardStar(x: number, y: number): Promise<void> {
    const slotIndex = Math.min(this.round, this.level.rounds - 1);
    this.round++;
    const slotEl = this.el.stars.querySelectorAll<HTMLElement>('.star-slot')[slotIndex];
    const sr = slotEl?.getBoundingClientRect();
    return new Promise<void>((resolve) => {
      let landed = false;
      const land = () => {
        if (landed) return;
        landed = true;
        this.displayedStars = Math.min(this.level.rounds, this.displayedStars + 1);
        this.renderStars(slotIndex);
        sfx.sfxStar(slotIndex);
        resolve();
      };
      setTimeout(() => {
        sfx.sfxStarFly();
        if (sr) this.fx.flyStar(x, y, sr.left + sr.width / 2, sr.top + sr.height / 2, land);
        else land();
      }, 200);
      setTimeout(land, 2200);
    });
  }

  private markCorrect(): void {
    this.state = recordAttempt(this.state, this.target, true);
    if (this.wrongThisRound === 0) this.streak++;
    else this.streak = 0;
  }

  /** Shared wrong-answer handling. */
  private async onWrong(run: number, opts: { replay?: boolean } = {}): Promise<void> {
    this.state = recordAttempt(this.state, this.target, false);
    this.wrongThisRound++;
    this.mistakes++;
    this.streak = 0;
    this.monster.setMood('confused', 1.3);
    if (opts.replay === false) return;
    await wait(450);
    if (!this.alive(run)) return;
    if (this.wrongThisRound === 1 && Math.random() < 0.6) {
      this.monster.setMood('speaking', 3);
      await sayLine(pick(['oops', 'notthat'] as const));
      if (!this.alive(run)) return;
    }
    if (this.wrongThisRound >= 2) {
      this.showAnswerHint();
      const token = ++this.sayToken;
      this.el.listen.classList.add('is-playing');
      this.monster.setMood('speaking', 4);
      await playPhoneme(this.target);
      if (token === this.sayToken && this.alive(run)) await sayLike(this.target);
      if (token === this.sayToken) {
        this.el.listen.classList.remove('is-playing');
        this.monster.setMood('idle');
      }
      this.bumpIdle();
    } else {
      this.sayTarget();
    }
  }

  private showAnswerHint(): void {
    this.el.playfield
      .querySelectorAll<HTMLElement>(`[data-letter="${this.target}"]`)
      .forEach((e) => e.classList.add('is-hint'));
  }

  /** "sss… snake!" plus praise. */
  private async celebrateSound(run: number): Promise<void> {
    this.monster.setMood('speaking', 4);
    await playPhoneme(this.target);
    if (!this.alive(run)) return;
    await sayWord(this.target);
    if (!this.alive(run)) return;
    if (this.streak >= 3 && Math.random() < 0.5) await sayLine(pick(['great', 'yougotit'] as const));
    this.monster.setMood('happy', 0.8);
  }

  /* ---------------------------------------------------------------- */
  /*  Mode: Feed Munchy (cards)                                        */
  /* ---------------------------------------------------------------- */

  private renderCards(choices: SatpinLetter[]): void {
    const wrap = this.el.playfield.querySelector('#cards')!;
    wrap.innerHTML = '';
    choices.forEach((letter, i) => {
      const item = SATPIN_ITEMS[letter];
      const slot = document.createElement('div');
      slot.className = 'card-slot deal';
      slot.style.setProperty('--deal-rot', `${(i - 1) * 14 - 4}deg`);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.letter = letter;
      card.style.setProperty('--accent', item.accent);
      card.style.setProperty('--accent-dark', item.accentDark);
      card.style.setProperty('--tint', item.tint);
      card.style.setProperty('--bob-delay', `${i * -0.7}s`);
      card.style.animationDelay = `${i * 0.11}s`;
      card.setAttribute('aria-label', `${letter}, ${item.word}`);
      card.innerHTML = `
        <div class="card-art"><div class="art-disc">${item.svg}</div></div>
        <div class="card-letter">${letter}</div>
        <div class="card-word"><b>${item.word[0]}</b>${item.word.slice(1)}</div>`;
      card.addEventListener('animationend', (e) => {
        if (e.animationName === 'deal') slot.classList.remove('deal');
      });
      slot.appendChild(card);
      wrap.appendChild(slot);
      setTimeout(() => sfx.sfxDeal(i), i * 110 + 80);
      this.bindCard(card, letter, i);
    });
  }

  private bindCard(card: HTMLButtonElement, letter: SatpinLetter, index: number): void {
    card.addEventListener('pointerenter', (e) => {
      if (!this.locked && !this.drag && e.pointerType === 'mouse') sfx.sfxHover(index);
    });
    card.addEventListener('pointermove', (e) => {
      if (this.drag?.card === card) return this.onDragMove(e);
      if (e.pointerType !== 'mouse' || this.locked) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 16}deg`);
      card.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 16}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
    card.addEventListener('pointerdown', (e) => {
      if (this.locked || this.drag || e.button > 0) return;
      e.preventDefault();
      unlockAudio();
      try {
        card.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
      this.drag = {
        card,
        letter,
        index,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        dx: 0,
        dy: 0,
        vx: 0,
        lastX: e.clientX,
        lastT: performance.now(),
        moved: false,
        home: (card.parentElement as HTMLElement).getBoundingClientRect(),
        trailAcc: 0,
      };
    });
    card.addEventListener('pointerup', (e) => this.onDragEnd(e, false));
    card.addEventListener('pointercancel', (e) => this.onDragEnd(e, true));
    card.addEventListener('click', (e) => {
      if (e.detail === 0 && !this.locked) this.feed(card, letter);
    });
  }

  private onDragMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    d.dx = e.clientX - d.startX;
    d.dy = e.clientY - d.startY;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.vx = d.vx * 0.7 + ((e.clientX - d.lastX) / dt) * 1000 * 0.3;
    d.lastX = e.clientX;
    d.lastT = now;
    if (!d.moved && Math.hypot(d.dx, d.dy) > 8) {
      d.moved = true;
      d.card.classList.add('is-dragging');
      d.card.style.setProperty('--rx', '0deg');
      d.card.style.setProperty('--ry', '0deg');
      sfx.sfxPickup(d.index);
    }
    if (!d.moved) return;
    d.card.style.translate = `${d.dx}px ${d.dy}px`;
    d.card.style.rotate = `${clamp(d.vx * 0.012, -16, 16)}deg`;
    const cx = d.home.left + d.home.width / 2 + d.dx;
    const cy = d.home.top + d.home.height / 2 + d.dy;
    const mouth = this.monster.getMouthScreenPosition();
    const dist = Math.hypot(mouth.x - cx, mouth.y - cy);
    this.monster.setHunger(clamp(1 - (dist - 60) / (this.monster.getUnitPx() * 4), 0, 1), cx, cy);
    d.trailAcc += dt;
    if (d.trailAcc > 30) {
      d.trailAcc = 0;
      this.fx.trail(cx, cy, SATPIN_ITEMS[d.letter].accent);
    }
  }

  private onDragEnd(e: PointerEvent, cancelled: boolean): void {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    this.drag = null;
    this.monster.setHunger(0);
    if (!d.moved) {
      if (!cancelled) this.feed(d.card, d.letter);
      return;
    }
    const cx = d.home.left + d.home.width / 2 + d.dx;
    const cy = d.home.top + d.home.height / 2 + d.dy;
    const mouth = this.monster.getMouthScreenPosition();
    const radius = Math.max(110, this.monster.getUnitPx() * 1.1);
    if (!cancelled && Math.hypot(mouth.x - cx, mouth.y - cy) < radius) this.feed(d.card, d.letter);
    else this.springBack(d.card);
  }

  private springBack(card: HTMLButtonElement): void {
    sfx.sfxDrop();
    const from = card.style.translate || '0px 0px';
    const rot = card.style.rotate || '0deg';
    card.classList.remove('is-dragging');
    card.style.translate = '';
    card.style.rotate = '';
    card.animate(
      [
        { translate: from, rotate: rot, scale: '1.1' },
        { translate: '0px 0px', rotate: '0deg', scale: '1' },
      ],
      { duration: 520, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  }

  private async flyToMouth(card: HTMLButtonElement): Promise<{ dx: number; dy: number }> {
    const home = (card.parentElement as HTMLElement).getBoundingClientRect();
    const fromT = card.style.translate || '0px 0px';
    const fromR = card.style.rotate || '0deg';
    const fromS = card.classList.contains('is-dragging') ? '1.1' : '1';
    const [fx, fy] = fromT.split(' ').map((v) => parseFloat(v) || 0);
    card.classList.remove('is-dragging');
    card.classList.add('is-flying');
    card.style.translate = '';
    card.style.rotate = '';
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    const mouth = this.monster.getMouthScreenPosition();
    const dx = mouth.x - (home.left + home.width / 2);
    const dy = mouth.y - (home.top + home.height / 2);
    this.monster.setHunger(1, mouth.x, mouth.y + 40);
    sfx.sfxWhoosh(0.38);
    const anim = card.animate(
      [
        { translate: `${fx}px ${fy}px`, rotate: fromR, scale: fromS },
        { translate: `${(fx + dx) / 2}px ${Math.min(fy, dy) - 70}px`, rotate: '-12deg', scale: '0.85', offset: 0.5 },
        { translate: `${dx}px ${dy}px`, rotate: '25deg', scale: '0.16' },
      ],
      { duration: 430, easing: 'cubic-bezier(0.45, 0, 0.8, 0.6)', fill: 'forwards' }
    );
    await Promise.race([anim.finished.catch(() => {}), wait(700)]);
    return { dx, dy };
  }

  private async feed(card: HTMLButtonElement, letter: SatpinLetter): Promise<void> {
    if (this.locked) return;
    const run = this.run;
    this.locked = true;
    this.clearIdle();
    this.sayToken++;
    this.el.listen.classList.remove('is-playing');
    stopVoice();
    const pos = await this.flyToMouth(card);
    this.monster.setHunger(0);
    if (!this.alive(run)) return;
    if (letter === this.target) await this.feedCorrect(run, card);
    else await this.feedWrong(run, card, pos);
  }

  private async feedCorrect(run: number, card: HTMLButtonElement): Promise<void> {
    const item = SATPIN_ITEMS[this.target];
    const mouth = this.monster.getMouthScreenPosition();
    card.style.opacity = '0';
    this.markCorrect();

    this.monster.setMood('chewing', 0.85);
    sfx.sfxMunch();
    this.shake(4);
    for (let i = 0; i < 3; i++) setTimeout(() => this.fx.crumbs(mouth.x, mouth.y, item.accent, 8), i * 170);
    await wait(620);
    this.monster.gulp();
    await wait(230);
    if (!this.alive(run)) return;

    // The occasional big silly burp
    if (!this.burpedLast && Math.random() < 0.3) {
      this.burpedLast = true;
      this.monster.setMood('burp', 0.8);
      sfx.sfxBurp();
      this.fx.text(mouth.x, mouth.y - this.monster.getUnitPx() * 1.4, 'BURP!', '#9be15d', 58);
      this.shake(6);
      await wait(850);
      if (!this.alive(run)) return;
      this.monster.setMood('speaking', 2);
      await sayLine('excuse');
      if (!this.alive(run)) return;
    } else {
      this.burpedLast = false;
    }

    this.monster.setMood('happy', 1.8);
    sfx.sfxCorrect(this.streak);
    this.fx.burst(mouth.x, mouth.y - 20, item.accent, 34);
    this.fx.hearts(mouth.x, mouth.y - 40, 4);
    this.fx.text(mouth.x, mouth.y - this.monster.getUnitPx() * 1.6, pick(PRAISE), item.accent, 52);
    this.showStreak();
    this.el.playfield.querySelectorAll<HTMLElement>('.card').forEach((c) => {
      if (c !== card) c.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '0.8' }], { duration: 300, fill: 'forwards', delay: 300 });
    });

    const star = this.awardStar(mouth.x, mouth.y - 30);
    await wait(300);
    await this.celebrateSound(run);
    await star;
    if (!this.alive(run)) return;
    await wait(350);
    this.nextRound(run);
  }

  private async feedWrong(run: number, card: HTMLButtonElement, pos: { dx: number; dy: number }): Promise<void> {
    const mouth = this.monster.getMouthScreenPosition();
    this.monster.setMood('yuck', 0.75);
    sfx.sfxWrong();
    await wait(260);
    sfx.sfxSpit();
    this.fx.crumbs(mouth.x, mouth.y, '#bfe9ff', 6);
    card.getAnimations().forEach((a) => a.cancel());
    const back = card.animate(
      [
        { translate: `${pos.dx}px ${pos.dy}px`, rotate: '25deg', scale: '0.16' },
        { translate: `${pos.dx * 0.4}px ${Math.min(pos.dy, 0) * 0.4 - 90}px`, rotate: '-200deg', scale: '1.05', offset: 0.55 },
        { translate: '0px 0px', rotate: '-360deg', scale: '1' },
      ],
      { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    await Promise.race([back.finished.catch(() => {}), wait(900)]);
    card.classList.remove('is-flying');
    card.classList.add('is-tried');
    if (!this.alive(run)) return;
    this.locked = false;
    await this.onWrong(run);
  }

  private shake(px: number): void {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    this.el.stage.animate(
      [
        { translate: '0 0' },
        { translate: `${-px}px ${px * 0.5}px` },
        { translate: `${px}px ${-px * 0.5}px` },
        { translate: `${-px * 0.5}px 0` },
        { translate: '0 0' },
      ],
      { duration: 260, easing: 'ease-out' }
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Mode: Egg Hatch                                                  */
  /* ---------------------------------------------------------------- */

  private renderEggs(choices: SatpinLetter[]): void {
    const wrap = this.el.playfield.querySelector('#eggs')!;
    wrap.innerHTML = '';
    this.hatchEgg = null;
    this.hatchStage = 0;
    choices.forEach((letter, i) => {
      const item = SATPIN_ITEMS[letter];
      const slot = document.createElement('div');
      slot.className = 'egg-slot deal';
      slot.style.setProperty('--deal-rot', `${(i - 1) * 10}deg`);
      const egg = document.createElement('button');
      egg.type = 'button';
      egg.className = 'egg';
      egg.dataset.letter = letter;
      egg.dataset.stage = '0';
      egg.style.setProperty('--accent', item.accent);
      egg.style.setProperty('--wobble-delay', `${rand(0, 3).toFixed(2)}s`);
      egg.style.animationDelay = `${i * 0.12}s`;
      egg.setAttribute('aria-label', `Egg with the letter ${letter}`);
      const svg = eggSvg(letter);
      egg.innerHTML = `
        <div class="egg-baby">${item.svg}</div>
        <div class="egg-shell bottom">${svg}</div>
        <div class="egg-shell top">${svg}</div>`;
      egg.addEventListener('animationend', (e) => {
        if (e.animationName === 'deal') slot.classList.remove('deal');
      });
      egg.addEventListener('click', () => this.onEggTap(egg, letter));
      slot.appendChild(egg);
      wrap.appendChild(slot);
      setTimeout(() => sfx.sfxDeal(i), i * 120 + 80);
    });
  }

  private async onEggTap(egg: HTMLElement, letter: SatpinLetter): Promise<void> {
    unlockAudio();
    const run = this.run;
    if (this.hatchEgg) {
      if (egg === this.hatchEgg) this.crackEgg(run);
      return;
    }
    if (this.locked) return;
    this.clearIdle();
    if (letter === this.target) {
      this.hatchEgg = egg;
      this.sayToken++;
      this.el.listen.classList.remove('is-playing');
      stopVoice();
      this.markCorrect();
      this.monster.setMood('happy', 0.8);
      this.el.playfield.querySelectorAll<HTMLElement>('.egg').forEach((e) => {
        if (e !== egg) e.classList.add('is-dim');
      });
      egg.classList.add('is-chosen');
      this.crackEgg(run);
    } else {
      sfx.sfxBonk();
      egg.classList.remove('nope');
      void egg.offsetWidth;
      egg.classList.add('nope', 'is-tried');
      this.monster.setMood('yuck', 0.5);
      await this.onWrong(run);
    }
  }

  private crackEgg(run: number): void {
    const egg = this.hatchEgg;
    if (!egg || !this.alive(run)) return;
    clearTimeout(this.hatchTimer);
    this.hatchStage++;
    egg.dataset.stage = String(this.hatchStage);
    const r = egg.getBoundingClientRect();
    egg.classList.remove('crack-shake');
    void egg.offsetWidth;
    egg.classList.add('crack-shake');
    if (this.hatchStage < 3) {
      sfx.sfxCrack(this.hatchStage);
      this.fx.crumbs(r.left + r.width / 2, r.top + r.height * 0.45, '#ffffff', 5);
      this.fx.text(r.left + r.width / 2, r.top - 10, this.hatchStage === 1 ? 'Tap!' : 'Tap tap!', SATPIN_ITEMS[this.target].accent, 34);
      // Keep things moving if the child waits
      this.hatchTimer = window.setTimeout(() => this.crackEgg(run), 2600);
    } else {
      this.hatch(run, egg);
    }
  }

  private async hatch(run: number, egg: HTMLElement): Promise<void> {
    const item = SATPIN_ITEMS[this.target];
    egg.classList.add('hatched');
    sfx.sfxHatch();
    const r = egg.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.35;
    this.fx.burst(cx, cy, item.accent, 34);
    this.fx.crumbs(cx, cy, '#ffffff', 12);
    this.fx.text(cx, r.top - 20, pick(PRAISE), item.accent, 48);
    this.monster.setMood('happy', 2);
    sfx.sfxCorrect(this.streak);
    this.showStreak();
    this.hatchEgg = null;
    this.locked = true;
    const star = this.awardStar(cx, cy);
    await wait(500);
    if (!this.alive(run)) return;
    await this.celebrateSound(run);
    await star;
    if (!this.alive(run)) return;
    await wait(500);
    this.nextRound(run);
  }

  /* ---------------------------------------------------------------- */
  /*  Mode: Bubble Pop                                                 */
  /* ---------------------------------------------------------------- */

  private renderPopCounter(): void {
    const el = this.el.playfield.querySelector('#pop-counter');
    if (!el) return;
    const item = SATPIN_ITEMS[this.target];
    el.innerHTML = Array.from({ length: this.popsNeeded }, (_, i) => `<span class="${i < this.pops ? 'on' : ''}" style="--accent:${item.accent}"></span>`).join('');
  }

  private startBubbles(): void {
    this.stopBubbles();
    this.bubbles = [];
    this.spawnAcc = 1;
    this.bubbleLast = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.bubbleLast) / 1000);
      this.bubbleLast = now;
      this.updateBubbles(dt);
      this.bubbleRaf = requestAnimationFrame(loop);
    };
    this.bubbleRaf = requestAnimationFrame(loop);
  }

  private stopBubbles(): void {
    cancelAnimationFrame(this.bubbleRaf);
    this.bubbleRaf = 0;
    this.bubbles.forEach((b) => b.el.remove());
    this.bubbles = [];
  }

  private spawnBubble(field: HTMLElement): void {
    const w = field.clientWidth;
    const h = field.clientHeight;
    if (!w || !h) return;
    const alive = this.bubbles.filter((b) => !b.dead);
    const targetsVisible = alive.filter((b) => b.letter === this.target && b.y > 0).length;
    const others = this.level.letters.filter((l) => l !== this.target);
    const wantTarget = this.bubbleRoundActive && (targetsVisible < 2 || Math.random() < 0.4);
    const letter = wantTarget || !others.length ? this.target : pick(others);
    const item = SATPIN_ITEMS[letter];
    const r = clamp(Math.min(w, h * 1.4) * 0.1, 36, 64);
    // Avoid spawning right on top of the previous bubble
    let x = rand(r, w - r);
    for (let tries = 0; tries < 6; tries++) {
      if (alive.every((b) => Math.abs(b.x - x) > r * 1.6 || b.y < h - r * 3)) break;
      x = rand(r, w - r);
    }
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'bubble';
    el.dataset.letter = letter;
    el.style.setProperty('--accent', item.accent);
    el.style.width = el.style.height = `${r * 2}px`;
    el.style.fontSize = `${r * 0.42}px`;
    el.setAttribute('aria-label', `Bubble with the letter ${letter}`);
    el.innerHTML = `<span>${letter}</span>`;
    if (this.wrongThisRound >= 2 && letter === this.target) el.classList.add('is-hint');
    const b: Bubble = { el, letter, x, y: h + r, r, vy: -(h / rand(6.5, 8.5)) - 18, phase: rand(0, Math.PI * 2), dead: false };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onBubbleTap(b);
    });
    el.addEventListener('click', (e) => {
      if (e.detail === 0) this.onBubbleTap(b);
    });
    field.appendChild(el);
    this.bubbles.push(b);
  }

  private updateBubbles(dt: number): void {
    const field = this.el.playfield.querySelector<HTMLElement>('#bubble-field');
    if (!field) return;
    this.spawnAcc += dt;
    const alive = this.bubbles.filter((b) => !b.dead).length;
    if (this.spawnAcc > 0.85 && alive < 8) {
      this.spawnAcc = 0;
      this.spawnBubble(field);
    }
    const t = performance.now() / 1000;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (b.dead) continue;
      b.y += b.vy * dt;
      const sway = Math.sin(t * 1.3 + b.phase) * b.r * 0.35;
      b.el.style.transform = `translate(${b.x - b.r + sway}px, ${b.y - b.r}px)`;
      if (b.y < -b.r * 2) {
        b.el.remove();
        this.bubbles.splice(i, 1);
      }
    }
  }

  private async onBubbleTap(b: Bubble): Promise<void> {
    unlockAudio();
    if (b.dead || this.locked) return;
    const run = this.run;
    this.bumpIdle();
    const r = b.el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const item = SATPIN_ITEMS[b.letter];
    if (b.letter !== this.target) {
      sfx.sfxBonk();
      b.el.classList.remove('nope');
      void b.el.offsetWidth;
      b.el.classList.add('nope');
      const firstMiss = this.wrongThisRound === 0;
      await this.onWrong(run, { replay: firstMiss || this.wrongThisRound === 1 });
      if (this.wrongThisRound >= 2) this.showAnswerHint();
      return;
    }
    // Pop!
    b.dead = true;
    b.el.classList.add('popping');
    setTimeout(() => {
      b.el.remove();
      this.bubbles = this.bubbles.filter((x) => x !== b);
    }, 320);
    this.pops++;
    sfx.sfxBubblePop(1 + this.pops * 0.15);
    this.fx.burst(cx, cy, item.accent, 16);
    this.renderPopCounter();
    const mouth = this.monster.getMouthScreenPosition();
    this.monster.setHunger(0.8, cx, cy);
    this.fx.flyLetter(cx, cy, mouth.x, mouth.y, b.letter, item.accent, () => {
      this.monster.setHunger(0);
      this.monster.setMood('chewing', 0.45);
      sfx.sfxNom();
      this.fx.crumbs(mouth.x, mouth.y, item.accent, 5);
    });
    if (this.pops < this.popsNeeded) return;

    // Round won
    this.locked = true;
    this.bubbleRoundActive = false;
    this.sayToken++;
    this.clearIdle();
    this.state = recordAttempt(this.state, this.target, true);
    if (this.wrongThisRound === 0) this.streak++;
    else this.streak = 0;
    await wait(750);
    if (!this.alive(run)) return;
    this.monster.setMood('happy', 1.5);
    sfx.sfxCorrect(this.streak);
    this.fx.text(mouth.x, mouth.y - this.monster.getUnitPx() * 1.6, pick(PRAISE), item.accent, 52);
    this.showStreak();
    const star = this.awardStar(mouth.x, mouth.y - 30);
    await this.celebrateSound(run);
    await star;
    if (!this.alive(run)) return;
    await wait(300);
    this.nextRound(run);
  }

  /* ---------------------------------------------------------------- */
  /*  Level complete + treasure chest                                  */
  /* ---------------------------------------------------------------- */

  private async levelComplete(run: number): Promise<void> {
    this.locked = true;
    this.clearIdle();
    this.bubbleRoundActive = false;
    const [three, two] = MODE_INFO[this.level.mode].stars;
    const stars = this.mistakes <= three ? 3 : this.mistakes <= two ? 2 : 1;
    const wasFinal = this.state.levelStars.every((s, i) => s > 0 || i === this.levelIndex);
    const res = completeLevel(this.state, this.levelIndex, stars);
    this.state = res.state;
    this.renderHud();

    this.monster.setMood('dance', 6);
    this.scene.celebrate(6);
    this.fx.confetti(3500);
    sfx.sfxFanfare();
    sayLine('didit');
    await wait(1300);
    if (!this.alive(run)) return;
    this.stopBubbles();

    const bigStar = (i: number) => `<div class="big-star" data-i="${i}">${STAR_SVG}</div>`;
    this.openModal(
      'complete',
      `<div class="panel" role="dialog" aria-label="Level complete">
        <div class="ribbon">Level ${this.levelIndex + 1} done!</div>
        <div class="big-stars">${[0, 1, 2].map(bigStar).join('')}</div>
        <div class="reward" id="reward"></div>
        <div class="reward-actions" id="reward-actions"></div>
      </div>`
    );

    for (let i = 0; i < stars; i++) {
      await wait(420);
      const s = this.el.modal.querySelector<HTMLElement>(`.big-star[data-i="${i}"]`);
      if (!s) return;
      s.classList.add('is-filled');
      sfx.sfxStarAward(i);
      const r = s.getBoundingClientRect();
      this.fx.burst(r.left + r.width / 2, r.top + r.height / 2, '#ffd43b', 16);
    }
    await wait(500);

    if (wasFinal) {
      sayLine('superstar');
      this.fx.confetti(3000);
    }

    const reward = this.el.modal.querySelector<HTMLElement>('#reward');
    if (!reward) return;
    if (res.prize) {
      reward.innerHTML = `<button class="chest" id="chest" type="button" aria-label="Open the treasure chest">${CHEST_SVG}<span class="chest-glow"></span></button>
        <p class="tap-hint">Tap the treasure!</p>`;
      if (!wasFinal) sayLine('chest');
      let taps = 0;
      const chest = q<HTMLButtonElement>(reward, '#chest');
      const tapChest = () => {
        taps++;
        chest.classList.remove('shake');
        void chest.offsetWidth;
        chest.classList.add('shake');
        const r = chest.getBoundingClientRect();
        if (taps < 3) {
          sfx.sfxChestShake();
          this.fx.trail(r.left + r.width / 2, r.top + r.height * 0.3, '#ffd43b');
          this.fx.trail(r.left + r.width / 2, r.top + r.height * 0.3, '#ffffff');
        } else {
          chest.disabled = true;
          clearTimeout(autoOpen);
          this.openChest(chest, res.prize!);
        }
      };
      chest.addEventListener('click', tapChest);
      const autoOpen = window.setTimeout(() => {
        if (taps < 3) {
          taps = 2;
          tapChest();
        }
      }, 9000);
    } else {
      this.showRewardActions(null);
    }
  }

  private async openChest(chest: HTMLButtonElement, prize: Prize): Promise<void> {
    chest.classList.add('open');
    sfx.sfxChestOpen();
    const r = chest.getBoundingClientRect();
    await wait(450);
    this.fx.burst(r.left + r.width / 2, r.top + r.height * 0.3, '#ffd43b', 40);
    const reward = this.el.modal.querySelector<HTMLElement>('#reward');
    if (!reward) return;
    if (prize.kind === 'hat') {
      reward.innerHTML = `<div class="rays-wrap prize-pop"><div class="rays"></div><canvas class="prize-munchy" id="prize-munchy"></canvas></div>
        <h2>${prize.hat.name}!</h2>`;
      const m = new MonsterCanvasController(q(reward, '#prize-munchy'), { sizeFactor: 1.05 });
      m.setVoiceProviders(() => engine.voiceLevel(), isNarratorSpeaking);
      m.setHat(prize.hat.id);
      m.setMood('happy', 2);
      this.modalMonsters.push(m);
      sfx.sfxWear();
      sayLine('newhat');
    } else {
      reward.innerHTML = `<div class="rays-wrap prize-pop"><div class="rays"></div>${this.stickerHtml(prize.sticker, 160)}</div>
        <h2>${prize.sticker.name}!</h2><p class="tagline">${prize.sticker.tagline}</p>`;
      sayLine('newsticker');
      this.el.bookBtn.classList.remove('bump');
      void this.el.bookBtn.offsetWidth;
      this.el.bookBtn.classList.add('bump');
    }
    this.renderHud();
    await wait(600);
    this.showRewardActions(prize);
  }

  private showRewardActions(prize: Prize | null): void {
    const actions = this.el.modal.querySelector<HTMLElement>('#reward-actions');
    if (!actions) return;
    const wearBtn =
      prize?.kind === 'hat'
        ? `<button class="big-btn alt" id="btn-wear" type="button">Wear it! 🎩</button>`
        : '';
    actions.innerHTML = `${wearBtn}<button class="big-btn" id="btn-to-map" type="button">Map ${ICON.play.replace('<svg', '<svg width="24" height="24"')}</button>`;
    const wear = actions.querySelector<HTMLButtonElement>('#btn-wear');
    if (wear && prize?.kind === 'hat') {
      wear.addEventListener('click', () => {
        this.equipHat(prize.hat.id);
        wear.disabled = true;
        wear.textContent = 'Looking good! ✨';
        this.modalMonsters.forEach((m) => m.setMood('happy', 1.2));
        sayLine('fancy');
      });
    }
    const toMap = q<HTMLButtonElement>(actions, '#btn-to-map');
    toMap.focus({ preventScroll: true });
    toMap.addEventListener('click', () => {
      sfx.sfxTap(1.2);
      const completed = this.levelIndex;
      const unlockedNew = this.state.unlockedLevel > completed && this.state.levelStars[this.state.unlockedLevel] === 0;
      this.closeModal();
      this.run++;
      const r = toMap.getBoundingClientRect();
      void this.wipe(r.left + r.width / 2, r.top + r.height / 2, () => this.showMap({ completed, unlockedNew }));
    });
  }

  private equipHat(id: string | null): void {
    this.state = update(this.state, { equippedHat: id });
    for (const m of [this.monster, this.mapMonster, this.titleMonster, ...this.modalMonsters]) m.setHat(id);
    sfx.sfxWear();
  }

  /* ---------------------------------------------------------------- */
  /*  Modals: wardrobe, sticker book                                   */
  /* ---------------------------------------------------------------- */

  private stickerHtml(s: AnimalSticker, size: number): string {
    return `<div class="sticker" style="--bg:${s.bg};--ring:${s.ring};--size:${size}px"><span class="emoji">${s.emoji}</span></div>`;
  }

  private openModal(kind: string, html: string): void {
    this.destroyModalMonsters();
    this.el.modal.dataset.kind = kind;
    this.el.modal.innerHTML = html;
    this.el.modal.classList.add('open');
  }

  private closeModal(): void {
    this.el.modal.classList.remove('open');
    this.el.modal.dataset.kind = '';
    this.destroyModalMonsters();
    sfx.sfxPanel(false);
  }

  private destroyModalMonsters(): void {
    this.modalMonsters.forEach((m) => m.destroy());
    this.modalMonsters = [];
  }

  private openWardrobe(): void {
    unlockAudio();
    sfx.sfxPanel(true);
    this.closeSettings();
    const items = HATS.map((h) => {
      const have = this.state.hats.includes(h.id);
      const on = this.state.equippedHat === h.id;
      return have
        ? `<button type="button" class="hat-item ${on ? 'is-on' : ''}" data-hat="${h.id}" aria-label="${h.name}" aria-pressed="${on}">
            <canvas class="hat-icon" data-hat="${h.id}"></canvas><span>${h.name}</span></button>`
        : `<div class="hat-item is-locked" aria-label="Locked hat"><span class="q">?</span><span>Locked</span></div>`;
    }).join('');
    this.openModal(
      'wardrobe',
      `<div class="panel wide wardrobe" role="dialog" aria-label="Dress up Munchy">
        <button class="icon-btn close-btn" id="btn-close" type="button" aria-label="Close">${ICON.close}</button>
        <div class="book-title">🎩 Dress Up Munchy</div>
        <p class="book-sub">Win hats from treasure chests! (${this.state.hats.length}/${HATS.length})</p>
        <div class="wardrobe-body">
          <div class="wardrobe-stage"><canvas id="wardrobe-munchy"></canvas></div>
          <div class="hat-grid">
            <button type="button" class="hat-item ${this.state.equippedHat ? '' : 'is-on'}" data-hat="" aria-label="No hat"><span class="q">🙂</span><span>No hat</span></button>
            ${items}
          </div>
        </div>
      </div>`
    );
    const m = new MonsterCanvasController(q(this.el.modal, '#wardrobe-munchy'), { sizeFactor: 1 });
    m.setVoiceProviders(() => engine.voiceLevel(), isNarratorSpeaking);
    m.setHat(this.state.equippedHat);
    this.modalMonsters.push(m);
    this.el.modal.querySelectorAll<HTMLCanvasElement>('canvas.hat-icon').forEach((c) => renderHatIcon(c, c.dataset.hat!));
    this.el.modal.querySelectorAll<HTMLButtonElement>('button.hat-item').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.hat || null;
        this.equipHat(id);
        m.setMood('happy', 1.2);
        if (id) sayLine(pick(['fancy', 'loveit'] as const));
        this.el.modal.querySelectorAll('button.hat-item').forEach((x) => {
          const on = x === b;
          x.classList.toggle('is-on', on);
          x.setAttribute('aria-pressed', String(on));
        });
      });
    });
    q(this.el.modal, '#btn-close').addEventListener('click', () => this.closeModal());
  }

  private openBook(): void {
    unlockAudio();
    sfx.sfxPanel(true);
    this.closeSettings();
    const stickers = ANIMAL_STICKERS.map((s) => {
      const have = this.state.stickers.includes(s.id);
      return `<div class="book-item">
        ${have ? this.stickerHtml(s, 96) : `<div class="locked" style="--size:96px"><span class="emoji">${s.emoji}</span></div>`}
        <span class="name">${have ? s.name : '???'}</span>
      </div>`;
    }).join('');
    const mastery = SATPIN_LETTERS.map((l) => {
      const item = SATPIN_ITEMS[l];
      const c = Math.min(MASTERY_TARGET, this.state.mastery[l].correct);
      const stars = Array.from({ length: MASTERY_TARGET }, (_, i) => `<i class="${i < c ? 'on' : ''}">★</i>`).join('');
      return `<div class="mastery-row" style="--accent:${item.accent};--tint:${item.tint}">
        <div class="letter"><span>${l}</span></div>
        <div><div class="word">${item.word}</div><div class="mini-stars">${stars}</div></div>
      </div>`;
    }).join('');
    this.openModal(
      'book',
      `<div class="panel wide" role="dialog" aria-label="Sticker book">
        <button class="icon-btn close-btn" id="btn-close" type="button" aria-label="Close">${ICON.close}</button>
        <div class="book-title">📒 Sticker Book</div>
        <p class="book-sub">Open treasure chests to find stickers! · ${this.state.totalCorrect} sounds found</p>
        <div class="book-grid">${stickers}</div>
        <div class="book-section">My Sounds</div>
        <div class="mastery-list">${mastery}</div>
      </div>`
    );
    q(this.el.modal, '#btn-close').addEventListener('click', () => this.closeModal());
  }
}

function q<T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T {
  return root.querySelector(sel) as T;
}

const app = document.getElementById('app');
if (app) {
  const game = new PhonicsGame(app);
  // Handy for debugging in development builds only
  if (import.meta.env.DEV) (window as unknown as { __game: PhonicsGame }).__game = game;
}
